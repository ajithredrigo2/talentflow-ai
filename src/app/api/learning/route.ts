import { NextRequest, NextResponse } from 'next/server';
import { analyseSkillGaps, rankInternalCandidates } from '@/lib/agents/specialists';
import { employees } from '@/lib/seed';
import { audit } from '@/lib/store';
import { badRequest, rateLimit, requireAuth, sanitize } from '@/lib/api';

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'learning');
  if (limited) return limited;
  const { user, error } = requireAuth(req);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const targetRole = sanitize(body.targetRole, 80) || 'Senior Cloud Engineer';

  if (body.mode === 'internal-candidates') {
    if (!['HR_ADMIN', 'HIRING_MANAGER'].includes(user!.role))
      return NextResponse.json({ error: 'Insufficient permissions for this action' }, { status: 403 });
    const ranked = rankInternalCandidates(targetRole, Number(body.limit) || 5);
    audit({ actor: 'AI Learning & Skills Agent', actorRole: 'AI Agent', action: 'INTERNAL_MATCH', entity: 'Role', entityId: targetRole, detail: `Ranked ${ranked.length} internal employees against ${targetRole} for ${user!.name}. No promotion decision taken automatically.` });
    return NextResponse.json({ ranked, targetRole });
  }

  const requestedId = sanitize(body.employeeId, 40);
  const isSelf = !requestedId || requestedId === user!.employeeId;
  if (!isSelf && user!.role === 'EMPLOYEE')
    return NextResponse.json({ error: 'Employees may only view their own learning plan.' }, { status: 403 });

  const employee = employees.find((e) => e.id === (requestedId || user!.employeeId || 'emp-001'));
  if (!employee) return badRequest('Unknown employee.');
  const analysis = analyseSkillGaps(employee, targetRole);
  return NextResponse.json({ employee, analysis });
}
