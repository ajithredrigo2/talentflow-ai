import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { listConnections } from '@/lib/email/providers';
import { SAMPLE_APPLICATIONS } from '@/lib/email/samples';
import { requireAuth } from '@/lib/api';

export async function GET(req: NextRequest) {
  const { error } = requireAuth(req, ['HR_ADMIN', 'RECRUITER', 'HIRING_MANAGER']);
  if (error) return error;

  const rows = db.emails.map((e) => {
    const application = db.applications.find((a) => a.id === e.applicationId);
    const candidate = db.candidates.find((c) => c.id === e.candidateId);
    const job = db.jobs.find((j) => j.id === e.jobId);
    return {
      id: e.id,
      receivedAt: e.receivedAt,
      fromName: e.fromName,
      fromEmail: e.fromEmail,
      subject: e.subject,
      mailboxAddress: e.mailboxAddress,
      provider: e.provider,
      simulated: e.simulated,
      status: e.status,
      attachment: e.attachments[0]
        ? { filename: e.attachments[0].filename, sizeBytes: e.attachments[0].sizeBytes, quarantined: e.attachments[0].validation.quarantined }
        : null,
      candidateId: e.candidateId,
      candidateName: candidate?.name ?? e.fromName,
      jobId: e.jobId,
      jobCode: job?.jobCode ?? null,
      jobTitle: job?.title ?? null,
      matchScore: application?.screening?.overall ?? null,
      recommendation: application?.screening?.recommendation ?? null,
      reference: application?.reference ?? null,
      duplicateOf: e.duplicateOf ?? null,
      source: 'Email' as const,
    };
  });

  return NextResponse.json({
    rows,
    mailboxes: db.mailboxes,
    connections: listConnections(),
    samples: SAMPLE_APPLICATIONS.map((s) => ({ key: s.key, label: s.label, note: s.note, mailbox: s.mailbox, subject: s.message.subject })),
  });
}
