import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { employees } from '@/lib/seed';
import { requireAuth } from '@/lib/api';

export async function GET(req: NextRequest) {
  const { error } = requireAuth(req, ['HR_ADMIN', 'RECRUITER', 'HIRING_MANAGER']);
  if (error) return error;

  const rows = [...db.interviews]
    .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
    .map((i) => {
      const c = db.candidates.find((x) => x.id === i.candidateId);
      const j = db.jobs.find((x) => x.id === i.jobId);
      return {
        id: i.id,
        candidate: c?.name ?? 'Unknown',
        candidateId: i.candidateId,
        job: j?.title ?? '',
        round: i.round,
        interviewer: employees.find((e) => e.id === i.interviewerId)?.name ?? '',
        when: new Date(i.scheduledAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai' }),
        status: i.status,
        feedback: i.feedback,
      };
    });

  return NextResponse.json({ rows });
}
