import { getSession } from '../session';
import { db } from '@/lib/store';
import { Badge, Card, Kpi, PageHeader, Table } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ actor?: string; severity?: string }> }) {
  await getSession('/audit');
  const sp = await searchParams;
  let logs = db.audit;
  if (sp.actor === 'ai') logs = logs.filter((l) => l.actorRole === 'AI Agent');
  if (sp.actor === 'human') logs = logs.filter((l) => l.actorRole !== 'AI Agent' && l.actorRole !== 'System');
  if (sp.severity) logs = logs.filter((l) => l.severity === sp.severity);

  return (
    <>
      <PageHeader
        eyebrow="Governance"
        title="Audit Logs"
        subtitle="Every agent run, recommendation, human decision and access attempt, with actor, action, entity and reasoning. Restricted to HR Administrators."
      />

      <div className="mb-5 grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total entries" value={db.audit.length} accent="brand" />
        <Kpi label="AI agent actions" value={db.audit.filter((l) => l.actorRole === 'AI Agent').length} accent="cyan" />
        <Kpi label="Human decisions" value={db.audit.filter((l) => l.actorRole !== 'AI Agent' && l.actorRole !== 'System').length} accent="mint" />
        <Kpi label="Warnings" value={db.audit.filter((l) => l.severity !== 'info').length} accent="amber" />
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <a href="/audit" className={`badge ${!sp.actor && !sp.severity ? 'bg-brand-600 text-white' : 'bg-[#f4f2f6] text-[#6b6377]'}`}>All</a>
        <a href="/audit?actor=ai" className={`badge ${sp.actor === 'ai' ? 'bg-brand-600 text-white' : 'bg-[#f4f2f6] text-[#6b6377]'}`}>AI agents</a>
        <a href="/audit?actor=human" className={`badge ${sp.actor === 'human' ? 'bg-brand-600 text-white' : 'bg-[#f4f2f6] text-[#6b6377]'}`}>Human decisions</a>
        <a href="/audit?severity=warning" className={`badge ${sp.severity === 'warning' ? 'bg-brand-600 text-white' : 'bg-[#f4f2f6] text-[#6b6377]'}`}>Warnings</a>
      </div>

      <Card>
        <Table head={['Timestamp', 'Actor', 'Role', 'Action', 'Entity', 'Detail', 'Severity']}>
          {logs.map((l) => (
            <tr key={l.id} className="transition hover:bg-[#fcfbfd]">
              <td className="td whitespace-nowrap font-mono text-[11.5px] text-[#898294]">
                {new Date(l.at).toLocaleString('en-GB', { timeZone: 'Asia/Dubai', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </td>
              <td className="td font-medium">{l.actor}</td>
              <td className="td"><Badge tone={l.actorRole === 'AI Agent' ? 'brand' : l.actorRole === 'System' ? 'neutral' : 'mint'}>{l.actorRole}</Badge></td>
              <td className="td font-mono text-[11.5px] text-[#5b5367]">{l.action}</td>
              <td className="td text-[#71697d]">{l.entity} <span className="text-[#a7a1b1]">{l.entityId.slice(0, 14)}</span></td>
              <td className="td max-w-lg text-[12px] text-[#71697d]">{l.detail}</td>
              <td className="td"><Badge tone={l.severity === 'critical' ? 'rose' : l.severity === 'warning' ? 'amber' : 'neutral'}>{l.severity}</Badge></td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
