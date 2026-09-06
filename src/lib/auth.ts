import { createHmac, timingSafeEqual } from 'crypto';
import type { Role, User } from './types';
import { users } from './seed';

/**
 * Prototype authentication.
 *
 * Demo accounts are seeded, non-personal and clearly labelled. The session is a
 * signed, HttpOnly cookie — the same shape a production deployment would use
 * with Auth0 / Supabase Auth / Firebase Auth behind it. The signing secret is
 * read from the environment and never committed.
 */
export const SESSION_COOKIE = 'tf_session';
const secret = () => process.env.AUTH_SECRET || 'talentflow-prototype-dev-secret';

export const DEMO_ACCOUNTS: { email: string; password: string; role: Role; label: string; description: string }[] = [
  { email: 'demo@talentflow.ai', password: 'Demo@2026', role: 'HR_ADMIN', label: 'HR Administrator', description: 'Full platform access: recruitment, employees, agents, analytics, audit.' },
  { email: 'recruiter@talentflow.ai', password: 'Demo@2026', role: 'RECRUITER', label: 'Recruiter', description: 'Jobs, candidates, screening, interviews and recruitment agents.' },
  { email: 'manager@talentflow.ai', password: 'Demo@2026', role: 'HIRING_MANAGER', label: 'Hiring Manager', description: 'Assigned requisitions, shortlists, evaluations and hiring approvals.' },
  { email: 'employee@talentflow.ai', password: 'Demo@2026', role: 'EMPLOYEE', label: 'Employee', description: 'HR AI assistant, leave, profile, learning and performance goals.' },
];

export function sign(value: string) {
  return createHmac('sha256', secret()).update(value).digest('base64url');
}

export function createSession(user: User) {
  const payload = Buffer.from(JSON.stringify({ id: user.id, role: user.role, iat: Date.now() })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function readSession(token: string | undefined): User | null {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = sign(payload);
  try {
    if (sig.length !== expected.length) return null;
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (Date.now() - data.iat > 1000 * 60 * 60 * 12) return null; // 12h expiry
    return users.find((u) => u.id === data.id) ?? null;
  } catch {
    return null;
  }
}

export function authenticate(email: string, password: string): User | null {
  const account = DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
  if (!account || account.password !== password) return null;
  return users.find((u) => u.email === account.email) ?? null;
}

export const ROLE_LABEL: Record<Role, string> = {
  HR_ADMIN: 'HR Administrator',
  RECRUITER: 'Recruiter',
  HIRING_MANAGER: 'Hiring Manager',
  EMPLOYEE: 'Employee',
};
