'use client';

import Link from 'next/link';
import { AIPanel, Badge, ExplainBlock, GuardrailNote, Meter, ScoreRing, Table } from './ui';
import { stageTone } from '@/lib/tone';
import type { AgentRun, Candidate, Employee, Interview, InterviewQuestion, Job, ScreeningResult } from '@/lib/types';

export interface ResultBlock {
  kind: string;
  title: string;
  data: unknown;
}

const CATEGORY_TONE: Record<string, 'brand' | 'cyan' | 'mint' | 'amber' | 'violet'> = {
  Technical: 'brand',
  Scenario: 'cyan',
  Behavioral: 'violet',
  'Problem Solving': 'amber',
  Leadership: 'mint',
  Culture: 'neutral' as never,
};

/* ------------------------------------------------------------------ */
/* Agent workflow visualisation                                        */
/* ------------------------------------------------------------------ */
export function AgentFlow({ run }: { run: AgentRun }) {
  const statusStyle: Record<string, string> = {
    Completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    Processing: 'border-brand-200 bg-brand-50 text-brand-700',
    Waiting: 'border-[#ebe9ef] bg-[#f8f7fa] text-[#898294]',
    'Needs Approval': 'border-amber-200 bg-amber-50 text-amber-700',
    Failed: 'border-rose-200 bg-rose-50 text-rose-600',
    Idle: 'border-[#ebe9ef] bg-white text-[#898294]',
  };
  return (
    <div className="space-y-2">
      {run.tasks.map((t, i) => (
        <div key={t.id} className="relative flex gap-3 fade-in" style={{ animationDelay: `${i * 60}ms` }}>
          <div className="flex flex-col items-center">
            <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold ${statusStyle[t.status]}`}>
              {t.status === 'Completed' ? '✓' : t.status === 'Failed' ? '!' : t.status === 'Needs Approval' ? '⏸' : i + 1}
            </span>
            {i < run.tasks.length - 1 && <span className="my-0.5 w-px flex-1 bg-[#ebe9ef]" />}
          </div>
          <div className={`mb-1 flex-1 rounded-lg border px-3.5 py-2.5 ${statusStyle[t.status]}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12.5px] font-semibold">{t.label}</span>
              <span className="flex items-center gap-2 text-[10.5px] font-medium opacity-70">
                {t.durationMs}ms · {t.status}
              </span>
            </div>
            {t.summary && <p className="mt-1 text-[12px] leading-relaxed opacity-85">{t.summary}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Block renderer                                                      */
/* ------------------------------------------------------------------ */
export function ResultBlocks({ blocks }: { blocks: ResultBlock[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((b, i) => (
        <div key={i} className="card overflow-hidden fade-in" style={{ animationDelay: `${i * 80}ms` }}>
          <header className="border-b border-[#f2f0f4] bg-[#fcfcfd] px-5 py-3">
            <h3 className="section-title">{b.title}</h3>
          </header>
          <div className="p-5">
            <Block block={b} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Block({ block }: { block: ResultBlock }) {
  const d = block.data as never;
  switch (block.kind) {
    case 'workforce':
      return <WorkforceBlock data={d} />;
    case 'jd':
      return <JDBlock data={d} />;
    case 'ranked-candidates':
      return <RankedBlock data={d} />;
    case 'questions':
      return <QuestionsBlock data={d} />;
    case 'onboarding':
      return <OnboardingBlock data={d} />;
    case 'leave':
      return <LeaveBlock data={d} />;
    case 'policy-answer':
      return <PolicyBlock data={d} />;
    case 'gaps':
      return <GapsBlock data={d} />;
    case 'gap-cohort':
      return <GapCohortBlock data={d} />;
    case 'internal':
      return <InternalBlock data={d} />;
    case 'report':
      return <ReportBlock data={d} />;
    case 'retention':
      return <RetentionBlock data={d} />;
    case 'engagement':
      return <EngagementBlock data={d} />;
    case 'performance':
      return <PerformanceBlock data={d} />;
    case 'offboarding':
      return <OffboardingBlock data={d} />;
    case 'interviews':
      return <InterviewsBlock data={d} />;
    case 'slots':
      return <SlotsBlock data={d} />;
    case 'email-applications':
      return <EmailApplicationsBlock data={d} />;
    default:
      return <pre className="overflow-x-auto text-[11px] text-[#71697d]">{JSON.stringify(d, null, 2)}</pre>;
  }
}

/* ------------------------------- blocks ------------------------------ */

function WorkforceBlock({ data }: { data: { driver: string; priority: string; roles: { title: string; seniority: string; count: number; skills: string[]; rationale: string }[]; shortages: { skill: string; holders: number; advanced: number; coverage: number; severity: string }[]; justification: string } }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="brand">{data.driver}</Badge>
        <Badge tone={data.priority === 'Critical' ? 'rose' : data.priority === 'High' ? 'amber' : 'neutral'}>Priority: {data.priority}</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {data.roles.map((r) => (
          <div key={r.title} className="rounded-lg border border-[#ebe9ef] p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[13.5px] font-semibold text-ink-950">{r.title}</div>
                <div className="text-[11.5px] text-[#9892a2]">{r.seniority} · {r.count} opening{r.count > 1 ? 's' : ''}</div>
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1">
              {r.skills.map((s) => (
                <span key={s} className="rounded bg-[#f4f2f6] px-1.5 py-0.5 text-[10.5px] font-medium text-[#6b6377]">{s}</span>
              ))}
            </div>
            <p className="mt-2.5 text-[12px] leading-relaxed text-[#898294]">{r.rationale}</p>
          </div>
        ))}
      </div>
      <div>
        <div className="kpi-label mb-2">Live skill-shortage scan across the current workforce</div>
        <Table head={['Skill', 'Holders', 'Advanced+', 'Coverage', 'Status']}>
          {data.shortages.map((s) => (
            <tr key={s.skill}>
              <td className="td font-medium">{s.skill}</td>
              <td className="td">{s.holders}</td>
              <td className="td">{s.advanced}</td>
              <td className="td">{s.coverage}%</td>
              <td className="td"><Badge tone={s.severity === 'Critical' ? 'rose' : s.severity === 'Watch' ? 'amber' : 'mint'}>{s.severity}</Badge></td>
            </tr>
          ))}
        </Table>
      </div>
      <AIPanel title="Hiring justification">{data.justification}</AIPanel>
    </div>
  );
}

function JDBlock({ data }: { data: ReturnType<typeof Object> & Record<string, never> }) {
  const jd = data as unknown as {
    title: string; seniority: string; location: string; employmentType: string; openings: number; minExperience: number;
    summary: string; responsibilities: string[]; mandatorySkills: string[]; preferredSkills: string[]; education: string;
    evaluationCriteria: { criterion: string; weight: number }[];
    inclusiveLanguage: { status: string; flags: string[]; note: string }; notice: string;
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[16px] font-semibold text-ink-950">{jd.title}</span>
        <Badge tone="neutral">{jd.seniority}</Badge>
        <Badge tone="neutral">{jd.location}</Badge>
        <Badge tone="neutral">{jd.employmentType}</Badge>
        <Badge tone="neutral">{jd.minExperience}+ yrs</Badge>
      </div>
      <p className="text-[13.5px] leading-relaxed text-[#5b5367]">{jd.summary}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="kpi-label mb-2">Responsibilities</div>
          <ul className="space-y-1.5">
            {jd.responsibilities.map((r) => (
              <li key={r} className="flex gap-2 text-[12.5px] leading-relaxed text-[#5b5367]">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-brand-500" />{r}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3.5">
          <div>
            <div className="kpi-label mb-1.5">Mandatory skills</div>
            <div className="flex flex-wrap gap-1">
              {jd.mandatorySkills.map((s) => <span key={s} className="rounded bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">{s}</span>)}
            </div>
          </div>
          <div>
            <div className="kpi-label mb-1.5">Preferred skills</div>
            <div className="flex flex-wrap gap-1">
              {jd.preferredSkills.map((s) => <span key={s} className="rounded bg-[#f4f2f6] px-2 py-0.5 text-[11px] font-medium text-[#6b6377]">{s}</span>)}
            </div>
          </div>
          <div>
            <div className="kpi-label mb-1.5">Evaluation criteria (drive candidate scoring)</div>
            <div className="space-y-1.5">
              {jd.evaluationCriteria.map((c) => <Meter key={c.criterion} value={c.weight * 2.5} label={c.criterion} right={`${c.weight}%`} tone="bg-brand-500" />)}
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={`rounded-lg border p-3.5 ${jd.inclusiveLanguage.status === 'Passed' ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/60'}`}>
          <div className="mb-1 flex items-center gap-2 text-[12px] font-semibold text-ink-900">
            Inclusive-language check <Badge tone={jd.inclusiveLanguage.status === 'Passed' ? 'mint' : 'amber'}>{jd.inclusiveLanguage.status}</Badge>
          </div>
          <p className="text-[12px] leading-relaxed text-[#6b6377]">{jd.inclusiveLanguage.note}</p>
        </div>
        <GuardrailNote>{jd.notice}</GuardrailNote>
      </div>
    </div>
  );
}

function RankedBlock({ data }: { data: { job: Job; ranked: { candidate: Candidate; screening: ScreeningResult }[] } }) {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {data.ranked.map((r, i) => (
          <div key={r.candidate.id} className="rounded-lg border border-[#ebe9ef] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-600 text-[11px] font-bold text-white">{i + 1}</span>
                <div>
                  <Link href={`/candidates/${r.candidate.id}`} className="text-[14px] font-semibold text-ink-950 hover:text-brand-600">{r.candidate.name}</Link>
                  <div className="text-[12px] text-[#898294]">
                    {r.candidate.currentTitle} · {r.candidate.currentCompany} · {r.candidate.experienceYears} yrs · {r.candidate.location}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={r.screening.recommendation === 'Advance' ? 'mint' : r.screening.recommendation === 'Review' ? 'amber' : 'neutral'}>
                  {r.screening.recommendation}
                </Badge>
                <ScoreRing value={r.screening.overall} size={54} />
              </div>
            </div>
            <div className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {r.screening.breakdown.map((b) => (
                <Meter key={b.label} value={b.score} label={`${b.label} (${b.weight}%)`} right={`${b.score}%`} />
              ))}
            </div>
            <details className="mt-3 group">
              <summary className="cursor-pointer text-[12px] font-medium text-brand-600 hover:underline">Why this score?</summary>
              <div className="mt-2.5 space-y-2.5">
                <ExplainBlock items={r.screening.breakdown.map((b) => `${b.label} — ${b.score}%: ${b.evidence}`)} title="Evidence per dimension" />
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <ExplainBlock items={r.screening.strengths} title="Strengths" />
                  <ExplainBlock items={r.screening.concerns} title="Gaps & concerns" />
                </div>
                <GuardrailNote>
                  Excluded from scoring: {r.screening.attributesExcluded.join(', ')}. No candidate is advanced or rejected automatically — shortlisting requires human approval.
                </GuardrailNote>
              </div>
            </details>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/compare?job=${data.job.id}`} className="btn-ghost">Compare candidates</Link>
        <Link href="/approvals" className="btn-primary">Review shortlist approval</Link>
      </div>
    </div>
  );
}

function QuestionsBlock({ data }: { data: { candidate: Candidate; questions: InterviewQuestion[] } }) {
  return (
    <div className="space-y-3">
      {data.questions.map((q, i) => (
        <div key={i} className="rounded-lg border border-[#ebe9ef] p-4">
          <div className="mb-2 flex items-center gap-2">
            <Badge tone={CATEGORY_TONE[q.category] ?? 'neutral'}>{q.category}</Badge>
            <span className="text-[11px] text-[#a7a1b1]">Q{i + 1}</span>
          </div>
          <p className="text-[13.5px] font-medium leading-relaxed text-ink-950">{q.question}</p>
          <p className="mt-2 text-[12px] leading-relaxed text-[#898294]"><span className="font-semibold text-[#6b6377]">Why ask this: </span>{q.rationale}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {q.lookFor.map((l) => <span key={l} className="rounded bg-[#f8f7fa] px-2 py-0.5 text-[11px] text-[#6b6377]">✓ {l}</span>)}
          </div>
        </div>
      ))}
      <GuardrailNote>Questions are generated from the job description and the candidate&apos;s own claims. No question touches protected attributes or personal circumstances.</GuardrailNote>
    </div>
  );
}

function OnboardingBlock({ data }: { data: { tasks: { id: string; task: string; owner: string; category: string; day: number; dueDate: string }[]; documents: string[]; it: string[] } }) {
  return (
    <div className="space-y-4">
      <Table head={['Day', 'Task', 'Owner', 'Function', 'Due']}>
        {data.tasks.map((t) => (
          <tr key={t.id}>
            <td className="td font-mono text-[12px] text-[#898294]">{t.day > 0 ? `D+${t.day}` : `D${t.day}`}</td>
            <td className="td font-medium">{t.task}</td>
            <td className="td text-[#71697d]">{t.owner}</td>
            <td className="td"><Badge tone="neutral">{t.category}</Badge></td>
            <td className="td text-[#898294]">{t.dueDate}</td>
          </tr>
        ))}
      </Table>
      <div className="grid gap-3 md:grid-cols-2">
        <ExplainBlock items={data.documents} title="Document & verification checklist" />
        <ExplainBlock items={data.it} title="IT access checklist" />
      </div>
    </div>
  );
}

function LeaveBlock({ data }: { data: { type: string; from: string; to: string; days: number; balance: number; balanceAfter: number; conflicts: string[]; approver: Employee; policy: { title: string; version: string }; employee: Employee } }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ['Type', data.type],
          ['From', data.from],
          ['To', data.to],
          ['Working days', String(data.days)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-[#ebe9ef] px-3.5 py-2.5">
            <div className="kpi-label">{k}</div>
            <div className="mt-0.5 text-[14px] font-semibold text-ink-950">{v}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-[#ebe9ef] p-3.5">
          <div className="kpi-label mb-2">Balance impact</div>
          <div className="flex items-center gap-3 text-[14px] font-semibold text-ink-950">
            {data.balance} days <span className="text-[#a7a1b1]">→</span> <span className={data.balanceAfter < 0 ? 'text-rose-500' : 'text-mint-600'}>{data.balanceAfter} days</span>
          </div>
        </div>
        <div className="rounded-lg border border-[#ebe9ef] p-3.5">
          <div className="kpi-label mb-2">Routed to</div>
          <div className="text-[14px] font-semibold text-ink-950">{data.approver.name}</div>
          <div className="text-[12px] text-[#898294]">{data.approver.title}</div>
        </div>
      </div>
      {data.conflicts.length > 0 && <ExplainBlock items={data.conflicts} title="Conflicts detected" />}
      <GuardrailNote>Governed by {data.policy.title} ({data.policy.version}). The agent prepares and routes the request — approval rests with the line manager.</GuardrailNote>
    </div>
  );
}

function PolicyBlock({ data }: { data: { answer: string; citations: { id: string; title: string; version: string; passage: string }[]; confidence: number; escalate: boolean } }) {
  return (
    <div className="space-y-3.5">
      <div className="prose-hr text-[13.5px] leading-relaxed text-[#4e465a]">
        {data.answer.split('\n\n').map((p, i) => <p key={i} dangerouslySetInnerHTML={{ __html: p.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />)}
      </div>
      {data.citations.length > 0 && (
        <div>
          <div className="kpi-label mb-2">Sources retrieved from the HR knowledge base</div>
          <div className="space-y-2">
            {data.citations.map((c) => (
              <Link key={c.id} href={`/policies#${c.id}`} className="block rounded-lg border border-[#ebe9ef] bg-[#fcfbfd] p-3 transition hover:border-brand-200">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-semibold text-ink-900">{c.title}</span>
                  <Badge tone="neutral">{c.version}</Badge>
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-[#898294]">{c.passage}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={data.confidence > 0.7 ? 'mint' : 'amber'}>Retrieval confidence {(data.confidence * 100).toFixed(0)}%</Badge>
        {data.escalate && <Badge tone="rose">Escalated to a human HR partner</Badge>}
      </div>
    </div>
  );
}

function GapsBlock({ data }: { data: { employee: Employee; analysis: { targetRole: string; readiness: number; gaps: { skill: string; current: string; required: string }[]; courses: { id: string; title: string; provider: string; hours: number; format: string }[]; roadmap: { phase: string; weeks: string; items: string[] }[]; explanation: string } } }) {
  const a = data.analysis;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <ScoreRing value={a.readiness} size={70} label="Readiness" />
        <div>
          <div className="text-[15px] font-semibold text-ink-950">{data.employee.name} → {a.targetRole}</div>
          <div className="text-[12.5px] text-[#898294]">{data.employee.title} · {a.gaps.length} skill gap{a.gaps.length === 1 ? '' : 's'} remaining</div>
        </div>
      </div>
      {a.gaps.length > 0 && (
        <Table head={['Skill', 'Current', 'Required']}>
          {a.gaps.map((g) => (
            <tr key={g.skill}>
              <td className="td font-medium">{g.skill}</td>
              <td className="td"><Badge tone={g.current === 'None' ? 'rose' : 'neutral'}>{g.current}</Badge></td>
              <td className="td"><Badge tone="brand">{g.required}</Badge></td>
            </tr>
          ))}
        </Table>
      )}
      <div className="grid gap-3 md:grid-cols-3">
        {a.roadmap.map((p) => (
          <div key={p.phase} className="rounded-lg border border-[#ebe9ef] p-3.5">
            <div className="text-[12.5px] font-semibold text-ink-950">{p.phase}</div>
            <div className="text-[11px] text-[#a7a1b1]">{p.weeks}</div>
            <ul className="mt-2 space-y-1.5">
              {p.items.map((i) => <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-[#6b6377]"><span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-accent-500" />{i}</li>)}
            </ul>
          </div>
        ))}
      </div>
      {a.courses.length > 0 && (
        <div>
          <div className="kpi-label mb-2">Matched interventions</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {a.courses.map((c) => (
              <div key={c.id} className="rounded-lg border border-[#ebe9ef] px-3.5 py-2.5">
                <div className="text-[12.5px] font-medium text-ink-950">{c.title}</div>
                <div className="text-[11.5px] text-[#9892a2]">{c.provider} · {c.hours}h · {c.format}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <AIPanel title="How this was calculated">{a.explanation}</AIPanel>
    </div>
  );
}

function GapCohortBlock({ data }: { data: { targetRole: string; cohort: { employee: Employee; analysis: { readiness: number; gaps: { skill: string }[] } }[] } }) {
  return (
    <Table head={['Employee', 'Role', 'Readiness', 'Top gaps']}>
      {data.cohort.map((c) => (
        <tr key={c.employee.id}>
          <td className="td font-medium"><Link href={`/employees/${c.employee.id}`} className="link">{c.employee.name}</Link></td>
          <td className="td text-[#71697d]">{c.employee.title}</td>
          <td className="td w-40"><Meter value={c.analysis.readiness} right={`${c.analysis.readiness}%`} /></td>
          <td className="td">
            <div className="flex flex-wrap gap-1">
              {c.analysis.gaps.slice(0, 3).map((g) => <span key={g.skill} className="rounded bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-medium text-amber-700">{g.skill}</span>)}
            </div>
          </td>
        </tr>
      ))}
    </Table>
  );
}

function InternalBlock({ data }: { data: { employee: Employee; score: number; readiness: number; gaps: { skill: string; current: string; required: string }[]; explanation: string }[] }) {
  return (
    <div className="space-y-3">
      {data.map((r, i) => (
        <div key={r.employee.id} className="rounded-lg border border-[#ebe9ef] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-600 text-[11px] font-bold text-white">{i + 1}</span>
              <div>
                <Link href={`/employees/${r.employee.id}`} className="text-[14px] font-semibold text-ink-950 hover:text-brand-600">{r.employee.name}</Link>
                <div className="text-[12px] text-[#898294]">{r.employee.title} · performance {r.employee.performanceScore}/5 · {r.employee.tenureMonths} months tenure</div>
              </div>
            </div>
            <ScoreRing value={r.score} size={54} />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {r.gaps.map((g) => <span key={g.skill} className="rounded bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">{g.skill}: {g.current} → {g.required}</span>)}
          </div>
          <p className="mt-2.5 text-[12px] leading-relaxed text-[#898294]">{r.explanation}</p>
        </div>
      ))}
      <GuardrailNote>Internal matching supports succession planning. No promotion, demotion or role change is made automatically.</GuardrailNote>
    </div>
  );
}

function ReportBlock({ data }: { data: { openJobs: number; openings: number; funnel: Record<string, number>; avgMatch: number; timeToHire: number; costPerHire: string; offerAcceptance: number; byDepartment: Record<string, number> } }) {
  const stages = Object.entries(data.funnel);
  const max = Math.max(...stages.map(([, v]) => v), 1);
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ['Open requisitions', data.openJobs],
          ['Total openings', data.openings],
          ['Time to hire', `${data.timeToHire} days`],
          ['Cost per hire', data.costPerHire],
          ['Offer acceptance', `${data.offerAcceptance}%`],
        ].map(([k, v]) => (
          <div key={String(k)} className="rounded-lg border border-[#ebe9ef] px-3.5 py-2.5">
            <div className="kpi-label">{k}</div>
            <div className="mt-0.5 text-[16px] font-semibold text-ink-950">{v}</div>
          </div>
        ))}
      </div>
      <div>
        <div className="kpi-label mb-2.5">Hiring funnel</div>
        <div className="space-y-2">
          {stages.map(([k, v]) => (
            <div key={k} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-[12px] text-[#6b6377]">{k}</span>
              <div className="h-6 flex-1 overflow-hidden rounded bg-[#f4f2f6]">
                <div className="flex h-full items-center justify-end rounded bg-gradient-to-r from-brand-500 to-accent-500 px-2 text-[11px] font-semibold text-white transition-all duration-700" style={{ width: `${Math.max(8, (v / max) * 100)}%` }}>{v}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="kpi-label mb-2">Open positions by department</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(data.byDepartment).map(([k, v]) => (
            <span key={k} className="rounded-lg border border-[#ebe9ef] px-3 py-1.5 text-[12px] text-[#6b6377]">{k} · <span className="font-semibold text-ink-900">{v}</span></span>
          ))}
        </div>
      </div>
    </div>
  );
}

function RetentionBlock({ data }: { data: { high: { employee: Employee; risk: { level: string; score: number; factors: { factor: string; impact: number; detail: string }[]; supportiveActions: string[]; guardrail: string } }[]; counts: { high: number; medium: number; low: number } } }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-rose-200 bg-rose-50/60 px-3.5 py-2.5"><div className="kpi-label">High risk</div><div className="text-[20px] font-semibold text-rose-600">{data.counts.high}</div></div>
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3.5 py-2.5"><div className="kpi-label">Medium risk</div><div className="text-[20px] font-semibold text-amber-600">{data.counts.medium}</div></div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3.5 py-2.5"><div className="kpi-label">Low risk</div><div className="text-[20px] font-semibold text-emerald-600">{data.counts.low}</div></div>
      </div>
      <div className="space-y-3">
        {data.high.map((h) => (
          <div key={h.employee.id} className="rounded-lg border border-[#ebe9ef] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <Link href={`/employees/${h.employee.id}`} className="text-[13.5px] font-semibold text-ink-950 hover:text-brand-600">{h.employee.name}</Link>
                <div className="text-[12px] text-[#898294]">{h.employee.title}</div>
              </div>
              <Badge tone={h.risk.level === 'High' ? 'rose' : h.risk.level === 'Medium' ? 'amber' : 'mint'}>{h.risk.level} · {h.risk.score}</Badge>
            </div>
            <div className="mt-3 space-y-1.5">
              {h.risk.factors.map((f) => (
                <div key={f.factor} className="flex items-start gap-2.5">
                  <span className="mt-0.5 w-9 shrink-0 rounded bg-[#f4f2f6] px-1 py-0.5 text-center text-[10.5px] font-bold text-[#6b6377]">+{f.impact}</span>
                  <div className="text-[12px] leading-relaxed"><span className="font-medium text-ink-900">{f.factor}</span> — <span className="text-[#898294]">{f.detail}</span></div>
                </div>
              ))}
            </div>
            <details className="mt-2.5">
              <summary className="cursor-pointer text-[12px] font-medium text-brand-600">Suggested supportive actions</summary>
              <ul className="mt-2 space-y-1">
                {h.risk.supportiveActions.map((a) => <li key={a} className="flex gap-2 text-[12px] text-[#6b6377]"><span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-mint-500" />{a}</li>)}
              </ul>
            </details>
          </div>
        ))}
      </div>
      {data.high[0] && <GuardrailNote>{data.high[0].risk.guardrail}</GuardrailNote>}
    </div>
  );
}

function EngagementBlock({ data }: { data: { themes: { theme: string; responses: number; sentiment: number; trend: number; suppressed: boolean; sample: string[] }[]; trend: { quarter: string; sentiment: number }[]; actions: string[]; note: string } }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-4">
        {data.trend.map((t) => (
          <div key={t.quarter} className="rounded-lg border border-[#ebe9ef] px-3.5 py-2.5">
            <div className="kpi-label">{t.quarter}</div>
            <div className={`mt-0.5 text-[18px] font-semibold ${t.sentiment >= 0.2 ? 'text-mint-600' : t.sentiment >= 0 ? 'text-amberx-500' : 'text-rose-500'}`}>{t.sentiment > 0 ? '+' : ''}{t.sentiment}</div>
          </div>
        ))}
      </div>
      <Table head={['Theme', 'Responses', 'Sentiment', 'QoQ trend']}>
        {data.themes.map((t) => (
          <tr key={t.theme}>
            <td className="td font-medium">{t.theme}</td>
            <td className="td">{t.suppressed ? <Badge tone="neutral">suppressed</Badge> : t.responses}</td>
            <td className="td">{t.suppressed ? '—' : <span className={t.sentiment >= 0 ? 'text-mint-600' : 'text-rose-500'}>{t.sentiment > 0 ? '+' : ''}{t.sentiment}</span>}</td>
            <td className="td">{t.suppressed ? '—' : <span className={t.trend >= 0 ? 'text-mint-600' : 'text-rose-500'}>{t.trend > 0 ? '▲' : t.trend < 0 ? '▼' : '—'} {Math.abs(t.trend)}</span>}</td>
          </tr>
        ))}
      </Table>
      <ExplainBlock items={data.actions} title="Recommended management actions" />
      <GuardrailNote>{data.note}</GuardrailNote>
    </div>
  );
}

function PerformanceBlock({ data }: { data: { employee: Employee; pack: { summary: string; evidence: string[]; goalsAchieved: number; goalsTotal: number; strengths: string[]; developmentAreas: string[]; suggestedObjectives: string[]; suggestedRating: number; disclaimer: string } } }) {
  const p = data.pack;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-[#ebe9ef] px-3.5 py-2.5"><div className="kpi-label">Goals achieved</div><div className="mt-0.5 text-[18px] font-semibold text-ink-950">{p.goalsAchieved}/{p.goalsTotal}</div></div>
        <div className="rounded-lg border border-[#ebe9ef] px-3.5 py-2.5"><div className="kpi-label">Suggested rating (advisory)</div><div className="mt-0.5 text-[18px] font-semibold text-ink-950">{p.suggestedRating}/5</div></div>
        <div className="rounded-lg border border-[#ebe9ef] px-3.5 py-2.5"><div className="kpi-label">Cycle</div><div className="mt-0.5 text-[18px] font-semibold text-ink-950">H1 2026</div></div>
      </div>
      <AIPanel title="Performance summary">{p.summary}</AIPanel>
      <div className="grid gap-3 md:grid-cols-3">
        <ExplainBlock items={p.strengths} title="Key strengths" />
        <ExplainBlock items={p.developmentAreas} title="Development opportunities" />
        <ExplainBlock items={p.suggestedObjectives} title="Suggested next-quarter objectives" />
      </div>
      <ExplainBlock items={p.evidence} title="Evidence used" />
      <GuardrailNote>{p.disclaimer}</GuardrailNote>
    </div>
  );
}

function OffboardingBlock({ data }: { data: { employee: string; lastDay: string; tasks: { task: string; owner: string; dueDate: string }[]; note: string } }) {
  return (
    <div className="space-y-4">
      <Table head={['Task', 'Owner', 'Due']}>
        {data.tasks.map((t) => (
          <tr key={t.task}>
            <td className="td font-medium">{t.task}</td>
            <td className="td text-[#71697d]">{t.owner}</td>
            <td className="td text-[#898294]">{t.dueDate}</td>
          </tr>
        ))}
      </Table>
      <GuardrailNote>{data.note}</GuardrailNote>
    </div>
  );
}

function InterviewsBlock({ data }: { data: Interview[] }) {
  if (!data.length) return <p className="text-[13px] text-[#898294]">No interviews scheduled in this window.</p>;
  return (
    <Table head={['When', 'Round', 'Mode', 'Status']}>
      {data.map((i) => (
        <tr key={i.id}>
          <td className="td font-medium">{new Date(i.scheduledAt).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai' })}</td>
          <td className="td">{i.round}</td>
          <td className="td text-[#71697d]">{i.mode}</td>
          <td className="td"><Badge tone={stageTone(i.status)}>{i.status}</Badge></td>
        </tr>
      ))}
    </Table>
  );
}

function SlotsBlock({ data }: { data: { candidate: Candidate; interviewer: Employee; slots: { iso: string; label: string }[] } }) {
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-[#71697d]">Conflict-free availability for <span className="font-semibold text-ink-900">{data.interviewer.name}</span> with <span className="font-semibold text-ink-900">{data.candidate.name}</span>:</p>
      <div className="flex flex-wrap gap-2">
        {data.slots.map((s) => <span key={s.iso} className="rounded-lg border border-[#ebe9ef] bg-[#fcfbfd] px-3 py-1.5 text-[12.5px] font-medium text-ink-800">{s.label}</span>)}
      </div>
      <Link href="/interviews" className="btn-primary">Book in Interview Management</Link>
    </div>
  );
}

function EmailApplicationsBlock({ data }: { data: { scope: string; rows: { id: string; candidate: string; fromEmail: string; mailbox: string; receivedAt: string; status: string; reference: string | null; jobTitle: string | null; jobCode: string | null; score: number | null; recommendation: string | null; attachment: string | null; duplicate: boolean }[] } }) {
  if (!data.rows.length)
    return <p className="text-[13px] text-[#898294]">No applications in scope. Open the Recruitment Inbox to simulate one through the intake pipeline.</p>;
  return (
    <div className="space-y-3">
      <Table head={['Received', 'Candidate', 'Applied position', 'Job ID', 'CV', 'Match', 'Status']}>
        {data.rows.map((r) => (
          <tr key={r.id}>
            <td className="td whitespace-nowrap text-[12px] text-[#898294]">
              {new Date(r.receivedAt).toLocaleString('en-GB', { timeZone: 'Asia/Dubai', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </td>
            <td className="td">
              <Link href={`/inbox/${r.id}`} className="font-medium text-ink-950 hover:text-brand-600">{r.candidate}</Link>
              <div className="text-[11px] text-[#9892a2]">{r.fromEmail} · {r.mailbox}</div>
              {r.duplicate && <Badge tone="violet">Linked to existing profile</Badge>}
            </td>
            <td className="td text-[#71697d]">{r.jobTitle ?? <Badge tone="amber">Unassigned</Badge>}</td>
            <td className="td font-mono text-[11.5px] text-[#898294]">{r.jobCode ?? '—'}</td>
            <td className="td text-[11.5px] text-[#6b6377]">{r.attachment ?? <span className="text-rose-500">None</span>}</td>
            <td className="td w-32">{r.score !== null ? <Meter value={r.score} right={`${r.score}%`} /> : <span className="text-[#ccc8d3]">—</span>}</td>
            <td className="td"><Badge tone={stageTone(r.status === 'Needs Assignment' || r.status === 'Needs Review' ? 'Pending' : r.status)} dot>{r.status}</Badge></td>
          </tr>
        ))}
      </Table>
      <div className="flex flex-wrap gap-2">
        <Link href="/inbox" className="btn-ghost">Open Recruitment Inbox</Link>
      </div>
      <GuardrailNote>
        Every application above arrived by email and was parsed, matched and screened automatically. None has been
        shortlisted or rejected — those decisions require a named recruiter.
      </GuardrailNote>
    </div>
  );
}
