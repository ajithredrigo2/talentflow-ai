import Link from 'next/link';
import { getSession } from '../session';
import { db } from '@/lib/store';
import { deptName, empName } from '@/lib/seed';
import { Badge, Card, Kpi, PageHeader, Table } from '@/components/ui';
import { stageTone } from '@/lib/tone';

export const dynamic = 'force-dynamic';

export default async function JobsPage() {
  await getSession('/jobs');
  const jobs = db.jobs;
  const open = jobs.filter((j) => j.status === 'Open');

  return (
    <>
      <PageHeader
        eyebrow="Recruitment"
        title="Jobs"
        subtitle="Requisitions across the organisation. AI-drafted descriptions carry the agent that produced them and the human who approved publication."
        actions={<Link href="/jobs/new" className="btn-primary">Create job with AI</Link>}
      />

      <div className="mb-5 grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Kpi label="Open requisitions" value={open.length} accent="brand" />
        <Kpi label="Total openings" value={open.reduce((a, j) => a + j.openings, 0)} accent="cyan" />
        <Kpi label="AI-drafted" value={jobs.filter((j) => j.createdBy === 'AI Job Description Agent').length} hint="human-approved before publication" accent="mint" />
        <Kpi label="Candidates in pipeline" value={db.candidates.length} accent="amber" />
      </div>

      <Card>
        <Table head={['Role', 'Department', 'Location', 'Seniority', 'Openings', 'Pipeline', 'Priority', 'Source', 'Status']}>
          {jobs.map((j) => (
            <tr key={j.id} className="transition hover:bg-[#fcfbfd]">
              <td className="td font-medium"><Link href={`/jobs/${j.id}`} className="link">{j.title}</Link></td>
              <td className="td text-[#71697d]">{deptName(j.departmentId)}</td>
              <td className="td text-[#71697d]">{j.location}</td>
              <td className="td text-[#71697d]">{j.seniority}</td>
              <td className="td">{j.openings}</td>
              <td className="td">{db.candidates.filter((c) => c.jobId === j.id).length}</td>
              <td className="td"><Badge tone={stageTone(j.priority)}>{j.priority}</Badge></td>
              <td className="td">
                {j.createdBy === 'AI Job Description Agent'
                  ? <Badge tone="brand">AI draft · approved by {j.approvedBy ?? 'pending'}</Badge>
                  : <Badge tone="neutral">Human</Badge>}
              </td>
              <td className="td"><Badge tone={stageTone(j.status)} dot>{j.status}</Badge></td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
