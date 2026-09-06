import { getSession } from '../session';
import { db } from '@/lib/store';
import { departments, employees, trainingCourses, skills } from '@/lib/seed';
import { assessRetentionRisk } from '@/lib/agents/specialists';
import { SKILL_LEVEL_VALUE } from '@/lib/types';
import { Badge, Card, GuardrailNote, Kpi, Meter, PageHeader, Table } from '@/components/ui';
import { BarsChart, DonutChart, LinesChart } from '@/components/Charts';

export const dynamic = 'force-dynamic';

export default async function WorkforcePage() {
  await getSession('/workforce');
  const active = employees.filter((e) => e.status === 'Active');

  const risks = active.map((e) => ({ e, r: assessRetentionRisk(e) }));
  const riskMix = [
    { name: 'Low', value: risks.filter((x) => x.r.level === 'Low').length },
    { name: 'Medium', value: risks.filter((x) => x.r.level === 'Medium').length },
    { name: 'High', value: risks.filter((x) => x.r.level === 'High').length },
  ];

  const trend = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'].map((m, i) => ({
    month: m,
    Headcount: [44, 46, 47, 48, 49, 50][i],
    Joiners: [2, 3, 2, 3, 2, 3][i],
    Leavers: [1, 1, 1, 2, 1, 2][i],
  }));

  const skillCoverage = skills
    .map((s) => {
      const holders = active.filter((e) => e.skills.some((x) => x.skillId === s.id));
      const advanced = holders.filter((e) => SKILL_LEVEL_VALUE[e.skills.find((x) => x.skillId === s.id)!.level] >= 3);
      return { skill: s.name, category: s.category, holders: holders.length, advanced: advanced.length, coverage: Math.round((holders.length / active.length) * 100) };
    })
    .filter((s) => s.holders > 0)
    .sort((a, b) => a.advanced - b.advanced)
    .slice(0, 12);

  const avgEng = Math.round(active.reduce((a, e) => a + e.engagementScore, 0) / active.length);
  const avgTrain = Math.round(active.reduce((a, e) => a + e.trainingCompletion, 0) / active.length);
  const avgTenure = Math.round(active.reduce((a, e) => a + e.tenureMonths, 0) / active.length);

  return (
    <>
      <PageHeader
        eyebrow="Workforce Intelligence"
        title="Workforce Analytics"
        subtitle="Headcount, capability coverage, retention indicators and learning participation across the organisation — the data every agent reasons over."
      />

      <div className="mb-5 grid gap-3 grid-cols-2 lg:grid-cols-6">
        <Kpi label="Headcount" value={employees.length} accent="brand" />
        <Kpi label="Departments" value={departments.length} accent="cyan" />
        <Kpi label="Avg tenure" value={`${Math.floor(avgTenure / 12)}y ${avgTenure % 12}m`} accent="mint" />
        <Kpi label="Turnover (12m)" value="10.9%" accent="amber" />
        <Kpi label="Avg engagement" value={`${avgEng}/100`} accent="brand" />
        <Kpi label="Training completion" value={`${avgTrain}%`} accent="mint" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Headcount movement" subtitle="Last six months" className="lg:col-span-2">
          <div className="p-4">
            <LinesChart data={trend} x="month" series={[{ key: 'Headcount', name: 'Headcount' }, { key: 'Joiners', name: 'Joiners', color: '#10b981' }, { key: 'Leavers', name: 'Leavers', color: '#f43f5e' }]} />
          </div>
        </Card>
        <Card title="Retention risk distribution" subtitle="Explainable indicators only">
          <div className="p-4">
            <DonutChart data={riskMix} />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Attrition by department">
          <div className="p-4">
            <BarsChart data={departments.map((d) => ({ name: d.name, Attrition: d.attritionRate }))} x="name" y="Attrition" horizontal color="#f43f5e" />
          </div>
        </Card>
        <Card title="Engagement by department">
          <div className="p-4">
            <BarsChart data={departments.map((d) => ({ name: d.name, Engagement: d.engagementScore }))} x="name" y="Engagement" horizontal color="#10b981" />
          </div>
        </Card>
      </div>

      <Card title="Capability coverage" subtitle="Thinnest capability first — the input to workforce planning" className="mt-4">
        <Table head={['Skill', 'Category', 'Holders', 'Advanced or above', 'Coverage', 'Status']}>
          {skillCoverage.map((s) => (
            <tr key={s.skill}>
              <td className="td font-medium">{s.skill}</td>
              <td className="td text-[#71697d]">{s.category}</td>
              <td className="td">{s.holders}</td>
              <td className="td">{s.advanced}</td>
              <td className="td w-36"><Meter value={s.coverage} right={`${s.coverage}%`} /></td>
              <td className="td"><Badge tone={s.advanced <= 2 ? 'rose' : s.advanced <= 5 ? 'amber' : 'mint'}>{s.advanced <= 2 ? 'Critical' : s.advanced <= 5 ? 'Watch' : 'Healthy'}</Badge></td>
            </tr>
          ))}
        </Table>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Learning programme uptake">
          <Table head={['Programme', 'Format', 'Hours', 'Completion']}>
            {trainingCourses.map((c) => (
              <tr key={c.id}>
                <td className="td font-medium">{c.title}</td>
                <td className="td"><Badge tone="neutral">{c.format}</Badge></td>
                <td className="td">{c.hours}h</td>
                <td className="td w-36"><Meter value={c.completionRate} right={`${c.completionRate}%`} /></td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card title="Recruitment throughput">
          <div className="divide-y divide-[#f5f4f7]">
            {[
              ['Open requisitions', String(db.jobs.filter((j) => j.status === 'Open').length)],
              ['Candidates in pipeline', String(db.candidates.length)],
              ['Interviews scheduled', String(db.interviews.filter((i) => i.status === 'Scheduled').length)],
              ['Offers in flight', String(db.offers.length)],
              ['Employees onboarding', '5'],
              ['Time to hire', '34 days'],
              ['Cost per hire', 'AED 11,400'],
              ['Offer acceptance rate', '82%'],
              ['Absenteeism', '2.4%'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between px-5 py-3 text-[12.5px]">
                <span className="text-[#898294]">{k}</span><span className="font-semibold text-ink-950">{v}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <GuardrailNote>
          Workforce analytics use only work-related attributes. Gender, race, religion, nationality, disability, marital
          status and age are not held as analysis dimensions anywhere in this platform, and retention indicators support
          supportive HR conversations — never adverse employment action.
        </GuardrailNote>
      </div>
    </>
  );
}
