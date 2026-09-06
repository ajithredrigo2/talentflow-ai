import { createHash } from 'crypto';
import type {
  AgentRun,
  AgentTask,
  Candidate,
  EmailAttachment,
  IncomingEmail,
  Job,
  JobApplication,
  JobMatchResult,
  ResumeParsingResult,
  SkillLevel,
} from '../types';
import { audit, db, notify, uid } from '../store';
import { skillByName, skills } from '../seed';
import { screenCandidate } from './screening';
import { activeProvider, llmJson } from '../ai';
import { sendAcknowledgement, validateAttachment, type RawMessage } from '../email/providers';

/* ==================================================================== */
/* Resume Parsing Agent                                                 */
/* ==================================================================== */

const SECTION = (text: string, names: string[]): string => {
  const lines = text.split('\n');
  const startIdx = lines.findIndex((l) => names.some((n) => new RegExp(`^\\s*${n}\\b`, 'i').test(l.trim())));
  if (startIdx === -1) return '';
  const out: string[] = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^[A-Z][A-Z \-&/]{4,}$/.test(l.trim()) && l.trim().length < 45) break;
    out.push(l);
  }
  return out.join('\n').trim();
};

const SOFT_SKILLS = [
  'communication', 'leadership', 'mentoring', 'collaboration', 'stakeholder management', 'problem solving',
  'ownership', 'coaching', 'documentation', 'incident response', 'teamwork', 'presentation',
];

/** Deterministic résumé extraction. Never reads or infers protected attributes. */
export function parseResumeText(text: string, fallbackName: string, fallbackEmail: string): ResumeParsingResult {
  const clean = text.replace(/\r/g, '');
  const lines = clean.split('\n').map((l) => l.trim());
  const nonEmpty = lines.filter(Boolean);

  const email = clean.match(/[\w.+-]+@[\w-]+\.[\w.]{2,}/)?.[0] ?? fallbackEmail;
  const phone = clean.match(/(\+?\d[\d\s()X-]{7,}\d)/)?.[1]?.trim();
  const linkedinUrl = clean.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/i)?.[0];
  const portfolioUrl = clean.match(/(?:https?:\/\/)?(?:www\.)?(?:github\.com|gitlab\.com|[\w-]+\.(?:dev|io|me))\/[\w-]+/i)?.[0];

  const name =
    nonEmpty.find((l) => /^[A-Z][A-Z\s.'-]{4,40}$/.test(l) && l.split(' ').length <= 4)?.replace(/\s+/g, ' ') ??
    fallbackName;
  const properName = name
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const locationLine = nonEmpty.find((l) => /(United Arab Emirates|UAE|Dubai|Abu Dhabi|Riyadh|Doha|KSA|Qatar|India|United Kingdom|UK)/i.test(l) && l.length < 70);
  const location = locationLine?.replace(/^[|·-]\s*/, '').trim();

  const summarySection = SECTION(clean, ['PROFESSIONAL SUMMARY', 'SUMMARY', 'PROFILE', 'OBJECTIVE']);
  const summary = (summarySection || nonEmpty.slice(2, 5).join(' ')).replace(/\n/g, ' ').slice(0, 700).trim();

  const experienceSection = SECTION(clean, ['PROFESSIONAL EXPERIENCE', 'EXPERIENCE', 'EMPLOYMENT', 'WORK HISTORY']);
  // A role line names a title and an employer. Date ranges ("March 2023 – Present")
  // and bullet points are not roles, so they are excluded before parsing.
  const DATE_LINE = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}|^\d{4}\s*[-–—]/i;
  const roleLines = experienceSection
    .split('\n')
    .map((l) => l.trim())
    .filter(
      (l) =>
        /—|–| at | - /.test(l) &&
        !l.startsWith('-') &&
        !DATE_LINE.test(l) &&
        l.length < 90 &&
        /[A-Za-z]/.test(l),
    );

  const parseRole = (l: string) => {
    const [title, employer] = l.split(/\s*[—–]\s*|\s+at\s+/);
    return { title: (title ?? '').trim(), employer: (employer ?? '').split(',')[0].trim() };
  };
  const roles = roleLines.map(parseRole).filter((r) => r.title && r.employer);
  const currentTitle = roles[0]?.title || nonEmpty[1];
  const currentEmployer = roles[0]?.employer;
  const previousEmployers = roles.slice(1).map((r) => r.employer).filter(Boolean);

  // Years of experience: explicit statement first, then earliest-year arithmetic
  const stated = clean.match(/(\d{1,2})\+?\s*years?\s+of\s+experience/i)?.[1];
  const years = clean.match(/\b(19|20)\d{2}\b/g)?.map(Number) ?? [];
  const earliest = years.length ? Math.min(...years) : 0;
  const totalExperienceYears = stated
    ? Number(stated)
    : earliest && earliest > 1980
      ? Math.max(1, new Date().getFullYear() - earliest)
      : 0;

  // Skills — matched against the governed skill taxonomy, plus recognised tools
  const EXTRA_TOOLS = [
    'Jenkins', 'GitHub Actions', 'GitLab CI', 'Argo CD', 'Helm', 'Ansible', 'Prometheus', 'Grafana',
    'OpenTelemetry', 'ELK', 'CloudFormation', 'Control Tower', 'PowerShell', 'Active Directory',
    'Microsoft 365', 'Bash', 'Go', 'Backstage',
  ];
  const vocabulary = [...skills.map((s) => s.name), ...EXTRA_TOOLS];
  const technicalSkills = Array.from(
    new Set(
      vocabulary.filter((s) => {
        const pattern = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\//g, '\\s*/\\s*');
        return new RegExp(`(^|[^A-Za-z])${pattern}([^A-Za-z]|$)`, 'i').test(clean);
      }),
    ),
  );
  const softSkills = SOFT_SKILLS.filter((s) => new RegExp(s, 'i').test(clean)).map(
    (s) => s.charAt(0).toUpperCase() + s.slice(1),
  );

  const certSection = SECTION(clean, ['CERTIFICATIONS', 'CERTIFICATION', 'LICENSES']);
  const certifications = certSection
    .split('\n')
    .map((l) => l.replace(/^[-•*]\s*/, '').trim())
    .filter((l) => l.length > 4 && l.length < 110);

  const eduSection = SECTION(clean, ['EDUCATION', 'ACADEMIC']);
  const education = eduSection
    .split('\n')
    .map((l) => l.replace(/^[-•*]\s*/, '').trim())
    .filter((l) => l.length > 4 && l.length < 130);

  const projSection = SECTION(clean, ['PROJECTS', 'KEY PROJECTS', 'SELECTED PROJECTS']);
  const projects = projSection
    .split('\n')
    .map((l) => l.replace(/^[-•*]\s*/, '').trim())
    .filter((l) => l.length > 8 && l.length < 200);

  const langSection = SECTION(clean, ['LANGUAGES', 'LANGUAGE']);
  const languages = (langSection || '')
    .split(/[,\n]/)
    .map((l) => l.trim())
    .filter((l) => l.length > 2 && l.length < 40);

  const noticeMatch = clean.match(/notice\s*period\s*[:\-–]?\s*(immediate|(\d{1,3})\s*(days?|weeks?|months?))/i);
  let noticePeriodDays: number | undefined;
  if (noticeMatch) {
    if (/immediate/i.test(noticeMatch[1])) noticePeriodDays = 0;
    else {
      const n = Number(noticeMatch[2]);
      noticePeriodDays = /week/i.test(noticeMatch[3]) ? n * 7 : /month/i.test(noticeMatch[3]) ? n * 30 : n;
    }
  }
  const expectedSalary = clean.match(/expected\s*salary\s*[:\-–]?\s*([^\n]{3,60})/i)?.[1]?.trim();

  const relevantExperience = roles
    .slice(0, 3)
    .map((r) => `${r.title} at ${r.employer}`)
    .join('; ');

  const attempted = 18;
  const found = [
    properName, email, phone, location, summary, currentTitle, currentEmployer,
    previousEmployers.length, totalExperienceYears, relevantExperience, technicalSkills.length,
    softSkills.length, certifications.length, education.length, projects.length, languages.length,
    noticePeriodDays !== undefined, expectedSalary,
  ].filter(Boolean).length;

  return {
    name: properName,
    email,
    phone,
    location,
    summary,
    currentTitle,
    currentEmployer,
    previousEmployers,
    totalExperienceYears,
    relevantExperience,
    technicalSkills,
    softSkills,
    certifications,
    education,
    projects,
    languages,
    noticePeriodDays,
    expectedSalary,
    linkedinUrl,
    portfolioUrl,
    confidence: Math.min(0.98, 0.45 + (found / attempted) * 0.55),
    parsedBy: 'AI Resume Parsing Agent',
    parsedAt: new Date().toISOString(),
    fieldsFound: found,
    fieldsAttempted: attempted,
  };
}

/* ==================================================================== */
/* Job Matching Agent                                                   */
/* ==================================================================== */

/**
 * Stated intent (a requisition code or a job title the candidate wrote themselves)
 * is strong evidence. Inference from a résumé is weaker evidence, so it must clear
 * a higher bar before the agent will assign a vacancy on its own.
 */
const INFERENCE_THRESHOLD = 0.8;

export function matchJob(subject: string, body: string, parsing?: ResumeParsingResult): JobMatchResult {
  const openJobs = db.jobs.filter((j) => j.status === 'Open');
  const describe = (j: Job, confidence: number, reason: string) => ({
    jobId: j.id,
    jobCode: j.jobCode,
    title: j.title,
    confidence,
    reason,
  });

  // 1 — Job ID in subject
  const codeInSubject = openJobs.find((j) => new RegExp(j.jobCode.replace(/-/g, '[-\\s]?'), 'i').test(subject));
  if (codeInSubject) {
    return {
      primary: describe(codeInSubject, 0.99, `Requisition code ${codeInSubject.jobCode} appears in the subject line — an exact identifier match.`),
      alternatives: [],
      method: 'Job ID in subject',
      explanation: `The subject line contains the requisition code ${codeInSubject.jobCode}, which maps unambiguously to ${codeInSubject.title} (${codeInSubject.location}). No inference was required.`,
      confidentEnough: true,
    };
  }

  // 2 — Job title in subject
  const titleInSubject = openJobs
    .filter((j) => subject.toLowerCase().includes(j.title.toLowerCase()))
    .sort((a, b) => b.title.length - a.title.length)[0];
  if (titleInSubject) {
    const alternatives = openJobs
      .filter((j) => j.id !== titleInSubject.id && j.departmentId === titleInSubject.departmentId)
      .slice(0, 2)
      .map((j) => describe(j, 0.5, 'Same department — offered as an alternative for recruiter consideration.'));
    return {
      primary: describe(titleInSubject, 0.93, `The exact job title "${titleInSubject.title}" appears in the subject line.`),
      alternatives,
      method: 'Job title in subject',
      explanation: `The subject line names "${titleInSubject.title}" verbatim, matching an open requisition (${titleInSubject.jobCode}, ${titleInSubject.location}). The candidate stated the role explicitly, so that stated intent takes priority over skills inference.`,
      confidentEnough: true,
    };
  }

  // 3 — Job ID in body
  const codeInBody = openJobs.find((j) => new RegExp(j.jobCode.replace(/-/g, '[-\\s]?'), 'i').test(body));
  if (codeInBody) {
    return {
      primary: describe(codeInBody, 0.95, `Requisition code ${codeInBody.jobCode} appears in the message body.`),
      alternatives: [],
      method: 'Job ID in body',
      explanation: `The message body cites requisition code ${codeInBody.jobCode}, mapping to ${codeInBody.title}.`,
      confidentEnough: true,
    };
  }

  // 4 — Job title in body
  const titleInBody = openJobs
    .filter((j) => body.toLowerCase().includes(j.title.toLowerCase()))
    .sort((a, b) => b.title.length - a.title.length)[0];
  if (titleInBody) {
    return {
      primary: describe(titleInBody, 0.86, `The job title "${titleInBody.title}" appears in the message body.`),
      alternatives: openJobs
        .filter((j) => j.id !== titleInBody.id && j.departmentId === titleInBody.departmentId)
        .slice(0, 2)
        .map((j) => describe(j, 0.45, 'Same department — offered as an alternative.')),
      method: 'Job title in body',
      explanation: `The candidate names "${titleInBody.title}" in the body of the email (${titleInBody.jobCode}). Stated intent takes priority over skills inference.`,
      confidentEnough: true,
    };
  }

  // 5 — Skills and experience inference
  if (!parsing) {
    return {
      alternatives: [],
      method: 'No confident match',
      explanation: 'No requisition code or job title was found, and no résumé text was available to infer from.',
      confidentEnough: false,
    };
  }

  const scored = openJobs
    .map((j) => {
      const required = [...j.mandatorySkills, ...j.preferredSkills];
      const matched = required.filter((r) => parsing.technicalSkills.some((s) => s.toLowerCase() === r.toLowerCase()));
      const mandatoryMatched = j.mandatorySkills.filter((r) =>
        parsing.technicalSkills.some((s) => s.toLowerCase() === r.toLowerCase()),
      );
      const skillRatio = required.length ? matched.length / required.length : 0;
      const mandatoryRatio = j.mandatorySkills.length ? mandatoryMatched.length / j.mandatorySkills.length : 0;
      const expRatio = Math.min(1, parsing.totalExperienceYears / Math.max(1, j.minExperience));
      const locMatch = parsing.location && j.location.split(',')[0]
        ? parsing.location.toLowerCase().includes(j.location.split(',')[0].toLowerCase())
          ? 1
          : 0.55
        : 0.7;
      const certMatch = parsing.certifications.some((c) =>
        required.some((r) => c.toLowerCase().includes(r.toLowerCase().split(' ')[0])),
      )
        ? 1
        : 0.6;
      const base = mandatoryRatio * 0.45 + skillRatio * 0.2 + expRatio * 0.2 + locMatch * 0.1 + certMatch * 0.05;
      // Evidence breadth: matching 2 of a role's 2 requirements is thinner evidence
      // than matching 4 of 5. Roles with few stated requirements are easy to "match"
      // by accident, so a narrow evidence base is discounted rather than rewarded.
      const breadth = Math.min(1, matched.length / 4);
      const confidence = base * (0.5 + 0.5 * breadth);
      return {
        job: j,
        confidence: Number(confidence.toFixed(2)),
        mandatoryMatched,
        matched,
        reason: `${mandatoryMatched.length}/${j.mandatorySkills.length} mandatory skills evidenced (${mandatoryMatched.join(', ') || 'none'}); ${parsing.totalExperienceYears} years against a ${j.minExperience}-year minimum.`,
      };
    })
    .sort((a, b) => b.confidence - a.confidence);

  const best = scored[0];
  const confidentEnough = Boolean(best && best.confidence >= INFERENCE_THRESHOLD);

  return {
    primary: best && confidentEnough ? describe(best.job, best.confidence, best.reason) : undefined,
    alternatives: scored.slice(confidentEnough ? 1 : 0, confidentEnough ? 3 : 3).map((s) => describe(s.job, s.confidence, s.reason)),
    method: confidentEnough ? 'Skills & experience inference' : 'No confident match',
    explanation: confidentEnough
      ? `The candidate named no requisition code and no job title, so the vacancy was inferred from the résumé. ${best.job.title} scores ${(best.confidence * 100).toFixed(0)}% — ${best.reason} That clears the ${(INFERENCE_THRESHOLD * 100).toFixed(0)}% bar this agent requires before assigning a vacancy on inference alone, which is deliberately higher than for a stated role.`
      : `The candidate named no requisition code and no job title, so the only route left was inference from the résumé. The strongest candidate role, ${best?.job.title ?? 'none'}, reached ${((best?.confidence ?? 0) * 100).toFixed(0)}% — short of the ${(INFERENCE_THRESHOLD * 100).toFixed(0)}% this agent requires to assign a vacancy on inference alone. It will not guess at what someone applied for: the application is parked in Unassigned Applications with the ranked possibilities below, for a recruiter to assign.`,
    confidentEnough,
  };
}

/* ==================================================================== */
/* Duplicate detection                                                  */
/* ==================================================================== */

export interface DuplicateResult {
  existing?: Candidate;
  signals: { signal: string; matched: boolean; detail: string }[];
  isDuplicate: boolean;
}

export function detectDuplicate(parsing: ResumeParsingResult, fromEmail: string, resumeHash: string): DuplicateResult {
  const norm = (s?: string) => (s ?? '').toLowerCase().replace(/[^a-z0-9@.]/g, '');
  const byEmail = db.candidates.find((c) => norm(c.email) === norm(parsing.email) || norm(c.email) === norm(fromEmail));
  const byPhone = parsing.phone
    ? db.candidates.find((c) => c.phone && norm(c.phone).slice(-7) === norm(parsing.phone).slice(-7))
    : undefined;
  const byHash = db.candidates.find((c) => (c as Candidate & { resumeHash?: string }).resumeHash === resumeHash);
  const byName = db.candidates.find((c) => norm(c.name) === norm(parsing.name));

  const existing = byEmail ?? byHash ?? byPhone ?? byName;
  const priorApplications = existing ? db.applications.filter((a) => a.candidateId === existing.id) : [];

  const signals = [
    { signal: 'Email address', matched: Boolean(byEmail), detail: byEmail ? `Matches existing candidate ${byEmail.name} (${byEmail.email})` : 'No existing candidate with this email address' },
    { signal: 'Phone number', matched: Boolean(byPhone), detail: byPhone ? `Last 7 digits match ${byPhone.name}` : 'No phone-number match' },
    { signal: 'Résumé hash', matched: Boolean(byHash), detail: byHash ? `Identical résumé already on file for ${byHash.name}` : 'Résumé content hash not seen before' },
    { signal: 'Candidate name', matched: Boolean(byName), detail: byName ? `Name matches ${byName.name}` : 'No exact name match' },
    {
      signal: 'Application history',
      matched: priorApplications.length > 0,
      detail: priorApplications.length
        ? `${priorApplications.length} prior application(s) on file`
        : 'No prior applications on file',
    },
  ];

  return { existing, signals, isDuplicate: Boolean(existing) };
}

/* ==================================================================== */
/* Candidate Profile Agent                                              */
/* ==================================================================== */

function levelFromResume(skillName: string, parsing: ResumeParsingResult): SkillLevel {
  const years = parsing.totalExperienceYears;
  const certed = parsing.certifications.some((c) => c.toLowerCase().includes(skillName.toLowerCase().split(' ')[0]));
  if (certed && years >= 5) return 'Expert';
  if (certed || years >= 6) return 'Advanced';
  if (years >= 3) return 'Intermediate';
  return 'Beginner';
}

export function buildCandidateFromResume(parsing: ResumeParsingResult, jobId: string, mailbox: string, resumeHash: string): Candidate {
  const mapped = parsing.technicalSkills
    .map((name) => ({ name, skill: skillByName(name) }))
    .filter((x) => x.skill)
    .map((x) => ({
      skillId: x.skill!.id,
      level: levelFromResume(x.name, parsing),
      years: Math.max(1, Math.min(parsing.totalExperienceYears, parsing.totalExperienceYears)),
    }));

  return {
    id: uid('cand'),
    name: parsing.name,
    email: parsing.email,
    phone: parsing.phone ?? '',
    jobId,
    stage: 'Applied',
    appliedAt: new Date().toISOString().slice(0, 10),
    experienceYears: parsing.totalExperienceYears,
    currentTitle: parsing.currentTitle ?? '',
    currentCompany: parsing.currentEmployer ?? '',
    location: parsing.location ?? '',
    noticePeriodDays: parsing.noticePeriodDays ?? 30,
    expectedSalary: parsing.expectedSalary ?? 'Not stated',
    education: parsing.education[0] ?? 'Not stated',
    certifications: parsing.certifications,
    skills: mapped,
    resumeSummary: parsing.summary,
    source: 'Careers Page',
    consentGiven: true,
    ...({ resumeHash, sourceDetail: mailbox } as object),
  } as Candidate;
}

/* ==================================================================== */
/* Email Intake Agent — the orchestrated pipeline                        */
/* ==================================================================== */

const now = () => new Date().toISOString();

function task(runId: string, agentId: string, label: string, status: AgentTask['status'], summary: string, ms: number): AgentTask {
  return {
    id: uid('tsk'),
    runId,
    agentId,
    label,
    status,
    startedAt: now(),
    finishedAt: now(),
    durationMs: ms,
    summary,
    requiresApproval: status === 'Needs Approval',
  };
}

export interface IntakeOutcome {
  email: IncomingEmail;
  run: AgentRun;
  narrative: string;
}

/**
 * The single intake pipeline. Real mailbox messages and simulated demo messages
 * both enter here — there is no separate demo path.
 */
export async function processIncomingEmail(
  raw: RawMessage,
  ctx: { mailboxId: string; mailboxAddress: string; provider: IncomingEmail['provider']; resumeText?: string; simulated: boolean; actor: string },
): Promise<IntakeOutcome> {
  const runId = uid('run');
  const tasks: AgentTask[] = [];
  const emailId = uid('eml');
  let narrative = '';

  const logStep = (action: string, detail: string, severity: 'info' | 'warning' | 'critical' = 'info') =>
    audit({ actor: 'AI Email Intake Agent', actorRole: 'AI Agent', action, entity: 'IncomingEmail', entityId: emailId, detail, severity });

  /* 1 — Email Intake Agent: receive and read */
  const attachmentsMeta = raw.attachments;
  tasks.push(
    task(runId, 'email-intake', 'Detect and read recruitment email', 'Completed',
      `Received from ${raw.fromName} <${raw.fromEmail}> at ${ctx.mailboxAddress}. Subject: "${raw.subject}". ${attachmentsMeta.length} attachment(s).`, 320),
  );
  logStep('EMAIL_RECEIVED', `Message from ${raw.fromEmail} to ${ctx.mailboxAddress} — "${raw.subject}" with ${attachmentsMeta.length} attachment(s).`);

  const email: IncomingEmail = {
    id: emailId,
    mailboxId: ctx.mailboxId,
    mailboxAddress: ctx.mailboxAddress,
    provider: ctx.provider,
    messageId: raw.messageId,
    fromName: raw.fromName,
    fromEmail: raw.fromEmail,
    subject: raw.subject,
    body: raw.body,
    receivedAt: raw.receivedAt || now(),
    attachments: [],
    status: 'Processing',
    runId,
    simulated: ctx.simulated,
  };

  /* 2 — Document Processing Agent: attachment detection and validation */
  const resumeText = ctx.resumeText ?? '';
  const validated: EmailAttachment[] = attachmentsMeta.map((a) =>
    validateAttachment(
      { ...a, content: a.content },
      a.filename.match(/\.(pdf|docx?)$/i) ? resumeText : undefined,
    ),
  );
  email.attachments = validated;

  const resumeAttachment = validated.find((a) => a.isResume && a.validation.passed);
  const quarantined = validated.filter((a) => a.validation.quarantined);

  if (quarantined.length) {
    tasks.push(
      task(runId, 'document-processing', 'Validate and extract attachment', 'Failed',
        `${quarantined.length} attachment(s) quarantined: ${quarantined.map((q) => q.filename).join(', ')}. Failed checks: ${quarantined[0].validation.checks.filter((c) => !c.passed).map((c) => c.check).join(', ')}. The file was never opened or executed.`, 410),
    );
    logStep('ATTACHMENT_QUARANTINED', `${quarantined.map((q) => q.filename).join(', ')} failed attachment validation and was quarantined. No parsing was attempted.`, 'critical');
    email.status = 'Failed';
    email.failureReason = 'Attachment failed security validation and was quarantined.';
    narrative = `The attachment on this message failed security validation and has been quarantined. ${quarantined[0].validation.checks.filter((c) => !c.passed).map((c) => `${c.check}: ${c.detail}`).join('. ')}. Nothing was parsed and the file was never executed. No candidate record was created — a recruiter can review the message and, if it is genuine, ask the sender to resend a PDF or Word CV.`;
    return finish(email, tasks, runId, ctx, narrative, 'Failed');
  }

  if (!resumeAttachment) {
    tasks.push(
      task(runId, 'document-processing', 'Validate and extract attachment', 'Needs Approval',
        attachmentsMeta.length === 0
          ? 'No attachment found on the message. Cannot create an application without a CV.'
          : `No valid résumé attachment found among ${attachmentsMeta.length} file(s).`, 280),
    );
    logStep('ATTACHMENT_MISSING', `No valid résumé attachment on message from ${raw.fromEmail}. Flagged for recruiter follow-up.`, 'warning');
    email.status = 'Missing CV';
    email.failureReason = 'No valid CV attachment.';
    narrative = `This message has no valid CV attached, so no candidate profile was created — the pipeline does not fabricate one. It is flagged as **Missing CV** so a recruiter can reply and request the document. The sender's stated interest and contact details are preserved on the message.`;
    return finish(email, tasks, runId, ctx, narrative, 'Missing CV');
  }

  tasks.push(
    task(runId, 'document-processing', 'Validate and extract attachment', 'Completed',
      `${resumeAttachment.filename} passed all ${resumeAttachment.validation.checks.length} validation checks (${resumeAttachment.mimeType}, ${(resumeAttachment.sizeBytes / 1024).toFixed(0)} KB). SHA-256 recorded. Text extracted without executing the file.`, 640),
  );
  logStep('CV_ATTACHMENT_DETECTED', `${resumeAttachment.filename} validated (${resumeAttachment.mimeType}, ${(resumeAttachment.sizeBytes / 1024).toFixed(0)} KB); SHA-256 ${resumeAttachment.sha256.slice(0, 16)}…`);

  /* 3 — Resume Parsing Agent */
  let parsing = parseResumeText(resumeText, raw.fromName, raw.fromEmail);
  let engine: 'llm' | 'deterministic' = 'deterministic';

  if (activeProvider() !== 'deterministic' && resumeText) {
    const enriched = await llmJson<Partial<ResumeParsingResult>>(
      `Extract structured fields from this résumé. Return ONLY facts present in the text — never infer or invent. Do not extract or infer gender, age, race, religion, nationality, marital status or disability; those fields must not appear in your output.

RÉSUMÉ:
${resumeText.slice(0, 8000)}

Return JSON with keys: summary (2-3 sentences), relevantExperience (one sentence), softSkills (array), projects (array of short strings).`,
      {},
      800,
    );
    if (enriched.engine === 'llm') {
      parsing = {
        ...parsing,
        summary: enriched.value.summary || parsing.summary,
        relevantExperience: enriched.value.relevantExperience || parsing.relevantExperience,
        softSkills: enriched.value.softSkills?.length ? enriched.value.softSkills : parsing.softSkills,
        projects: enriched.value.projects?.length ? enriched.value.projects : parsing.projects,
        parsedBy: 'AI Resume Parsing Agent (model-assisted)',
      };
      engine = 'llm';
    }
  }

  email.parsing = parsing;
  tasks.push(
    task(runId, 'resume-parsing', 'Parse résumé into structured data', 'Completed',
      `${parsing.fieldsFound}/${parsing.fieldsAttempted} fields extracted at ${(parsing.confidence * 100).toFixed(0)}% confidence. ${parsing.technicalSkills.length} technical skills, ${parsing.certifications.length} certifications, ${parsing.totalExperienceYears} years of experience.`, 1180),
  );
  logStep('RESUME_PARSED', `Extracted ${parsing.fieldsFound}/${parsing.fieldsAttempted} fields for ${parsing.name} at ${(parsing.confidence * 100).toFixed(0)}% confidence.`);

  /* 4 — Duplicate check */
  const duplicate = detectDuplicate(parsing, raw.fromEmail, resumeAttachment.sha256);
  tasks.push(
    task(runId, 'candidate-profile', 'Check for an existing candidate record', 'Completed',
      duplicate.isDuplicate
        ? `Existing candidate found: ${duplicate.existing!.name}. Matched on ${duplicate.signals.filter((s) => s.matched).map((s) => s.signal.toLowerCase()).join(', ')}. A new application will be linked to the existing profile rather than creating a second one.`
        : `No existing candidate matched on email, phone, résumé hash, name or application history. A new profile will be created.`, 380),
  );

  /* 5 — Job Matching Agent */
  const jobMatch = matchJob(raw.subject, raw.body, parsing);
  email.jobMatch = jobMatch;
  const matchedJob = jobMatch.primary ? db.jobs.find((j) => j.id === jobMatch.primary!.jobId) : undefined;

  tasks.push(
    task(runId, 'job-matching', 'Identify the vacancy applied for',
      jobMatch.confidentEnough ? 'Completed' : 'Needs Approval',
      jobMatch.confidentEnough
        ? `Matched to ${jobMatch.primary!.title} (${jobMatch.primary!.jobCode}) at ${(jobMatch.primary!.confidence * 100).toFixed(0)}% via "${jobMatch.method}".${jobMatch.alternatives.length ? ` Alternatives offered: ${jobMatch.alternatives.map((a) => `${a.title} ${(a.confidence * 100).toFixed(0)}%`).join(', ')}.` : ''}`
        : `No confident vacancy match. Best inference reached ${((jobMatch.alternatives[0]?.confidence ?? 0) * 100).toFixed(0)}%, below the ${(INFERENCE_THRESHOLD * 100).toFixed(0)}% bar for inference-only assignment. Routed to Unassigned Applications with ${jobMatch.alternatives.length} ranked possibilities for recruiter assignment.`,
      520),
  );
  logStep('JOB_IDENTIFICATION', jobMatch.explanation, jobMatch.confidentEnough ? 'info' : 'warning');

  /* 6 — Candidate profile creation / linkage */
  let candidate: Candidate;
  if (duplicate.existing) {
    candidate = duplicate.existing;
    // Refresh the profile with anything newer from this résumé, without losing history
    if (parsing.certifications.length > candidate.certifications.length) candidate.certifications = parsing.certifications;
    if (parsing.totalExperienceYears > candidate.experienceYears) candidate.experienceYears = parsing.totalExperienceYears;
    if (parsing.summary) candidate.resumeSummary = parsing.summary;
    logStep('CANDIDATE_LINKED', `Linked new application to existing candidate profile ${candidate.id} (${candidate.name}). One profile, multiple applications.`);
  } else {
    candidate = buildCandidateFromResume(parsing, matchedJob?.id ?? '', ctx.mailboxAddress, resumeAttachment.sha256);
    db.candidates.unshift(candidate);
    logStep('CANDIDATE_CREATED', `Created candidate profile ${candidate.id} for ${candidate.name} from résumé data. Source: Email (${ctx.mailboxAddress}).`);
  }
  email.candidateId = candidate.id;
  email.duplicateOf = duplicate.existing?.id;

  tasks.push(
    task(runId, 'candidate-profile', duplicate.existing ? 'Link application to existing candidate' : 'Create candidate profile', 'Completed',
      duplicate.existing
        ? `Application linked to existing profile ${candidate.name} (${candidate.id}). Profile refreshed with newer résumé data where applicable.`
        : `Candidate profile created for ${candidate.name}: ${candidate.skills.length} skills mapped to the governed taxonomy, ${candidate.certifications.length} certifications, ${candidate.experienceYears} years of experience.`, 460),
  );

  /* 7 — Application record */
  const application: JobApplication = {
    id: uid('app'),
    reference: `APP-${new Date().getFullYear()}-${String(db.applications.length + 128).padStart(5, '0')}`,
    candidateId: candidate.id,
    jobId: matchedJob?.id,
    source: 'Email',
    sourceDetail: ctx.mailboxAddress,
    emailId: email.id,
    stage: matchedJob ? 'Applied' : 'Needs Assignment',
    receivedAt: email.receivedAt,
  };
  db.applications.unshift(application);
  email.applicationId = application.id;
  email.jobId = matchedJob?.id;

  /* 8 — Resume Screening Agent (only once a vacancy is known) */
  if (matchedJob) {
    const screening = screenCandidate({ ...candidate, jobId: matchedJob.id }, matchedJob);
    application.screening = screening;
    candidate.screening = screening;
    candidate.jobId = matchedJob.id;
    candidate.stage = 'Screened';

    tasks.push(
      task(runId, 'screening', 'Score against the approved evaluation criteria', 'Needs Approval',
        `Match ${screening.overall}% for ${matchedJob.title}. ${screening.matchedSkills.length} required skills evidenced, ${screening.missingSkills.length} missing. Recommendation: ${screening.recommendation} — shortlisting requires human approval.`, 890),
    );
    logStep('SCREENING_COMPLETED', `Candidate ${candidate.name} scored ${screening.overall}% against ${matchedJob.title} (${matchedJob.jobCode}) using the approved evaluation criteria. Protected attributes excluded.`);
    logStep('CANDIDATE_MATCH', `Candidate match: ${screening.overall}%.`);

    email.status = 'Needs Review';
    application.stage = 'Screened';
  } else {
    tasks.push(task(runId, 'screening', 'Score against the approved evaluation criteria', 'Waiting',
      'Screening is deferred until a recruiter assigns a vacancy — a score is only meaningful against approved criteria.', 0));
    email.status = 'Needs Assignment';
  }

  /* 9 — HR Coordinator: route to the recruiter review queue */
  tasks.push(
    task(runId, 'coordinator', 'Route to the recruiter review queue', 'Needs Approval',
      matchedJob
        ? `Application ${application.reference} placed in the recruiter review queue for ${matchedJob.title}. A named human decides: Shortlist, Hold, Reject, Request Information or Assign to a different job.`
        : `Application ${application.reference} placed in Unassigned Applications. A recruiter must assign the vacancy before screening runs.`, 240),
  );
  logStep('RECRUITER_REVIEW_REQUESTED', `Application ${application.reference} routed for human recruiter decision. No automated shortlist or rejection was applied.`);

  notify({
    title: matchedJob ? 'New email application to review' : 'Unassigned application needs a vacancy',
    body: `${candidate.name} — ${matchedJob ? `${matchedJob.title}, ${application.screening?.overall}% match` : 'vacancy could not be determined confidently'}. Received at ${ctx.mailboxAddress}.`,
    forRole: ['HR_ADMIN', 'RECRUITER'],
    kind: 'agent',
  });

  /* 10 — Acknowledgement */
  const mailbox = db.mailboxes.find((m) => m.id === ctx.mailboxId);
  if (mailbox?.autoAcknowledge && matchedJob) {
    const subject = `Application Received – ${matchedJob.title}`;
    const body = `Hi ${candidate.name.split(' ')[0]},

Thank you for applying for the ${matchedJob.title} position.

Your application has been successfully received and is currently under review. This message confirms receipt only and does not indicate that you have been shortlisted or selected.

Application ID:
${application.reference}

Regards,
Talent Acquisition Team`;

    const delivery = await sendAcknowledgement(ctx.provider, ctx.mailboxAddress, candidate.email, subject, body);
    const ack = { id: uid('ack'), emailId: email.id, applicationId: application.id, to: candidate.email, subject, body, sentAt: now(), delivery };
    db.acknowledgements.unshift(ack);
    email.acknowledgementId = ack.id;
    tasks.push(task(runId, 'email-intake', 'Send application acknowledgement', 'Completed',
      `Acknowledgement ${delivery.toLowerCase()} to ${candidate.email} with reference ${application.reference}. Wording confirms receipt only — it does not imply shortlisting.`, 300));
    logStep('ACKNOWLEDGEMENT_SENT', `Acknowledgement ${delivery.toLowerCase()} to ${candidate.email} for ${application.reference}.`);
  }

  const s = application.screening;
  narrative = matchedJob
    ? `${candidate.name}'s application arrived at ${ctx.mailboxAddress} and ran the full intake pipeline without a recruiter touching it.\n\nThe CV passed all ${resumeAttachment.validation.checks.length} attachment security checks, and ${parsing.fieldsFound} of ${parsing.fieldsAttempted} résumé fields were extracted at ${(parsing.confidence * 100).toFixed(0)}% confidence. The vacancy was identified as ${matchedJob.title} (${matchedJob.jobCode}) via ${jobMatch.method.toLowerCase()} at ${((jobMatch.primary?.confidence ?? 0) * 100).toFixed(0)}% confidence.${duplicate.existing ? ` This sender already had a profile on file, so a second application was linked to it rather than creating a duplicate.` : ''}\n\nScreening against the approved criteria returns ${s?.overall}% — ${s?.matchedSkills.slice(0, 5).join(', ')} evidenced${s?.missingSkills.length ? `, ${s.missingSkills.slice(0, 3).join(' and ')} not evidenced` : ''}. Recommendation: ${s?.recommendation}.\n\nApplication ${application.reference} is now in the recruiter review queue. Nobody has been shortlisted or rejected — that decision is yours.`
    : `${candidate.name}'s application arrived at ${ctx.mailboxAddress} and was parsed successfully — ${parsing.fieldsFound} of ${parsing.fieldsAttempted} fields at ${(parsing.confidence * 100).toFixed(0)}% confidence.\n\nThe vacancy could not be determined confidently: ${jobMatch.explanation}\n\nApplication ${application.reference} is parked in **Unassigned Applications**. Assign the correct vacancy and screening will run against that requisition's approved criteria.`;

  return finish(email, tasks, runId, ctx, narrative, email.status);
}

function finish(
  email: IncomingEmail,
  tasks: AgentTask[],
  runId: string,
  ctx: { actor: string },
  narrative: string,
  status: IncomingEmail['status'],
): IntakeOutcome {
  email.status = status;
  db.emails.unshift(email);
  const mailbox = db.mailboxes.find((m) => m.id === email.mailboxId);
  if (mailbox) mailbox.receivedCount++;

  const run: AgentRun = {
    id: runId,
    request: `Inbound application: "${email.subject}" from ${email.fromEmail}`,
    intent: 'EMAIL_INTAKE',
    actor: ctx.actor,
    createdAt: now(),
    status: tasks.some((t) => t.status === 'Failed') ? 'Failed' : tasks.some((t) => t.status === 'Needs Approval') ? 'Awaiting Approval' : 'Completed',
    plan: [
      { agentId: 'email-intake', label: 'Detect and read recruitment email' },
      { agentId: 'document-processing', label: 'Validate and extract attachment' },
      { agentId: 'resume-parsing', label: 'Parse résumé into structured data' },
      { agentId: 'candidate-profile', label: 'Create or link the candidate profile' },
      { agentId: 'job-matching', label: 'Identify the vacancy applied for' },
      { agentId: 'screening', label: 'Score against the approved evaluation criteria' },
      { agentId: 'coordinator', label: 'Route to the recruiter review queue' },
    ],
    tasks,
    reasoning: `Zero-Touch Candidate Intake pipeline for message ${email.messageId} received at ${email.mailboxAddress} via ${email.provider}. ${email.simulated ? 'Simulated message — processed through the identical pipeline used for live mail.' : 'Live mailbox message.'} Final state: ${status}.`,
    engine: 'deterministic',
  };
  db.runs.unshift(run);
  if (db.runs.length > 60) db.runs.length = 60;

  return { email, run, narrative };
}
