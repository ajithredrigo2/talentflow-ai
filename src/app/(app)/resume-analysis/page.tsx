'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Badge, Card, ExplainBlock, GuardrailNote, Kpi, Meter, PageHeader, ScoreRing, Spinner } from '@/components/ui';
import type { Candidate, Job, ScreeningResult } from '@/lib/types';

function Analysis() {
  const sp = useSearchParams();
  const [jobs, setJobs] = useState<{ id: string; title: string; location: string }[]>([]);
  const [jobId, setJobId] = useState(sp.get('job') ?? 'job-001');
  const [result, setResult] = useState<{ job: Job; ranked: { candidate: Candidate; screening: ScreeningResult }[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/health').then(() => {});
    // job list is small enough to inline from the screening response; seed the selector from a first run
    run(jobId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(id: string) {
    setBusy(true);
    setError('');
    const res = await fetch('/api/screen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobId: id }) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? 'Screening failed.');
    setResult(data);
    if (!jobs.length) setJobs(JOB_OPTIONS);
  }

  const advance = result?.ranked.filter((r) => r.screening.recommendation === 'Advance').length ?? 0;
  const review = result?.ranked.filter((r) => r.screening.recommendation === 'Review').length ?? 0;
  const avg = result?.ranked.length ? Math.round(result.ranked.reduce((a, r) => a + r.screening.overall, 0) / result.ranked.length) : 0;

  return (
    <>
      <PageHeader
        eyebrow="AI Resume Screening Agent"
        title="Resume Analysis"
        subtitle="Every candidate on a requisition scored against the same approved, weighted criteria — with the evidence behind each dimension. The agent recommends; it never advances or rejects anyone."
        actions={
          <div className="flex items-center gap-2">
            <select
              className="input w-56"
              value={jobId}
              onChange={(e) => {
                setJobId(e.target.value);
                run(e.target.value);
              }}
            >
              {JOB_OPTIONS.map((j) => <option key={j.id} value={j.id}>{j.title} — {j.location}</option>)}
            </select>
            <button className="btn-primary" onClick={() => run(jobId)} disabled={busy}>{busy ? 'Scoring…' : 'Re-run screening'}</button>
          </div>
        }
      />

      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-600">{error}</div>}
      {busy && <Card className="mb-4"><div className="p-6"><Spinner label="Screening Agent scoring the pipeline…" /></div></Card>}

      {result && (
        <>
          <div className="mb-5 grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Kpi label="Candidates screened" value={result.ranked.length} accent="brand" />
            <Kpi label="Recommended to advance" value={advance} hint="pending human approval" accent="mint" />
            <Kpi label="Flagged for review" value={review} accent="amber" />
            <Kpi label="Average match" value={`${avg}%`} accent="cyan" />
          </div>

          <div className="mb-4 rounded-xl border border-[#ebe9ef] bg-white p-4">
            <div className="kpi-label mb-2">Evaluation criteria in use — from the approved requisition</div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {result.job.evaluationCriteria.map((c) => <Meter key={c.criterion} value={c.weight * 2.5} label={c.criterion} right={`${c.weight}%`} tone="bg-brand-500" />)}
            </div>
          </div>

          <div className="space-y-3">
            {result.ranked.map((r, i) => (
              <Card key={r.candidate.id}>
                <div className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-[12px] font-bold text-white">{i + 1}</span>
                      <div>
                        <Link href={`/candidates/${r.candidate.id}`} className="text-[15px] font-semibold text-ink-950 hover:text-brand-600">{r.candidate.name}</Link>
                        <div className="text-[12.5px] text-[#898294]">
                          {r.candidate.currentTitle} · {r.candidate.currentCompany} · {r.candidate.experienceYears} yrs · {r.candidate.location} · notice {r.candidate.noticePeriodDays}d
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {r.screening.matchedSkills.map((s) => <span key={s} className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10.5px] font-medium text-emerald-700">✓ {s}</span>)}
                          {r.screening.missingSkills.map((s) => <span key={s} className="rounded bg-rose-50 px-1.5 py-0.5 text-[10.5px] font-medium text-rose-600">✕ {s}</span>)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge tone={r.screening.recommendation === 'Advance' ? 'mint' : r.screening.recommendation === 'Review' ? 'amber' : 'neutral'}>{r.screening.recommendation}</Badge>
                      <ScoreRing value={r.screening.overall} size={62} />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {r.screening.breakdown.map((b) => <Meter key={b.label} value={b.score} label={`${b.label} (${b.weight}%)`} right={`${b.score}%`} />)}
                  </div>

                  <details className="mt-3">
                    <summary className="cursor-pointer text-[12.5px] font-medium text-brand-600 hover:underline">Show full explanation</summary>
                    <div className="mt-3 space-y-3">
                      <ExplainBlock items={r.screening.breakdown.map((b) => `${b.label} — ${b.score}%: ${b.evidence}`)} title="Evidence per dimension" />
                      <div className="grid gap-3 md:grid-cols-3">
                        <ExplainBlock items={r.screening.strengths} title="Strengths" />
                        <ExplainBlock items={r.screening.concerns} title="Gaps & concerns" />
                        <ExplainBlock items={r.screening.interviewFocus} title="Interview focus" />
                      </div>
                      <div className="rounded-lg border border-[#ebe9ef] bg-[#fcfbfd] p-3.5 text-[12.5px] leading-relaxed text-[#5b5367]">{r.screening.explanation}</div>
                    </div>
                  </details>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-4">
            <GuardrailNote>
              Excluded from scoring across every candidate: gender, race / ethnicity, religion, nationality, disability,
              marital status, age, photograph and name-derived inferences. Shortlisting and rejection both require a
              named human approver, recorded in the audit log.
            </GuardrailNote>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/compare?job=${result.job.id}`} className="btn-ghost">Compare top candidates</Link>
            <Link href="/approvals" className="btn-primary">Go to approvals</Link>
          </div>
        </>
      )}
    </>
  );
}

const JOB_OPTIONS = [
  { id: 'job-001', title: 'Senior DevOps Engineer', location: 'Dubai' },
  { id: 'job-002', title: 'Cloud Security Engineer', location: 'Dubai' },
  { id: 'job-003', title: 'Cloud Engineer', location: 'Abu Dhabi' },
  { id: 'job-004', title: 'IT Security Analyst', location: 'Dubai' },
  { id: 'job-005', title: 'Systems Administrator', location: 'Dubai' },
  { id: 'job-006', title: 'Finance Manager', location: 'Dubai' },
  { id: 'job-007', title: 'Talent Acquisition Specialist', location: 'Dubai' },
  { id: 'job-008', title: 'Operations Manager', location: 'Riyadh' },
  { id: 'job-009', title: 'Demand Generation Manager', location: 'Dubai' },
  { id: 'job-010', title: 'Account Executive', location: 'Doha' },
];

export default function Page() {
  return (
    <Suspense fallback={<Spinner label="Loading…" />}>
      <Analysis />
    </Suspense>
  );
}
