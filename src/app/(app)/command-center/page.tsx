'use client';

import { useRef, useState } from 'react';
import { Sparkles, CornerDownLeft } from 'lucide-react';
import { AgentFlow, ResultBlocks, type ResultBlock } from '@/components/AgentResults';
import { AIPanel, Badge, Card, PageHeader, Spinner } from '@/components/ui';
import type { AgentRun } from '@/lib/types';

const EXAMPLES = [
  { label: 'Recruit a Senior DevOps Engineer', text: 'We need to hire a Senior DevOps Engineer in Dubai with Kubernetes, AWS, Terraform and CI/CD experience.' },
  { label: 'Top candidates', text: 'Find the top candidates for Senior DevOps Engineer.' },
  { label: 'Internal succession', text: 'Who are the best internal candidates for our upcoming Cloud Platform Lead position?' },
  { label: 'Cloud skill gaps', text: 'Show employees with cloud skill gaps.' },
  { label: 'Workforce plan', text: 'We are moving 40% of our infrastructure to cloud this quarter — what roles do we need?' },
  { label: 'Onboarding plan', text: 'Create an onboarding plan for the new Finance Manager.' },
  { label: 'Recruitment report', text: "Generate this month's recruitment report." },
  { label: 'Interview questions', text: 'Create interview questions for candidate Grace Adeyemi.' },
  { label: 'This week’s interviews', text: 'Show all interviews scheduled this week.' },
  { label: 'Retention risk', text: 'Which employees are at retention risk and why?' },
];

interface RunResult {
  run: AgentRun;
  blocks: ResultBlock[];
  narrative: string;
}

export default function CommandCenter() {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<{ request: string; intent: string; at: string }[]>([]);
  const [phase, setPhase] = useState('');
  const resultsRef = useRef<HTMLDivElement>(null);

  async function run(text: string) {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError('');
    setResult(null);
    const phases = ['Coordinator interpreting request…', 'Building execution plan…', 'Dispatching specialist agents…', 'Aggregating results…'];
    let p = 0;
    setPhase(phases[0]);
    const timer = setInterval(() => {
      p = Math.min(p + 1, phases.length - 1);
      setPhase(phases[p]);
    }, 900);

    try {
      const res = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'The Coordinator could not complete this request.');
      setResult(data);
      setHistory((h) => [{ request: text, intent: data.run.intent, at: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) }, ...h].slice(0, 8));
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      clearInterval(timer);
      setBusy(false);
      setPhase('');
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Orchestration"
        title="AI HR Command Center"
        subtitle="Describe what you need in plain language. The HR Coordinator Agent classifies the intent, builds an execution plan, dispatches specialist agents and returns explainable results — stopping at every decision that belongs to a human."
      />

      {/* Composer */}
      <div className="relative overflow-hidden rounded-2xl bg-ink-950 p-6 text-white">
        <div className="absolute inset-0 grid-bg opacity-60" />
        <div className="absolute inset-x-0 top-0 h-56 glow" />
        <div className="relative">
          <div className="mb-3 flex items-center gap-2 text-[12px] text-white/50">
            <Sparkles size={14} className="text-accent-400" />
            HR Coordinator Agent · 16 specialist agents available
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(input);
            }}
          >
            <div className="flex flex-col gap-2 rounded-xl border border-white/15 bg-white/[0.06] p-2.5 sm:flex-row sm:items-center">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g. We need to hire a Senior DevOps Engineer in Dubai with Kubernetes, AWS and Terraform…"
                className="flex-1 bg-transparent px-2.5 py-2 text-[14px] text-white outline-none placeholder:text-white/35"
                disabled={busy}
              />
              <button className="btn bg-brand-600 px-5 py-2.5 text-white hover:bg-brand-500 disabled:opacity-60" disabled={busy || !input.trim()}>
                {busy ? 'Running…' : <>Run <CornerDownLeft size={13} /></>}
              </button>
            </div>
          </form>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {EXAMPLES.map((e) => (
              <button
                key={e.label}
                onClick={() => {
                  setInput(e.text);
                  run(e.text);
                }}
                disabled={busy}
                className="rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-[11.5px] text-white/70 transition hover:border-white/25 hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {busy && (
        <Card className="mt-5">
          <div className="flex items-center gap-3 px-5 py-6">
            <Spinner />
            <div>
              <div className="text-[13.5px] font-medium text-ink-950">{phase}</div>
              <div className="text-[12px] text-[#8b93a9]">Request → Coordinator → Agents → Tasks → Results → Human approval</div>
            </div>
          </div>
          <div className="h-0.5 overflow-hidden bg-[#eef0f6]">
            <div className="h-full w-1/3 animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-brand-500 to-transparent" />
          </div>
        </Card>
      )}

      {error && <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-600">{error}</div>}

      {result && (
        <div ref={resultsRef} className="mt-6 grid gap-5 lg:grid-cols-[340px_1fr]">
          <div className="space-y-4">
            <Card title="Execution plan" subtitle={`Intent: ${result.run.intent}`}>
              <div className="p-4">
                <AgentFlow run={result.run} />
              </div>
            </Card>
            <Card title="Coordinator reasoning">
              <div className="p-4 text-[12.5px] leading-relaxed text-[#5a6480]">
                {result.run.reasoning}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge tone={result.run.status === 'Awaiting Approval' ? 'amber' : result.run.status === 'Failed' ? 'rose' : 'mint'}>{result.run.status}</Badge>
                  <Badge tone="neutral">{result.run.engine === 'llm' ? 'LLM-assisted narrative' : 'Deterministic engine'}</Badge>
                  <Badge tone="neutral">{result.run.tasks.length} tasks</Badge>
                </div>
              </div>
            </Card>
            {history.length > 0 && (
              <Card title="This session">
                <div className="divide-y divide-[#f2f4f9]">
                  {history.map((h, i) => (
                    <button key={i} onClick={() => run(h.request)} className="block w-full px-4 py-2.5 text-left transition hover:bg-[#fafbfe]">
                      <div className="line-clamp-2 text-[12.5px] text-ink-800">{h.request}</div>
                      <div className="mt-0.5 text-[11px] text-[#9aa2b8]">{h.intent} · {h.at}</div>
                    </button>
                  ))}
                </div>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <AIPanel title="Coordinator summary">
              <div className="whitespace-pre-line">{result.narrative}</div>
            </AIPanel>
            <ResultBlocks blocks={result.blocks} />
          </div>
        </div>
      )}

      {!result && !busy && (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { t: 'Request → Plan', d: 'The Coordinator classifies intent across 16 workflow patterns and extracts role, location, skills and people from the sentence.' },
            { t: 'Agents → Tasks', d: 'Specialist agents run in dependency order. Each task reports its own status, duration and a summary of what it produced.' },
            { t: 'Results → Approval', d: 'Results arrive with their evidence. Anything that decides someone’s employment stops at an approval gate with your name on it.' },
          ].map((c, i) => (
            <Card key={c.t} className="card-pad">
              <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-[12px] font-bold text-brand-700">{i + 1}</div>
              <h3 className="text-[13.5px] font-semibold text-ink-950">{c.t}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#7a839c]">{c.d}</p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
