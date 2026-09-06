import { NextRequest, NextResponse } from 'next/server';
import { readSession, SESSION_COOKIE } from './auth';
import type { Role, User } from './types';

/* --------------------------- rate limiting ---------------------------- */
const buckets = new Map<string, { count: number; reset: number }>();
const LIMIT = Number(process.env.RATE_LIMIT_PER_MINUTE || 60);

export function rateLimit(req: NextRequest, key = 'default') {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const id = `${key}:${ip}`;
  const now = Date.now();
  const bucket = buckets.get(id);
  if (!bucket || now > bucket.reset) {
    buckets.set(id, { count: 1, reset: now + 60_000 });
    return null;
  }
  bucket.count++;
  if (bucket.count > LIMIT) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again shortly.' }, { status: 429 });
  }
  return null;
}

/* ------------------------------- auth --------------------------------- */
export function currentUser(req: NextRequest): User | null {
  return readSession(req.cookies.get(SESSION_COOKIE)?.value);
}

export function requireAuth(req: NextRequest, roles?: Role[]) {
  const user = currentUser(req);
  if (!user) return { user: null, error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  if (roles && !roles.includes(user.role))
    return { user, error: NextResponse.json({ error: 'Insufficient permissions for this action' }, { status: 403 }) };
  return { user, error: null as NextResponse | null };
}

/* -------------------------- input validation --------------------------- */
export function sanitize(value: unknown, maxLen = 2000): string {
  if (typeof value !== 'string') return '';
  // strip control characters, cap length, trim
  return value.replace(/[\u0000-\u001F\u007F]/g, ' ').slice(0, maxLen).trim();
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
