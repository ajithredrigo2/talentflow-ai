'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Download, ExternalLink, FileText, Paperclip, ShieldAlert, ShieldCheck } from 'lucide-react';
import { AgentFlow } from '@/components/AgentResults';
import {
  AIPanel, Avatar, Badge, Card, ExplainBlock, GuardrailNote, Meter, PageHeader, ScoreRing, Spinner, Table,
} from '@/components/ui';
import { stageTone } from '@/lib/tone';
import type {
  AgentRun, Candidate, EmailAcknowledgement, IncomingEmail, InterviewQuestion, Job, JobApplication, ScreeningResult,
} from '@/lib/types';

interface Detail {
  email: IncomingEmail;
  application?: JobApplication;
  candidate?: Candidate;
  job?: Job;
  run?: AgentRun;
  acknowledgement?: EmailAcknowledgement;
  openJobs: { id: string; jobCode: string; title: string; location: string }[];
  otherApplications: (JobApplication & { jobTitle: string })[];
}

export default function EmailDetail() {
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<Detail | null>(null);
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  const [assignTo, setAssignTo] = useState('');
  const [questions, setQuestions] = useState<InterviewQuestion[] | null>(null);
  const [flash, setFlash] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await fetch(`/api/inbox/${id}`);
    if (!res.ok) return setError('Message not found.');
    setD(await res.json());
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setBusy(action);
    setError('');
    setFlash('');
    const res = await fetch(`/api/inbox/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, note, ...extra }),
    });
    const data = await res.json();
    setBusy('');
    if (!res.ok) return setError(data.error ?? 'Action failed.');
    if (data.questions) setQuestions(data.questions);
    setFlash(
      action === 'shortlist'
        ? 'Shortlisted. The Interview Intelligence Agent has prepared a tailored guide and an approval is waiting to book the slot.'
        : action === 'assign'
          ? `Vacancy assigned and screening re-run — ${data.screening?.overall}% match against the approved criteria.`
          : action === 'reject'
            ? 'Recorded as rejected against your name. The candidate profile and audit trail are retained.'
            : `Recorded: ${data.decision ?? action}.`,
    );
    setNote('');
    load();
  }

  if (error && !d) return <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-600">{error}</div>;
  if (!d) return <Spinner label="Loading application…" />;

  const { email, application, candidate, job, run, acknowledgement } = d;
  const attachment = email.attachments[0];
  const parsing = email.parsing;
  const screening: ScreeningResult | undefined = application?.screening;
  const decided = application?.recruiterDecision;

  return (
    <>
      <PageHeader
        eyebrow={`${email.mailboxAddress} · ${email.simulated ? 'Simulated message' : 'Live mailbox'}`}
        title={email.subject}
        subtitle={`From ${email.fromName} <${email.fromEmail}> · received ${new Date(email.receivedAt).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}`}
        actions={
          <>
            <Link href="/inbox" className="btn-ghost">Back to inbox</Link>
            {candidate && <Link href={`/candidates/${candidate.id}`} className="btn-ghost">Candidate profile</Link>}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge tone={stageTone(email.status === 'Needs Assignment' || email.status === 'Needs Review' ? 'Pending' : email.status)} dot>{email.status}</Badge>
        {application && <Badge tone="neutral">{application.reference}</Badge>}
        <Badge tone="neutral">Source: Email</Badge>
        {email.duplicateOf && <Badge tone="violet">Linked to an existing candidate profile</Badge>}
        {job && <Badge tone="brand">{job.jobCode}</Badge>}
        {decided && <Badge tone={decided.action === 'Shortlist' ? 'mint' : decided.action === 'Reject' ? 'rose' : 'amber'}>{decided.action} by {decided.by}</Badge>}
      </div>

      {flash && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700">{flash}</div>}
      {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-600">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {/* ------------------------------------------------ the message */}
          <Card title="Message">
            <div className="p-5">
              <div className="mb-4 flex items-center gap-3">
                <Avatar name={email.fromName} size={38} />
                <div>
                  <div className="text-[13.5px] font-semibold text-ink-950">{email.fromName}</div>
                  <div className="text-[12px] text-[#7a839c]">{email.fromEmail}</div>
                </div>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-[#4a5470]">{email.body}</pre>

              {attachment && (
                <div className={`mt-4 rounded-lg border p-3.5 ${attachment.validation.quarantined ? 'border-rose-200 bg-rose-50/60' : 'border-[#e6e9f2] bg-[#fafbfe]'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${attachment.validation.quarantined ? 'bg-rose-100 text-rose-600' : 'bg-white text-brand-600'}`}>
                        {attachment.validation.quarantined ? <ShieldAlert size={15} /> : <FileText size={15} />}
                      </span>
                      <div>
                        <div className="text-[12.5px] font-semibold text-ink-950">{attachment.filename}</div>
                        <div className="text-[11px] text-[#8b93a9]">
                          {attachment.mimeType} · {(attachment.sizeBytes / 1024).toFixed(0)} KB · SHA-256 {attachment.sha256.slice(0, 12)}…
                        </div>
                      </div>
                    </div>
                    {!attachment.validation.quarantined && (
                      <div className="flex gap-2">
                        <a href={`/api/inbox/${id}/cv`} target="_blank" rel="noreferrer" className="btn-ghost"><ExternalLink size={13} /> View CV</a>
                        <a href={`/api/inbox/${id}/cv`} download className="btn-ghost"><Download size={13} /> Download</a>
                      </div>
                    )}
                  </div>

                  <details className="mt-3">
                    <summary className="cursor-pointer text-[12px] font-medium text-brand-600 hover:underline">
                      Attachment validation — {attachment.validation.checks.filter((c) => c.passed).length}/{attachment.validation.checks.length} checks passed
                    </summary>
                    <div className="mt-2 space-y-1.5">
                      {attachment.validation.checks.map((c) => (
                        <div key={c.check} className="flex gap-2 text-[11.5px] leading-snug">
                          <span className={c.passed ? 'text-mint-600' : 'text-rose-500'}>{c.passed ? '✓' : '✕'}</span>
                          <span><span className="font-medium text-ink-900">{c.check}</span> — <span className="text-[#7a839c]">{c.detail}</span></span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}

              {!attachment && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/60 p-3.5 text-[12.5px] text-amber-800">
                  <Paperclip size={13} className="mr-1 inline" /> No attachment on this message. No candidate profile was
                  created — reply to request the CV rather than guessing at the applicant&apos;s background.
                </div>
              )}
            </div>
          </Card>

          {/* ------------------------------------------------ job identification */}
          {email.jobMatch && (
            <Card title="Job Matching Agent" subtitle={`Method: ${email.jobMatch.method}`} actions={email.jobMatch.primary ? <Badge tone="mint">{(email.jobMatch.primary.confidence * 100).toFixed(0)}% confidence</Badge> : <Badge tone="amber">Below threshold</Badge>}>
              <div className="space-y-3 p-5">
                {email.jobMatch.primary ? (
                  <div className="rounded-lg border border-brand-200 bg-brand-50/50 p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-[13.5px] font-semibold text-ink-950">{email.jobMatch.primary.title}</div>
                        <div className="font-mono text-[11.5px] text-[#7a839c]">{email.jobMatch.primary.jobCode}</div>
                      </div>
                      <Badge tone="brand">Primary match</Badge>
                    </div>
                    <p className="mt-2 text-[12px] leading-relaxed text-[#5a6480]">{email.jobMatch.primary.reason}</p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3.5 text-[12.5px] leading-relaxed text-amber-800">
                    Confidence stayed below the assignment threshold, so no vacancy was assigned. The agent does not guess —
                    assign the correct requisition below and screening will run against its approved criteria.
                  </div>
                )}

                {email.jobMatch.alternatives.length > 0 && (
                  <div>
                    <div className="kpi-label mb-2">Alternative matches</div>
                    <div className="space-y-1.5">
                      {email.jobMatch.alternatives.map((a) => (
                        <div key={a.jobId} className="flex items-start justify-between gap-3 rounded-lg border border-[#e6e9f2] px-3 py-2">
                          <div>
                            <div className="text-[12.5px] font-medium text-ink-900">{a.title}</div>
                            <div className="text-[11px] text-[#8b93a9]">{a.reason}</div>
                          </div>
                          <span className="shrink-0 text-[12px] font-semibold text-[#5a6480]">{(a.confidence * 100).toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <AIPanel title="How the vacancy was determined">{email.jobMatch.explanation}</AIPanel>
              </div>
            </Card>
          )}

          {/* ------------------------------------------------ parsed résumé */}
          {parsing && (
            <Card
              title="Résumé Parsing Agent"
              subtitle={`${parsing.fieldsFound}/${parsing.fieldsAttempted} fields extracted · ${parsing.parsedBy}`}
              actions={<Badge tone={parsing.confidence > 0.8 ? 'mint' : 'amber'}>{(parsing.confidence * 100).toFixed(0)}% extraction confidence</Badge>}
            >
              <div className="space-y-4 p-5">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {([
                    ['Name', parsing.name],
                    ['Email', parsing.email],
                    ['Phone', parsing.phone],
                    ['Location', parsing.location],
                    ['Current title', parsing.currentTitle],
                    ['Current employer', parsing.currentEmployer],
                    ['Total experience', parsing.totalExperienceYears ? `${parsing.totalExperienceYears} years` : undefined],
                    ['Notice period', parsing.noticePeriodDays !== undefined ? `${parsing.noticePeriodDays} days` : undefined],
                    ['Expected salary', parsing.expectedSalary],
                  ] as [string, string | undefined][]).map(([k, v]) => (
                    <div key={k} className="rounded-lg border border-[#e6e9f2] px-3 py-2">
                      <div className="kpi-label">{k}</div>
                      <div className={`mt-0.5 text-[12.5px] ${v ? 'font-medium text-ink-950' : 'text-[#c3c9d8]'}`}>{v ?? 'Not stated'}</div>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="kpi-label mb-1.5">Professional summary</div>
                  <p className="text-[12.5px] leading-relaxed text-[#4a5470]">{parsing.summary}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="kpi-label mb-1.5">Technical skills ({parsing.technicalSkills.length})</div>
                    <div className="flex flex-wrap gap-1">
                      {parsing.technicalSkills.map((s) => <span key={s} className="rounded bg-brand-50 px-1.5 py-0.5 text-[10.5px] font-medium text-brand-700">{s}</span>)}
                    </div>
                    {parsing.softSkills.length > 0 && (
                      <>
                        <div className="kpi-label mb-1.5 mt-3">Soft skills</div>
                        <div className="flex flex-wrap gap-1">
                          {parsing.softSkills.map((s) => <span key={s} className="rounded bg-[#f0f2f8] px-1.5 py-0.5 text-[10.5px] text-[#5a6480]">{s}</span>)}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="space-y-3">
                    {parsing.certifications.length > 0 && <ExplainBlock items={parsing.certifications} title="Certifications" />}
                    {parsing.education.length > 0 && <ExplainBlock items={parsing.education} title="Education" />}
                  </div>
                </div>

                {parsing.previousEmployers.length > 0 && (
                  <div>
                    <div className="kpi-label mb-1.5">Employment history</div>
                    <div className="text-[12.5px] text-[#4a5470]">{parsing.relevantExperience || parsing.previousEmployers.join(' · ')}</div>
                  </div>
                )}

                <div className="flex flex-wrap gap-3 text-[11.5px] text-[#7a839c]">
                  {parsing.linkedinUrl && <span>LinkedIn: <span className="text-brand-600">{parsing.linkedinUrl}</span></span>}
                  {parsing.portfolioUrl && <span>Portfolio: <span className="text-brand-600">{parsing.portfolioUrl}</span></span>}
                  {parsing.languages.length > 0 && <span>Languages: {parsing.languages.join(', ')}</span>}
                </div>

                <GuardrailNote>
                  The parser never extracts or infers gender, age, race, religion, nationality, marital status or
                  disability. Fields it could not find are shown as &ldquo;Not stated&rdquo; rather than filled by inference.
                </GuardrailNote>
              </div>
            </Card>
          )}

          {/* ------------------------------------------------ screening */}
          {screening && job && (
            <Card
              title="Resume Screening Agent"
              subtitle={`Scored against the approved evaluation criteria for ${job.title}`}
              actions={<Badge tone={screening.recommendation === 'Advance' ? 'mint' : screening.recommendation === 'Review' ? 'amber' : 'neutral'}>{screening.recommendation}</Badge>}
            >
              <div className="p-5">
                <div className="flex flex-wrap items-center gap-6">
                  <ScoreRing value={screening.overall} size={86} />
                  <div className="min-w-[240px] flex-1 space-y-2">
                    {screening.breakdown.map((b) => <Meter key={b.label} value={b.score} label={`${b.label} · weight ${b.weight}%`} right={`${b.score}%`} />)}
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  <ExplainBlock items={screening.breakdown.map((b) => `${b.label} — ${b.score}%: ${b.evidence}`)} title="Evidence per dimension" />
                  <div className="grid gap-3 md:grid-cols-3">
                    <ExplainBlock items={screening.strengths} title="Strengths" />
                    <ExplainBlock items={screening.concerns} title="Gaps & concerns" />
                    <ExplainBlock items={screening.interviewFocus} title="Interview focus" />
                  </div>
                  <GuardrailNote>
                    Excluded from every dimension: {screening.attributesExcluded.join(', ')}. This is a recommendation —
                    the Screening Agent cannot shortlist or reject anyone.
                  </GuardrailNote>
                </div>
              </div>
            </Card>
          )}

          {/* ------------------------------------------------ interview guide */}
          {questions && (
            <Card title="Interview Intelligence Agent" subtitle="Generated on shortlisting">
              <div className="space-y-3 p-5">
                {questions.map((q, i) => (
                  <div key={i} className="rounded-lg border border-[#e6e9f2] p-3.5">
                    <Badge tone="brand">{q.category}</Badge>
                    <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-ink-950">{q.question}</p>
                    <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#7a839c]"><span className="font-semibold text-[#5a6480]">Why ask this: </span>{q.rationale}</p>
                  </div>
                ))}
                <Link href={candidate ? `/candidates/${candidate.id}` : '/interviews'} className="btn-primary">Book the interview</Link>
              </div>
            </Card>
          )}

          {/* ------------------------------------------------ agent history */}
          {run && (
            <Card title="Agent processing history" subtitle={`Run ${run.id.slice(0, 16)} · ${run.tasks.length} tasks`}>
              <div className="p-4"><AgentFlow run={run} /></div>
            </Card>
          )}
        </div>

        {/* ============================================ sidebar: actions */}
        <div className="space-y-4">
          <Card title="Recruiter actions" subtitle="Every decision is recorded against your name">
            <div className="space-y-3 p-4">
              {email.status === 'Needs Assignment' || !job ? (
                <>
                  <label className="block">
                    <span className="mb-1.5 block text-[12px] font-medium text-ink-800">Assign a vacancy</span>
                    <select className="input" value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
                      <option value="">Select the correct requisition…</option>
                      {d.openJobs.map((j) => <option key={j.id} value={j.id}>{j.jobCode} — {j.title} ({j.location})</option>)}
                    </select>
                  </label>
                  <button className="btn-primary w-full" disabled={!assignTo || !!busy || !application} onClick={() => act('assign', { jobId: assignTo })}>
                    {busy === 'assign' ? 'Assigning & screening…' : 'Assign job & run screening'}
                  </button>
                </>
              ) : (
                <>
                  <textarea className="input min-h-[64px]" placeholder="Note for the audit record (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
                  <div className="grid grid-cols-2 gap-2">
                    <button className="btn-primary" disabled={!!busy} onClick={() => act('shortlist')}>{busy === 'shortlist' ? '…' : 'Shortlist'}</button>
                    <button className="btn-ghost" disabled={!!busy} onClick={() => act('hold')}>Hold</button>
                    <button className="btn-ghost" disabled={!!busy} onClick={() => act('reject')}>Reject</button>
                    <button className="btn-ghost" disabled={!!busy} onClick={() => act('request-info')}>Request info</button>
                  </div>
                  <label className="block pt-1">
                    <span className="mb-1.5 block text-[12px] font-medium text-ink-800">Assign to a different job</span>
                    <select className="input" value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
                      <option value="">Keep current requisition</option>
                      {d.openJobs.filter((j) => j.id !== job?.id).map((j) => <option key={j.id} value={j.id}>{j.jobCode} — {j.title}</option>)}
                    </select>
                  </label>
                  {assignTo && (
                    <button className="btn-ghost w-full" disabled={!!busy} onClick={() => act('assign', { jobId: assignTo })}>Reassign & re-screen</button>
                  )}
                </>
              )}

              <div className="border-t border-[#eef0f6] pt-3">
                <div className="kpi-label mb-2">Re-run an agent</div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn-ghost" disabled={!!busy} onClick={() => act('reparse')}>Re-run parsing</button>
                  <button className="btn-ghost" disabled={!!busy} onClick={() => act('rematch')}>Re-run matching</button>
                  <button className="btn-ghost" disabled={!!busy || !job} onClick={() => act('rescreen')}>Re-run screening</button>
                </div>
              </div>
            </div>
          </Card>

          {decided && (
            <div className="rounded-xl border border-[#e6e9f2] bg-[#fafbfe] p-4 text-[12.5px] leading-relaxed text-[#4a5470]">
              <span className="font-semibold text-ink-900">{decided.action}</span> recorded by {decided.by} on{' '}
              {new Date(decided.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.
              {decided.note && <div className="mt-1 italic text-[#7a839c]">“{decided.note}”</div>}
            </div>
          )}

          {/* candidate summary */}
          {candidate && (
            <Card title="Candidate profile">
              <div className="flex flex-col items-center px-5 py-5 text-center">
                <Avatar name={candidate.name} size={54} />
                <div className="mt-2.5 text-[14px] font-semibold text-ink-950">{candidate.name}</div>
                <div className="text-[12px] text-[#7a839c]">{candidate.currentTitle || 'Title not stated'}</div>
                <div className="mt-2"><Badge tone={stageTone(candidate.stage)} dot>{candidate.stage}</Badge></div>
              </div>
              <div className="divide-y divide-[#f2f4f9] border-t border-[#eef0f6]">
                {([
                  ['Application ref', application?.reference],
                  ['Source', 'Email'],
                  ['Mailbox', email.mailboxAddress],
                  ['Experience', candidate.experienceYears ? `${candidate.experienceYears} years` : '—'],
                  ['Location', candidate.location || '—'],
                  ['Notice period', `${candidate.noticePeriodDays} days`],
                  ['Expected salary', candidate.expectedSalary],
                ] as [string, string | undefined][]).map(([k, v]) => (
                  <div key={k} className="flex items-start justify-between gap-3 px-5 py-2.5 text-[12.5px]">
                    <span className="shrink-0 text-[#7a839c]">{k}</span>
                    <span className="text-right font-medium text-ink-900">{v ?? '—'}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#eef0f6] p-3">
                <Link href={`/candidates/${candidate.id}`} className="btn-ghost w-full">Open full profile</Link>
              </div>
            </Card>
          )}

          {/* duplicate linkage */}
          {d.otherApplications.length > 0 && (
            <Card title="Other applications from this candidate" subtitle="One profile, multiple applications">
              <Table head={['Reference', 'Role', 'Stage']}>
                {d.otherApplications.map((a) => (
                  <tr key={a.id}>
                    <td className="td font-mono text-[11.5px]">{a.reference}</td>
                    <td className="td text-[#616b85]">{a.jobTitle}</td>
                    <td className="td"><Badge tone={stageTone(a.stage)}>{a.stage}</Badge></td>
                  </tr>
                ))}
              </Table>
            </Card>
          )}

          {/* acknowledgement */}
          {acknowledgement && (
            <Card title="Acknowledgement" subtitle={`${acknowledgement.delivery} to ${acknowledgement.to}`}>
              <div className="p-4">
                <div className="text-[12px] font-semibold text-ink-900">{acknowledgement.subject}</div>
                <pre className="mt-2 whitespace-pre-wrap font-sans text-[11.5px] leading-relaxed text-[#5a6480]">{acknowledgement.body}</pre>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-mint-600">
                  <ShieldCheck size={12} /> Confirms receipt only — no shortlisting is implied.
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
