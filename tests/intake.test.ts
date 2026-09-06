import { beforeEach, describe, expect, it } from 'vitest';
import { detectDuplicate, parseResumeText, processIncomingEmail } from '@/lib/agents/intake';
import { validateAttachment } from '@/lib/email/providers';
import { sampleByKey } from '@/lib/email/samples';
import { db, resetStore } from '@/lib/store';

beforeEach(() => resetStore());

/* ==================================================================== */
/* Résumé parsing                                                       */
/* ==================================================================== */

const JOHN = sampleByKey('job-code-subject')!;

describe('parseResumeText', () => {
  it('extracts identity, contact and availability from a real-shaped CV', () => {
    const p = parseResumeText(JOHN.resumeText, 'Fallback Name', 'fallback@example.com');
    expect(p.name).toBe('John Doe');
    expect(p.email).toBe('john.doe@example.com');
    expect(p.location).toMatch(/Dubai/);
    expect(p.totalExperienceYears).toBe(6);
    expect(p.noticePeriodDays).toBe(30);
    expect(p.expectedSalary).toMatch(/31,000/);
    expect(p.linkedinUrl).toMatch(/linkedin\.com\/in\/johndoe/);
  });

  it('separates current employer from previous employers without swallowing date lines', () => {
    const p = parseResumeText(JOHN.resumeText, '', '');
    expect(p.currentTitle).toBe('Senior DevOps Engineer');
    expect(p.currentEmployer).toBe('Tabby');
    expect(p.previousEmployers).toEqual(['Property Finder', 'Emaar Digital']);
    // "March 2023 – Present" is a date range, not an employer
    expect(p.previousEmployers.join(' ')).not.toMatch(/2023|Present/);
  });

  it('normalises skills against the governed taxonomy', () => {
    const p = parseResumeText(JOHN.resumeText, '', '');
    ['Kubernetes', 'AWS', 'Terraform', 'CI/CD', 'Linux'].forEach((s) =>
      expect(p.technicalSkills, `expected ${s}`).toContain(s),
    );
  });

  it('reports a confidence score proportional to what it actually found', () => {
    const rich = parseResumeText(JOHN.resumeText, '', '');
    const sparse = parseResumeText('Someone\n\nNo structure here.', 'A Person', 'a@example.com');
    expect(rich.confidence).toBeGreaterThan(sparse.confidence);
    expect(rich.fieldsFound).toBeGreaterThan(sparse.fieldsFound);
  });

  it('falls back to the sender identity rather than inventing one', () => {
    const p = parseResumeText('', 'Priya Menon', 'priya@example.com');
    expect(p.name).toBe('Priya Menon');
    expect(p.email).toBe('priya@example.com');
  });

  it('never emits a protected attribute, even when the CV states one', () => {
    const cv = `${JOHN.resumeText}

PERSONAL DETAILS
Gender: Male
Date of birth: 12 March 1994
Nationality: Indian
Marital status: Married
Religion: Hindu`;
    const p = parseResumeText(cv, '', '');
    const serialised = JSON.stringify(p).toLowerCase();
    ['male', 'married', 'hindu', 'date of birth'].forEach((term) =>
      expect(serialised, `parser leaked "${term}"`).not.toContain(term),
    );
    // and it must still have parsed the legitimate fields
    expect(p.technicalSkills).toContain('Kubernetes');
  });
});

/* ==================================================================== */
/* Attachment validation                                                */
/* ==================================================================== */

describe('validateAttachment', () => {
  const pdfBytes = Buffer.from('%PDF-1.4\nhello world content');

  it('accepts a well-formed PDF CV', () => {
    const a = validateAttachment(
      { filename: 'CV.pdf', mimeType: 'application/pdf', sizeBytes: 120_000, content: pdfBytes },
      'EXPERIENCE EDUCATION SKILLS',
    );
    expect(a.validation.passed).toBe(true);
    expect(a.validation.quarantined).toBe(false);
    expect(a.isResume).toBe(true);
    expect(a.sha256).toHaveLength(64);
  });

  it('quarantines a disguised executable', () => {
    const a = validateAttachment({
      filename: 'Resume_2026.pdf.exe',
      mimeType: 'application/octet-stream',
      sizeBytes: 2_400_000,
    });
    expect(a.validation.quarantined).toBe(true);
    expect(a.isResume).toBe(false);
    const failed = a.validation.checks.filter((c) => !c.passed).map((c) => c.check);
    expect(failed).toContain('No executable or archive extension');
  });

  it('rejects an archive even with an innocent name', () => {
    const a = validateAttachment({ filename: 'documents.zip', mimeType: 'application/zip', sizeBytes: 50_000 });
    expect(a.validation.quarantined).toBe(true);
  });

  it('flags a double extension', () => {
    const a = validateAttachment({ filename: 'cv.doc.pdf', mimeType: 'application/pdf', sizeBytes: 90_000 });
    expect(a.validation.checks.find((c) => c.check === 'No double extension')?.passed).toBe(false);
  });

  it('enforces the size ceiling', () => {
    const a = validateAttachment({ filename: 'huge.pdf', mimeType: 'application/pdf', sizeBytes: 20 * 1024 * 1024 });
    expect(a.validation.quarantined).toBe(true);
    expect(a.validation.checks.find((c) => c.check === 'File size within limit')?.passed).toBe(false);
  });

  it('does not trust a declared MIME type that the content contradicts', () => {
    const a = validateAttachment({
      filename: 'cv.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1000,
      content: Buffer.from('MZ\x90\x00 this is a windows executable'),
    });
    expect(a.validation.checks.find((c) => c.check === 'Content signature matches declared type')?.passed).toBe(false);
    expect(a.validation.quarantined).toBe(true);
  });

  it('notices when a valid document does not look like a résumé', () => {
    const a = validateAttachment(
      { filename: 'invoice.pdf', mimeType: 'application/pdf', sizeBytes: 40_000, content: pdfBytes },
      'Invoice number 4471. Amount due on receipt. Bank details below.',
    );
    expect(a.validation.checks.find((c) => c.check === 'Content appears to be a résumé')?.passed).toBe(false);
  });

  it('hashes content so identical CVs collide and different ones do not', () => {
    const one = validateAttachment({ filename: 'a.pdf', mimeType: 'application/pdf', sizeBytes: 10, content: pdfBytes });
    const same = validateAttachment({ filename: 'b.pdf', mimeType: 'application/pdf', sizeBytes: 10, content: pdfBytes });
    const other = validateAttachment({
      filename: 'c.pdf', mimeType: 'application/pdf', sizeBytes: 10, content: Buffer.from('%PDF-1.4 different'),
    });
    expect(one.sha256).toBe(same.sha256);
    expect(one.sha256).not.toBe(other.sha256);
  });
});

/* ==================================================================== */
/* Duplicate detection                                                  */
/* ==================================================================== */

describe('detectDuplicate', () => {
  const parsed = (over: Record<string, unknown> = {}) =>
    ({ ...parseResumeText(JOHN.resumeText, '', ''), ...over }) as ReturnType<typeof parseResumeText>;

  it('finds no duplicate for a genuinely new applicant', () => {
    const d = detectDuplicate(parsed({ name: 'Brand New Person', email: 'brand.new@example.com', phone: undefined }), 'brand.new@example.com', 'hash-1');
    expect(d.isDuplicate).toBe(false);
    expect(d.existing).toBeUndefined();
    expect(d.signals).toHaveLength(5);
  });

  it('matches an existing candidate on email address', () => {
    const known = db.candidates[0];
    const d = detectDuplicate(parsed({ name: 'Different Name', email: known.email, phone: undefined }), known.email, 'hash-2');
    expect(d.isDuplicate).toBe(true);
    expect(d.existing?.id).toBe(known.id);
    expect(d.signals.find((s) => s.signal === 'Email address')?.matched).toBe(true);
  });

  it('matches on an identical résumé hash even if the email changed', () => {
    const known = db.candidates[0] as typeof db.candidates[0] & { resumeHash?: string };
    known.resumeHash = 'shared-hash';
    const d = detectDuplicate(parsed({ name: 'Someone Else', email: 'new.address@example.com', phone: undefined }), 'new.address@example.com', 'shared-hash');
    expect(d.isDuplicate).toBe(true);
    expect(d.signals.find((s) => s.signal === 'Résumé hash')?.matched).toBe(true);
  });

  it('does NOT merge two different people who happen to share a name', () => {
    // A name collision alone is not identity. Merging on it would attach one
    // person's application to another person's profile.
    const known = db.candidates[0];
    const d = detectDuplicate(
      parsed({ name: known.name, email: 'totally.different@example.com', phone: '+971 5X XXX 1111' }),
      'totally.different@example.com',
      'unique-hash',
    );
    expect(d.signals.find((s) => s.signal === 'Candidate name')?.matched).toBe(true);
    expect(d.isDuplicate, 'name alone must not be treated as a duplicate').toBe(false);
    expect(d.existing).toBeUndefined();
  });

  it('always reports every signal it checked, matched or not', () => {
    const d = detectDuplicate(parsed(), 'x@example.com', 'h');
    expect(d.signals.map((s) => s.signal)).toEqual([
      'Email address', 'Phone number', 'Résumé hash', 'Candidate name', 'Application history',
    ]);
    d.signals.forEach((s) => expect(s.detail.length).toBeGreaterThan(5));
  });
});

/* ==================================================================== */
/* End-to-end pipeline                                                  */
/* ==================================================================== */

const run = (key: string) => {
  const s = sampleByKey(key)!;
  const mailbox = db.mailboxes.find((m) => m.address === s.mailbox) ?? db.mailboxes[0];
  return processIncomingEmail(
    { ...s.message, receivedAt: new Date().toISOString() },
    { mailboxId: mailbox.id, mailboxAddress: mailbox.address, provider: 'demo', resumeText: s.resumeText, simulated: true, actor: 'Test Runner' },
  );
};

describe('processIncomingEmail — end to end', () => {
  it('turns an emailed CV into a screened application in the review queue', async () => {
    const { email, run: agentRun } = await run('job-code-subject');

    expect(email.status).toBe('Needs Review');
    expect(email.candidateId).toBeTruthy();
    expect(email.applicationId).toBeTruthy();
    expect(email.jobId).toBe('job-001');

    const application = db.applications.find((a) => a.id === email.applicationId)!;
    expect(application.source).toBe('Email');
    expect(application.reference).toMatch(/^APP-\d{4}-\d{5}$/);
    expect(application.screening!.overall).toBeGreaterThan(80);

    // the whole agent chain ran
    expect(agentRun.tasks.map((t) => t.agentId)).toEqual(
      expect.arrayContaining(['email-intake', 'document-processing', 'resume-parsing', 'candidate-profile', 'job-matching', 'screening', 'coordinator']),
    );
    // and it stopped for a human
    expect(agentRun.status).toBe('Awaiting Approval');
    expect(agentRun.tasks.some((t) => t.status === 'Needs Approval')).toBe(true);
  });

  it('never advances or rejects the candidate on its own', async () => {
    const { email } = await run('job-code-subject');
    const candidate = db.candidates.find((c) => c.id === email.candidateId)!;
    const application = db.applications.find((a) => a.id === email.applicationId)!;
    expect(candidate.stage).toBe('Screened');
    expect(['Shortlisted', 'Rejected', 'Hired']).not.toContain(candidate.stage);
    expect(application.recruiterDecision).toBeUndefined();
  });

  it('writes an audit entry for every stage', async () => {
    const before = db.audit.length;
    await run('job-code-subject');
    const added = db.audit.slice(0, db.audit.length - before).map((l) => l.action);
    ['EMAIL_RECEIVED', 'CV_ATTACHMENT_DETECTED', 'RESUME_PARSED', 'CANDIDATE_CREATED', 'JOB_IDENTIFICATION', 'SCREENING_COMPLETED', 'RECRUITER_REVIEW_REQUESTED']
      .forEach((a) => expect(added, `missing audit action ${a}`).toContain(a));
  });

  it('parks an unmatchable application instead of guessing', async () => {
    const { email } = await run('unassignable');
    expect(email.status).toBe('Needs Assignment');
    expect(email.jobId).toBeUndefined();
    const application = db.applications.find((a) => a.id === email.applicationId)!;
    expect(application.stage).toBe('Needs Assignment');
    expect(application.screening).toBeUndefined(); // no score without approved criteria
  });

  it('links a returning applicant to their existing profile', async () => {
    await run('job-title-subject');            // Sarah Khan, first application
    const countAfterFirst = db.candidates.length;
    const { email } = await run('duplicate');  // Sarah Khan, second application

    expect(db.candidates.length, 'must not create a second profile').toBe(countAfterFirst);
    expect(email.duplicateOf).toBeTruthy();
    const apps = db.applications.filter((a) => a.candidateId === email.candidateId);
    expect(apps.length).toBe(2); // one person, two applications
  });

  it('refuses to create an application from a message with no CV', async () => {
    const before = db.candidates.length;
    const { email } = await run('no-attachment');
    expect(email.status).toBe('Missing CV');
    expect(email.candidateId).toBeUndefined();
    expect(db.candidates.length).toBe(before);
  });

  it('quarantines a malicious attachment and creates nothing', async () => {
    const before = db.candidates.length;
    const { email, run: agentRun } = await run('malicious');
    expect(email.status).toBe('Failed');
    expect(email.attachments[0].validation.quarantined).toBe(true);
    expect(email.candidateId).toBeUndefined();
    expect(db.candidates.length).toBe(before);
    expect(agentRun.tasks.some((t) => t.status === 'Failed')).toBe(true);
    // the parser must never have run on it
    expect(agentRun.tasks.some((t) => t.agentId === 'resume-parsing')).toBe(false);
  });

  it('sends an acknowledgement only when the mailbox has it enabled', async () => {
    const mailbox = db.mailboxes.find((m) => m.address === 'careers@talentflow.demo')!;
    mailbox.autoAcknowledge = false;
    const { email } = await run('job-code-subject');
    expect(email.acknowledgementId).toBeUndefined();

    resetStore();
    const { email: second } = await run('job-code-subject');
    expect(second.acknowledgementId).toBeTruthy();
    const ack = db.acknowledgements.find((a) => a.id === second.acknowledgementId)!;
    expect(ack.body).toMatch(/does not indicate that you have been shortlisted/i);
  });

  it('records simulated mail as simulated but runs the identical pipeline', async () => {
    const { email, run: agentRun } = await run('job-code-subject');
    expect(email.simulated).toBe(true);
    expect(agentRun.intent).toBe('EMAIL_INTAKE');
    // the plan is the production plan, not a demo-only shortcut
    expect(agentRun.plan.map((p) => p.agentId)).toEqual([
      'email-intake', 'document-processing', 'resume-parsing', 'candidate-profile', 'job-matching', 'screening', 'coordinator',
    ]);
  });
});
