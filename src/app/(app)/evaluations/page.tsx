'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AIPanel, Badge, Card, GuardrailNote, Meter, PageHeader, Spinner } from '@/components/ui';

interface Row {
  id: string;
  candidate: string;
  candidateId: string;
  job: string;
  round: string;
  interviewer: string;
  when: string;
  status: string;
  feedback?: {
    ratings: { technical: number; problemSolving: number; communication: number; leadership: number };
    aiSummary?: string;
    recommendation?: string;
    reasoning?: string;
    notes: string;
  };
}

export default function Evaluations() {
  const [rows, setRows] = useState<Row[]>([]);
  const [active, setActive] = useState<string>('');
  const [form, setForm] = useState({ technical: 8, problemSolving: 8, communication: 7, leadership: 7, notes: '', technicalFeedback: '', behavioralFeedback: '' });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ summary: string; recommendation: string; reasoning: string; average: number; bar: number } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/evaluations-list')
      .then((r) => (r.ok ? r.json() : { rows: [] }))
      .then((d) => {
        setRows(d.rows ?? []);
        if (d.rows?.length) setActive(d.rows.find((r: Row) => !r.feedback)?.id ?? d.rows[0].id);
      })
      .catch(() => {});
  }, []);

  const current = rows.find((r) => r.id === active);

  async function submit() {
    if (!current) return;
    setBusy(true);
    setError('');
    const res = await fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interviewId: current.id, ...form }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? 'Submission failed.');
    setResult(data.evaluation);
    setRows((p) => p.map((r) => (r.id === current.id ? { ...r, status: 'Completed', feedback: { ratings: { technical: form.technical, problemSolving: form.problemSolving, communication: form.communication, leadership: form.leadership }, aiSummary: data.evaluation.summary, recommendation: data.evaluation.recommendation, reasoning: data.evaluation.reasoning, notes: form.notes } } : r)));
  }

  return (
    <>
      <PageHeader
        eyebrow="Interview Evaluation Agent"
        title="Interview Evaluation"
        subtitle="Interviewers record ratings and notes; the agent normalises them against the role bar and produces a structured summary with a reasoned recommendation. The hiring decision stays with the hiring manager."
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card title="Interviews" subtitle={`${rows.length} in scope`}>
          <div className="max-h-[640px] divide-y divide-[#f5f4f7] overflow-y-auto">
            {rows.length === 0 && <p className="px-5 py-8 text-center text-[12.5px] text-[#9892a2]">Loading interviews…</p>}
            {rows.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setActive(r.id);
                  setResult(null);
                }}
                className={`block w-full px-4 py-3 text-left transition ${active === r.id ? 'bg-brand-50/60' : 'hover:bg-[#fcfbfd]'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-semibold text-ink-950">{r.candidate}</span>
                  {r.feedback?.recommendation
                    ? <Badge tone={r.feedback.recommendation.includes('Strong') ? 'mint' : r.feedback.recommendation === 'No Hire' ? 'rose' : 'brand'}>{r.feedback.recommendation}</Badge>
                    : <Badge tone="amber">Pending</Badge>}
                </div>
                <div className="mt-0.5 text-[11.5px] text-[#9892a2]">{r.round} · {r.job}</div>
                <div className="text-[11px] text-[#a7a1b1]">{r.interviewer} · {r.when}</div>
              </button>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          {!current && <Card><p className="px-5 py-12 text-center text-[13px] text-[#9892a2]">Select an interview to record or review feedback.</p></Card>}

          {current && (
            <>
              <Card title={`${current.candidate} — ${current.round}`} subtitle={`${current.job} · interviewed by ${current.interviewer}`} actions={<Link href={`/candidates/${current.candidateId}`} className="btn-ghost">Candidate profile</Link>}>
                <div className="space-y-4 p-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {([
                      ['technical', 'Technical'],
                      ['problemSolving', 'Problem solving'],
                      ['communication', 'Communication'],
                      ['leadership', 'Leadership'],
                    ] as const).map(([key, label]) => (
                      <div key={key}>
                        <div className="mb-1.5 flex items-center justify-between text-[12.5px]">
                          <span className="font-medium text-ink-800">{label}</span>
                          <span className="font-semibold text-brand-600">{form[key]}/10</span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={10}
                          value={form[key]}
                          onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
                          className="w-full accent-brand-600"
                        />
                      </div>
                    ))}
                  </div>

                  <label className="block">
                    <span className="mb-1.5 block text-[12px] font-medium text-ink-800">Interview notes</span>
                    <textarea className="input min-h-[90px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="What was covered, how the candidate approached it, specific examples…" />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-[12px] font-medium text-ink-800">Technical feedback</span>
                      <textarea className="input min-h-[80px]" value={form.technicalFeedback} onChange={(e) => setForm({ ...form, technicalFeedback: e.target.value })} />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-[12px] font-medium text-ink-800">Behavioural feedback</span>
                      <textarea className="input min-h-[80px]" value={form.behavioralFeedback} onChange={(e) => setForm({ ...form, behavioralFeedback: e.target.value })} />
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button className="btn-primary" onClick={submit} disabled={busy}>{busy ? 'Summarising…' : 'Submit & summarise with AI'}</button>
                    {busy && <Spinner />}
                  </div>
                  {error && <p className="text-[12px] text-rose-600">{error}</p>}
                </div>
              </Card>

              {(result || current.feedback?.aiSummary) && (
                <Card title="Evaluation summary" actions={<Badge tone={(result?.recommendation ?? current.feedback?.recommendation ?? '').includes('Strong') ? 'mint' : 'brand'}>{result?.recommendation ?? current.feedback?.recommendation}</Badge>}>
                  <div className="space-y-4 p-5">
                    {result && (
                      <div className="grid gap-3 sm:grid-cols-4">
                        {([
                          ['Technical', form.technical],
                          ['Problem solving', form.problemSolving],
                          ['Communication', form.communication],
                          ['Leadership', form.leadership],
                        ] as const).map(([l, v]) => (
                          <div key={l} className="rounded-lg border border-[#ebe9ef] px-3.5 py-2.5">
                            <div className="kpi-label">{l}</div>
                            <div className="mt-0.5 text-[17px] font-semibold text-ink-950">{v}/10</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {result && <Meter value={result.average * 10} label={`Panel average against role bar of ${result.bar}/10`} right={`${result.average}/10`} />}
                    <AIPanel title="Summary">{result?.summary ?? current.feedback?.aiSummary}</AIPanel>
                    <div className="rounded-lg border border-[#ebe9ef] bg-[#fcfbfd] p-3.5">
                      <div className="kpi-label mb-1.5">Reasoning behind the recommendation</div>
                      <p className="text-[12.5px] leading-relaxed text-[#5b5367]">{result?.reasoning ?? current.feedback?.reasoning}</p>
                    </div>
                    <GuardrailNote>
                      The recommendation is advisory. The hiring manager records the final decision, and it is written to
                      the audit log against their name.
                    </GuardrailNote>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
