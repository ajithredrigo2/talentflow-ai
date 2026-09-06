import { NextRequest, NextResponse } from 'next/server';
import { resetStore } from '@/lib/store';
import { requireAuth } from '@/lib/api';

/** Restores the seeded demo dataset. Useful between judging sessions. */
export async function POST(req: NextRequest) {
  const { error } = requireAuth(req, ['HR_ADMIN']);
  if (error) return error;
  resetStore();
  return NextResponse.json({ ok: true, message: 'Demo dataset restored.' });
}
