import { NextRequest, NextResponse } from 'next/server';
import { db, audit, uid, notify } from '@/lib/store';
import { matchJob, parseResumeText } from '@/lib/agents/intake';
import { screenCandidate } from '@/lib/agents/screening';
import { buildInterviewQuestions } from '@/lib/agents/specialists';
import { badRequest, rateLimit, requireAuth, sanitize } from '@/lib/api';

export const maxDuration = 45;

function hydrate(id: string) {
  const email = db.emails.find((e) => e.id === id);
  if (!email) return null;
  const application = db.applications.find((a) => a.id === email.applicationId);
  const candidate = db.candidates.find((c) => c.id === email.candidateId);
  const job = db.jobs.find((j) => j.id === email.jobId);
  const run = db.runs.find((r) => r.id === email.runId);
  const acknowledgement = db.acknowledgements.find((a) => a.id === email.acknowledgementId);
  return { email, application, candidate, job, run, acknowledgement };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = requireAuth(req, ['HR_ADMIN', 'RECRUITER', 'HIRING_MANAGER']);
  if (error) return error;
  const { id } = await params;
  const data = hydrate(id);
  if (!data) return NextResponse.json({ error: 'Message not found.' }, { status: 404 });

  return NextResponse.json({
    ...data,
    openJobs: db.jobs.filter((j) => j.status === 'Open').map((j) => ({ id: j.id, jobCode: j.jobCode, title: j.title, location: j.location })),
    otherApplications: data.candidate
      ? db.applications
          .filter((a) => a.candidateId === data.candidate!.id && a.id !== data.application?.id)
          .map((a) => ({ ...a, jobTitle: db.jobs.find((j) => j.id === a.jobId)?.title ?? 'Unassigned' }))
      : [],
  });
}

/** Recruiter actions. Every one is a human decision recorded against a name. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, 'inbox-action');
  if (limited) return limited;
  const { user, error } = requireAuth(req, ['HR_ADMIN', 'RECRUITER', 'HIRING_MANAGER']);
  if (error) return error;

  const { id } = await params;
  const data = hydrate(id);
  if (!data) return NextResponse.json({ error: 'Message not found.' }, { status: 404 });
  const { email, application, candidate } = data;

  const body = await req.json().catch(() => ({}));
  const action = sanitize(body.action, 40);
  const note = sanitize(body.note, 500);

  const logDecision = (act: string, detail: string, severity: 'info' | 'warning' = 'info') =>
    audit({ actor: user!.name, actorRole: user!.role, action: act, entity: 'JobApplication', entityId: application?.id ?? email.id, detail, severity });

  switch (action) {
    /* ---------------------------------------------- assign a vacancy */
    case 'assign': {
      const jobId = sanitize(body.jobId, 40);
      const job = db.jobs.find((j) => j.id === jobId);
      if (!job || !application || !candidate) return badRequest('Unknown vacancy or application.');

      application.jobId = job.id;
      candidate.jobId = job.id;
      const screening = screenCandidate({ ...candidate, jobId: job.id }, job);
      application.screening = screening;
      candidate.screening = screening;
      candidate.stage = 'Screened';
      application.stage = 'Screened';
      email.jobId = job.id;
      email.status = 'Needs Review';

      logDecision('APPLICATION_ASSIGNED', `${user!.name} assigned application ${application.reference} to ${job.title} (${job.jobCode}). Screening then ran against that requisition's approved criteria, returning ${screening.overall}%.`);
      return NextResponse.json({ ok: true, screening, status: email.status });
    }

    /* ---------------------------------------------- re-run parsing */
    case 'reparse': {
      const text = email.attachments[0]?.extractedText ?? '';
      if (!text) return badRequest('No extracted résumé text is stored for this message.');
      email.parsing = parseResumeText(text, email.fromName, email.fromEmail);
      audit({ actor: 'AI Résumé Parsing Agent', actorRole: 'AI Agent', action: 'RESUME_REPARSED', entity: 'IncomingEmail', entityId: email.id, detail: `Re-parsed at the request of ${user!.name}. ${email.parsing.fieldsFound}/${email.parsing.fieldsAttempted} fields recovered at ${(email.parsing.confidence * 100).toFixed(0)}% confidence.` });
      return NextResponse.json({ ok: true, parsing: email.parsing });
    }

    /* ---------------------------------------------- re-run matching */
    case 'rematch': {
      email.jobMatch = matchJob(email.subject, email.body, email.parsing);
      audit({ actor: 'AI Job Matching Agent', actorRole: 'AI Agent', action: 'JOB_REMATCHED', entity: 'IncomingEmail', entityId: email.id, detail: `Re-matched at the request of ${user!.name}. ${email.jobMatch.explanation}` });
      return NextResponse.json({ ok: true, jobMatch: email.jobMatch });
    }

    /* ---------------------------------------------- re-run screening */
    case 'rescreen': {
      const job = db.jobs.find((j) => j.id === email.jobId);
      if (!job || !candidate || !application) return badRequest('Assign a vacancy before screening.');
      const screening = screenCandidate({ ...candidate, jobId: job.id }, job);
      application.screening = screening;
      candidate.screening = screening;
      audit({ actor: 'AI Resume Screening Agent', actorRole: 'AI Agent', action: 'SCREENING_RERUN', entity: 'Candidate', entityId: candidate.id, detail: `Re-screened against ${job.title} at the request of ${user!.name}: ${screening.overall}%. Protected attributes excluded.` });
      return NextResponse.json({ ok: true, screening });
    }

    /* ---------------------------------------------- recruiter decisions */
    case 'shortlist':
    case 'hold':
    case 'reject':
    case 'request-info': {
      if (!application || !candidate) return badRequest('No application on this message.');
      const map = {
        shortlist: 'Shortlist',
        hold: 'Hold',
        reject: 'Reject',
        'request-info': 'Request More Information',
      } as const;
      const decision = map[action as keyof typeof map];
      application.recruiterDecision = { action: decision, by: user!.name, at: new Date().toISOString(), note };

      if (action === 'shortlist') {
        candidate.stage = 'Shortlisted';
        application.stage = 'Shortlisted';
        email.status = 'Shortlisted';
      } else if (action === 'reject') {
        candidate.stage = 'Rejected';
        application.stage = 'Rejected';
        email.status = 'Archived';
      } else {
        email.status = 'Needs Review';
      }

      logDecision(
        `APPLICATION_${decision.toUpperCase().replace(/ /g, '_')}`,
        `${user!.name} recorded "${decision}" on application ${application.reference} for ${candidate.name}.${note ? ` Note: ${note}` : ''} This was a human decision; the AI recommendation was ${application.screening?.recommendation ?? 'not available'}.`,
        action === 'reject' ? 'warning' : 'info',
      );

      // Shortlisting starts interview preparation, still gated on a human booking the slot.
      let questions;
      if (action === 'shortlist' && email.jobId) {
        const job = db.jobs.find((j) => j.id === email.jobId)!;
        questions = buildInterviewQuestions(candidate, job, application.screening?.missingSkills.slice(0, 2) ?? []);
        db.approvals.unshift({
          id: uid('apr'),
          type: 'Candidate Shortlist',
          title: `Interview ${candidate.name} — ${job.title}`,
          summary: `Shortlisted from an email application (${application.reference}). Interview guide generated; a slot still needs to be booked.`,
          requestedBy: 'AI Interview Intelligence Agent',
          requestedAt: new Date().toISOString(),
          requiredRole: ['HR_ADMIN', 'RECRUITER', 'HIRING_MANAGER'],
          status: 'Pending',
          payload: { candidateId: candidate.id, jobId: job.id, applicationId: application.id },
          aiRecommendation: 'Proceed to technical screen',
          explanation: [
            `Screening match ${application.screening?.overall}% against the approved criteria for ${job.title}`,
            `${application.screening?.matchedSkills.length} required skills evidenced on the CV`,
            `${questions.length} tailored interview questions generated across ${new Set(questions.map((q) => q.category)).size} categories`,
            `Shortlisted by ${user!.name} — the AI did not advance this candidate`,
          ],
        });
        notify({
          title: 'Interview preparation ready',
          body: `${candidate.name} shortlisted for ${job.title}. Interview guide generated; book a slot to proceed.`,
          forRole: ['HR_ADMIN', 'RECRUITER', 'HIRING_MANAGER'],
          kind: 'approval',
        });
        audit({ actor: 'AI Interview Intelligence Agent', actorRole: 'AI Agent', action: 'QUESTIONS_GENERATED', entity: 'Candidate', entityId: candidate.id, detail: `${questions.length} interview questions generated following shortlisting by ${user!.name}.` });
      }

      return NextResponse.json({ ok: true, decision, status: email.status, questions });
    }

    case 'archive': {
      email.status = 'Archived';
      logDecision('APPLICATION_ARCHIVED', `${user!.name} archived the message from ${email.fromEmail}.`);
      return NextResponse.json({ ok: true, status: email.status });
    }

    default:
      return badRequest('Unknown action.');
  }
}
