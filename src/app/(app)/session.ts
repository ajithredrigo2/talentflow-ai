import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { readSession, SESSION_COOKIE } from '@/lib/auth';
import { canAccess } from '@/lib/rbac';
import type { User } from '@/lib/types';

/** Server-side session + RBAC guard used by every protected page. */
export async function getSession(pathname?: string): Promise<User> {
  const store = await cookies();
  const user = readSession(store.get(SESSION_COOKIE)?.value);
  if (!user) redirect('/login');
  if (pathname && !canAccess(user.role, pathname)) redirect('/denied');
  return user;
}
