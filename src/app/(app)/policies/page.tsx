import { getSession } from '../session';
import { policies } from '@/lib/seed';
import { Badge, Card, GuardrailNote, Kpi, PageHeader } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function PoliciesPage() {
  await getSession('/policies');
  const categories = Array.from(new Set(policies.map((p) => p.category)));

  return (
    <>
      <PageHeader
        eyebrow="Knowledge base"
        title="HR Policies"
        subtitle="The governed corpus the HR Helpdesk Agent retrieves from. Every answer the assistant gives cites one of these documents and its version — nothing is answered from outside this corpus."
      />

      <div className="mb-5 grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Kpi label="Policies" value={policies.length} accent="brand" />
        <Kpi label="Categories" value={categories.length} accent="cyan" />
        <Kpi label="Indexed for retrieval" value={policies.length} hint="lexical + tag index" accent="mint" />
        <Kpi label="Last updated" value={policies.map((p) => p.updated).sort().reverse()[0]} accent="amber" />
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {categories.map((c) => <span key={c} className="badge bg-[#f4f2f6] text-[#6b6377]">{c} ({policies.filter((p) => p.category === c).length})</span>)}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {policies.map((p) => (
          <Card key={p.id} title={p.title} subtitle={`${p.category} · updated ${p.updated}`} actions={<Badge tone="neutral">{p.version}</Badge>}>
            <div id={p.id} className="p-5">
              <div className="space-y-2.5">
                {p.content.split('\n').map((line, i) => (
                  <p key={i} className="text-[12.5px] leading-relaxed text-[#5b5367]">{line}</p>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {p.tags.map((t) => <span key={t} className="rounded bg-[#f8f7fa] px-1.5 py-0.5 text-[10.5px] text-[#898294]">{t}</span>)}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-4">
        <GuardrailNote>
          Employee Data Privacy &amp; AI Use (v1.4) governs every agent in this platform: minimum necessary data, no
          protected attributes in any assessment, no autonomous employment decisions, a named human approver on every
          sensitive action, and a right to explanation and human review for anyone affected.
        </GuardrailNote>
      </div>
    </>
  );
}
