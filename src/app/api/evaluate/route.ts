import { NextRequest, NextResponse } from 'next/server';
import { evaluateInterview } from '@/lib/agents/specialists';
import { llmJson, activeProvider } from '@/lib/ai';
import { audit, db } from '@/lib/store';
import { badRequest, rateLimit, requireAuth, sanitize } from '@/lib/api';

export const maxDuration = 45;

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'evaluate');
  if (limited) return limited;
  const { user, error } = requireAuth(req, ['HR_ADMIN', 'RECRUITER', 'HIRING_MANAGER']);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const interview = db.interviews.find((i) => i.id === sanitize(body.interviewId, 40));
  if (!interview) return badRequest('Unknown interview.');
  const candidate = db.candidates.find((c) => c.id === interview.candidateId)!;
  const job = db.jobs.find((j) => j.id === interview.jobId)!;

  const clamp = (n: unknown) => Math.min(10, Math.max(1, Math.round(Number(n) || 5)));
  const feedback = {
    ratings: {
      technical: clamp(body.technical),
      problemSolving: clamp(body.problemSolving),
      communication: clamp(body.communication),
      leadership: clamp(body.leadership),
    },
    notes: sanitize(body.notes, 3000),
    technicalFeedback: sanitize(body.technicalFeedback, 3000),
    behavioralFeedback: sanitize(body.behavioralFeedback, 3000),
    submittedBy: user!.name,
    submittedAt: new Date().toISOString(),
  };

  const det = evaluateInterview(feedback as never, candidate, job);
  let summary = det.summary;
  let engine: 'llm' | 'deterministic' = 'deterministic';

  if (activeProvider() !== 'deterministic') {
    const enriched = await llmJson<{ summary?: string }>(
      `Summarise this interview for a hiring manager in 70-110 words. Use only the evidence given. Do not invent facts, and do not reference any personal attribute.
Role: ${job.title} (${job.seniority}), role bar ${det.bar}/10.
Ratings: technical ${feedback.ratings.technical}, problem solving ${feedback.ratings.problemSolving}, communication ${feedback.ratings.communication}, leadership ${feedback.ratings.leadership}.
Interviewer notes: ${feedback.notes}
Technical feedback: ${feedback.technicalFeedback}
Behavioural feedback: ${feedback.behavioralFeedback}
Return JSON: {"summary": "..."}`,
      {},
      500,
    );
    if (enriched.engine === 'llm' && enriched.value.summary) {
      summary = enriched.value.summary;
      engine = 'llm';
    }
  }

  interview.feedback = { ...feedback, aiSummary: summary, recommendation: det.recommendation, reasoning: det.reasoning };
  interview.status = 'Completed';

  audit({ actor: 'AI Interview Evaluation Agent', actorRole: 'AI Agent', action: 'EVALUATION_SUMMARISED', entity: 'Interview', entityId: interview.id, detail: `Feedback from ${user!.name} summarised. Advisory recommendation: ${det.recommendation}. Final hiring decision remains with the hiring manager.` });
  return NextResponse.json({ interview, evaluation: { ...det, summary }, engine });
}
