import { beforeEach, describe, expect, it } from 'vitest';
import { canAccess, navFor, NAV, landingFor } from '@/lib/rbac';
import { authenticate, createSession, readSession, DEMO_ACCOUNTS } from '@/lib/auth';
import { assessRetentionRisk, analyseEngagement, parseLeaveRequest, buildPerformanceSummary } from '@/lib/agents/specialists';
import { AGENTS } from '@/lib/agents/registry';
import { textToPdf } from '@/lib/pdf';
import { employees } from '@/lib/seed';
import { db, resetStore } from '@/lib/store';
import type { Role } from '@/lib/types';

beforeEach(() => resetStore());

/* ==================================================================== */
/* Role-based access control                                            */
/* ==================================================================== */

const ROLES: Role[] = ['HR_ADMIN', 'RECRUITER', 'HIRING_MANAGER', 'EMPLOYEE'];

describe('RBAC matrix', () => {
  it('keeps employees out of every recruitment and governance surface', () => {
    const forbidden = ['/dashboard', '/inbox', '/candidates', '/jobs', '/employees', '/audit', '/workforce', '/approvals', '/offers', '/command-center'];
    forbidden.forEach((route) => expect(canAccess('EMPLOYEE', route), `EMPLOYEE reached ${route}`).toBe(false));
  });

  it('gives employees their own self-service surfaces', () => {
    ['/assistant', '/leave', '/learning', '/performance', '/policies', '/settings'].forEach((route) =>
      expect(canAccess('EMPLOYEE', route), `EMPLOYEE blocked from ${route}`).toBe(true),
    );
  });

  it('restricts audit logs and offboarding to HR administrators', () => {
    ['/audit', '/offboarding'].forEach((route) => {
      expect(canAccess('HR_ADMIN', route)).toBe(true);
      expect(canAccess('RECRUITER', route)).toBe(false);
      expect(canAccess('HIRING_MANAGER', route)).toBe(false);
      expect(canAccess('EMPLOYEE', route)).toBe(false);
    });
  });

  it('keeps recruiters out of offer management', () => {
    expect(canAccess('RECRUITER', '/offers')).toBe(false);
    expect(canAccess('HR_ADMIN', '/offers')).toBe(true);
    expect(canAccess('HIRING_MANAGER', '/offers')).toBe(true);
  });

  it('keeps hiring managers out of job creation', () => {
    expect(canAccess('HIRING_MANAGER', '/jobs/new')).toBe(false);
    expect(canAccess('RECRUITER', '/jobs/new')).toBe(true);
  });

  it('applies the most specific rule when routes nest', () => {
    // /jobs is open to hiring managers, /jobs/new is not.
    expect(canAccess('HIRING_MANAGER', '/jobs')).toBe(true);
    expect(canAccess('HIRING_MANAGER', '/jobs/job-001')).toBe(true);
    expect(canAccess('HIRING_MANAGER', '/jobs/new')).toBe(false);
  });

  it('never shows a role a nav item it cannot open', () => {
    ROLES.forEach((role) =>
      navFor(role).forEach((item) =>
        expect(canAccess(role, item.href), `${role} sees ${item.href} but cannot access it`).toBe(true),
      ),
    );
  });

  it('lands each role somewhere it is allowed to be', () => {
    ROLES.forEach((role) => expect(canAccess(role, landingFor(role))).toBe(true));
  });

  it('declares a role list for every navigation entry', () => {
    NAV.forEach((n) => expect(n.roles.length, `${n.href} has no roles`).toBeGreaterThan(0));
  });
});

/* ==================================================================== */
/* Sessions                                                             */
/* ==================================================================== */

describe('session signing', () => {
  it('accepts every seeded demo account', () => {
    DEMO_ACCOUNTS.forEach((a) => {
      const user = authenticate(a.email, a.password);
      expect(user, `${a.email} failed to authenticate`).toBeTruthy();
      expect(user!.role).toBe(a.role);
    });
  });

  it('rejects a wrong password and an unknown address', () => {
    expect(authenticate('demo@talentflow.ai', 'wrong')).toBeNull();
    expect(authenticate('nobody@talentflow.ai', 'Demo@2026')).toBeNull();
  });

  it('round-trips a valid session', () => {
    const user = authenticate('demo@talentflow.ai', 'Demo@2026')!;
    expect(readSession(createSession(user))?.id).toBe(user.id);
  });

  it('rejects a tampered payload', () => {
    const user = authenticate('employee@talentflow.ai', 'Demo@2026')!;
    const token = createSession(user);
    const [payload, sig] = token.split('.');

    // forge an HR_ADMIN payload, keep the old signature
    const forged = Buffer.from(JSON.stringify({ id: 'usr-1', role: 'HR_ADMIN', iat: Date.now() })).toString('base64url');
    expect(readSession(`${forged}.${sig}`)).toBeNull();

    // flip a byte of the signature
    const flipped = sig.slice(0, -1) + (sig.at(-1) === 'A' ? 'B' : 'A');
    expect(readSession(`${payload}.${flipped}`)).toBeNull();
  });

  it('rejects malformed and empty tokens', () => {
    [undefined, '', 'garbage', 'a.b.c', '.'].forEach((t) => expect(readSession(t as string | undefined)).toBeNull());
  });

  it('rejects an expired session', () => {
    const stale = Buffer.from(JSON.stringify({ id: 'usr-1', role: 'HR_ADMIN', iat: Date.now() - 13 * 3600 * 1000 })).toString('base64url');
    // even correctly signed, a 13-hour-old session is past the 12-hour window
    const { createHmac } = require('crypto');
    const sig = createHmac('sha256', process.env.AUTH_SECRET || 'talentflow-prototype-dev-secret').update(stale).digest('base64url');
    expect(readSession(`${stale}.${sig}`)).toBeNull();
  });
});

/* ==================================================================== */
/* Responsible-AI guardrails                                            */
/* ==================================================================== */

describe('retention risk', () => {
  it('builds its score only from work-related indicators', () => {
    const risk = assessRetentionRisk(employees.find((e) => e.id === 'emp-004')!);
    const text = JSON.stringify(risk).toLowerCase();
    // Word-boundary matched: "age" must not appear as a word, but "engagement" is fine.
    ['gender', 'race', 'religion', 'nationality', 'marital', 'disability', 'age', 'ethnicity'].forEach((a) =>
      expect(new RegExp(`\\b${a}\\b`).test(text), `retention risk referenced "${a}"`).toBe(false),
    );
    // and the factors it does use are all work-related
    const allowed = /engagement|workload|tenure|training|learning|mobility|performance|attrition|progression|indicators/i;
    risk.factors.forEach((f) => expect(allowed.test(f.factor), `unexpected factor "${f.factor}"`).toBe(true));
  });

  it('never recommends an adverse employment action', () => {
    employees.slice(0, 20).forEach((e) => {
      const actions = assessRetentionRisk(e).supportiveActions.join(' ').toLowerCase();
      ['terminat', 'dismiss', 'demot', 'fire', 'let go', 'performance improvement plan'].forEach((word) =>
        expect(actions, `suggested "${word}" for ${e.name}`).not.toContain(word),
      );
    });
  });

  it('shows every contributing factor behind the score', () => {
    const risk = assessRetentionRisk(employees.find((e) => e.id === 'emp-004')!);
    expect(risk.factors.length).toBeGreaterThan(0);
    const declared = risk.factors.reduce((a, f) => a + f.impact, 0);
    expect(risk.score).toBe(Math.min(100, declared)); // score == sum of what it showed you
    risk.factors.forEach((f) => expect(f.detail.length).toBeGreaterThan(10));
  });

  it('always carries its guardrail statement', () => {
    expect(assessRetentionRisk(employees[0]).guardrail).toMatch(/never recommends termination/i);
  });
});

describe('engagement analysis', () => {
  it('suppresses segments too small to stay anonymous', () => {
    const eng = analyseEngagement();
    eng.themes.filter((t) => t.suppressed).forEach((t) => {
      expect(t.responses).toBeLessThan(5);
      expect(t.sample).toHaveLength(0); // no quotes leak from a suppressed segment
    });
  });

  it('uses no protected attribute as an analysis dimension', () => {
    const themes = analyseEngagement().themes.map((t) => t.theme.toLowerCase());
    ['gender', 'race', 'religion', 'nationality', 'age', 'disability'].forEach((a) =>
      expect(themes.join(' ')).not.toContain(a),
    );
  });
});

describe('performance packs', () => {
  it('marks the suggested rating as advisory', () => {
    const pack = buildPerformanceSummary(employees[0]);
    expect(pack.disclaimer).toMatch(/advisory/i);
    expect(pack.disclaimer).toMatch(/manager/i);
    expect(pack.evidence.length).toBeGreaterThan(0);
  });
});

/* ==================================================================== */
/* Leave parsing                                                        */
/* ==================================================================== */

describe('parseLeaveRequest', () => {
  const employee = employees.find((e) => e.id === 'emp-001')!;

  it('reads an explicit date range and excludes the weekend', () => {
    const r = parseLeaveRequest('Apply annual leave from 21 September to 25 September.', employee);
    expect(r.type).toBe('Annual');
    expect(r.from).toBe('2026-09-21');
    expect(r.to).toBe('2026-09-25');
    expect(r.days).toBe(4); // Fri 25 Sep is a weekend day in this organisation
  });

  it('distinguishes leave types', () => {
    expect(parseLeaveRequest('I need sick leave on 14 October', employee).type).toBe('Sick');
    expect(parseLeaveRequest('requesting parental leave from 1 November', employee).type).toBe('Parental');
    expect(parseLeaveRequest('unpaid leave from 3 December to 4 December', employee).type).toBe('Unpaid');
  });

  it('accepts ISO dates', () => {
    const r = parseLeaveRequest('leave from 2026-10-05 to 2026-10-07', employee);
    expect(r.from).toBe('2026-10-05');
    expect(r.to).toBe('2026-10-07');
  });

  it('flags a request that exceeds the balance instead of silently allowing it', () => {
    const r = parseLeaveRequest('annual leave from 1 October to 30 November', employee);
    expect(r.balanceAfter).toBeLessThan(0);
    expect(r.conflicts.join(' ')).toMatch(/exceeds/i);
  });

  it('routes to an approver and never self-approves', () => {
    const r = parseLeaveRequest('annual leave from 5 October to 6 October', employee);
    expect(r.approver).toBeTruthy();
    expect(r.approver.id).not.toBe(employee.id);
    expect(r.policy.title).toMatch(/Annual Leave/);
  });

  it('handles a single-day request', () => {
    const r = parseLeaveRequest('I need 14 October off', employee);
    expect(r.days).toBeGreaterThanOrEqual(1);
    expect(r.from).toBe(r.to);
  });
});

/* ==================================================================== */
/* Agent registry                                                       */
/* ==================================================================== */

describe('agent registry', () => {
  it('gives every agent a mission, capabilities, inputs, outputs and guardrails', () => {
    AGENTS.forEach((a) => {
      expect(a.mission.length, `${a.name} has a thin mission`).toBeGreaterThan(40);
      [a.capabilities, a.inputs, a.outputs, a.guardrails].forEach((list) =>
        expect(list.length, `${a.name} has an empty list`).toBeGreaterThan(0),
      );
    });
  });

  it('uses unique ids and short names', () => {
    expect(new Set(AGENTS.map((a) => a.id)).size).toBe(AGENTS.length);
    expect(new Set(AGENTS.map((a) => a.name)).size).toBe(AGENTS.length);
  });

  it('gates every agent that can influence an employment decision', () => {
    ['job-description', 'screening', 'interview-evaluation', 'offer-onboarding', 'leave', 'performance'].forEach((id) => {
      const agent = AGENTS.find((a) => a.id === id)!;
      expect(agent.requiresApproval, `${agent.name} is not approval-gated`).toBe(true);
    });
  });
});

/* ==================================================================== */
/* Store                                                                */
/* ==================================================================== */

describe('store', () => {
  it('actually restores the seeded dataset', () => {
    const seeded = db.candidates.length;
    db.candidates.push({ ...db.candidates[0], id: 'temp-1' });
    db.emails.push({} as never);
    expect(db.candidates.length).toBe(seeded + 1);

    resetStore();

    expect(db.candidates.length).toBe(seeded);
    expect(db.candidates.find((c) => c.id === 'temp-1')).toBeUndefined();
    expect(db.emails).toHaveLength(0);
  });

  it('seeds the dataset the submission claims', () => {
    expect(db.employees.length).toBe(50);
    expect(db.candidates.length).toBe(50);
    expect(db.jobs.length).toBe(10);
    expect(db.interviews.length).toBe(20);
    expect(db.leave.length).toBe(10);
    expect(db.mailboxes.length).toBe(3);
  });

  it('gives every job a unique requisition code', () => {
    const codes = db.jobs.map((j) => j.jobCode);
    expect(new Set(codes).size).toBe(codes.length);
    codes.forEach((c) => expect(c).toMatch(/^[A-Z]+-\d{4}-\d{3}$/));
  });
});

/* ==================================================================== */
/* PDF writer                                                           */
/* ==================================================================== */

describe('textToPdf', () => {
  it('emits a structurally valid PDF', () => {
    const pdf = textToPdf('JOHN DOE\nSenior DevOps Engineer\n\nEXPERIENCE\nSome content here.', 'CV.pdf');
    const head = pdf.subarray(0, 8).toString('latin1');
    expect(head).toMatch(/^%PDF-1\.\d/);
    expect(pdf.toString('latin1')).toContain('%%EOF');
    expect(pdf.toString('latin1')).toMatch(/\/Type \/Catalog/);
    expect(pdf.length).toBeGreaterThan(400);
  });

  it('paginates long documents', () => {
    const long = Array.from({ length: 200 }, (_, i) => `Line ${i} of the résumé body text.`).join('\n');
    const pdf = textToPdf(long).toString('latin1');
    const pages = (pdf.match(/\/Type \/Page[^s]/g) ?? []).length;
    expect(pages).toBeGreaterThan(1);
  });

  it('escapes characters that would corrupt the file', () => {
    const pdf = textToPdf('Name (nickname) \\ backslash').toString('latin1');
    expect(pdf).toContain('\\(nickname\\)');
    expect(pdf).toContain('%%EOF');
  });

  it('handles empty input without producing a broken file', () => {
    const pdf = textToPdf('').toString('latin1');
    expect(pdf).toMatch(/^%PDF/);
    expect(pdf).toContain('%%EOF');
  });
});
