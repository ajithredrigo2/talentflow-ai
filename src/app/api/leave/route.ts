import { NextRequest, NextResponse } from 'next/server';
import { parseLeaveRequest } from '@/lib/agents/specialists';
import { employees } from '@/lib/seed';
import { audit, db, notify, uid } from '@/lib/store';
import { badRequest, rateLimit, requireAuth, sanitize } from '@/lib/api';

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'leave');
  if (limited) return limited;
  const { user, error } = requireAuth(req);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const text = sanitize(body.text, 500);
  const employee = employees.find((e) => e.id === (user!.employeeId ?? 'emp-001'))!;
  if (!text) return badRequest('Describe the leave you would like to request.');

  const parsed = parseLeaveRequest(text, employee);
  if (body.confirm !== true) return NextResponse.json({ parsed, employee });

  const request = {
    id: uid('lv'),
    employeeId: employee.id,
    type: parsed.type,
    from: parsed.from,
    to: parsed.to,
    days: parsed.days,
    reason: sanitize(body.reason, 300) || 'Requested via HR AI Assistant',
    status: 'Pending' as const,
    approverId: parsed.approver.id,
    createdAt: new Date().toISOString(),
    conflicts: parsed.conflicts,
    balanceAfter: parsed.balanceAfter,
  };
  db.leave.unshift(request);
  notify({ title: 'Leave request awaiting approval', body: `${employee.name}: ${parsed.days} days ${parsed.type.toLowerCase()} leave from ${parsed.from}.`, forRole: ['HR_ADMIN', 'HIRING_MANAGER'], kind: 'approval' });
  audit({ actor: 'AI Leave Management Agent', actorRole: 'AI Agent', action: 'LEAVE_REQUEST_CREATED', entity: 'LeaveRequest', entityId: request.id, detail: `${employee.name} — ${parsed.days} days ${parsed.type} leave routed to ${parsed.approver.name} for approval. Agent does not self-approve.` });
  return NextResponse.json({ request, parsed });
}

export async function PATCH(req: NextRequest) {
  const { user, error } = requireAuth(req, ['HR_ADMIN', 'HIRING_MANAGER']);
  if (error) return error;
  const body = await req.json().catch(() => ({}));
  const request = db.leave.find((l) => l.id === sanitize(body.id, 40));
  if (!request) return badRequest('Unknown leave request.');
  const decision = sanitize(body.decision, 20);
  if (!['Approved', 'Rejected'].includes(decision)) return badRequest('Decision must be Approved or Rejected.');
  request.status = decision as 'Approved' | 'Rejected';
  audit({ actor: user!.name, actorRole: user!.role, action: `LEAVE_${decision.toUpperCase()}`, entity: 'LeaveRequest', entityId: request.id, detail: `${decision} by ${user!.name}.` });
  return NextResponse.json({ request });
}
