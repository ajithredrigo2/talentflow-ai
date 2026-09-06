import { NextRequest, NextResponse } from 'next/server';
import { runCoordinator } from '@/lib/agents/coordinator';
import { badRequest, rateLimit, requireAuth, sanitize } from '@/lib/api';

export const maxDuration = 45;

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'command');
  if (limited) return limited;
  const { user, error } = requireAuth(req);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const request = sanitize(body.request, 1000);
  if (request.length < 4) return badRequest('Please describe what you need in a little more detail.');

  const result = await runCoordinator({
    request,
    actor: user!.name,
    role: user!.role,
    employeeId: user!.employeeId,
  });
  return NextResponse.json(result);
}
