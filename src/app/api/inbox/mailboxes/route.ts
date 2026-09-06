import { NextRequest, NextResponse } from 'next/server';
import { audit, db } from '@/lib/store';
import { listConnections } from '@/lib/email/providers';
import { badRequest, requireAuth, sanitize } from '@/lib/api';

export async function GET(req: NextRequest) {
  const { error } = requireAuth(req);
  if (error) return error;
  return NextResponse.json({ mailboxes: db.mailboxes, connections: listConnections() });
}

/** HR administrators control acknowledgement dispatch and mailbox activation. */
export async function PATCH(req: NextRequest) {
  const { user, error } = requireAuth(req, ['HR_ADMIN']);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const mailbox = db.mailboxes.find((m) => m.id === sanitize(body.id, 40));
  if (!mailbox) return badRequest('Unknown mailbox.');

  if (typeof body.autoAcknowledge === 'boolean') mailbox.autoAcknowledge = body.autoAcknowledge;
  if (typeof body.enabled === 'boolean') mailbox.enabled = body.enabled;

  audit({
    actor: user!.name,
    actorRole: user!.role,
    action: 'MAILBOX_SETTINGS_CHANGED',
    entity: 'RecruitmentMailbox',
    entityId: mailbox.id,
    detail: `${user!.name} updated ${mailbox.address}: intake ${mailbox.enabled ? 'enabled' : 'disabled'}, automatic acknowledgement ${mailbox.autoAcknowledge ? 'on' : 'off'}.`,
  });
  return NextResponse.json({ mailbox });
}
