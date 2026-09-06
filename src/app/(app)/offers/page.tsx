import Link from 'next/link';
import { getSession } from '../session';
import { db } from '@/lib/store';
import { draftOfferLetter } from '@/lib/agents/specialists';
import { Badge, Card, Empty, GuardrailNote, Kpi, PageHeader, Table } from '@/components/ui';
import { stageTone } from '@/lib/tone';

export const dynamic = 'force-dynamic';

export default async function OffersPage() {
  await getSession('/offers');
  const offers = db.offers.map((o) => {
    const candidate = db.candidates.find((c) => c.id === o.candidateId)!;
    const job = db.jobs.find((j) => j.id === o.jobId)!;
    return { o, candidate, job, letter: o.letterDraft || draftOfferLetter(candidate, job, o.baseSalary, o.joiningDate) };
  });

  return (
    <>
      <PageHeader
        eyebrow="Recruitment"
        title="Offer Management"
        subtitle="Offers drafted by the Offer & Onboarding Agent within the approved salary band. Every offer sits at Pending Approval until a named human approver releases it."
        actions={<Link href="/approvals" className="btn-primary">Approvals queue</Link>}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total offers" value={offers.length} accent="brand" />
        <Kpi label="Pending approval" value={offers.filter((x) => x.o.status === 'Pending Approval').length} accent="amber" />
        <Kpi label="Sent" value={offers.filter((x) => x.o.status === 'Sent').length} accent="cyan" />
        <Kpi label="Accepted" value={offers.filter((x) => x.o.status === 'Accepted').length} accent="mint" />
      </div>

      {offers.length === 0 ? (
        <Card><Empty title="No offers drafted yet" hint="Open a candidate profile and use the Offer & Onboarding Agent to draft one." /></Card>
      ) : (
        <div className="space-y-4">
          <Card title="Offer pipeline">
            <Table head={['Candidate', 'Role', 'Base salary', 'Joining date', 'Created', 'Status']}>
              {offers.map(({ o, candidate, job }) => (
                <tr key={o.id}>
                  <td className="td font-medium"><Link href={`/candidates/${candidate.id}`} className="link">{candidate.name}</Link></td>
                  <td className="td text-[#616b85]">{job.title}</td>
                  <td className="td">{o.baseSalary}</td>
                  <td className="td text-[#616b85]">{o.joiningDate}</td>
                  <td className="td text-[#616b85]">{new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                  <td className="td"><Badge tone={stageTone(o.status)} dot>{o.status}</Badge></td>
                </tr>
              ))}
            </Table>
          </Card>

          {offers.map(({ o, candidate, letter }) => (
            <Card key={o.id} title={`Offer letter draft — ${candidate.name}`} subtitle={`${o.baseSalary} · joining ${o.joiningDate}`} actions={<Badge tone={stageTone(o.status)}>{o.status}</Badge>}>
              <div className="p-5">
                <pre className="max-h-[420px] overflow-y-auto whitespace-pre-wrap rounded-lg border border-[#e6e9f2] bg-[#fafbfe] p-4 font-mono text-[11.5px] leading-relaxed text-[#4a5470]">{letter}</pre>
              </div>
            </Card>
          ))}

          <GuardrailNote>
            The Offer &amp; Onboarding Agent drafts and routes. It cannot issue an offer, and the approval record carries
            the approver&apos;s name, timestamp and any note they attach.
          </GuardrailNote>
        </div>
      )}
    </>
  );
}
