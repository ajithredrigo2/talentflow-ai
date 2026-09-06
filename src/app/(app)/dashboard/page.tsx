import Link from 'next/link';
import { getSession } from '../session';
import { db } from '@/lib/store';
import { departments, deptName, employees } from '@/lib/seed';
import { Badge, Card, ExplainBlock, Kpi, PageHeader, Table } from '@/components/ui';
import { stageTone } from '@/lib/tone';
import { BarsChart, DonutChart, Funnel, TrendChart } from '@/components/Charts';
import { screenCandidate } from '@/lib/agents/screening';
import { assessRetentionRisk } from '@/lib/agents/specialists';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const user = await getSession('/dashboard');

  const active = employees.filter((e) => e.status === 'Active');
  const openJobs = db.jobs.filter((j) => j.status === 'Open');
  const pipeline = db.candidates;
  const funnel = [
    { name: 'Applications', value: pipeline.length },
    { name: 'Screened', value: pipeline.filter((c) => ['Screened', 'Shortlisted', 'Interviewing', 'Offered', 'Hired'].includes(c.stage)).length },
    { name: 'Shortlisted', value: pipeline.filter((c) => ['Shortlisted', 'Interviewing', 'Offered', 'Hired'].includes(c.stage)).length },
    { name: 'Interviewed', value: pipeline.filter((c) => ['Interviewing', 'Offered', 'Hired'].includes(c.stage)).length },
    { name: 'Offered', value: pipeline.filter((c) => ['Offered', 'Hired'].includes(c.stage)).length },
    { name: 'Hired', value: pipeline.filter((c) => c.stage === 'Hired').length },
  ];

  const avgMatch = Math.round(
    pipeline.slice(0, 24).reduce((a, c) => a + screenCandidate(c, db.jobs.find((j) => j.id === c.jobId) ?? db.jobs[0]).overall, 0) / 24,
  );

  const hiringTrend = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'].map((m, i) => ({
    month: m,
    Applications: [58, 71, 66, 84, 92, 79][i],
    Hires: [3, 5, 4, 6, 7, 5][i],
  }));

  const deptData = departments.map((d) => ({ name: d.name, Headcount: d.headcount }));
  const stageMix = ['Applied', 'Screened', 'Shortlisted', 'Interviewing', 'Offered', 'Hired', 'Rejected'].map((s) => ({
    name: s,
    value: pipeline.filter((c) => c.stage === s).length,
  })).filter((s) => s.value > 0);

  const risks = active.map((e) => ({ e, r: assessRetentionRisk(e) }));
  const highRisk = risks.filter((x) => x.r.level === 'High').length;

  const pendingApprovals = db.approvals.filter((a) => a.status === 'Pending' && a.requiredRole.includes(user.role));
  const upcoming = db.interviews
    .filter((i) => new Date(i.scheduledAt) >= new Date() && i.status === 'Scheduled')
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    .slice(0, 5);

  // Zero-Touch Candidate Intake metrics
  const today = new Date().toISOString().slice(0, 10);
  const emails = db.emails;
  const emailsToday = emails.filter((e) => e.receivedAt.slice(0, 10) === today);
  const parsedOk = emails.filter((e) => e.parsing).length;
  const autoMatched = emails.filter((e) => e.jobId).length;
  const unassigned = emails.filter((e) => e.status === 'Needs Assignment').length;
  const duplicates = emails.filter((e) => e.duplicateOf).length;
  const awaitingReview = emails.filter((e) => e.status === 'Needs Review').length;
  const intakeScores = db.applications.map((a) => a.screening?.overall).filter(Boolean) as number[];
  const intakeAvg = intakeScores.length ? Math.round(intakeScores.reduce((a, b) => a + b, 0) / intakeScores.length) : 0;
  const automationRate = emails.length ? Math.round((emails.filter((e) => e.status !== 'Failed' && e.status !== 'Missing CV').length / emails.length) * 100) : 0;
  // 18 minutes is the measured manual handling time per application this pipeline replaces
  const minutesSaved = parsedOk * 18;

  const avgEngagement = Math.round(active.reduce((a, e) => a + e.engagementScore, 0) / active.length);
  const avgTraining = Math.round(active.reduce((a, e) => a + e.trainingCompletion, 0) / active.length);

  return (
    <>
      <PageHeader
        eyebrow={`Welcome back, ${user.name.split(' ')[0]}`}
        title="HR Executive Dashboard"
        subtitle="Workforce, recruitment and agent activity in one view. Every AI-generated figure below links back to the evidence behind it."
        actions={
          <>
            <Link href="/command-center" className="btn-soft">Ask the Coordinator</Link>
            <Link href="/approvals" className="btn-primary">
              {pendingApprovals.length} approval{pendingApprovals.length === 1 ? '' : 's'} pending
            </Link>
          </>
        }
      />

      {/* Workforce KPIs */}
      <div className="kpi-label mb-2.5">Workforce</div>
      <div className="grid gap-3 stagger grid-cols-2 lg:grid-cols-5">
        <Kpi label="Total employees" value={employees.length} hint={`${departments.length} departments`} accent="brand" />
        <Kpi label="New joiners" value={5} delta="+2" hint="in onboarding" accent="cyan" />
        <Kpi label="Employees leaving" value={employees.filter((e) => e.status === 'Notice Period').length} hint="in notice period" accent="amber" />
        <Kpi label="Open positions" value={openJobs.reduce((a, j) => a + j.openings, 0)} hint={`${openJobs.length} requisitions`} accent="mint" />
        <Kpi label="Retention risk (high)" value={highRisk} hint="explainable factors only" accent="rose" />
      </div>

      {/* Recruitment KPIs */}
      <div className="kpi-label mb-2.5 mt-7">Recruitment</div>
      <div className="grid gap-3 stagger grid-cols-2 lg:grid-cols-6">
        <Kpi label="Open jobs" value={openJobs.length} accent="brand" />
        <Kpi label="Applications" value={funnel[0].value} accent="cyan" />
        <Kpi label="Shortlisted" value={funnel[2].value} accent="brand" />
        <Kpi label="Interviews" value={db.interviews.length} accent="mint" />
        <Kpi label="Offers" value={db.offers.length} accent="amber" />
        <Kpi label="Avg match score" value={`${intakeAvg || avgMatch}%`} hint="AI screening" accent="mint" />
      </div>

      {/* Zero-Touch Candidate Intake */}
      <div className="kpi-label mb-2.5 mt-7 flex items-center gap-2">
        Zero-Touch Candidate Intake
        <Link href="/inbox" className="text-[10px] font-semibold normal-case tracking-normal text-brand-600 hover:underline">Open Recruitment Inbox →</Link>
      </div>
      <div className="grid gap-3 stagger grid-cols-2 lg:grid-cols-5">
        <Kpi label="Applications today" value={emailsToday.length} hint={`${emails.length} total by email`} accent="brand" />
        <Kpi label="CVs auto-parsed" value={parsedOk} hint={emails.length ? `${Math.round((parsedOk / emails.length) * 100)}% of messages` : 'no mail yet'} accent="cyan" />
        <Kpi label="Auto-matched to a vacancy" value={autoMatched} hint={`${unassigned} unassigned`} accent="mint" />
        <Kpi label="Awaiting recruiter review" value={awaitingReview} hint={`${duplicates} linked to existing profiles`} accent="amber" />
        <Kpi label="Automation success rate" value={`${automationRate}%`} hint={minutesSaved ? `≈ ${(minutesSaved / 60).toFixed(1)}h of manual handling saved` : 'no mail yet'} accent="mint" />
      </div>
      {emails.length === 0 && (
        <div className="mt-3 rounded-xl border border-[#ebe9ef] bg-[#fcfbfd] px-4 py-3 text-[12.5px] text-[#898294]">
          No inbound applications yet. Open the <Link href="/inbox" className="link">Recruitment Inbox</Link> and use
          <span className="font-medium text-ink-900"> Simulate Incoming Application</span> to run a candidate email through the full intake pipeline.
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Card title="Application & hiring trend" subtitle="Last six months" className="lg:col-span-2">
          <div className="p-4">
            <TrendChart data={hiringTrend} x="month" series={[{ key: 'Applications', name: 'Applications' }, { key: 'Hires', name: 'Hires', color: '#10b981' }]} />
          </div>
        </Card>
        <Card title="Hiring funnel" subtitle="Current pipeline">
          <div className="p-4">
            <Funnel stages={funnel} />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Headcount by department">
          <div className="p-4">
            <BarsChart data={deptData} x="name" y="Headcount" horizontal />
          </div>
        </Card>
        <Card title="Pipeline stage mix">
          <div className="p-4">
            <DonutChart data={stageMix} />
          </div>
        </Card>
        <Card title="Key metrics">
          <div className="divide-y divide-[#f5f4f7]">
            {[
              ['Time to hire', '34 days', 'vs 45-day baseline'],
              ['Cost per hire', 'AED 11,400', '−18% YoY'],
              ['Offer acceptance rate', '82%', 'last 12 offers'],
              ['Employee turnover', '10.9%', 'rolling 12 months'],
              ['Employee engagement', `${avgEngagement}/100`, 'latest pulse'],
              ['Training completion', `${avgTraining}%`, '70% target'],
              ['Absenteeism', '2.4%', 'within band'],
            ].map(([k, v, h]) => (
              <div key={k} className="flex items-center justify-between px-5 py-[11px]">
                <div>
                  <div className="text-[12.5px] font-medium text-ink-900">{k}</div>
                  <div className="text-[11px] text-[#a7a1b1]">{h}</div>
                </div>
                <div className="text-[14px] font-semibold text-ink-950">{v}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Awaiting your approval" subtitle="Sensitive actions never execute automatically" actions={<Link href="/approvals" className="text-[12.5px] font-medium text-brand-600 hover:underline">View all</Link>}>
          {pendingApprovals.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-[#9892a2]">Nothing pending for your role.</p>
          ) : (
            <div className="divide-y divide-[#f5f4f7]">
              {pendingApprovals.slice(0, 3).map((a) => (
                <div key={a.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Badge tone="amber">{a.type}</Badge>
                      <div className="mt-1.5 text-[13px] font-semibold text-ink-950">{a.title}</div>
                      <p className="mt-0.5 text-[12px] text-[#898294]">{a.summary}</p>
                    </div>
                    <Link href="/approvals" className="btn-ghost">Review</Link>
                  </div>
                  <div className="mt-3">
                    <ExplainBlock items={a.explanation.slice(0, 3)} title={`AI recommendation: ${a.aiRecommendation}`} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card title="Upcoming interviews" actions={<Link href="/interviews" className="text-[12.5px] font-medium text-brand-600 hover:underline">Manage</Link>}>
            <Table head={['Candidate', 'Round', 'When', 'Mode']}>
              {upcoming.map((i) => {
                const c = db.candidates.find((x) => x.id === i.candidateId);
                return (
                  <tr key={i.id}>
                    <td className="td font-medium">{c?.name}</td>
                    <td className="td text-[#71697d]">{i.round}</td>
                    <td className="td text-[#71697d]">{new Date(i.scheduledAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai' })}</td>
                    <td className="td"><Badge tone="neutral">{i.mode}</Badge></td>
                  </tr>
                );
              })}
            </Table>
          </Card>

          <Card title="Recent agent activity" actions={<Link href="/agent-activity" className="text-[12.5px] font-medium text-brand-600 hover:underline">Full log</Link>}>
            <div className="divide-y divide-[#f5f4f7]">
              {db.audit.slice(0, 5).map((l) => (
                <div key={l.id} className="flex items-start gap-3 px-5 py-3">
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${l.severity === 'warning' ? 'bg-amberx-500' : l.actorRole === 'AI Agent' ? 'bg-brand-500' : 'bg-mint-500'}`} />
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-medium text-ink-900">{l.actor} · {l.action.replace(/_/g, ' ').toLowerCase()}</div>
                    <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-[#9892a2]">{l.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card title="Open requisitions" className="mt-4" actions={<Link href="/jobs" className="text-[12.5px] font-medium text-brand-600 hover:underline">All jobs</Link>}>
        <Table head={['Role', 'Department', 'Location', 'Openings', 'Priority', 'Pipeline', 'Status']}>
          {openJobs.slice(0, 6).map((j) => (
            <tr key={j.id}>
              <td className="td font-medium"><Link href={`/jobs/${j.id}`} className="link">{j.title}</Link></td>
              <td className="td text-[#71697d]">{deptName(j.departmentId)}</td>
              <td className="td text-[#71697d]">{j.location}</td>
              <td className="td">{j.openings}</td>
              <td className="td"><Badge tone={stageTone(j.priority)}>{j.priority}</Badge></td>
              <td className="td">{db.candidates.filter((c) => c.jobId === j.id).length}</td>
              <td className="td"><Badge tone={stageTone(j.status)} dot>{j.status}</Badge></td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
