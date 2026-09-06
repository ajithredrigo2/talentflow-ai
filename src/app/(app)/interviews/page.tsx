import Link from 'next/link';
import { getSession } from '../session';
import { db } from '@/lib/store';
import { employees } from '@/lib/seed';
import { Avatar, Badge, Card, Kpi, PageHeader, Table } from '@/components/ui';
import { stageTone } from '@/lib/tone';

export const dynamic = 'force-dynamic';

export default async function InterviewsPage() {
  await getSession('/interviews');
  const now = new Date();
  const sorted = [...db.interviews].sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
  const upcoming = sorted.filter((i) => new Date(i.scheduledAt) >= now).reverse();
  const past = sorted.filter((i) => new Date(i.scheduledAt) < now);
  const thisWeek = upcoming.filter((i) => new Date(i.scheduledAt).getTime() - now.getTime() < 7 * 864e5);

  const row = (i: (typeof sorted)[number]) => {
    const c = db.candidates.find((x) => x.id === i.candidateId);
    const j = db.jobs.find((x) => x.id === i.jobId);
    const iv = employees.find((e) => e.id === i.interviewerId);
    return (
      <tr key={i.id} className="transition hover:bg-[#fcfbfd]">
        <td className="td">
          <div className="flex items-center gap-2.5">
            <Avatar name={c?.name ?? '?'} size={28} />
            <div>
              <Link href={`/candidates/${c?.id}`} className="font-medium text-ink-950 hover:text-brand-600">{c?.name}</Link>
              <div className="text-[11.5px] text-[#9892a2]">{j?.title}</div>
            </div>
          </div>
        </td>
        <td className="td text-[#71697d]">{i.round}</td>
        <td className="td text-[#71697d]">{iv?.name}</td>
        <td className="td text-[#71697d]">
          {new Date(i.scheduledAt).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai' })}
          <span className="ml-1 text-[11px] text-[#a7a1b1]">GST</span>
        </td>
        <td className="td">{i.durationMins}m</td>
        <td className="td"><Badge tone="neutral">{i.mode}</Badge></td>
        <td className="td"><Badge tone={stageTone(i.status)} dot>{i.status}</Badge></td>
        <td className="td">
          {i.feedback?.recommendation
            ? <Badge tone={i.feedback.recommendation.includes('Strong') ? 'mint' : i.feedback.recommendation === 'Hire' ? 'brand' : i.feedback.recommendation === 'No Hire' ? 'rose' : 'neutral'}>{i.feedback.recommendation}</Badge>
            : <Link href="/evaluations" className="link">Add feedback</Link>}
        </td>
      </tr>
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="Recruitment"
        title="Interview Management"
        subtitle="Scheduled and completed interviews across all requisitions. Scheduling, question generation and evaluation summarisation are handled by three separate agents — booking a slot updates the candidate stage and writes to the audit log."
        actions={<Link href="/candidates" className="btn-primary">Schedule from a candidate profile</Link>}
      />

      <div className="mb-5 grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total interviews" value={db.interviews.length} accent="brand" />
        <Kpi label="Next 7 days" value={thisWeek.length} accent="cyan" />
        <Kpi label="Awaiting feedback" value={db.interviews.filter((i) => i.status === 'Awaiting Feedback').length} accent="amber" />
        <Kpi label="Completed" value={db.interviews.filter((i) => i.status === 'Completed').length} accent="mint" />
      </div>

      <Card title="Upcoming" subtitle={`${upcoming.length} scheduled`} className="mb-4">
        <Table head={['Candidate', 'Round', 'Interviewer', 'When', 'Duration', 'Mode', 'Status', 'Outcome']}>{upcoming.map(row)}</Table>
      </Card>

      <Card title="Completed & awaiting feedback">
        <Table head={['Candidate', 'Round', 'Interviewer', 'When', 'Duration', 'Mode', 'Status', 'Outcome']}>{past.map(row)}</Table>
      </Card>
    </>
  );
}
