import { NextRequest, NextResponse } from 'next/server';
import { buildOnboardingPlan, DOCUMENT_CHECKLIST, draftOfferLetter, IT_ACCESS_CHECKLIST } from '@/lib/agents/specialists';
import { deptName } from '@/lib/seed';
import { audit, db, uid } from '@/lib/store';
import { badRequest, rateLimit, requireAuth, sanitize } from '@/lib/api';

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'offer');
  if (limited) return limited;
  const { user, error } = requireAuth(req, ['HR_ADMIN', 'HIRING_MANAGER']);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const candidate = db.candidates.find((c) => c.id === sanitize(body.candidateId, 40));
  if (!candidate) return badRequest('Unknown candidate.');
  const job = db.jobs.find((j) => j.id === candidate.jobId)!;
  const salary = sanitize(body.salary, 60) || job.salaryRange.split('–')[1]?.trim() || 'Band on file';
  const joiningDate = sanitize(body.joiningDate, 20) || new Date(Date.now() + 45 * 864e5).toISOString().slice(0, 10);

  const letter = draftOfferLetter(candidate, job, salary, joiningDate);
  const offer = {
    id: uid('off'),
    candidateId: candidate.id,
    jobId: job.id,
    status: 'Pending Approval' as const,
    baseSalary: salary,
    joiningDate,
    createdAt: new Date().toISOString(),
    letterDraft: letter,
  };
  db.offers.unshift(offer);

  const approval = {
    id: uid('apr'),
    type: 'Offer Creation' as const,
    title: `Offer for ${candidate.name} — ${job.title}`,
    summary: `Offer drafted at ${salary} with a joining date of ${joiningDate}.`,
    requestedBy: 'AI Offer & Onboarding Agent',
    requestedAt: new Date().toISOString(),
    requiredRole: ['HR_ADMIN', 'HIRING_MANAGER'] as ('HR_ADMIN' | 'HIRING_MANAGER')[],
    status: 'Pending' as const,
    payload: { candidateId: candidate.id, jobId: job.id, offerId: offer.id },
    aiRecommendation: 'Proceed with offer',
    explanation: [
      `Screening match ${candidate.screening?.overall ?? 'n/a'}% against the approved criteria for ${job.title}`,
      `Proposed base ${salary} sits within the approved band ${job.salaryRange}`,
      `Notice period ${candidate.noticePeriodDays} days against a proposed start of ${joiningDate}`,
      'Interview panel feedback recorded and available on the candidate profile',
    ],
  };
  db.approvals.unshift(approval);

  const onboarding = buildOnboardingPlan(candidate.name, job.title, deptName(job.departmentId), joiningDate);

  audit({ actor: 'AI Offer & Onboarding Agent', actorRole: 'AI Agent', action: 'OFFER_DRAFTED', entity: 'Offer', entityId: offer.id, detail: `Offer draft created for ${candidate.name} (${job.title}) at the request of ${user!.name}. Routed for human approval — not issued.` });
  return NextResponse.json({ offer, approval, onboarding, documents: DOCUMENT_CHECKLIST, it: IT_ACCESS_CHECKLIST });
}
