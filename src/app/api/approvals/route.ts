import { NextRequest, NextResponse } from 'next/server';
import { audit, db } from '@/lib/store';
import { badRequest, rateLimit, requireAuth, sanitize } from '@/lib/api';

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;
  return NextResponse.json({ approvals: db.approvals.filter((a) => a.requiredRole.includes(user!.role)) });
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'approvals');
  if (limited) return limited;
  const { user, error } = requireAuth(req, ['HR_ADMIN', 'RECRUITER', 'HIRING_MANAGER']);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const approval = db.approvals.find((a) => a.id === sanitize(body.id, 40));
  if (!approval) return badRequest('Unknown approval request.');
  if (!approval.requiredRole.includes(user!.role))
    return NextResponse.json({ error: 'Your role is not an authorised approver for this decision.' }, { status: 403 });

  const decision = sanitize(body.decision, 30);
  const map: Record<string, typeof approval.status> = {
    approve: 'Approved',
    reject: 'Rejected',
    modify: 'Modified',
    info: 'Info Requested',
  };
  if (!map[decision]) return badRequest('Decision must be approve, reject, modify or info.');

  approval.status = map[decision];
  approval.decidedBy = user!.name;
  approval.decidedAt = new Date().toISOString();
  approval.note = sanitize(body.note, 500);

  // Downstream effects of a human decision
  if (approval.type === 'Offer Creation' && decision === 'approve') {
    const offer = db.offers.find((o) => o.id === (approval.payload as { offerId?: string }).offerId);
    if (offer) offer.status = 'Sent';
    const cand = db.candidates.find((c) => c.id === (approval.payload as { candidateId?: string }).candidateId);
    if (cand) cand.stage = 'Offered';
  }

  audit({
    actor: user!.name,
    actorRole: user!.role,
    action: `APPROVAL_${map[decision].toUpperCase().replace(' ', '_')}`,
    entity: 'ApprovalRequest',
    entityId: approval.id,
    detail: `${approval.type}: "${approval.title}" — ${map[decision]} by ${user!.name}.${approval.note ? ` Note: ${approval.note}` : ''}`,
    severity: decision === 'reject' ? 'warning' : 'info',
  });
  return NextResponse.json({ approval });
}
