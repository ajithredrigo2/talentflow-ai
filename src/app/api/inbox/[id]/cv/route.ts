import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { textToPdf } from '@/lib/pdf';
import { audit } from '@/lib/store';
import { requireAuth } from '@/lib/api';

/** Renders the stored résumé back as a PDF. Nothing uploaded is ever executed. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = requireAuth(req, ['HR_ADMIN', 'RECRUITER', 'HIRING_MANAGER']);
  if (error) return error;

  const { id } = await params;
  const email = db.emails.find((e) => e.id === id);
  const attachment = email?.attachments.find((a) => a.isResume);
  if (!email || !attachment) return NextResponse.json({ error: 'No résumé on this message.' }, { status: 404 });
  if (attachment.validation.quarantined)
    return NextResponse.json({ error: 'This attachment is quarantined and cannot be served.' }, { status: 403 });

  const text = attachment.extractedText || 'No text could be extracted from this document.';
  const pdf = textToPdf(text, attachment.filename);

  audit({
    actor: user!.name,
    actorRole: user!.role,
    action: 'CV_VIEWED',
    entity: 'EmailAttachment',
    entityId: attachment.id,
    detail: `${user!.name} opened ${attachment.filename} (SHA-256 ${attachment.sha256.slice(0, 16)}…) from the application by ${email.fromName}.`,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${attachment.filename.replace(/[^\w.-]/g, '_')}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
