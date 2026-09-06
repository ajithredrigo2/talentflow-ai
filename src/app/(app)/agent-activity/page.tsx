import Link from 'next/link';
import { getSession } from '../session';
import { db } from '@/lib/store';
import { AGENTS, agentName } from '@/lib/agents/registry';
import { Badge, Card, Empty, PageHeader } from '@/components/ui';

export const dynamic = 'force-dynamic';

const STATUS_STYLE: Record<string, string> = {
  Completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Processing: 'border-brand-200 bg-brand-50 text-brand-700',
  Waiting: 'border-[#ebe9ef] bg-[#f8f7fa] text-[#898294]',
  'Needs Approval': 'border-amber-200 bg-amber-50 text-amber-700',
  Failed: 'border-rose-200 bg-rose-50 text-rose-600',
  Idle: 'border-[#ebe9ef] bg-white text-[#a7a1b1]',
};

export default async function AgentActivity() {
  await getSession('/agent-activity');
  const runs = db.runs.slice(0, 20);

  const liveState = AGENTS.map((a) => {
    const tasks = db.runs.flatMap((r) => r.tasks).filter((t) => t.agentId === a.id);
    const last = tasks[0];
    return { agent: a, runs: tasks.length, status: last?.status ?? 'Idle', lastSummary: last?.summary };
  });

  return (
    <>
      <PageHeader
        eyebrow="Observability"
        title="Agent Activity"
        subtitle="Live state of every agent and the full task graph of each Coordinator run: what was requested, which agents were activated, what each produced and where a human decision was required."
        actions={<Link href="/command-center" className="btn-primary">Run a workflow</Link>}
      />

      <Card title="Agent runtime state" subtitle="Waiting · Processing · Completed · Needs Approval · Failed" className="mb-5">
        <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {liveState.map((s) => (
            <div key={s.agent.id} className={`rounded-lg border px-3.5 py-3 ${STATUS_STYLE[s.status]}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-semibold">{s.agent.shortName}</span>
                <span className="text-[10.5px] font-medium opacity-75">{s.status}</span>
              </div>
              <div className="mt-1 text-[11px] opacity-70">{s.runs} task{s.runs === 1 ? '' : 's'} this session</div>
            </div>
          ))}
        </div>
      </Card>

      {runs.length === 0 ? (
        <Card>
          <Empty title="No agent runs yet in this session" hint="Open the AI HR Command Center and issue a request — the full task graph will appear here." />
        </Card>
      ) : (
        <div className="space-y-4">
          {runs.map((run) => (
            <Card key={run.id}>
              <div className="border-b border-[#f2f0f4] px-5 py-3.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-[13.5px] font-semibold text-ink-950">{run.request}</div>
                    <div className="mt-0.5 text-[11.5px] text-[#9892a2]">
                      {run.actor} · {new Date(run.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Dubai', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · run {run.id.slice(0, 14)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone="neutral">{run.intent}</Badge>
                    <Badge tone={run.status === 'Awaiting Approval' ? 'amber' : run.status === 'Failed' ? 'rose' : 'mint'}>{run.status}</Badge>
                    <Badge tone="neutral">{run.engine === 'llm' ? 'LLM-assisted' : 'Deterministic'}</Badge>
                  </div>
                </div>
              </div>
              <div className="space-y-2 p-4">
                {run.tasks.map((t, i) => (
                  <div key={t.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold ${STATUS_STYLE[t.status]}`}>
                        {t.status === 'Completed' ? '✓' : t.status === 'Failed' ? '!' : t.status === 'Needs Approval' ? '⏸' : i + 1}
                      </span>
                      {i < run.tasks.length - 1 && <span className="my-0.5 w-px flex-1 bg-[#ebe9ef]" />}
                    </div>
                    <div className={`mb-1 flex-1 rounded-lg border px-3.5 py-2.5 ${STATUS_STYLE[t.status]}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[12.5px] font-semibold">{agentName(t.agentId)}</span>
                        <span className="text-[10.5px] opacity-70">{t.durationMs}ms · {t.status}</span>
                      </div>
                      <div className="mt-0.5 text-[12px] opacity-90">{t.label}</div>
                      {t.summary && <p className="mt-1 text-[11.5px] leading-relaxed opacity-75">{t.summary}</p>}
                    </div>
                  </div>
                ))}
                <div className="mt-2 rounded-lg border border-[#ebe9ef] bg-[#fcfbfd] px-3.5 py-2.5 text-[11.5px] leading-relaxed text-[#6b6377]">
                  <span className="font-semibold text-ink-900">Coordinator reasoning: </span>{run.reasoning}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
