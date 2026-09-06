import Link from 'next/link';
import { getSession } from '../session';
import { db } from '@/lib/store';
import { deptName, employees, empName } from '@/lib/seed';
import LeaveComposer from '@/components/LeaveComposer';
import LeaveDecision from '@/components/LeaveDecision';
import { Badge, Card, Empty, GuardrailNote, Kpi, PageHeader, Table } from '@/components/ui';
import { stageTone } from '@/lib/tone';

export const dynamic = 'force-dynamic';

export default async function LeavePage() {
  const user = await getSession('/leave');
  const me = employees.find((e) => e.id === (user.employeeId ?? 'emp-001'))!;
  const isApprover = user.role === 'HR_ADMIN' || user.role === 'HIRING_MANAGER';

  const mine = db.leave.filter((l) => l.employeeId === me.id);
  const toApprove = db.leave.filter((l) => l.status === 'Pending' && (user.role === 'HR_ADMIN' || l.approverId === me.id));
  const all = db.leave;

  return (
    <>
      <PageHeader
        eyebrow="Leave Management Agent"
        title="Leave Management"
        subtitle="Describe leave in plain language. The agent extracts the dates, calculates working days against the Gulf weekend, checks your balance and team coverage, and routes the request to your line manager — it never self-approves."
      />

      <div className="mb-5 grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Kpi label="Annual leave balance" value={`${me.leaveBalance.annual} days`} accent="brand" />
        <Kpi label="Sick leave balance" value={`${me.leaveBalance.sick} days`} accent="cyan" />
        <Kpi label="My requests" value={mine.length} accent="mint" />
        <Kpi label={isApprover ? 'Awaiting your decision' : 'Pending across org'} value={isApprover ? toApprove.length : all.filter((l) => l.status === 'Pending').length} accent="amber" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {isApprover && (
            <Card title="Awaiting your approval" subtitle="Agent-prepared requests with conflicts already checked">
              {toApprove.length === 0 ? (
                <Empty title="No leave requests pending your decision" />
              ) : (
                <div className="divide-y divide-[#f5f4f7]">
                  {toApprove.map((l) => (
                    <div key={l.id} className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-[13.5px] font-semibold text-ink-950">{empName(l.employeeId)}</div>
                          <div className="text-[12px] text-[#898294]">
                            {l.type} leave · {l.from} → {l.to} · {l.days} working day{l.days === 1 ? '' : 's'} · balance after: {l.balanceAfter}
                          </div>
                          <div className="mt-1 text-[12px] text-[#9892a2]">{l.reason}</div>
                          {l.conflicts.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {l.conflicts.map((c) => (
                                <li key={c} className="flex gap-2 text-[11.5px] text-amber-700"><span>⚠</span>{c}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <LeaveDecision id={l.id} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          <Card title="My leave requests">
            {mine.length === 0 ? (
              <Empty title="No leave requests yet" hint="Use the composer to raise one in plain language." />
            ) : (
              <Table head={['Type', 'From', 'To', 'Days', 'Approver', 'Status']}>
                {mine.map((l) => (
                  <tr key={l.id}>
                    <td className="td font-medium">{l.type}</td>
                    <td className="td text-[#71697d]">{l.from}</td>
                    <td className="td text-[#71697d]">{l.to}</td>
                    <td className="td">{l.days}</td>
                    <td className="td text-[#71697d]">{empName(l.approverId)}</td>
                    <td className="td"><Badge tone={stageTone(l.status)} dot>{l.status}</Badge></td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>

          {isApprover && (
            <Card title="All leave requests" subtitle={`${all.length} across the organisation`}>
              <Table head={['Employee', 'Department', 'Type', 'From', 'To', 'Days', 'Status']}>
                {all.map((l) => {
                  const emp = employees.find((e) => e.id === l.employeeId)!;
                  return (
                    <tr key={l.id}>
                      <td className="td font-medium"><Link href={`/employees/${emp.id}`} className="link">{emp.name}</Link></td>
                      <td className="td text-[#71697d]">{deptName(emp.departmentId)}</td>
                      <td className="td">{l.type}</td>
                      <td className="td text-[#71697d]">{l.from}</td>
                      <td className="td text-[#71697d]">{l.to}</td>
                      <td className="td">{l.days}</td>
                      <td className="td"><Badge tone={stageTone(l.status)}>{l.status}</Badge></td>
                    </tr>
                  );
                })}
              </Table>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <LeaveComposer />
          <GuardrailNote>
            Working days exclude the Friday–Saturday weekend used in this demonstration organisation; a production
            deployment resolves the working calendar per country. The agent prepares and routes — approval authority
            stays with the line manager under the Annual Leave Policy (v4.2).
          </GuardrailNote>
        </div>
      </div>
    </>
  );
}
