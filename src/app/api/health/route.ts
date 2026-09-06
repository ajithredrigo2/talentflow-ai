import { NextResponse } from 'next/server';
import { activeProvider } from '@/lib/ai';
import { db } from '@/lib/store';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    engine: activeProvider(),
    entities: {
      jobs: db.jobs.length,
      candidates: db.candidates.length,
      employees: db.employees.length,
      interviews: db.interviews.length,
      approvals: db.approvals.length,
      runs: db.runs.length,
    },
    time: new Date().toISOString(),
  });
}
