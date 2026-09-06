'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AIPanel, Badge, Card, ExplainBlock, GuardrailNote, Kpi, Meter, PageHeader, ScoreRing, Spinner, Table } from '@/components/ui';

const TARGET_ROLES = ['Senior Cloud Engineer', 'Cloud Platform Lead', 'Senior DevOps Engineer', 'Engineering Manager', 'Finance Manager'];

interface Analysis {
  targetRole: string;
  readiness: number;
  gaps: { skill: string; current: string; required: string }[];
  courses: { id: string; title: string; provider: string; hours: number; format: string; level: string; completionRate: number }[];
  roadmap: { phase: string; weeks: string; items: string[] }[];
  explanation: string;
}

export default function Learning() {
  const [targetRole, setTargetRole] = useState('Senior Cloud Engineer');
  const [data, setData] = useState<{ employee: { id: string; name: string; title: string; trainingCompletion: number }; analysis: Analysis } | null>(null);
  const [internal, setInternal] = useState<{ employee: { id: string; name: string; title: string; performanceScore: number }; score: number; readiness: number; gaps: { skill: string; current: string; required: string }[]; explanation: string }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load(role: string) {
    setBusy(true);
    setError('');
    const res = await fetch('/api/learning', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetRole: role }) });
    const d = await res.json();
    if (!res.ok) setError(d.error ?? 'Failed to load.');
    else setData(d);

    const res2 = await fetch('/api/learning', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetRole: role, mode: 'internal-candidates', limit: 5 }) });
    if (res2.ok) setInternal((await res2.json()).ranked);
    else setInternal(null);
    setBusy(false);
  }

  useEffect(() => {
    load(targetRole);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const a = data?.analysis;

  return (
    <>
      <PageHeader
        eyebrow="Learning & Skills Agent"
        title="Learning & Skills"
        subtitle="The live skill graph, the distance between a person and a target role, and a sequenced development plan with matched courses, certifications, labs, mentoring and internal projects."
        actions={
          <select
            className="input w-60"
            value={targetRole}
            onChange={(e) => {
              setTargetRole(e.target.value);
              load(e.target.value);
            }}
          >
            {TARGET_ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        }
      />

      {busy && <Card className="mb-4"><div className="p-6"><Spinner label="Learning & Skills Agent computing gaps…" /></div></Card>}
      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-600">{error}</div>}

      {data && a && (
        <>
          <div className="mb-5 grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Kpi label="Role readiness" value={`${a.readiness}%`} hint={`vs ${a.targetRole}`} accent="brand" />
            <Kpi label="Skill gaps" value={a.gaps.length} accent="amber" />
            <Kpi label="Matched interventions" value={a.courses.length} accent="cyan" />
            <Kpi label="Training completion" value={`${data.employee.trainingCompletion}%`} hint="70% target" accent="mint" />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              <Card title={`Skill gap analysis — ${data.employee.name} → ${a.targetRole}`} subtitle={data.employee.title} actions={<ScoreRing value={a.readiness} size={50} />}>
                {a.gaps.length ? (
                  <Table head={['Skill', 'Current level', 'Required level', 'Distance']}>
                    {a.gaps.map((g) => (
                      <tr key={g.skill}>
                        <td className="td font-medium">{g.skill}</td>
                        <td className="td"><Badge tone={g.current === 'None' ? 'rose' : 'neutral'}>{g.current}</Badge></td>
                        <td className="td"><Badge tone="brand">{g.required}</Badge></td>
                        <td className="td text-[#898294]">{g.current === 'None' ? 'Not evidenced' : 'One level below'}</td>
                      </tr>
                    ))}
                  </Table>
                ) : (
                  <p className="px-5 py-8 text-center text-[13px] text-mint-600">No skill gaps remain against this target profile.</p>
                )}
              </Card>

              <Card title="Personalised learning roadmap">
                <div className="grid gap-3 p-5 md:grid-cols-3">
                  {a.roadmap.map((p) => (
                    <div key={p.phase} className="rounded-lg border border-[#ebe9ef] p-4">
                      <div className="text-[13px] font-semibold text-ink-950">{p.phase}</div>
                      <div className="text-[11px] text-[#a7a1b1]">{p.weeks}</div>
                      <ul className="mt-2.5 space-y-2">
                        {p.items.map((i) => <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-[#6b6377]"><span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-accent-500" />{i}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </Card>

              {a.courses.length > 0 && (
                <Card title="Matched interventions" subtitle="Courses, certifications, labs, mentoring and internal projects">
                  <Table head={['Programme', 'Provider', 'Format', 'Level', 'Hours', 'Org completion']}>
                    {a.courses.map((c) => (
                      <tr key={c.id}>
                        <td className="td font-medium">{c.title}</td>
                        <td className="td text-[#71697d]">{c.provider}</td>
                        <td className="td"><Badge tone={c.format === 'Certification' ? 'brand' : c.format === 'Internal Project' ? 'mint' : 'neutral'}>{c.format}</Badge></td>
                        <td className="td text-[#71697d]">{c.level}</td>
                        <td className="td">{c.hours}h</td>
                        <td className="td w-32"><Meter value={c.completionRate} right={`${c.completionRate}%`} /></td>
                      </tr>
                    ))}
                  </Table>
                </Card>
              )}

              <AIPanel title="How readiness was calculated">{a.explanation}</AIPanel>
            </div>

            <div className="space-y-4">
              {internal && (
                <Card title={`Internal succession — ${targetRole}`} subtitle="Ranked by skill readiness, performance and learning participation">
                  <div className="space-y-3 p-4">
                    {internal.map((r, i) => (
                      <div key={r.employee.id} className="rounded-lg border border-[#ebe9ef] p-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="mr-1.5 text-[11px] font-bold text-[#a7a1b1]">{i + 1}.</span>
                            <Link href={`/employees/${r.employee.id}`} className="text-[13px] font-semibold text-ink-950 hover:text-brand-600">{r.employee.name}</Link>
                            <div className="text-[11.5px] text-[#9892a2]">{r.employee.title} · {r.employee.performanceScore}/5</div>
                          </div>
                          <ScoreRing value={r.score} size={44} />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {r.gaps.slice(0, 3).map((g) => <span key={g.skill} className="rounded bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-medium text-amber-700">{g.skill}</span>)}
                        </div>
                      </div>
                    ))}
                    <GuardrailNote>Succession input only. No promotion or role change is made automatically, and development recommendations are never grounds for adverse action.</GuardrailNote>
                  </div>
                </Card>
              )}

              <Card title="How the skill graph works">
                <div className="space-y-2.5 p-4 text-[12px] leading-relaxed text-[#6b6377]">
                  <p><span className="font-semibold text-ink-900">Four levels.</span> Beginner, Intermediate, Advanced, Expert — held per person, per skill, and updated each performance cycle.</p>
                  <p><span className="font-semibold text-ink-900">Target profiles.</span> Each role defines the level it needs for each skill. Readiness is the average attainment against that profile.</p>
                  <p><span className="font-semibold text-ink-900">Largest gap first.</span> The roadmap sequences the biggest distances into foundations, applied practice and validation.</p>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </>
  );
}
