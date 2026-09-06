import { getSession } from '../session';
import { db } from '@/lib/store';
import ApprovalCard from '@/components/ApprovalCard';
import { Card, Empty, GuardrailNote, Kpi, PageHeader } from '@/components/ui';
import { ROLE_LABEL } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const SENSITIVE_ACTIONS = [
  'Candidate shortlisting',
  'Candidate rejection',
  'Hiring decision',
  'Offer creation',
  'Promotion recommendation',
  'Performance rating',
  'Termination',
  'Job publication',
  'Leave approval',
];

export default async function ApprovalsPage() {
  const user = await getSession('/approvals');
  const mine = db.approvals.filter((a) => a.requiredRole.includes(user.role));
  const pending = mine.filter((a) => a.status === 'Pending');
  const decided = mine.filter((a) => a.status !== 'Pending');

  return (
    <>
      <PageHeader
        eyebrow="Human-in-the-loop"
        title="Approvals"
        subtitle={`Sensitive HR actions never execute autonomously. As ${ROLE_LABEL[user.role]}, these are the decisions routed to you — with the agent's recommendation, its reasoning, and four ways to respond.`}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Pending your decision" value={pending.length} accent="amber" />
        <Kpi label="Decided" value={decided.length} accent="mint" />
        <Kpi label="Approved" value={decided.filter((a) => a.status === 'Approved').length} accent="brand" />
        <Kpi label="Rejected / modified" value={decided.filter((a) => a.status === 'Rejected' || a.status === 'Modified').length} accent="rose" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {pending.length === 0 ? (
            <Card><Empty title="Nothing pending for your role" hint="Run a workflow in the AI HR Command Center — approval gates will surface here." /></Card>
          ) : (
            pending.map((a) => <ApprovalCard key={a.id} approval={a} />)
          )}

          {decided.length > 0 && (
            <>
              <h2 className="mt-6 text-[15px] font-semibold text-ink-950">Decision history</h2>
              {decided.map((a) => <ApprovalCard key={a.id} approval={a} />)}
            </>
          )}
        </div>

        <div className="space-y-4">
          <Card title="Actions that always require a human">
            <ul className="space-y-1.5 p-4">
              {SENSITIVE_ACTIONS.map((s) => (
                <li key={s} className="flex gap-2 text-[12.5px] text-[#4a5470]">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-amberx-500" />{s}
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Your four responses">
            <div className="space-y-2.5 p-4 text-[12px] leading-relaxed text-[#5a6480]">
              <p><span className="font-semibold text-ink-900">Approve</span> — the action executes and is logged against your name.</p>
              <p><span className="font-semibold text-ink-900">Reject</span> — nothing executes; the reason is recorded for the audit trail.</p>
              <p><span className="font-semibold text-ink-900">Modify</span> — you change the agent&apos;s proposal before it proceeds.</p>
              <p><span className="font-semibold text-ink-900">Request more information</span> — the request returns to the agent for additional evidence.</p>
            </div>
          </Card>

          <GuardrailNote>
            Every decision writes actor, action, entity, reasoning and timestamp to the immutable audit log. Candidates
            and employees affected by an AI-assisted recommendation may request an explanation and human review.
          </GuardrailNote>
        </div>
      </div>
    </>
  );
}
