import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSession } from '../../session';
import { db } from '@/lib/store';
import { employees, skillName } from '@/lib/seed';
import { screenCandidate } from '@/lib/agents/screening';
import CandidateActions from '@/components/CandidateActions';
import { Avatar, Badge, Card, ExplainBlock, GuardrailNote, Meter, PageHeader, ScoreRing, Table } from '@/components/ui';
import { stageTone } from '@/lib/tone';

export const dynamic = 'force-dynamic';

export default async function CandidateProfile({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSession('/candidates');
  const { id } = await params;
  const candidate = db.candidates.find((c) => c.id === id);
  if (!candidate) notFound();

  const job = db.jobs.find((j) => j.id === candidate.jobId)!;
  const screening = candidate.screening ?? screenCandidate(candidate, job);
  const candidateInterviews = db.interviews.filter((i) => i.candidateId === candidate.id);

  const interviewers = employees
    .filter((e) => ['emp-002', 'emp-003', 'emp-001', 'emp-004', 'emp-008'].includes(e.id))
    .map((e) => ({ id: e.id, name: e.name, title: e.title }));

  return (
    <>
      <PageHeader
        eyebrow={`Applied for ${job.title}`}
        title={candidate.name}
        subtitle={`${candidate.currentTitle} at ${candidate.currentCompany} · ${candidate.experienceYears} years' experience · ${candidate.location}`}
        actions={
          <>
            <Link href={`/compare?job=${job.id}&ids=${candidate.id}`} className="btn-ghost">Add to comparison</Link>
            <Link href={`/jobs/${job.id}`} className="btn-ghost">View requisition</Link>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {/* Screening */}
          <Card title="AI Resume Screening" subtitle={`Scored against the approved evaluation criteria for ${job.title}`} actions={<Badge tone={screening.recommendation === 'Advance' ? 'mint' : screening.recommendation === 'Review' ? 'amber' : 'neutral'}>{screening.recommendation}</Badge>}>
            <div className="p-5">
              <div className="flex flex-wrap items-center gap-6">
                <ScoreRing value={screening.overall} size={90} />
                <div className="min-w-[260px] flex-1 space-y-2">
                  {screening.breakdown.map((b) => <Meter key={b.label} value={b.score} label={`${b.label} · weight ${b.weight}%`} right={`${b.score}%`} />)}
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <ExplainBlock items={screening.breakdown.map((b) => `${b.label} — ${b.score}%: ${b.evidence}`)} title="Evidence behind each dimension" />
                <div className="grid gap-3 md:grid-cols-2">
                  <ExplainBlock items={screening.strengths} title="Strengths" />
                  <ExplainBlock items={screening.concerns} title="Gaps & concerns" />
                </div>
                <ExplainBlock items={screening.interviewFocus} title="Recommended interview focus areas" />
                <div className="rounded-lg border border-[#ebe9ef] bg-[#fcfbfd] p-3.5">
                  <div className="kpi-label mb-1.5">How the overall score was computed</div>
                  <p className="text-[12.5px] leading-relaxed text-[#5b5367]">{screening.explanation}</p>
                </div>
                <GuardrailNote>
                  Excluded from every dimension: {screening.attributesExcluded.join(', ')}. The Screening Agent cannot
                  reject a candidate — shortlisting and rejection both require a named human approver.
                </GuardrailNote>
              </div>
            </div>
          </Card>

          {/* Skills */}
          <Card title="Skills extracted from the CV" subtitle="Parsed by the Talent Acquisition Agent">
            <Table head={['Skill', 'Self-reported level', 'Years', 'Required for this role']}>
              {candidate.skills.map((s) => {
                const name = skillName(s.skillId);
                const mandatory = job.mandatorySkills.includes(name);
                const preferred = job.preferredSkills.includes(name);
                return (
                  <tr key={s.skillId}>
                    <td className="td font-medium">{name}</td>
                    <td className="td"><Badge tone={s.level === 'Expert' ? 'mint' : s.level === 'Advanced' ? 'brand' : 'neutral'}>{s.level}</Badge></td>
                    <td className="td">{s.years}</td>
                    <td className="td">{mandatory ? <Badge tone="brand">Mandatory</Badge> : preferred ? <Badge tone="cyan">Preferred</Badge> : <span className="text-[#a7a1b1]">—</span>}</td>
                  </tr>
                );
              })}
            </Table>
            {screening.missingSkills.length > 0 && (
              <div className="border-t border-[#f2f0f4] px-5 py-3.5">
                <div className="kpi-label mb-1.5">Required but not evidenced</div>
                <div className="flex flex-wrap gap-1">
                  {screening.missingSkills.map((s) => <span key={s} className="rounded bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-600">{s}</span>)}
                </div>
              </div>
            )}
          </Card>

          {/* Résumé */}
          <Card title="Résumé summary">
            <p className="p-5 text-[13px] leading-relaxed text-[#5b5367]">{candidate.resumeSummary}</p>
          </Card>

          {/* Interviews */}
          {candidateInterviews.length > 0 && (
            <Card title="Interviews">
              <Table head={['Round', 'Interviewer', 'When', 'Mode', 'Status', 'Outcome']}>
                {candidateInterviews.map((i) => (
                  <tr key={i.id}>
                    <td className="td font-medium">{i.round}</td>
                    <td className="td text-[#71697d]">{employees.find((e) => e.id === i.interviewerId)?.name}</td>
                    <td className="td text-[#71697d]">{new Date(i.scheduledAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai' })}</td>
                    <td className="td text-[#71697d]">{i.mode}</td>
                    <td className="td"><Badge tone={stageTone(i.status)}>{i.status}</Badge></td>
                    <td className="td">
                      {i.feedback?.recommendation ? <Badge tone={i.feedback.recommendation.includes('Strong') ? 'mint' : i.feedback.recommendation === 'Hire' ? 'brand' : 'neutral'}>{i.feedback.recommendation}</Badge> : <Link href="/evaluations" className="link">Submit feedback</Link>}
                    </td>
                  </tr>
                ))}
              </Table>
              {candidateInterviews.some((i) => i.feedback?.aiSummary) && (
                <div className="space-y-3 border-t border-[#f2f0f4] p-5">
                  {candidateInterviews.filter((i) => i.feedback?.aiSummary).map((i) => (
                    <div key={i.id} className="rounded-lg border border-brand-200 bg-brand-50/50 p-4">
                      <div className="mb-1.5 flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-brand-600 text-[10px] font-bold text-white">AI</span>
                        <span className="text-[12.5px] font-semibold text-ink-900">Evaluation summary · {i.round}</span>
                      </div>
                      <p className="text-[12.5px] leading-relaxed text-[#5b5367]">{i.feedback!.aiSummary}</p>
                      <p className="mt-2 text-[12px] leading-relaxed text-[#898294]"><span className="font-semibold">Reasoning: </span>{i.feedback!.reasoning}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          <CandidateActions
            candidateId={candidate.id}
            candidateName={candidate.name}
            interviewers={interviewers}
            canOffer={user.role === 'HR_ADMIN' || user.role === 'HIRING_MANAGER'}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <div className="flex flex-col items-center px-5 py-6 text-center">
              <Avatar name={candidate.name} size={64} />
              <div className="mt-3 text-[15px] font-semibold text-ink-950">{candidate.name}</div>
              <div className="text-[12.5px] text-[#898294]">{candidate.currentTitle}</div>
              <div className="mt-2.5"><Badge tone={stageTone(candidate.stage)} dot>{candidate.stage}</Badge></div>
            </div>
            <div className="divide-y divide-[#f5f4f7] border-t border-[#f2f0f4]">
              {[
                ['Applied for', job.title],
                ['Applied on', candidate.appliedAt],
                ['Source', candidate.source],
                ['Experience', `${candidate.experienceYears} years`],
                ['Location', candidate.location],
                ['Notice period', `${candidate.noticePeriodDays} days`],
                ['Expected salary', candidate.expectedSalary],
                ['Education', candidate.education],
              ].map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-3 px-5 py-2.5 text-[12.5px]">
                  <span className="shrink-0 text-[#898294]">{k}</span>
                  <span className="text-right font-medium text-ink-900">{v}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Certifications">
            <div className="p-5">
              {candidate.certifications.length ? (
                <div className="space-y-1.5">
                  {candidate.certifications.map((c) => (
                    <div key={c} className="rounded-lg border border-[#ebe9ef] px-3 py-2 text-[12.5px] text-[#5b5367]">{c}</div>
                  ))}
                </div>
              ) : (
                <p className="text-[12.5px] text-[#9892a2]">No certifications listed on the CV.</p>
              )}
            </div>
          </Card>

          <Card title="Data & consent">
            <div className="divide-y divide-[#f5f4f7]">
              <div className="flex items-center justify-between px-5 py-3 text-[12.5px]">
                <span className="text-[#898294]">Processing consent</span>
                <Badge tone={candidate.consentGiven ? 'mint' : 'rose'}>{candidate.consentGiven ? 'Given' : 'Not given'}</Badge>
              </div>
              <div className="flex items-center justify-between px-5 py-3 text-[12.5px]">
                <span className="text-[#898294]">Retention window</span><span className="font-medium text-ink-900">12 months</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3 text-[12.5px]">
                <span className="text-[#898294]">Contact details</span><span className="font-medium text-ink-900">Masked in list views</span>
              </div>
              <div className="px-5 py-3 text-[11.5px] leading-relaxed text-[#9892a2]">
                The candidate may request an explanation of any AI-assisted recommendation affecting them, and may
                request human review, under Employee Data Privacy &amp; AI Use (v1.4).
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
