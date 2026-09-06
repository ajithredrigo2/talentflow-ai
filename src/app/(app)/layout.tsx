import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Shell from '@/components/Shell';
import { readSession, SESSION_COOKIE } from '@/lib/auth';
import { db } from '@/lib/store';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const user = readSession(store.get(SESSION_COOKIE)?.value);
  if (!user) redirect('/login');

  const pending = db.approvals.filter((a) => a.status === 'Pending' && a.requiredRole.includes(user.role)).length;

  return (
    <Shell role={user.role} name={user.name} avatarColor={user.avatarColor} pendingApprovals={pending}>
      {children}
    </Shell>
  );
}
