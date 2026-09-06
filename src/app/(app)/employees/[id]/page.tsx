import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSession } from '../../session';
import { db } from '@/lib/store';
import { deptName, employees, empName, skillName } from '@/lib/seed';
import { analyseSkillGaps, assessRetentionRisk, buildPerformanceSummary } from '@/lib/agents/specialists';
import { AIPanel, Avatar, Badge, Card, ExplainBlock, GuardrailNote, Kpi, Meter, PageHeader, ScoreRing, Table } from '@/components/ui';
import { stageTone } from '@/lib/tone';

export const dynamic = 'force-dynamic';

export default async function EmployeeProfile({ params }: { params: Promise<{ id: string }> }) {
  await getSession('/employees');
  const { id } = await params;
  const e = employees.find((x) => x.id === id);
  if (!e) notFound();

  const risk = assessRetentionRisk(e);
  const perf = buildPerformanceSummary(e);
  const targetRole = e.title.includes('Cloud') ? 'Senior Cloud Engineer' : e.level === 'Manager' ? 'Engineering Manager' : 'Senior DevOps Engineer';
  const gaps = analyseSkillGaps(e, targetRole);
  const leave = db.leave.filter((l) => l.employeeId === e.id);

  return (
    <>
      <PageHeader
        eyebrow={`${deptName(e.departmentId)} · ${e.level}`}
        title={e.name}
        subtitle={`${e.title} · ${e.location} · joined ${new Date(e.joinDate).toLocaleDateString('en-GB', { timeZone: 'Asia/Dubai', month: 'long', year: 'numeric' })}`}
        actions={<Link href="/learning" className="btn-ghost">Learning plan</Link>}
      />

      <div className="mb-5 grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Kpi label="Performance" value={`${e.performanceScore.toFixed(1)}/5`} accent="mint" />
        <Kpi label="Engagement" value={`${e.engagementScore}/100`} accent="brand" />
        <Kpi label="Training completion" value={`${e.trainingCompletion}%`} accent="cyan" />
        <Kpi label="Tenure" value={`${Math.floor(e.tenureMonths / 12)}y ${e.tenureMonths % 12}m`} accent="amber" />
        <Kpi label="Retention risk" value={risk.level} hint={`score ${risk.score}`} accent={risk.level === 'High' ? 'rose' : risk.level === 'Medium' ? 'amber' : 'mint'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Card title="Skill profile">
            <Table head={['Skill', 'Level', 'Relevance to target role']}>
              {e.skills.map((s) => (
                <tr key={s.skillId}>
                  <td className="td font-medium">{skillName(s.skillId)}</td>
                  <td className="td"><Badge tone={s.level === 'Expert' ? 'mint' : s.level === 'Advanced' ? 'brand' : 'neutral'}>{s.level}</Badge></td>
                  <td className="td text-[#898294]">{gaps.gaps.some((g) => g.skill === skillName(s.skillId)) ? 'Below target level' : 'Meets target'}</td>
                </tr>
              ))}
            </Table>
          </Card>

          <Card title={`Development path → ${targetRole}`} subtitle="Learning & Skills Agent" actions={<ScoreRing value={gaps.readiness} size={48} />}>
            <div className="space-y-4 p-5">
              {gaps.gaps.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {gaps.gaps.map((g) => <span key={g.skill} className="rounded bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">{g.skill}: {g.current} → {g.required}</span>)}
                </div>
              )}
              <div className="grid gap-3 md:grid-cols-3">
                {gaps.roadmap.map((p) => (
                  <div key={p.phase} className="rounded-lg border border-[#ebe9ef] p-3.5">
                    <div className="text-[12.5px] font-semibold text-ink-950">{p.phase}</div>
                    <div className="text-[11px] text-[#a7a1b1]">{p.weeks}</div>
                    <ul className="mt-2 space-y-1.5">
                      {p.items.map((i) => <li key={i} className="flex gap-2 text-[11.5px] leading-relaxed text-[#6b6377]"><span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-accent-500" />{i}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
              <AIPanel title="How readiness was calculated">{gaps.explanation}</AIPanel>
            </div>
          </Card>

          <Card title="Performance review pack" subtitle="Performance Management Agent · advisory only">
            <div className="space-y-4 p-5">
              <AIPanel title="Summary">{perf.summary}</AIPanel>
              <div className="grid gap-3 md:grid-cols-3">
                <ExplainBlock items={perf.strengths} title="Key strengths" />
                <ExplainBlock items={perf.developmentAreas} title="Development opportunities" />
                <ExplainBlock items={perf.suggestedObjectives} title="Suggested objectives" />
              </div>
              <ExplainBlock items={perf.evidence} title="Evidence used" />
              <GuardrailNote>{perf.disclaimer}</GuardrailNote>
            </div>
          </Card>

          {leave.length > 0 && (
            <Card title="Leave history">
              <Table head={['Type', 'From', 'To', 'Days', 'Status']}>
                {leave.map((l) => (
                  <tr key={l.id}>
                    <td className="td font-medium">{l.type}</td>
                    <td className="td text-[#71697d]">{l.from}</td>
                    <td className="td text-[#71697d]">{l.to}</td>
                    <td className="td">{l.days}</td>
                    <td className="td"><Badge tone={stageTone(l.status)}>{l.status}</Badge></td>
                  </tr>
                ))}
              </Table>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <div className="flex flex-col items-center px-5 py-6 text-center">
              <Avatar name={e.name} size={64} />
              <div className="mt-3 text-[15px] font-semibold text-ink-950">{e.name}</div>
              <div className="text-[12.5px] text-[#898294]">{e.title}</div>
              <div className="mt-2.5"><Badge tone={stageTone(e.status)} dot>{e.status}</Badge></div>
            </div>
            <div className="divide-y divide-[#f5f4f7] border-t border-[#f2f0f4]">
              {[
                ['Employee ID', e.id],
                ['Department', deptName(e.departmentId)],
                ['Manager', e.managerId ? empName(e.managerId) : '—'],
                ['Location', e.location],
                ['Employment type', e.employmentType],
                ['Join date', e.joinDate],
                ['Probation ends', e.probationEnd ?? 'Completed'],
                ['Annual leave balance', `${e.leaveBalance.annual} days`],
                ['Sick leave balance', `${e.leaveBalance.sick} days`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-3 px-5 py-2.5 text-[12.5px]">
                  <span className="shrink-0 text-[#898294]">{k}</span><span className="text-right font-medium text-ink-900">{v}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Retention indicators" subtitle="Retention Risk Agent" actions={<Badge tone={stageTone(risk.level)}>{risk.level}</Badge>}>
            <div className="space-y-3 p-4">
              <Meter value={risk.score} label="Composite risk score" right={`${risk.score}/100`} tone={risk.level === 'High' ? 'bg-rose-500' : risk.level === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'} />
              <div className="space-y-2">
                {risk.factors.map((f) => (
                  <div key={f.factor} className="flex items-start gap-2.5">
                    <span className="mt-0.5 w-9 shrink-0 rounded bg-[#f4f2f6] px-1 py-0.5 text-center text-[10.5px] font-bold text-[#6b6377]">+{f.impact}</span>
                    <div className="text-[11.5px] leading-relaxed"><span className="font-medium text-ink-900">{f.factor}</span> — <span className="text-[#898294]">{f.detail}</span></div>
                  </div>
                ))}
              </div>
              <ExplainBlock items={risk.supportiveActions} title="Suggested supportive actions" />
              <GuardrailNote>{risk.guardrail}</GuardrailNote>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
