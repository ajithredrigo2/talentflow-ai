import Link from 'next/link';
import { getSession } from '../session';
import { employees, offboardingCases, deptName } from '@/lib/seed';
import { Badge, Card, Empty, GuardrailNote, Kpi, Meter, PageHeader, Table } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function OffboardingPage() {
  await getSession('/offboarding');
  const cases = offboardingCases.map((c) => ({ c, e: employees.find((x) => x.id === c.employeeId)! }));
  const avg = cases.length ? Math.round(cases.reduce((a, x) => a + x.c.completion, 0) / cases.length) : 0;

  return (
    <>
      <PageHeader
        eyebrow="Offboarding Agent"
        title="Offboarding"
        subtitle="A clean, auditable exit for every leaver: interview, assets, access revocation, knowledge transfer, payroll and documentation, with live completion tracking."
      />

      <div className="mb-5 grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Kpi label="Active cases" value={cases.length} accent="brand" />
        <Kpi label="Average completion" value={`${avg}%`} accent="mint" />
        <Kpi label="Exit interviews done" value={cases.filter((x) => x.c.exitInterviewDone).length} accent="cyan" />
        <Kpi label="Access revocations pending" value={cases.filter((x) => x.c.tasks.some((t) => t.task.includes('Access') && t.status === 'Pending')).length} accent="rose" />
      </div>

      {cases.length === 0 ? (
        <Card><Empty title="No active offboarding cases" /></Card>
      ) : (
        <div className="space-y-4">
          {cases.map(({ c, e }) => (
            <Card
              key={c.id}
              title={e.name}
              subtitle={`${e.title} · ${deptName(e.departmentId)} · ${c.reason} · last day ${c.lastDay}`}
              actions={<div className="w-40"><Meter value={c.completion} right={`${c.completion}%`} /></div>}
            >
              <Table head={['Task', 'Owner', 'Status']}>
                {c.tasks.map((t) => (
                  <tr key={t.task}>
                    <td className="td font-medium">{t.task}</td>
                    <td className="td text-[#71697d]">{t.owner}</td>
                    <td className="td"><Badge tone={t.status === 'Completed' ? 'mint' : 'amber'} dot>{t.status}</Badge></td>
                  </tr>
                ))}
              </Table>
              <div className="border-t border-[#f2f0f4] px-5 py-3 text-[12px] text-[#898294]">
                <Link href={`/employees/${e.id}`} className="link">View employee record</Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-4">
        <GuardrailNote>
          System access is revoked at 18:00 on the last working day and final settlement is processed within 14 days,
          per the Resignation &amp; Offboarding Policy (v3.1). Every revocation is logged and requires IT confirmation.
        </GuardrailNote>
      </div>
    </>
  );
}
