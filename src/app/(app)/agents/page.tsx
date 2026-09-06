import { getSession } from '../session';
import { AGENTS } from '@/lib/agents/registry';
import { Badge, Card, PageHeader } from '@/components/ui';
import { activeProvider } from '@/lib/ai';

export const dynamic = 'force-dynamic';

const CATEGORIES = ['Orchestration', 'Talent Acquisition', 'Employee Experience', 'Workforce Intelligence'] as const;
const TONE = { Orchestration: 'brand', 'Talent Acquisition': 'cyan', 'Employee Experience': 'mint', 'Workforce Intelligence': 'amber' } as const;

export default async function AgentsPage() {
  await getSession('/agents');
  const engine = activeProvider();

  return (
    <>
      <PageHeader
        eyebrow="Agent registry"
        title="AI Agents"
        subtitle="Sixteen specialised agents with defined missions, inputs, outputs and guardrails. The Coordinator composes them into workflows; each one is independently auditable."
        actions={
          <Badge tone={engine === 'deterministic' ? 'neutral' : 'mint'} dot>
            Reasoning engine: {engine === 'deterministic' ? 'Deterministic (no API key configured)' : `${engine.toUpperCase()} + deterministic fallback`}
          </Badge>
        }
      />

      {CATEGORIES.map((cat) => (
        <section key={cat} className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-ink-950">{cat}</h2>
            <Badge tone={TONE[cat]}>{AGENTS.filter((a) => a.category === cat).length} agents</Badge>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {AGENTS.filter((a) => a.category === cat).map((a) => (
              <Card key={a.id} className="card-pad">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[14.5px] font-semibold text-ink-950">{a.name}</h3>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#71697d]">{a.mission}</p>
                  </div>
                  {a.requiresApproval && <Badge tone="amber">Approval gate</Badge>}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="kpi-label mb-1.5">Capabilities</div>
                    <ul className="space-y-1">
                      {a.capabilities.map((c) => (
                        <li key={c} className="flex gap-2 text-[12px] leading-snug text-[#6b6377]">
                          <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-brand-500" />{c}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="kpi-label mb-1.5">Inputs</div>
                      <div className="flex flex-wrap gap-1">
                        {a.inputs.map((i) => <span key={i} className="rounded bg-[#f4f2f6] px-1.5 py-0.5 text-[10.5px] text-[#6b6377]">{i}</span>)}
                      </div>
                    </div>
                    <div>
                      <div className="kpi-label mb-1.5">Outputs</div>
                      <div className="flex flex-wrap gap-1">
                        {a.outputs.map((i) => <span key={i} className="rounded bg-brand-50 px-1.5 py-0.5 text-[10.5px] font-medium text-brand-700">{i}</span>)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-[#ebe9ef] bg-[#fcfbfd] p-3">
                  <div className="kpi-label mb-1.5">Guardrails</div>
                  <ul className="space-y-1">
                    {a.guardrails.map((g) => (
                      <li key={g} className="flex gap-2 text-[11.5px] leading-snug text-[#6b6377]">
                        <span className="text-mint-600">✓</span>{g}
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
