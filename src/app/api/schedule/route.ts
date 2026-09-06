import { NextRequest, NextResponse } from 'next/server';
import { suggestSlots } from '@/lib/agents/specialists';
import { audit, db, uid } from '@/lib/store';
import { employees } from '@/lib/seed';
import { badRequest, rateLimit, requireAuth, sanitize } from '@/lib/api';

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'schedule');
  if (limited) return limited;
  const { user, error } = requireAuth(req, ['HR_ADMIN', 'RECRUITER', 'HIRING_MANAGER']);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const interviewerId = sanitize(body.interviewerId, 40);
  const candidateId = sanitize(body.candidateId, 40);
  const slot = sanitize(body.slot, 40);
  const interviewer = employees.find((e) => e.id === interviewerId);
  const candidate = db.candidates.find((c) => c.id === candidateId);
  if (!interviewer || !candidate) return badRequest('Unknown candidate or interviewer.');

  if (!slot) {
    return NextResponse.json({ slots: suggestSlots(interviewerId) });
  }

  const interview = {
    id: uid('int'),
    candidateId,
    jobId: candidate.jobId,
    interviewerId,
    round: sanitize(body.round, 60) || 'Technical Screen',
    scheduledAt: slot,
    durationMins: Number(body.durationMins) || 60,
    mode: (sanitize(body.mode, 30) || 'Google Meet') as 'Google Meet' | 'Microsoft Teams' | 'Onsite' | 'Phone',
    status: 'Scheduled' as const,
  };
  db.interviews.unshift(interview);
  if (candidate.stage === 'Shortlisted' || candidate.stage === 'Screened') candidate.stage = 'Interviewing';

  audit({ actor: 'AI Interview Scheduling Agent', actorRole: 'AI Agent', action: 'INTERVIEW_SCHEDULED', entity: 'Interview', entityId: interview.id, detail: `${candidate.name} booked with ${interviewer.name} at ${slot} (${interview.mode}). Confirmed by ${user!.name}. Calendar invitation simulated in prototype.` });
  return NextResponse.json({ interview, simulated: true });
}
