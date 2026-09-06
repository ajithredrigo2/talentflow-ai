import { NextRequest, NextResponse } from 'next/server';
import { buildInterviewQuestions } from '@/lib/agents/specialists';
import { screenCandidate } from '@/lib/agents/screening';
import { audit, db } from '@/lib/store';
import { badRequest, rateLimit, requireAuth, sanitize } from '@/lib/api';

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'questions');
  if (limited) return limited;
  const { user, error } = requireAuth(req, ['HR_ADMIN', 'RECRUITER', 'HIRING_MANAGER']);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const candidate = db.candidates.find((c) => c.id === sanitize(body.candidateId, 40));
  if (!candidate) return badRequest('Unknown candidate.');
  const job = db.jobs.find((j) => j.id === candidate.jobId)!;
  const screening = candidate.screening ?? screenCandidate(candidate, job);
  const questions = buildInterviewQuestions(candidate, job, screening.missingSkills.slice(0, 2));

  audit({ actor: 'AI Interview Intelligence Agent', actorRole: 'AI Agent', action: 'QUESTIONS_GENERATED', entity: 'Candidate', entityId: candidate.id, detail: `${questions.length} tailored interview questions generated for ${job.title}, requested by ${user!.name}.` });
  return NextResponse.json({ questions, candidate, job, screening });
}
