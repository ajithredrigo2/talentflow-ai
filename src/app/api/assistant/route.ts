import { NextRequest, NextResponse } from 'next/server';
import { classify } from '@/lib/agents/coordinator';
import { runCoordinator } from '@/lib/agents/coordinator';
import { badRequest, rateLimit, requireAuth, sanitize } from '@/lib/api';

export const maxDuration = 45;

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'assistant');
  if (limited) return limited;
  const { user, error } = requireAuth(req);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const message = sanitize(body.message, 800);
  if (message.length < 2) return badRequest('Please type a question.');

  const { intent } = classify(message);
  const result = await runCoordinator({ request: message, actor: user!.name, role: user!.role, employeeId: user!.employeeId });
  return NextResponse.json({ ...result, intent });
}
