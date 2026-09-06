import Link from 'next/link';
import { getSession } from '../session';
import { departments, deptName, employees } from '@/lib/seed';
import { assessRetentionRisk } from '@/lib/agents/specialists';
import { Avatar, Badge, Card, Kpi, Meter, PageHeader, Table } from '@/components/ui';
import { stageTone } from '@/lib/tone';
import { BarsChart } from '@/components/Charts';

export const dynamic = 'force-dynamic';

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<{ dept?: string }> }) {
  await getSession('/employees');
  const sp = await searchParams;
  const list = sp.dept ? employees.filter((e) => e.departmentId === sp.dept) : employees;

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Employees"
        subtitle="The workforce record that every agent reads from — skills, performance, engagement, learning and tenure. Retention indicators are explainable and restricted to HR roles."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Total employees" value={employees.length} accent="brand" />
        <Kpi label="Departments" value={departments.length} accent="cyan" />
        <Kpi label="Active" value={employees.filter((e) => e.status === 'Active').length} accent="mint" />
        <Kpi label="Notice period" value={employees.filter((e) => e.status === 'Notice Period').length} accent="amber" />
        <Kpi label="Avg performance" value={(employees.reduce((a, e) => a + e.performanceScore, 0) / employees.length).toFixed(1)} hint="out of 5" accent="mint" />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card title="Headcount by department" className="lg:col-span-2">
          <div className="p-4">
            <BarsChart data={departments.map((d) => ({ name: d.name, Headcount: d.headcount }))} x="name" y="Headcount" horizontal />
          </div>
        </Card>
        <Card title="Filter by department">
          <div className="flex flex-wrap gap-1.5 p-4">
            <Link href="/employees" className={`badge ${!sp.dept ? 'bg-ink-900 text-white' : 'bg-[#f0f2f8] text-[#5a6480]'}`}>All ({employees.length})</Link>
            {departments.map((d) => (
              <Link key={d.id} href={`/employees?dept=${d.id}`} className={`badge ${sp.dept === d.id ? 'bg-ink-900 text-white' : 'bg-[#f0f2f8] text-[#5a6480]'}`}>{d.name} ({d.headcount})</Link>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <Table head={['Employee', 'Department', 'Level', 'Location', 'Tenure', 'Performance', 'Engagement', 'Retention', 'Status']}>
          {list.map((e) => {
            const risk = assessRetentionRisk(e);
            return (
              <tr key={e.id} className="transition hover:bg-[#fafbfe]">
                <td className="td">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={e.name} size={30} />
                    <div>
                      <Link href={`/employees/${e.id}`} className="font-medium text-ink-950 hover:text-brand-600">{e.name}</Link>
                      <div className="text-[11.5px] text-[#8b93a9]">{e.title}</div>
                    </div>
                  </div>
                </td>
                <td className="td text-[#616b85]">{deptName(e.departmentId)}</td>
                <td className="td text-[#616b85]">{e.level}</td>
                <td className="td text-[#616b85]">{e.location}</td>
                <td className="td">{Math.floor(e.tenureMonths / 12)}y {e.tenureMonths % 12}m</td>
                <td className="td">{e.performanceScore.toFixed(1)}</td>
                <td className="td w-28"><Meter value={e.engagementScore} right={`${e.engagementScore}`} /></td>
                <td className="td"><Badge tone={stageTone(risk.level)}>{risk.level}</Badge></td>
                <td className="td"><Badge tone={stageTone(e.status)} dot>{e.status}</Badge></td>
              </tr>
            );
          })}
        </Table>
      </Card>
    </>
  );
}
