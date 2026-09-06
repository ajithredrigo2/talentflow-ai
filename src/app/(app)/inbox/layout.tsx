import { getSession } from '../session';

/** Server-side RBAC guard for this client-rendered route. */
export default async function Layout({ children }: { children: React.ReactNode }) {
  await getSession('/inbox');
  return <>{children}</>;
}
