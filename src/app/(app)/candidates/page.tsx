import Link from 'next/link';
import { getSession } from '../session';
import { db } from '@/lib/store';
import { screenCandidate } from '@/lib/agents/screening';
import { Avatar, Badge, Card, Kpi, Meter, PageHeader, Table } from '@/components/ui';
import { stageTone } from '@/lib/tone';

export const dynamic = 'force-dynamic';

export default async function CandidatesPage({ searchParams }: { searchParams: Promise<{ job?: string; stage?: string }> }) {
  await getSession('/candidates');
  const sp = await searchParams;

  let list = db.candidates;
  if (sp.job) list = list.filter((c) => c.jobId === sp.job);
  if (sp.stage) list = list.filter((c) => c.stage === sp.stage);

  const scored = list
    .map((c) => ({ c, s: c.screening ?? screenCandidate(c, db.jobs.find((j) => j.id === c.jobId) ?? db.jobs[0]) }))
    .sort((a, b) => b.s.overall - a.s.overall);

  const stages = ['Applied', 'Screened', 'Shortlisted', 'Interviewing', 'Offered', 'Hired', 'Rejected'];

  return (
    <>
      <PageHeader
        eyebrow="Recruitment"
        title="Candidates"
        subtitle="Every applicant parsed into a structured, comparable profile by the Talent Acquisition Agent and scored by the Screening Agent against the approved criteria for their requisition."
        actions={<Link href="/compare" className="btn-primary">Compare candidates</Link>}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Total candidates" value={db.candidates.length} accent="brand" />
        <Kpi label="Shortlisted" value={db.candidates.filter((c) => c.stage === 'Shortlisted').length} accent="cyan" />
        <Kpi label="Interviewing" value={db.candidates.filter((c) => c.stage === 'Interviewing').length} accent="mint" />
        <Kpi label="Offered" value={db.candidates.filter((c) => c.stage === 'Offered').length} accent="amber" />
        <Kpi label="Hired" value={db.candidates.filter((c) => c.stage === 'Hired').length} accent="mint" />
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <Link href="/candidates" className={`badge ${!sp.stage && !sp.job ? 'bg-ink-900 text-white' : 'bg-[#f0f2f8] text-[#5a6480]'}`}>All ({db.candidates.length})</Link>
        {stages.map((s) => (
          <Link key={s} href={`/candidates?stage=${s}`} className={`badge ${sp.stage === s ? 'bg-ink-900 text-white' : 'bg-[#f0f2f8] text-[#5a6480]'}`}>
            {s} ({db.candidates.filter((c) => c.stage === s).length})
          </Link>
        ))}
      </div>

      <Card>
        <Table head={['Candidate', 'Applied for', 'Experience', 'Location', 'Notice', 'Source', 'Stage', 'AI match']}>
          {scored.map(({ c, s }) => (
            <tr key={c.id} className="transition hover:bg-[#fafbfe]">
              <td className="td">
                <div className="flex items-center gap-2.5">
                  <Avatar name={c.name} size={30} />
                  <div>
                    <Link href={`/candidates/${c.id}`} className="font-medium text-ink-950 hover:text-brand-600">{c.name}</Link>
                    <div className="text-[11.5px] text-[#8b93a9]">{c.currentTitle} · {c.currentCompany}</div>
                  </div>
                </div>
              </td>
              <td className="td text-[#616b85]">{db.jobs.find((j) => j.id === c.jobId)?.title}</td>
              <td className="td">{c.experienceYears} yrs</td>
              <td className="td text-[#616b85]">{c.location}</td>
              <td className="td text-[#616b85]">{c.noticePeriodDays}d</td>
              <td className="td"><Badge tone="neutral">{c.source}</Badge></td>
              <td className="td"><Badge tone={stageTone(c.stage)}>{c.stage}</Badge></td>
              <td className="td w-36"><Meter value={s.overall} right={`${s.overall}%`} /></td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
