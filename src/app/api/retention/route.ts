import { NextRequest, NextResponse } from 'next/server';
import { assessRetentionRisk } from '@/lib/agents/specialists';
import { employees } from '@/lib/seed';
import { audit } from '@/lib/store';
import { rateLimit, requireAuth } from '@/lib/api';

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, 'retention');
  if (limited) return limited;
  const { user, error } = requireAuth(req, ['HR_ADMIN', 'HIRING_MANAGER']);
  if (error) return error;

  const assessed = employees
    .filter((e) => e.status === 'Active')
    .map((e) => ({ employee: { id: e.id, name: e.name, title: e.title, departmentId: e.departmentId }, risk: assessRetentionRisk(e) }))
    .sort((a, b) => b.risk.score - a.risk.score);

  audit({ actor: 'AI Retention Risk Agent', actorRole: 'AI Agent', action: 'RISK_BATCH', entity: 'Workforce', entityId: 'all-active', detail: `Retention indicators assessed for ${assessed.length} active employees at the request of ${user!.name}. Explainable factors only; no adverse action recommended.`, severity: 'warning' });
  return NextResponse.json({ assessed });
}
