import type { Candidate, Job, ScreeningResult, SkillLevel } from '../types';
import { SKILL_LEVEL_VALUE } from '../types';
import { skillByName, skillName } from '../seed';

export const EXCLUDED_ATTRIBUTES = [
  'Gender',
  'Race / ethnicity',
  'Religion',
  'Nationality',
  'Disability',
  'Marital status',
  'Age',
  'Photograph',
  'Name-derived inferences',
];

const levelOf = (c: Candidate, skillId: string): SkillLevel | null =>
  c.skills.find((s) => s.skillId === skillId)?.level ?? null;

const yearsOf = (c: Candidate, skillId: string): number => c.skills.find((s) => s.skillId === skillId)?.years ?? 0;

function skillCoverage(candidate: Candidate, names: string[]) {
  const matched: string[] = [];
  const missing: string[] = [];
  let points = 0;
  names.forEach((n) => {
    const skill = skillByName(n);
    const lvl = skill ? levelOf(candidate, skill.id) : null;
    if (lvl) {
      matched.push(n);
      points += SKILL_LEVEL_VALUE[lvl] / 4;
    } else {
      missing.push(n);
    }
  });
  return { matched, missing, ratio: names.length ? points / names.length : 1 };
}

const CLOUD_SKILLS = ['sk-aws', 'sk-azure', 'sk-gcp'];

/**
 * Deterministic, fully explainable candidate scoring.
 *
 * Only job-relevant evidence enters the calculation. Every dimension carries
 * its own weight (taken from the approved job description), a score, and the
 * evidence sentence shown to the HR user. The result is a recommendation — the
 * platform never rejects or advances a candidate without human approval.
 */
export function screenCandidate(candidate: Candidate, job: Job): ScreeningResult {
  const mandatory = skillCoverage(candidate, job.mandatorySkills);
  const preferred = skillCoverage(candidate, job.preferredSkills);

  // 1. Technical skills — mandatory weighted 80%, preferred 20%
  const technical = Math.round((mandatory.ratio * 0.8 + preferred.ratio * 0.2) * 100);

  // 2. Experience against the stated minimum
  const expRatio = Math.min(1.15, candidate.experienceYears / Math.max(1, job.minExperience));
  const experience = Math.round(Math.min(100, expRatio * 88 + (candidate.experienceYears >= job.minExperience ? 12 : 0)));

  // 3. Cloud / platform depth — deepest relevant cloud skill the role asks for
  const roleCloud = CLOUD_SKILLS.filter((id) =>
    [...job.mandatorySkills, ...job.preferredSkills].some((n) => skillByName(n)?.id === id),
  );
  const cloudPool = roleCloud.length ? roleCloud : CLOUD_SKILLS;
  const cloudBest = Math.max(0, ...cloudPool.map((id) => (levelOf(candidate, id) ? SKILL_LEVEL_VALUE[levelOf(candidate, id)!] : 0)));
  const cloudYears = Math.max(0, ...cloudPool.map((id) => yearsOf(candidate, id)));
  const cloudDepth = roleCloud.length
    ? Math.round(Math.min(100, (cloudBest / 4) * 78 + Math.min(22, cloudYears * 4)))
    : 0;

  // 4. Certifications relevant to the requested skill set
  const roleTerms = [...job.mandatorySkills, ...job.preferredSkills].map((s) => s.toLowerCase());
  const relevantCerts = candidate.certifications.filter((c) =>
    roleTerms.some((t) => c.toLowerCase().includes(t.split(' ')[0])) ||
    /kubernetes|aws|azure|terraform|cloud|security|cissp|pmp|acca|salesforce/i.test(c),
  );
  const certifications = Math.round(Math.min(100, relevantCerts.length * 42 + (candidate.education ? 16 : 0)));

  // 5. Location & availability (work-authorisation-neutral: distance + notice only)
  const sameCity = candidate.location.split(',')[0].trim() === job.location.split(',')[0].trim();
  const sameCountry = candidate.location.split(',').pop()?.trim() === job.location.split(',').pop()?.trim();
  const locationScore = sameCity ? 100 : sameCountry ? 80 : 45;
  const noticePenalty = candidate.noticePeriodDays > 60 ? 15 : candidate.noticePeriodDays > 30 ? 5 : 0;
  const locationAvailability = Math.max(0, locationScore - noticePenalty);

  const dimension = (criterion: string): number => {
    const found = job.evaluationCriteria.find((c) => c.criterion.toLowerCase().includes(criterion));
    return found ? found.weight : 0;
  };

  const raw = [
    {
      label: 'Technical skills',
      score: technical,
      weight: dimension('technical'),
      evidence: `${mandatory.matched.length}/${job.mandatorySkills.length} mandatory skills evidenced (${mandatory.matched.join(', ') || 'none'})${
        preferred.matched.length ? `; preferred: ${preferred.matched.join(', ')}` : ''
      }.`,
    },
    {
      label: 'Relevant experience',
      score: experience,
      weight: dimension('experience'),
      evidence: `${candidate.experienceYears} years against a stated minimum of ${job.minExperience}. Most recent role: ${candidate.currentTitle} at ${candidate.currentCompany}.`,
    },
    {
      label: 'Cloud platform depth',
      score: cloudDepth,
      weight: dimension('cloud'),
      evidence: roleCloud.length
        ? `Deepest relevant cloud skill: ${
            cloudPool
              .map((id) => ({ id, l: levelOf(candidate, id) }))
              .filter((x) => x.l)
              .map((x) => `${skillName(x.id)} — ${x.l} (${yearsOf(candidate, x.id)} yrs)`)
              .join(', ') || 'none evidenced'
          }.`
        : 'Not an evaluation dimension for this role.',
    },
    {
      label: 'Certifications',
      score: certifications,
      weight: dimension('certification'),
      evidence: relevantCerts.length
        ? `Role-relevant certifications: ${relevantCerts.join(', ')}.`
        : `No role-relevant certifications listed. Education: ${candidate.education}.`,
    },
    {
      label: 'Location & availability',
      score: locationAvailability,
      weight: dimension('location'),
      evidence: `${candidate.location} vs role location ${job.location}; notice period ${candidate.noticePeriodDays} days.`,
    },
  ];

  const breakdown = raw.filter((d) => d.weight > 0);
  const weightSum = breakdown.reduce((a, d) => a + d.weight, 0) || 1;
  const overall = Math.round(breakdown.reduce((a, d) => a + d.score * d.weight, 0) / weightSum);

  const strengths: string[] = [];
  if (mandatory.missing.length === 0) strengths.push(`Evidences every mandatory skill for the role (${job.mandatorySkills.join(', ')})`);
  if (candidate.experienceYears >= job.minExperience + 2)
    strengths.push(`${candidate.experienceYears} years of experience — ${candidate.experienceYears - job.minExperience} years above the minimum`);
  if (relevantCerts.length) strengths.push(`Holds ${relevantCerts.join(' and ')}`);
  if (sameCity) strengths.push(`Already based in ${candidate.location} — no relocation required`);
  const deepSkills = candidate.skills.filter((s) => s.level === 'Expert').map((s) => skillName(s.skillId));
  if (deepSkills.length) strengths.push(`Expert-level depth in ${deepSkills.slice(0, 3).join(', ')}`);
  if (!strengths.length) strengths.push('Meets part of the role profile; see breakdown for detail');

  const concerns: string[] = [];
  if (mandatory.missing.length) concerns.push(`No evidence of ${mandatory.missing.join(', ')} — a mandatory requirement`);
  if (candidate.experienceYears < job.minExperience)
    concerns.push(`${candidate.experienceYears} years against a ${job.minExperience}-year minimum`);
  if (candidate.noticePeriodDays > 60) concerns.push(`${candidate.noticePeriodDays}-day notice period may delay the start date`);
  if (!sameCountry) concerns.push('Based outside the role country — relocation and timing to confirm with the candidate');
  if (!relevantCerts.length && dimension('certification') > 0) concerns.push('No role-relevant certification listed');
  if (!concerns.length) concerns.push('No material gaps identified against the approved criteria');

  const weakest = [...candidate.skills].sort((a, b) => SKILL_LEVEL_VALUE[a.level] - SKILL_LEVEL_VALUE[b.level])[0];
  const interviewFocus: string[] = [];
  mandatory.missing.slice(0, 2).forEach((m) => interviewFocus.push(`Probe practical exposure to ${m} — not evidenced on the CV`));
  if (weakest) interviewFocus.push(`Validate depth in ${skillName(weakest.skillId)} (self-reported ${weakest.level})`);
  if (mandatory.matched.includes('Kubernetes'))
    interviewFocus.push('Production Kubernetes troubleshooting — failure modes, rollout strategy and recovery');
  if (candidate.experienceYears >= 6) interviewFocus.push('Scope of ownership and mentoring impact in the most recent role');
  interviewFocus.push('Motivation for the move and expectations for the first 90 days');

  const recommendation: ScreeningResult['recommendation'] =
    overall >= 80 && mandatory.missing.length === 0 ? 'Advance' : overall >= 65 ? 'Review' : 'Hold';

  const explanation = `Overall ${overall}% is the weighted sum of ${breakdown
    .map((d) => `${d.label} ${d.score}% × ${d.weight}%`)
    .join(', ')}, using the evaluation criteria approved on the ${job.title} requisition. Matched: ${
    mandatory.matched.join(', ') || 'none'
  }. Missing: ${mandatory.missing.join(', ') || 'none'}. Experience ${candidate.experienceYears} years against a ${
    job.minExperience
  }-year minimum. This is a recommendation for human review — no candidate is advanced or rejected automatically.`;

  return {
    overall,
    breakdown,
    matchedSkills: [...mandatory.matched, ...preferred.matched],
    missingSkills: [...mandatory.missing, ...preferred.missing],
    strengths,
    concerns,
    interviewFocus: interviewFocus.slice(0, 5),
    recommendation,
    explanation,
    generatedBy: 'AI Resume Screening Agent',
    generatedAt: new Date().toISOString(),
    attributesExcluded: EXCLUDED_ATTRIBUTES,
  };
}

export function screenAll(candidates: Candidate[], job: Job) {
  return candidates
    .map((c) => ({ candidate: c, screening: screenCandidate(c, job) }))
    .sort((a, b) => b.screening.overall - a.screening.overall);
}
