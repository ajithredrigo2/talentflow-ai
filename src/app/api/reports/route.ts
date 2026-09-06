import { NextRequest, NextResponse } from 'next/server';
import { badRequest, rateLimit, requireAuth, sanitize } from '@/lib/api';
import { audit } from '@/lib/store';
import { generateReport, reportToCsv, reportsFor, REPORTS } from '@/lib/reports';
import { reportToXlsx } from '@/lib/report-excel';

/** Lists the reports the caller's role is entitled to run. */
export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;
  return NextResponse.json({
    reports: reportsFor(user!.role).map(({ id, name, description, category, agentId, agentLabel }) => ({
      id,
      name,
      description,
      category,
      agentId,
      agentLabel,
    })),
    total: REPORTS.length,
  });
}

/**
 * Generates a report. Authorisation is re-checked against the report's own role
 * list, not just the session, and every generation is written to the audit log
 * — a report is a disclosure of employee data and is treated as one.
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'reports');
  if (limited) return limited;

  const { user, error } = requireAuth(req);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const id = sanitize(body.id, 60);
  const format: 'json' | 'csv' | 'xlsx' =
    body.format === 'csv' ? 'csv' : body.format === 'xlsx' ? 'xlsx' : 'json';
  if (!id) return badRequest('A report id is required.');

  const report = generateReport(id, user!.role);
  if (!report) {
    const known = REPORTS.some((r) => r.id === id);
    return NextResponse.json(
      { error: known ? 'Your role is not entitled to this report.' : 'Unknown report.' },
      { status: known ? 403 : 404 },
    );
  }

  audit({
    actor: user!.name,
    actorRole: user!.role,
    action: 'REPORT_GENERATED',
    entity: 'Report',
    entityId: report.id,
    detail: `${user!.name} generated "${report.name}" via the ${report.agentLabel}. ${report.kpis.length} measures and ${report.sections.length} sections over live platform data. Format: ${format}.`,
  });

  if (format === 'xlsx') {
    const workbook = await reportToXlsx(report, user!.name);
    return new NextResponse(new Uint8Array(workbook), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${report.id}-${report.generatedAt.slice(0, 10)}.xlsx"`,
        'Content-Length': String(workbook.length),
        'Cache-Control': 'private, no-store',
      },
    });
  }

  if (format === 'csv') {
    return new NextResponse(reportToCsv(report), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${report.id}-${report.generatedAt.slice(0, 10)}.csv"`,
        'Cache-Control': 'private, no-store',
      },
    });
  }

  return NextResponse.json({ report });
}
