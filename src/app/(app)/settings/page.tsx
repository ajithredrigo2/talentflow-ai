import { getSession } from '../session';
import { activeProvider } from '@/lib/ai';
import { db } from '@/lib/store';
import { AGENTS } from '@/lib/agents/registry';
import { NAV } from '@/lib/rbac';
import { ROLE_LABEL, DEMO_ACCOUNTS } from '@/lib/auth';
import { EXCLUDED_ATTRIBUTES } from '@/lib/agents/screening';
import { Badge, Card, GuardrailNote, PageHeader, Table } from '@/components/ui';
import type { Role } from '@/lib/types';

export const dynamic = 'force-dynamic';

const ROLES: Role[] = ['HR_ADMIN', 'RECRUITER', 'HIRING_MANAGER', 'EMPLOYEE'];

const SECURITY = [
  ['Server-side model calls', 'All provider calls originate from API route handlers. No key is ever exposed to the browser.'],
  ['Secrets in environment only', 'GEMINI_API_KEY / OPENAI_API_KEY / AUTH_SECRET / DATABASE_URL are read from the environment; .env.example ships with empty values.'],
  ['Signed HttpOnly session', 'HMAC-SHA256 signed session cookie, HttpOnly, SameSite=Lax, Secure in production, 12-hour expiry.'],
  ['Route protection', 'Middleware guards every non-public route and API; each page re-checks the session and role server-side.'],
  ['Role-based access control', 'Navigation, pages and API handlers each enforce the role matrix independently.'],
  ['Input validation', 'Every request body is length-capped and stripped of control characters before reaching an agent.'],
  ['Rate limiting', 'Per-IP, per-endpoint token bucket (default 60 requests/minute, configurable).'],
  ['Secure headers', 'X-Frame-Options, X-Content-Type-Options, Referrer-Policy and Permissions-Policy set on every response.'],
  ['Audit logging', 'Every agent run, recommendation, human decision and denied access attempt is recorded.'],
  ['PII protection', 'Candidate contact details are masked in list views; agents receive only task-relevant fields.'],
];

export default async function SettingsPage() {
  const user = await getSession('/settings');
  const engine = activeProvider();

  return (
    <>
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        subtitle="Platform configuration, role permissions, responsible-AI controls and security posture."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Your account">
          <div className="divide-y divide-[#f2f4f9]">
            {[
              ['Name', user.name],
              ['Email', user.email],
              ['Role', ROLE_LABEL[user.role]],
              ['Linked employee record', user.employeeId ?? '—'],
              ['Session', 'Signed HttpOnly cookie · 12-hour expiry'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between px-5 py-3 text-[12.5px]">
                <span className="text-[#7a839c]">{k}</span><span className="font-medium text-ink-900">{v}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="AI configuration">
          <div className="divide-y divide-[#f2f4f9]">
            {[
              ['Active reasoning engine', engine === 'deterministic' ? 'Deterministic agent engine' : `${engine.toUpperCase()} with deterministic fallback`],
              ['Provider key configured', engine === 'deterministic' ? 'No — running fully offline' : 'Yes — read from environment'],
              ['Agents registered', String(AGENTS.length)],
              ['Approval-gated agents', String(AGENTS.filter((a) => a.requiresApproval).length)],
              ['Agent runs this session', String(db.runs.length)],
              ['Knowledge-base documents', '12 HR policies, lexically indexed'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between px-5 py-3 text-[12.5px]">
                <span className="text-[#7a839c]">{k}</span><span className="font-medium text-ink-900">{v}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-[#eef0f6] px-5 py-3.5 text-[11.5px] leading-relaxed text-[#7a839c]">
            Set <code className="rounded bg-[#f0f2f8] px-1 font-mono text-[11px]">GEMINI_API_KEY</code> or{' '}
            <code className="rounded bg-[#f0f2f8] px-1 font-mono text-[11px]">OPENAI_API_KEY</code> in the deployment
            environment to enable model-written narratives. Agent results stay grounded in platform data either way —
            the model rewrites the summary, it does not invent the findings.
          </div>
        </Card>
      </div>

      <Card title="Role-based access matrix" subtitle="Enforced in navigation, page guards and API handlers" className="mt-4">
        <Table head={['Surface', ...ROLES.map((r) => ROLE_LABEL[r])]}>
          {NAV.map((n) => (
            <tr key={n.href}>
              <td className="td font-medium">{n.label}<div className="text-[11px] font-normal text-[#9aa2b8]">{n.href}</div></td>
              {ROLES.map((r) => (
                <td key={r} className="td">
                  {n.roles.includes(r) ? <span className="text-mint-600">✓</span> : <span className="text-[#d5dae6]">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </Table>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Responsible AI controls">
          <div className="space-y-3 p-5">
            <div>
              <div className="kpi-label mb-2">Attributes excluded from every assessment</div>
              <div className="flex flex-wrap gap-1">
                {EXCLUDED_ATTRIBUTES.map((a) => <span key={a} className="rounded bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-600">✕ {a}</span>)}
              </div>
            </div>
            <div className="divide-y divide-[#f2f4f9] rounded-lg border border-[#e6e9f2]">
              {[
                ['Human-in-the-loop', 'Enforced'],
                ['Explainability on every recommendation', 'Enforced'],
                ['Audit trail', 'Immutable, append-only'],
                ['Small-sample suppression (engagement)', '5 responses'],
                ['Candidate data retention', '12 months'],
                ['Right to explanation & human review', 'Available on request'],
                ['Autonomous employment decisions', 'Disabled — not configurable'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between px-3.5 py-2.5 text-[12.5px]">
                  <span className="text-[#5a6480]">{k}</span><Badge tone="mint">{v}</Badge>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Security posture">
          <div className="divide-y divide-[#f2f4f9]">
            {SECURITY.map(([k, v]) => (
              <div key={k} className="px-5 py-3">
                <div className="text-[12.5px] font-medium text-ink-900">{k}</div>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#7a839c]">{v}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Demonstration accounts" subtitle="Seeded, non-personal accounts for evaluation" className="mt-4">
        <Table head={['Role', 'Email', 'Password', 'Access']}>
          {DEMO_ACCOUNTS.map((a) => (
            <tr key={a.email}>
              <td className="td font-medium">{a.label}</td>
              <td className="td font-mono text-[12px]">{a.email}</td>
              <td className="td font-mono text-[12px]">{a.password}</td>
              <td className="td text-[12px] text-[#616b85]">{a.description}</td>
            </tr>
          ))}
        </Table>
      </Card>

      <div className="mt-4">
        <GuardrailNote>
          This is a demonstration deployment. All employee, candidate and feedback records are synthetic and contain no
          real personal data. No credentials in this environment are production credentials.
        </GuardrailNote>
      </div>
    </>
  );
}
