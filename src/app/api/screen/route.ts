import { NextRequest, NextResponse } from 'next/server';
import { screenAll, screenCandidate } from '@/lib/agents/screening';
import { audit, db } from '@/lib/store';
import { badRequest, rateLimit, requireAuth, sanitize } from '@/lib/api';

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'screen');
  if (limited) return limited;
  const { user, error } = requireAuth(req, ['HR_ADMIN', 'RECRUITER', 'HIRING_MANAGER']);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const jobId = sanitize(body.jobId, 40);
  const candidateId = sanitize(body.candidateId, 40);
  const job = db.jobs.find((j) => j.id === jobId);
  if (!job) return badRequest('Unknown requisition.');

  if (candidateId) {
    const candidate = db.candidates.find((c) => c.id === candidateId);
    if (!candidate) return badRequest('Unknown candidate.');
    const screening = screenCandidate(candidate, job);
    candidate.screening = screening;
    audit({ actor: 'AI Resume Screening Agent', actorRole: 'AI Agent', action: 'SCREENING_COMPLETED', entity: 'Candidate', entityId: candidate.id, detail: `Scored ${screening.overall}% against ${job.title} using approved criteria. Requested by ${user!.name}. Protected attributes excluded.` });
    return NextResponse.json({ screening });
  }

  const pipeline = db.candidates.filter((c) => c.jobId === job.id);
  const ranked = screenAll(pipeline, job);
  ranked.forEach((r) => {
    const c = db.candidates.find((x) => x.id === r.candidate.id);
    if (c) c.screening = r.screening;
  });
  audit({ actor: 'AI Resume Screening Agent', actorRole: 'AI Agent', action: 'SCREENING_BATCH', entity: 'Job', entityId: job.id, detail: `Scored ${ranked.length} candidates for ${job.title}. Requested by ${user!.name}. No candidate advanced or rejected automatically.` });
  return NextResponse.json({ job, ranked });
}
