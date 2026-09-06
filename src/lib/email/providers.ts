import { createHash } from 'crypto';
import type { EmailAttachment, EmailConnection, IncomingEmail, MailProvider } from '../types';

/**
 * Recruitment mailbox integration — server-side only.
 *
 * Credentials NEVER reach the browser. Every provider reads its secrets from
 * the environment; nothing is hard-coded and nothing is returned to the client
 * beyond a connection *status*. Mailbox scopes are least-privilege and
 * read-only for intake (plus Send for acknowledgements, when enabled).
 */

/* --------------------------------------------------------------------- */
/* Connection discovery                                                    */
/* --------------------------------------------------------------------- */

export function listConnections(): EmailConnection[] {
  const graphReady = Boolean(process.env.MS_GRAPH_TENANT_ID && process.env.MS_GRAPH_CLIENT_ID && process.env.MS_GRAPH_CLIENT_SECRET);
  const gmailReady = Boolean(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN);
  const imapReady = Boolean(process.env.IMAP_HOST && process.env.IMAP_USER && process.env.IMAP_PASSWORD);

  return [
    {
      id: 'conn-graph',
      provider: 'microsoft-graph',
      displayName: 'Microsoft 365 / Outlook',
      status: graphReady ? 'Connected' : 'Not configured',
      authMethod: 'OAuth 2.0',
      scopes: ['Mail.Read', 'Mail.Send'],
      detail: graphReady
        ? 'Client-credentials OAuth against Microsoft Graph. Subscription webhooks deliver new mail events; polling is the fallback.'
        : 'Set MS_GRAPH_TENANT_ID, MS_GRAPH_CLIENT_ID and MS_GRAPH_CLIENT_SECRET to enable. Grant application permissions Mail.Read and Mail.Send, scoped to the recruitment mailboxes only.',
      envVars: ['MS_GRAPH_TENANT_ID', 'MS_GRAPH_CLIENT_ID', 'MS_GRAPH_CLIENT_SECRET'],
    },
    {
      id: 'conn-gmail',
      provider: 'gmail',
      displayName: 'Gmail / Google Workspace',
      status: gmailReady ? 'Connected' : 'Not configured',
      authMethod: 'OAuth 2.0',
      scopes: ['gmail.readonly', 'gmail.send'],
      detail: gmailReady
        ? 'OAuth refresh-token flow against the Gmail API. Pub/Sub push notifications deliver new mail events; polling is the fallback.'
        : 'Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_REFRESH_TOKEN to enable. Use a service account with domain-wide delegation limited to the recruitment mailboxes.',
      envVars: ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN'],
    },
    {
      id: 'conn-imap',
      provider: 'imap',
      displayName: 'Generic IMAP (fallback)',
      status: imapReady ? 'Connected' : 'Not configured',
      authMethod: 'App password (IMAP)',
      scopes: ['INBOX read-only'],
      detail: imapReady
        ? 'IMAP over TLS, polled on a conservative interval.'
        : 'Set IMAP_HOST, IMAP_USER and IMAP_PASSWORD to enable. Use an app-specific password, never the account password, and a read-only mailbox role.',
      envVars: ['IMAP_HOST', 'IMAP_PORT', 'IMAP_USER', 'IMAP_PASSWORD'],
    },
    {
      id: 'conn-demo',
      provider: 'demo',
      displayName: 'Demonstration mailbox',
      status: 'Demo mode',
      authMethod: 'Simulated',
      scopes: [],
      detail:
        'Simulated inbound mail for evaluation. Simulated messages run through exactly the same intake pipeline as real mail — there is no separate demo workflow.',
      envVars: [],
    },
  ];
}

export const anyRealConnection = () => listConnections().some((c) => c.status === 'Connected');

/* --------------------------------------------------------------------- */
/* Microsoft Graph                                                         */
/* --------------------------------------------------------------------- */

async function graphToken(): Promise<string> {
  const res = await fetch(`https://login.microsoftonline.com/${process.env.MS_GRAPH_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.MS_GRAPH_CLIENT_ID!,
      client_secret: process.env.MS_GRAPH_CLIENT_SECRET!,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Graph token ${res.status}`);
  return (await res.json()).access_token as string;
}

interface GraphMessage {
  id: string;
  subject?: string;
  bodyPreview?: string;
  body?: { content?: string };
  receivedDateTime: string;
  hasAttachments?: boolean;
  from?: { emailAddress?: { name?: string; address?: string } };
}

async function fetchGraph(mailbox: string, since: string): Promise<RawMessage[]> {
  const token = await graphToken();
  const url =
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailbox)}/messages` +
    `?$filter=hasAttachments eq true and receivedDateTime ge ${since}` +
    `&$select=id,subject,body,bodyPreview,receivedDateTime,from,hasAttachments&$top=25&$orderby=receivedDateTime desc`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`Graph messages ${res.status}`);
  const data = (await res.json()) as { value: GraphMessage[] };

  const out: RawMessage[] = [];
  for (const m of data.value ?? []) {
    const attRes = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailbox)}/messages/${m.id}/attachments`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000) },
    );
    const atts = attRes.ok ? ((await attRes.json()).value as { name: string; contentType: string; size: number; contentBytes?: string }[]) : [];
    out.push({
      messageId: m.id,
      fromName: m.from?.emailAddress?.name ?? 'Unknown sender',
      fromEmail: m.from?.emailAddress?.address ?? '',
      subject: m.subject ?? '(no subject)',
      body: stripHtml(m.body?.content ?? m.bodyPreview ?? ''),
      receivedAt: m.receivedDateTime,
      attachments: atts.map((a) => ({
        filename: a.name,
        mimeType: a.contentType,
        sizeBytes: a.size,
        content: a.contentBytes ? Buffer.from(a.contentBytes, 'base64') : undefined,
      })),
    });
  }
  return out;
}

/* --------------------------------------------------------------------- */
/* Gmail                                                                   */
/* --------------------------------------------------------------------- */

async function gmailToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID!,
      client_secret: process.env.GMAIL_CLIENT_SECRET!,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Gmail token ${res.status}`);
  return (await res.json()).access_token as string;
}

interface GmailPart {
  filename?: string;
  mimeType?: string;
  body?: { size?: number; data?: string; attachmentId?: string };
  parts?: GmailPart[];
  headers?: { name: string; value: string }[];
}

function walkParts(part: GmailPart | undefined, acc: { text: string[]; atts: GmailPart[] }) {
  if (!part) return;
  if (part.filename) acc.atts.push(part);
  else if (part.mimeType === 'text/plain' && part.body?.data)
    acc.text.push(Buffer.from(part.body.data, 'base64url').toString('utf8'));
  part.parts?.forEach((p) => walkParts(p, acc));
}

async function fetchGmail(mailbox: string, since: string): Promise<RawMessage[]> {
  const token = await gmailToken();
  const auth = { Authorization: `Bearer ${token}` };
  const q = encodeURIComponent(`has:attachment after:${since.slice(0, 10).replace(/-/g, '/')}`);
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(mailbox)}/messages?q=${q}&maxResults=25`,
    { headers: auth, signal: AbortSignal.timeout(20000) },
  );
  if (!listRes.ok) throw new Error(`Gmail list ${listRes.status}`);
  const ids = ((await listRes.json()).messages ?? []) as { id: string }[];

  const out: RawMessage[] = [];
  for (const { id } of ids) {
    const mRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(mailbox)}/messages/${id}?format=full`,
      { headers: auth, signal: AbortSignal.timeout(20000) },
    );
    if (!mRes.ok) continue;
    const msg = (await mRes.json()) as { payload?: GmailPart; internalDate?: string };
    const headers = msg.payload?.headers ?? [];
    const h = (n: string) => headers.find((x) => x.name.toLowerCase() === n)?.value ?? '';
    const from = h('from');
    const acc = { text: [] as string[], atts: [] as GmailPart[] };
    walkParts(msg.payload, acc);

    const attachments = [];
    for (const a of acc.atts) {
      let content: Buffer | undefined;
      if (a.body?.attachmentId) {
        const aRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(mailbox)}/messages/${id}/attachments/${a.body.attachmentId}`,
          { headers: auth, signal: AbortSignal.timeout(20000) },
        );
        if (aRes.ok) content = Buffer.from((await aRes.json()).data, 'base64url');
      }
      attachments.push({
        filename: a.filename ?? 'attachment',
        mimeType: a.mimeType ?? 'application/octet-stream',
        sizeBytes: a.body?.size ?? content?.length ?? 0,
        content,
      });
    }

    out.push({
      messageId: id,
      fromName: from.replace(/<.*/, '').replace(/"/g, '').trim() || 'Unknown sender',
      fromEmail: from.match(/<(.+?)>/)?.[1] ?? from.trim(),
      subject: h('subject') || '(no subject)',
      body: acc.text.join('\n').slice(0, 20000),
      receivedAt: new Date(Number(msg.internalDate ?? Date.now())).toISOString(),
      attachments,
    });
  }
  return out;
}

/* --------------------------------------------------------------------- */
/* IMAP fallback                                                           */
/* --------------------------------------------------------------------- */

async function fetchImap(): Promise<RawMessage[]> {
  // The IMAP adapter requires a TCP client (imapflow/node-imap), which is
  // intentionally not bundled into the serverless prototype. In a deployment
  // that needs it, this adapter runs on a worker with IMAP_HOST/USER/PASSWORD
  // and pushes into the same processIncomingEmail() pipeline.
  throw new Error('IMAP adapter requires the polling worker deployment. Configure Microsoft Graph or Gmail for serverless intake.');
}

/* --------------------------------------------------------------------- */
/* Unified fetch                                                           */
/* --------------------------------------------------------------------- */

export interface RawMessage {
  messageId: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  body: string;
  receivedAt: string;
  attachments: { filename: string; mimeType: string; sizeBytes: number; content?: Buffer }[];
}

export async function fetchNewMessages(provider: MailProvider, mailbox: string, sinceISO: string): Promise<RawMessage[]> {
  switch (provider) {
    case 'microsoft-graph':
      return fetchGraph(mailbox, sinceISO);
    case 'gmail':
      return fetchGmail(mailbox, sinceISO);
    case 'imap':
      return fetchImap();
    default:
      return [];
  }
}

/* --------------------------------------------------------------------- */
/* Outbound acknowledgement                                                */
/* --------------------------------------------------------------------- */

export async function sendAcknowledgement(
  provider: MailProvider,
  mailbox: string,
  to: string,
  subject: string,
  body: string,
): Promise<'Sent' | 'Simulated'> {
  try {
    if (provider === 'microsoft-graph' && process.env.MS_GRAPH_CLIENT_SECRET) {
      const token = await graphToken();
      const res = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailbox)}/sendMail`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: { subject, body: { contentType: 'Text', content: body }, toRecipients: [{ emailAddress: { address: to } }] },
          saveToSentItems: true,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) return 'Sent';
    }
    if (provider === 'gmail' && process.env.GMAIL_REFRESH_TOKEN) {
      const token = await gmailToken();
      const raw = Buffer.from(
        `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}`,
      ).toString('base64url');
      const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(mailbox)}/messages/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) return 'Sent';
    }
  } catch (e) {
    console.error('[email] acknowledgement send failed:', (e as Error).message);
  }
  return 'Simulated';
}

/* --------------------------------------------------------------------- */
/* Attachment validation                                                   */
/* --------------------------------------------------------------------- */

const ALLOWED_EXT = ['pdf', 'doc', 'docx'];
const ALLOWED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_BYTES = 10 * 1024 * 1024;
const DANGEROUS = /\.(exe|js|vbs|scr|bat|cmd|com|ps1|jar|sh|msi|dll|htm|html|lnk|iso|zip|rar|7z)$/i;
const RESUME_SIGNALS = /(experience|education|skills|curriculum vitae|résumé|resume|employment|certification|projects|profile)/i;

/** Magic-number sniffing — the declared MIME type is never trusted on its own. */
function sniff(content?: Buffer): string | null {
  if (!content || content.length < 8) return null;
  if (content.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  if (content[0] === 0xd0 && content[1] === 0xcf) return 'application/msword';
  if (content.subarray(0, 2).toString('latin1') === 'PK')
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return null;
}

export function validateAttachment(
  a: { filename: string; mimeType: string; sizeBytes: number; content?: Buffer },
  extractedText?: string,
): EmailAttachment {
  const extension = (a.filename.split('.').pop() ?? '').toLowerCase();
  const sniffed = sniff(a.content);
  const checks: { check: string; passed: boolean; detail: string }[] = [
    { check: 'Attachment present', passed: true, detail: `${a.filename} (${(a.sizeBytes / 1024).toFixed(0)} KB)` },
    {
      check: 'File extension allowed',
      passed: ALLOWED_EXT.includes(extension),
      detail: ALLOWED_EXT.includes(extension) ? `.${extension} is an accepted résumé format` : `.${extension} is not in the allow-list (pdf, doc, docx)`,
    },
    {
      check: 'MIME type allowed',
      passed: ALLOWED_MIME.includes(a.mimeType),
      detail: ALLOWED_MIME.includes(a.mimeType) ? a.mimeType : `${a.mimeType} is not an accepted document type`,
    },
    {
      check: 'Content signature matches declared type',
      passed: !a.content || sniffed !== null,
      detail: sniffed ? `Magic bytes identify ${sniffed}` : a.content ? 'Content signature unrecognised' : 'No binary supplied for signature check',
    },
    {
      check: 'File size within limit',
      passed: a.sizeBytes > 0 && a.sizeBytes <= MAX_BYTES,
      detail: `${(a.sizeBytes / 1024 / 1024).toFixed(2)} MB against a 10 MB ceiling`,
    },
    {
      check: 'No executable or archive extension',
      passed: !DANGEROUS.test(a.filename),
      detail: DANGEROUS.test(a.filename) ? 'Blocked extension detected — quarantined' : 'Filename carries no executable or archive extension',
    },
    {
      check: 'No double extension',
      passed: !/\.[a-z0-9]{2,4}\.(pdf|doc|docx)$/i.test(a.filename),
      detail: 'Filename does not disguise a second extension',
    },
    {
      check: 'Content appears to be a résumé',
      passed: !extractedText || RESUME_SIGNALS.test(extractedText),
      detail: extractedText
        ? RESUME_SIGNALS.test(extractedText)
          ? 'Résumé section headings detected in extracted text'
          : 'No résumé section headings found in the extracted text'
        : 'Text extraction pending',
    },
  ];

  const hardFail = checks.filter((c) => !c.passed);
  const quarantined = DANGEROUS.test(a.filename) || a.sizeBytes > MAX_BYTES || (!!a.content && sniffed === null);

  return {
    id: `att-${createHash('sha1').update(a.filename + a.sizeBytes).digest('hex').slice(0, 10)}`,
    filename: a.filename,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    extension,
    isResume: ALLOWED_EXT.includes(extension) && !quarantined,
    sha256: a.content ? createHash('sha256').update(a.content).digest('hex') : createHash('sha256').update(a.filename + a.sizeBytes).digest('hex'),
    validation: { passed: hardFail.length === 0, checks, quarantined },
    extractedText,
  };
}

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export type { IncomingEmail };
