import { NextRequest, NextResponse } from 'next/server';
import { buildJobDescription } from '@/lib/agents/specialists';
import { llmJson, activeProvider } from '@/lib/ai';
import { audit, db, uid } from '@/lib/store';
import { badRequest, rateLimit, requireAuth, sanitize } from '@/lib/api';
import type { Job } from '@/lib/types';

export const maxDuration = 45;

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'jd');
  if (limited) return limited;
  const { user, error } = requireAuth(req, ['HR_ADMIN', 'RECRUITER']);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const title = sanitize(body.title, 100);
  if (!title) return badRequest('A role title is required.');

  const input = {
    title,
    location: sanitize(body.location, 80) || 'Dubai, UAE',
    department: sanitize(body.department, 60) || 'Engineering',
    seniority: sanitize(body.seniority, 30) || 'Mid',
    skills: Array.isArray(body.skills) ? body.skills.map((s: unknown) => sanitize(s, 50)).filter(Boolean).slice(0, 12) : [],
    minExperience: Math.min(30, Math.max(0, Number(body.minExperience) || 3)),
    employmentType: sanitize(body.employmentType, 30) || 'Full-time',
    openings: Math.min(20, Math.max(1, Number(body.openings) || 1)),
  };
  if (!input.skills.length) return badRequest('At least one required skill is needed.');

  const deterministic = buildJobDescription(input);
  let result = deterministic;
  let engine: 'llm' | 'deterministic' = 'deterministic';

  if (activeProvider() !== 'deterministic') {
    const enriched = await llmJson<{ summary?: string; responsibilities?: string[] }>(
      `Draft the role summary and responsibilities for this job description.
Role: ${input.title} (${input.seniority}) in ${input.department}, ${input.location}.
Required skills: ${input.skills.join(', ')}. Minimum experience: ${input.minExperience} years.
Write inclusive, outcome-focused language. No gender-coded or age-coded wording. No personal-attribute requirements.
Return JSON: {"summary": "3-4 sentences", "responsibilities": ["6 bullet points"]}`,
      {},
      900,
    );
    if (enriched.engine === 'llm' && enriched.value.summary) {
      result = {
        ...deterministic,
        summary: enriched.value.summary,
        responsibilities: enriched.value.responsibilities?.length ? enriched.value.responsibilities.slice(0, 8) : deterministic.responsibilities,
      };
      engine = 'llm';
    }
  }

  audit({ actor: 'AI Job Description Agent', actorRole: 'AI Agent', action: 'JD_GENERATED', entity: 'Job', entityId: 'draft', detail: `Draft generated for "${title}" by request of ${user!.name}. Awaiting human approval before publication.` });
  return NextResponse.json({ jd: result, engine });
}

/** Publish an approved job description — requires an explicit human approver. */
export async function PUT(req: NextRequest) {
  const { user, error } = requireAuth(req, ['HR_ADMIN', 'RECRUITER']);
  if (error) return error;
  const body = await req.json().catch(() => ({}));
  const jd = body.jd;
  if (!jd?.title) return badRequest('Nothing to publish.');

  const job: Job = {
    id: uid('job'),
    title: sanitize(jd.title, 100),
    departmentId: db.jobs.find((j) => j.id)?.departmentId ?? 'dep-eng',
    location: sanitize(jd.location, 80),
    seniority: sanitize(jd.seniority, 30),
    employmentType: sanitize(jd.employmentType, 30) || 'Full-time',
    status: 'Open',
    openings: Number(jd.openings) || 1,
    postedAt: new Date().toISOString().slice(0, 10),
    hiringManagerId: 'emp-003',
    recruiterId: 'emp-008',
    minExperience: Number(jd.minExperience) || 3,
    salaryRange: sanitize(jd.salaryRange, 60) || 'Band on file',
    summary: sanitize(jd.summary, 1500),
    responsibilities: (jd.responsibilities ?? []).map((r: unknown) => sanitize(r, 300)),
    mandatorySkills: (jd.mandatorySkills ?? []).map((r: unknown) => sanitize(r, 60)),
    preferredSkills: (jd.preferredSkills ?? []).map((r: unknown) => sanitize(r, 60)),
    education: sanitize(jd.education, 300),
    evaluationCriteria: jd.evaluationCriteria ?? [],
    priority: 'High',
    createdBy: 'AI Job Description Agent',
    approvedBy: user!.name,
  };
  db.jobs.unshift(job);
  audit({ actor: user!.name, actorRole: user!.role, action: 'JOB_PUBLISHED', entity: 'Job', entityId: job.id, detail: `Approved and published "${job.title}". AI-drafted, human-approved.` });
  return NextResponse.json({ job });
}
