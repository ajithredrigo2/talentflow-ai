import { NextRequest, NextResponse } from 'next/server';
import { authenticate, createSession, SESSION_COOKIE } from '@/lib/auth';
import { landingFor } from '@/lib/rbac';
import { audit } from '@/lib/store';
import { badRequest, rateLimit, sanitize } from '@/lib/api';

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'login');
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const email = sanitize(body.email, 120);
  const password = typeof body.password === 'string' ? body.password.slice(0, 200) : '';
  if (!email || !password) return badRequest('Email and password are required.');

  const user = authenticate(email, password);
  if (!user) {
    audit({ actor: email, actorRole: 'System', action: 'LOGIN_FAILED', entity: 'User', entityId: email, detail: 'Invalid demo credentials supplied.', severity: 'warning' });
    return NextResponse.json({ error: 'Invalid credentials. Use one of the demo accounts shown below.' }, { status: 401 });
  }

  audit({ actor: user.name, actorRole: user.role, action: 'LOGIN', entity: 'User', entityId: user.id, detail: `Signed in as ${user.role}.` });

  const res = NextResponse.json({ user: { id: user.id, name: user.name, role: user.role }, redirect: landingFor(user.role) });
  res.cookies.set(SESSION_COOKIE, createSession(user), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  return res;
}
