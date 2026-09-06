import { getSession } from '../session';
import { db } from '@/lib/store';
import { DOCUMENT_CHECKLIST, IT_ACCESS_CHECKLIST } from '@/lib/agents/specialists';
import { Badge, Card, ExplainBlock, Kpi, Meter, PageHeader, Table } from '@/components/ui';
import { stageTone } from '@/lib/tone';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  await getSession('/onboarding');
  const tasks = db.onboarding;
  const people = Array.from(new Set(tasks.map((t) => t.employeeName)));
  const done = tasks.filter((t) => t.status === 'Completed').length;

  return (
    <>
      <PageHeader
        eyebrow="Offer & Onboarding Agent"
        title="Onboarding"
        subtitle="Every accepted offer becomes a sequenced programme from Day −10 to Day 30, assigned across HR Operations, Compliance, IT Service Desk, Learning & Development and the hiring manager."
      />

      <div className="mb-5 grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Kpi label="Employees onboarding" value={people.length} accent="brand" />
        <Kpi label="Total tasks" value={tasks.length} accent="cyan" />
        <Kpi label="Completed" value={done} accent="mint" />
        <Kpi label="Overall completion" value={`${Math.round((done / tasks.length) * 100)}%`} accent="amber" />
      </div>

      <div className="space-y-4">
        {people.map((name) => {
          const own = tasks.filter((t) => t.employeeName === name);
          const complete = own.filter((t) => t.status === 'Completed').length;
          const pct = Math.round((complete / own.length) * 100);
          const first = own[0];
          return (
            <Card
              key={name}
              title={name}
              subtitle={`${first.jobTitle} · ${first.department}`}
              actions={<div className="w-40"><Meter value={pct} right={`${pct}%`} /></div>}
            >
              <Table head={['Day', 'Task', 'Owner', 'Function', 'Due', 'Status']}>
                {own.map((t) => (
                  <tr key={t.id}>
                    <td className="td font-mono text-[12px] text-[#898294]">{t.day > 0 ? `D+${t.day}` : `D${t.day}`}</td>
                    <td className="td font-medium">{t.task}</td>
                    <td className="td text-[#71697d]">{t.owner}</td>
                    <td className="td"><Badge tone="neutral">{t.category}</Badge></td>
                    <td className="td text-[#898294]">{t.dueDate}</td>
                    <td className="td"><Badge tone={stageTone(t.status)} dot>{t.status}</Badge></td>
                  </tr>
                ))}
              </Table>
            </Card>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card title="Standard document & verification checklist"><div className="p-4"><ExplainBlock items={DOCUMENT_CHECKLIST} title="Collected before Day 1" /></div></Card>
        <Card title="Standard IT access checklist"><div className="p-4"><ExplainBlock items={IT_ACCESS_CHECKLIST} title="Provisioned by Day −1" /></div></Card>
      </div>
    </>
  );
}
