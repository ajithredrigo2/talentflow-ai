import { describe, expect, it } from 'vitest';
import { EXCLUDED_ATTRIBUTES, screenAll, screenCandidate } from '@/lib/agents/screening';
import { jobs, skillByName } from '@/lib/seed';
import type { Candidate, Job, SkillLevel } from '@/lib/types';

const devopsJob = jobs.find((j) => j.id === 'job-001')!;

function candidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    id: 'test-1',
    name: 'Test Candidate',
    email: 'test@example.com',
    phone: '+971 5X XXX 0000',
    jobId: devopsJob.id,
    stage: 'Applied',
    appliedAt: '2026-09-01',
    experienceYears: 6,
    currentTitle: 'DevOps Engineer',
    currentCompany: 'Example Co',
    location: 'Dubai, UAE',
    noticePeriodDays: 30,
    expectedSalary: 'AED 30,000 / month',
    education: "Bachelor's in Computer Science",
    certifications: [],
    skills: [],
    resumeSummary: 'Summary',
    source: 'Careers Page',
    consentGiven: true,
    ...overrides,
  };
}

const skill = (name: string, level: SkillLevel, years = 5) => ({
  skillId: skillByName(name)!.id,
  level,
  years,
});

/** A candidate evidencing every mandatory skill for the DevOps role. */
const fullyQualified = () =>
  candidate({
    skills: devopsJob.mandatorySkills.map((n) => skill(n, 'Expert', 6)),
    certifications: ['CKA – Certified Kubernetes Administrator', 'AWS Solutions Architect – Professional'],
  });

describe('screenCandidate — scoring contract', () => {
  it('uses only the evaluation criteria approved on the requisition', () => {
    const result = screenCandidate(fullyQualified(), devopsJob);
    const scored = result.breakdown.map((b) => b.label).sort();
    const approved = devopsJob.evaluationCriteria.map((c) => c.criterion).sort();

    // Every scored dimension must trace back to an approved criterion, and vice versa.
    expect(scored.length).toBe(approved.length);
    result.breakdown.forEach((b) => {
      const match = devopsJob.evaluationCriteria.find((c) =>
        c.criterion.toLowerCase().includes(b.label.toLowerCase().split(' ')[0]),
      );
      expect(match, `dimension "${b.label}" has no approved criterion`).toBeTruthy();
      expect(b.weight).toBe(match!.weight);
    });
  });

  it('computes the overall score as the weighted sum of its dimensions', () => {
    const result = screenCandidate(fullyQualified(), devopsJob);
    const weightSum = result.breakdown.reduce((a, d) => a + d.weight, 0);
    const expected = Math.round(result.breakdown.reduce((a, d) => a + d.score * d.weight, 0) / weightSum);
    expect(result.overall).toBe(expected);
  });

  it('scores a fully qualified candidate above a partially qualified one', () => {
    const strong = screenCandidate(fullyQualified(), devopsJob);
    const weak = screenCandidate(
      candidate({ skills: [skill('Linux', 'Beginner', 1)], experienceYears: 1 }),
      devopsJob,
    );
    expect(strong.overall).toBeGreaterThan(weak.overall);
  });

  it('never returns a score without an explanation and per-dimension evidence', () => {
    const result = screenCandidate(fullyQualified(), devopsJob);
    expect(result.explanation.length).toBeGreaterThan(80);
    result.breakdown.forEach((b) => {
      expect(b.evidence, `dimension "${b.label}" has no evidence`).toBeTruthy();
      expect(b.evidence.length).toBeGreaterThan(10);
    });
  });

  it('reports missing mandatory skills rather than silently ignoring them', () => {
    const result = screenCandidate(
      candidate({ skills: [skill('AWS', 'Advanced'), skill('Linux', 'Advanced')] }),
      devopsJob,
    );
    expect(result.missingSkills).toContain('Kubernetes');
    expect(result.missingSkills).toContain('Terraform');
    expect(result.concerns.join(' ')).toMatch(/Kubernetes|mandatory/i);
  });
});

describe('screenCandidate — responsible AI guarantees', () => {
  it('publishes the excluded-attribute list with every result', () => {
    const result = screenCandidate(fullyQualified(), devopsJob);
    expect(result.attributesExcluded).toEqual(EXCLUDED_ATTRIBUTES);
    ['Gender', 'Race / ethnicity', 'Religion', 'Nationality', 'Disability', 'Marital status', 'Age'].forEach((a) =>
      expect(result.attributesExcluded).toContain(a),
    );
  });

  it('never emits a recommendation that rejects a candidate', () => {
    // The agent may say Advance / Review / Hold. "Reject" is not in its vocabulary.
    const spread = [
      fullyQualified(),
      candidate({ skills: [skill('Linux', 'Beginner', 1)], experienceYears: 0, location: 'Berlin, Germany' }),
      candidate({ skills: [], experienceYears: 1 }),
    ];
    spread.forEach((c) => {
      const r = screenCandidate(c, devopsJob);
      expect(['Advance', 'Review', 'Hold']).toContain(r.recommendation);
      expect(r.recommendation).not.toBe('Reject');
    });
  });

  it('produces an identical score for two candidates differing only by name', () => {
    // Guards against name-derived inference creeping into the scoring path.
    const base = fullyQualified();
    const a = screenCandidate({ ...base, name: 'Aisha Al Mansoori', email: 'a@example.com' }, devopsJob);
    const b = screenCandidate({ ...base, name: 'John Smith', email: 'b@example.com' }, devopsJob);
    expect(a.overall).toBe(b.overall);
    expect(a.breakdown.map((x) => x.score)).toEqual(b.breakdown.map((x) => x.score));
  });

  it('does not let location scoring depend on anything but distance and notice period', () => {
    const inCity = screenCandidate(candidate({ ...fullyQualified(), location: 'Dubai, UAE' }), devopsJob);
    const abroad = screenCandidate(candidate({ ...fullyQualified(), location: 'Prague, Czechia' }), devopsJob);
    const loc = (r: typeof inCity) => r.breakdown.find((b) => b.label === 'Location & availability')!.score;
    expect(loc(inCity)).toBeGreaterThan(loc(abroad));
    expect(loc(abroad)).toBeGreaterThan(0); // being abroad is a penalty, never a disqualification
  });
});

describe('screenAll', () => {
  it('ranks candidates by descending overall score', () => {
    const ranked = screenAll(
      [
        candidate({ id: 'weak', skills: [skill('Linux', 'Beginner', 1)], experienceYears: 1 }),
        fullyQualified(),
        candidate({ id: 'mid', skills: [skill('AWS', 'Advanced'), skill('Kubernetes', 'Intermediate')] }),
      ],
      devopsJob,
    );
    const scores = ranked.map((r) => r.screening.overall);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it('scores every candidate handed to it', () => {
    const pool = [candidate({ id: 'a' }), candidate({ id: 'b' }), candidate({ id: 'c' })];
    expect(screenAll(pool, devopsJob)).toHaveLength(3);
  });
});

describe('score stability across requisitions', () => {
  it('scores the same person differently against different approved criteria', () => {
    const financeJob = jobs.find((j) => j.id === 'job-006') as Job;
    const engineer = fullyQualified();
    const asDevops = screenCandidate(engineer, devopsJob);
    const asFinance = screenCandidate({ ...engineer, jobId: financeJob.id }, financeJob);
    expect(asDevops.overall).toBeGreaterThan(asFinance.overall);
  });
});
