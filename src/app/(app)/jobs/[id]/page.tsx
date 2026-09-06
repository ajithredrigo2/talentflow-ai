import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSession } from '../../session';
import { db } from '@/lib/store';
import { deptName, empName } from '@/lib/seed';
import { screenAll } from '@/lib/agents/screening';
import { Badge, Card, ExplainBlock, Kpi, Meter, PageHeader, ScoreRing, Table, GuardrailNote } from '@/components/ui';
import { stageTone } from '@/lib/tone';

export const dynamic = 'force-dynamic';

export default async function JobDetail({ params }: { params: Promise<{ id: string }> }) {
  await getSession('/jobs');
  const { id } = await params;
  const job = db.jobs.find((j) => j.id === id);
  if (!job) notFound();

  const pipeline = db.candidates.filter((c) => c.jobId === job.id);
  const ranked = screenAll(pipeline, job);

  return (
    <>
      <PageHeader
        eyebrow={deptName(job.departmentId)}
        title={job.title}
        subtitle={job.summary}
        actions={
          <>
            <Link href={`/compare?job=${job.id}`} className="btn-ghost">Compare candidates</Link>
            <Link href={`/resume-analysis?job=${job.id}`} className="btn-primary">Run screening</Link>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <Badge tone={stageTone(job.status)} dot>{job.status}</Badge>
        <Badge tone="neutral">{job.location}</Badge>
        <Badge tone="neutral">{job.seniority}</Badge>
        <Badge tone="neutral">{job.employmentType}</Badge>
        <Badge tone="neutral">{job.minExperience}+ years</Badge>
        <Badge tone={stageTone(job.priority)}>{job.priority} priority</Badge>
        <Badge tone="neutral">{job.salaryRange}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Card title="Responsibilities">
            <ul className="space-y-2 p-5">
              {job.responsibilities.map((r) => (
                <li key={r} className="flex gap-2.5 text-[13px] leading-relaxed text-[#5b5367]">
                  <span className="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-brand-500" />{r}
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Candidate pipeline" subtitle={`${pipeline.length} candidates · scored against the approved evaluation criteria`}>
            <Table head={['#', 'Candidate', 'Experience', 'Location', 'Stage', 'Match']}>
              {ranked.map((r, i) => (
                <tr key={r.candidate.id} className="transition hover:bg-[#fcfbfd]">
                  <td className="td text-[#a7a1b1]">{i + 1}</td>
                  <td className="td font-medium">
                    <Link href={`/candidates/${r.candidate.id}`} className="link">{r.candidate.name}</Link>
                    <div className="text-[11.5px] font-normal text-[#9892a2]">{r.candidate.currentTitle} · {r.candidate.currentCompany}</div>
                  </td>
                  <td className="td">{r.candidate.experienceYears} yrs</td>
                  <td className="td text-[#71697d]">{r.candidate.location}</td>
                  <td className="td"><Badge tone={stageTone(r.candidate.stage)}>{r.candidate.stage}</Badge></td>
                  <td className="td w-40"><Meter value={r.screening.overall} right={`${r.screening.overall}%`} /></td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Requirements">
            <div className="space-y-4 p-5">
              <div>
                <div className="kpi-label mb-1.5">Mandatory skills</div>
                <div className="flex flex-wrap gap-1">
                  {job.mandatorySkills.map((s) => <span key={s} className="rounded bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">{s}</span>)}
                </div>
              </div>
              <div>
                <div className="kpi-label mb-1.5">Preferred skills</div>
                <div className="flex flex-wrap gap-1">
                  {job.preferredSkills.map((s) => <span key={s} className="rounded bg-[#f4f2f6] px-2 py-0.5 text-[11px] font-medium text-[#6b6377]">{s}</span>)}
                </div>
              </div>
              <div>
                <div className="kpi-label mb-1.5">Education</div>
                <p className="text-[12.5px] leading-relaxed text-[#6b6377]">{job.education}</p>
              </div>
            </div>
          </Card>

          <Card title="Evaluation criteria" subtitle="These weights drive every candidate score">
            <div className="space-y-2.5 p-5">
              {job.evaluationCriteria.map((c) => (
                <Meter key={c.criterion} value={c.weight * 2.5} label={c.criterion} right={`${c.weight}%`} tone="bg-brand-500" />
              ))}
            </div>
          </Card>

          <Card title="Hiring team">
            <div className="divide-y divide-[#f5f4f7]">
              <div className="flex items-center justify-between px-5 py-3 text-[12.5px]">
                <span className="text-[#898294]">Hiring manager</span><span className="font-medium text-ink-900">{empName(job.hiringManagerId)}</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3 text-[12.5px]">
                <span className="text-[#898294]">Recruiter</span><span className="font-medium text-ink-900">{empName(job.recruiterId)}</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3 text-[12.5px]">
                <span className="text-[#898294]">Posted</span><span className="font-medium text-ink-900">{job.postedAt}</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3 text-[12.5px]">
                <span className="text-[#898294]">Source</span><span className="font-medium text-ink-900">{job.createdBy}</span>
              </div>
              {job.approvedBy && (
                <div className="flex items-center justify-between px-5 py-3 text-[12.5px]">
                  <span className="text-[#898294]">Approved by</span><span className="font-medium text-ink-900">{job.approvedBy}</span>
                </div>
              )}
            </div>
          </Card>

          <GuardrailNote>
            Scoring uses only the criteria above. Gender, race, religion, nationality, disability, marital status and age
            are excluded, and no candidate is advanced or rejected without human approval.
          </GuardrailNote>
        </div>
      </div>
    </>
  );
}
