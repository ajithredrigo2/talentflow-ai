import { NextRequest, NextResponse } from 'next/server';
import { processIncomingEmail } from '@/lib/agents/intake';
import { sampleByKey, SAMPLE_APPLICATIONS } from '@/lib/email/samples';
import { db } from '@/lib/store';
import { badRequest, rateLimit, requireAuth, sanitize } from '@/lib/api';

export const maxDuration = 45;

/**
 * Demo mode. A simulated message is handed to the SAME processIncomingEmail()
 * pipeline that live mailbox messages use — there is no separate demo workflow.
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'simulate');
  if (limited) return limited;
  const { user, error } = requireAuth(req, ['HR_ADMIN', 'RECRUITER']);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const key = sanitize(body.key, 40);
  const sample = key ? sampleByKey(key) : SAMPLE_APPLICATIONS[db.emails.length % SAMPLE_APPLICATIONS.length];
  if (!sample) return badRequest('Unknown demonstration application.');

  const mailbox = db.mailboxes.find((m) => m.address === sample.mailbox) ?? db.mailboxes[0];

  const outcome = await processIncomingEmail(
    {
      ...sample.message,
      messageId: `${sample.message.messageId}-${Date.now().toString(36)}`,
      receivedAt: new Date().toISOString(),
    },
    {
      mailboxId: mailbox.id,
      mailboxAddress: mailbox.address,
      provider: 'demo',
      resumeText: sample.resumeText,
      simulated: true,
      actor: user!.name,
    },
  );

  return NextResponse.json({
    emailId: outcome.email.id,
    status: outcome.email.status,
    run: outcome.run,
    narrative: outcome.narrative,
  });
}
