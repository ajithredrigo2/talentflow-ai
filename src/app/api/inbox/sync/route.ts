import { NextRequest, NextResponse } from 'next/server';
import { processIncomingEmail } from '@/lib/agents/intake';
import { fetchNewMessages, listConnections } from '@/lib/email/providers';
import { audit, db } from '@/lib/store';
import { rateLimit, requireAuth } from '@/lib/api';

export const maxDuration = 60;

/**
 * Pull new mail from every connected recruitment mailbox.
 *
 * Event-driven delivery is preferred in production (Microsoft Graph
 * subscriptions, Gmail Pub/Sub push). This endpoint is the reconciliation
 * path — invoked by a webhook handler or a conservative scheduled poll, never
 * aggressive polling from the browser.
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'sync');
  if (limited) return limited;
  const { user, error } = requireAuth(req, ['HR_ADMIN', 'RECRUITER']);
  if (error) return error;

  const connections = listConnections().filter((c) => c.status === 'Connected');
  if (!connections.length) {
    return NextResponse.json({
      processed: 0,
      connected: 0,
      message:
        'No live mailbox is connected. Configure Microsoft Graph or Gmail credentials in the deployment environment, or use Simulate Incoming Application — simulated mail runs the identical intake pipeline.',
    });
  }

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const seen = new Set(db.emails.map((e) => e.messageId));
  let processed = 0;
  const errors: string[] = [];

  for (const conn of connections) {
    const mailboxes = db.mailboxes.filter((m) => m.connectionId === conn.id && m.enabled);
    for (const mailbox of mailboxes) {
      try {
        const messages = await fetchNewMessages(conn.provider, mailbox.address, since);
        for (const message of messages) {
          if (seen.has(message.messageId)) continue;
          const resume = message.attachments.find((a) => /\.(pdf|docx?)$/i.test(a.filename));
          await processIncomingEmail(message, {
            mailboxId: mailbox.id,
            mailboxAddress: mailbox.address,
            provider: conn.provider,
            resumeText: resume?.content ? extractText(resume.content) : '',
            simulated: false,
            actor: user!.name,
          });
          processed++;
        }
        mailbox.receivedCount += messages.length;
      } catch (e) {
        errors.push(`${mailbox.address}: ${(e as Error).message}`);
      }
    }
  }

  audit({
    actor: 'AI Email Intake Agent',
    actorRole: 'AI Agent',
    action: 'MAILBOX_SYNC',
    entity: 'RecruitmentMailbox',
    entityId: 'all',
    detail: `Sync requested by ${user!.name}. ${processed} new application(s) processed across ${connections.length} connection(s).${errors.length ? ` Errors: ${errors.join('; ')}` : ''}`,
    severity: errors.length ? 'warning' : 'info',
  });

  return NextResponse.json({ processed, connected: connections.length, errors });
}

/**
 * Text extraction from a résumé binary.
 *
 * PDFs carry their text in content streams; this pulls the readable runs without
 * ever executing the file. A production deployment swaps in pdf-parse / mammoth
 * behind this same call site.
 */
function extractText(buf: Buffer): string {
  const latin = buf.toString('latin1');
  const runs = latin.match(/\((?:\\.|[^\\()])*\)/g) ?? [];
  const text = runs
    .map((r) => r.slice(1, -1).replace(/\\([()\\])/g, '$1'))
    .join(' ')
    .replace(/\s{2,}/g, ' ');
  return text.length > 120 ? text : latin.replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s{3,}/g, '\n');
}
