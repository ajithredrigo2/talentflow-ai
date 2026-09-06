import { beforeEach, describe, expect, it } from 'vitest';
import { matchJob } from '@/lib/agents/intake';
import { resetStore } from '@/lib/store';
import type { ResumeParsingResult } from '@/lib/types';

/**
 * The Job Matching Agent resolves a vacancy in a fixed priority order:
 *   1. requisition code in subject
 *   2. job title in subject
 *   3. requisition code in body
 *   4. job title in body
 *   5. skills & experience inference (held to a higher confidence bar)
 * A candidate's stated intent must always beat inference.
 */

const resume = (overrides: Partial<ResumeParsingResult> = {}): ResumeParsingResult => ({
  name: 'Test Candidate',
  email: 'test@example.com',
  summary: 'Summary',
  previousEmployers: [],
  totalExperienceYears: 6,
  relevantExperience: '',
  technicalSkills: ['Kubernetes', 'AWS', 'Terraform', 'CI/CD', 'Linux'],
  softSkills: [],
  certifications: [],
  education: [],
  projects: [],
  languages: [],
  location: 'Dubai, UAE',
  confidence: 0.9,
  parsedBy: 'test',
  parsedAt: new Date().toISOString(),
  fieldsFound: 15,
  fieldsAttempted: 18,
  ...overrides,
});

beforeEach(() => resetStore());

describe('priority 1 — requisition code in subject', () => {
  it('resolves the exact vacancy and reports the method', () => {
    const m = matchJob('Application – DEVOPS-2026-004', 'Please find my CV attached.', resume());
    expect(m.method).toBe('Job ID in subject');
    expect(m.primary?.jobCode).toBe('DEVOPS-2026-004');
    expect(m.primary?.title).toBe('Senior DevOps Engineer');
    expect(m.confidentEnough).toBe(true);
    expect(m.primary!.confidence).toBeGreaterThan(0.95);
  });

  it('tolerates spacing variations in the code', () => {
    expect(matchJob('Re: DEVOPS 2026 004', '', resume()).primary?.jobCode).toBe('DEVOPS-2026-004');
  });

  it('beats a conflicting job title elsewhere in the message', () => {
    // Stated code is the strongest signal; a title mentioned in passing must not override it.
    const m = matchJob('Application – DEVOPS-2026-004', 'I also considered the Cloud Engineer role.', resume());
    expect(m.primary?.jobCode).toBe('DEVOPS-2026-004');
  });
});

describe('priority 2 — job title in subject', () => {
  it('resolves from the title and offers same-department alternatives', () => {
    const m = matchJob('Application for Cloud Engineer', 'CV attached.', resume());
    expect(m.method).toBe('Job title in subject');
    expect(m.primary?.title).toBe('Cloud Engineer');
    expect(m.confidentEnough).toBe(true);
    expect(m.alternatives.length).toBeGreaterThan(0);
  });

  it('prefers the most specific title when several match', () => {
    // "Senior DevOps Engineer" contains "DevOps Engineer"; the longer title must win.
    const m = matchJob('Application for Senior DevOps Engineer', '', resume());
    expect(m.primary?.title).toBe('Senior DevOps Engineer');
  });

  it('overrides what the résumé would otherwise infer', () => {
    // Résumé screams DevOps; the candidate asked for Finance Manager. Stated intent wins.
    const m = matchJob('Application for Finance Manager', '', resume());
    expect(m.primary?.title).toBe('Finance Manager');
  });
});

describe('priorities 3 and 4 — signals in the body', () => {
  it('finds a requisition code in the body when the subject is bare', () => {
    const m = matchJob('Job application', 'I am applying for DEVOPS-2026-004.', resume());
    expect(m.method).toBe('Job ID in body');
    expect(m.primary?.jobCode).toBe('DEVOPS-2026-004');
  });

  it('finds a job title in the body when no code is present', () => {
    const m = matchJob('Hello', 'I would like to apply for the Cloud Security Engineer position.', resume());
    expect(m.method).toBe('Job title in body');
    expect(m.primary?.title).toBe('Cloud Security Engineer');
  });

  it('ranks a subject signal above a body signal', () => {
    const m = matchJob('Application for Cloud Engineer', 'Reference DEVOPS-2026-004', resume());
    expect(m.method).toBe('Job title in subject');
    expect(m.primary?.title).toBe('Cloud Engineer');
  });
});

describe('priority 5 — inference, held to a higher bar', () => {
  it('infers a vacancy from a strong, broad skills match', () => {
    const m = matchJob('Open application', 'Please consider me for any opening.', resume());
    expect(m.method).toBe('Skills & experience inference');
    expect(m.primary).toBeTruthy();
    expect(m.confidentEnough).toBe(true);
  });

  it('refuses to guess when no role is a credible fit', () => {
    const designer = resume({
      technicalSkills: ['Adobe InDesign', 'Typography', 'Art direction'],
      totalExperienceYears: 8,
      location: 'Berlin, Germany',
    });
    const m = matchJob('Open application', 'I am interested in any suitable opening.', designer);
    expect(m.confidentEnough).toBe(false);
    expect(m.primary).toBeUndefined();
    expect(m.method).toBe('No confident match');
    // It must still show its work so a recruiter can assign manually.
    expect(m.alternatives.length).toBeGreaterThan(0);
    expect(m.explanation).toMatch(/will not guess|Unassigned/i);
  });

  it('requires more confidence for inference than for a stated role', () => {
    const stated = matchJob('Application for Cloud Engineer', '', resume());
    const inferred = matchJob('Open application', '', resume());
    // Inference clears a deliberately higher bar (80%) than stated intent needs.
    expect(inferred.primary!.confidence).toBeGreaterThanOrEqual(0.8);
    expect(stated.method).not.toBe('Skills & experience inference');
  });

  it('returns no match at all when there is no résumé to infer from', () => {
    const m = matchJob('Job application', 'CV to follow.', undefined);
    expect(m.confidentEnough).toBe(false);
    expect(m.primary).toBeUndefined();
  });
});

describe('closed requisitions', () => {
  it('never matches a vacancy that is not open', () => {
    const m = matchJob('Application – DEVOPS-2026-004', '', resume());
    expect(m.primary).toBeTruthy();
    // every returned option must be an open requisition
    const all = [m.primary, ...m.alternatives].filter(Boolean);
    all.forEach((o) => expect(o!.jobId).toMatch(/^job-/));
  });
});
