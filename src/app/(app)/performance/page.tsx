import Link from 'next/link';
import { getSession } from '../session';
import { db } from '@/lib/store';
import { deptName, employees, empName, employeeGoals } from '@/lib/seed';
import { buildPerformanceSummary } from '@/lib/agents/specialists';
import { AIPanel, Badge, Card, ExplainBlock, GuardrailNote, Kpi, Meter, PageHeader, Table } from '@/components/ui';
import { stageTone } from '@/lib/tone';

export const dynamic = 'force-dynamic';

export default async function PerformancePage() {
  const user = await getSession('/performance');
  const isEmployee = user.role === 'EMPLOYEE';
  const me = employees.find((e) => e.id === (user.employeeId ?? 'emp-001'))!;

  if (isEmployee) {
    const pack = buildPerformanceSummary(me);
    const goals = employeeGoals.filter((g) => g.employeeId === me.id);
    return (
      <>
        <PageHeader eyebrow="Performance Management Agent" title="My Performance" subtitle="Your goals, evidence and the draft review pack your manager will work from. Ratings are set by your manager, not by an agent." />
        <div className="mb-5 grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Kpi label="Goals achieved" value={`${pack.goalsAchieved}/${pack.goalsTotal}`} accent="brand" />
          <Kpi label="Current rating" value={`${me.performanceScore.toFixed(1)}/5`} accent="mint" />
          <Kpi label="Training completion" value={`${me.trainingCompletion}%`} accent="cyan" />
          <Kpi label="Engagement" value={`${me.engagementScore}/100`} accent="amber" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <Card title="My goals">
              <Table head={['Goal', 'Progress', 'Due', 'Status']}>
                {goals.map((g) => (
                  <tr key={g.id}>
                    <td className="td font-medium">{g.title}</td>
                    <td className="td w-44"><Meter value={g.progress} right={`${g.progress}%`} /></td>
                    <td className="td text-[#71697d]">{g.due}</td>
                    <td className="td"><Badge tone={g.status === 'At Risk' ? 'amber' : g.status === 'Completed' ? 'mint' : 'brand'}>{g.status}</Badge></td>
                  </tr>
                ))}
              </Table>
            </Card>
            <Card title="Draft review pack">
              <div className="space-y-4 p-5">
                <AIPanel title="Summary">{pack.summary}</AIPanel>
                <div className="grid gap-3 md:grid-cols-3">
                  <ExplainBlock items={pack.strengths} title="Key strengths" />
                  <ExplainBlock items={pack.developmentAreas} title="Development opportunities" />
                  <ExplainBlock items={pack.suggestedObjectives} title="Suggested next-quarter objectives" />
                </div>
                <ExplainBlock items={pack.evidence} title="Evidence used" />
                <GuardrailNote>{pack.disclaimer} You may add a written response before the review is finalised.</GuardrailNote>
              </div>
            </Card>
          </div>
          <Card title="How your review works">
            <div className="space-y-2.5 p-4 text-[12px] leading-relaxed text-[#6b6377]">
              <p><span className="font-semibold text-ink-900">Half-yearly cycle</span> with continuous check-ins between.</p>
              <p><span className="font-semibold text-ink-900">Evidence, not impressions.</span> The agent assembles goals, training and feedback; it does not judge you.</p>
              <p><span className="font-semibold text-ink-900">Your manager decides.</span> The rating is set by your manager and approved by HR, then calibrated at department level.</p>
              <p><span className="font-semibold text-ink-900">Right of response.</span> You can add a written response to any review before it is finalised.</p>
            </div>
          </Card>
        </div>
      </>
    );
  }

  const reviews = db.reviews;
  return (
    <>
      <PageHeader
        eyebrow="Performance Management Agent"
        title="Performance"
        subtitle="Evidence-based review packs prepared for managers. Every draft rating is advisory: the manager sets it and HR approves it under Performance Management Policy v4.0."
        actions={<Link href="/approvals" className="btn-primary">Rating approvals</Link>}
      />
      <div className="mb-5 grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Kpi label="Reviews in cycle" value={reviews.length} accent="brand" />
        <Kpi label="Pending approval" value={reviews.filter((r) => r.status === 'Pending Approval').length} accent="amber" />
        <Kpi label="Avg goals achieved" value={`${(reviews.reduce((a, r) => a + r.goalsAchieved, 0) / reviews.length).toFixed(1)}/10`} accent="cyan" />
        <Kpi label="Avg rating" value={(reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)} hint="out of 5 · advisory" accent="mint" />
      </div>

      <Card title="Review cycle — H1 2026" className="mb-4">
        <Table head={['Employee', 'Department', 'Goals', 'Draft rating', 'Manager', 'Status']}>
          {reviews.map((r) => {
            const e = employees.find((x) => x.id === r.employeeId)!;
            return (
              <tr key={r.id} className="transition hover:bg-[#fcfbfd]">
                <td className="td font-medium"><Link href={`/employees/${e.id}`} className="link">{e.name}</Link></td>
                <td className="td text-[#71697d]">{deptName(e.departmentId)}</td>
                <td className="td w-40"><Meter value={(r.goalsAchieved / r.goalsTotal) * 100} right={`${r.goalsAchieved}/${r.goalsTotal}`} /></td>
                <td className="td">{r.rating.toFixed(1)}</td>
                <td className="td text-[#71697d]">{empName(r.managerId)}</td>
                <td className="td"><Badge tone={stageTone(r.status)} dot>{r.status}</Badge></td>
              </tr>
            );
          })}
        </Table>
      </Card>

      <div className="space-y-4">
        {reviews.slice(0, 3).map((r) => {
          const e = employees.find((x) => x.id === r.employeeId)!;
          const pack = buildPerformanceSummary(e, r);
          return (
            <Card key={r.id} title={`Review pack — ${e.name}`} subtitle={`${e.title} · ${deptName(e.departmentId)}`} actions={<Badge tone={stageTone(r.status)}>{r.status}</Badge>}>
              <div className="space-y-4 p-5">
                <AIPanel title="Performance summary">{pack.summary}</AIPanel>
                <div className="grid gap-3 md:grid-cols-3">
                  <ExplainBlock items={pack.strengths} title="Key strengths" />
                  <ExplainBlock items={pack.developmentAreas} title="Development opportunities" />
                  <ExplainBlock items={pack.suggestedObjectives} title="Suggested next-quarter objectives" />
                </div>
                <ExplainBlock items={pack.evidence} title="Evidence used" />
                <GuardrailNote>{pack.disclaimer}</GuardrailNote>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
