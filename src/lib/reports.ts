import type { Role } from './types';
import { db } from './store';
import { deptName, departments, skillName } from './seed';
import { screenCandidate } from './agents/screening';
import { analyseEngagement, assessRetentionRisk } from './agents/specialists';

/**
 * HR reporting layer.
 *
 * Every report is produced by the agent that already owns that domain — there
 * is no separate "reporting engine" inventing numbers. Each generator reads the
 * live store, states the method it used and the caveats that apply, and returns
 * a recommendation-shaped result: figures for a human to act on, never an
 * automated decision.
 *
 * No report segments people by gender, race, ethnicity, religion, nationality,
 * disability, marital status or age. Those attributes are not held on the record
 * and are not a permitted analysis dimension — see REPORTING_EXCLUSIONS.
 */

export const REPORTING_EXCLUSIONS = [
  'Gender',
  'Race / ethnicity',
  'Religion',
  'Nationality',
  'Disability',
  'Marital status',
  'Age',
];

export type ReportCategory = 'Recruitment' | 'Workforce' | 'Employee experience' | 'Governance';

export interface ReportKpi {
  label: string;
  value: string | number;
  hint?: string;
  accent?: 'brand' | 'mint' | 'amber' | 'rose' | 'cyan';
}

export type ReportSection =
  | { kind: 'table'; title: string; head: string[]; rows: (string | number)[][] }
  | { kind: 'bars'; title: string; data: { label: string; value: number }[] }
  | { kind: 'list'; title: string; items: string[] };

export interface ReportResult {
  id: string;
  name: string;
  agentId: string;
  agentLabel: string;
  generatedAt: string;
  period: string;
  kpis: ReportKpi[];
  sections: ReportSection[];
  narrative: string;
  methodology: string[];
  caveats: string[];
}

export interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  category: ReportCategory;
  agentId: string;
  agentLabel: string;
  roles: Role[];
  generate: () => ReportResult;
}

const HR = ['HR_ADMIN'] as Role[];
const HR_HM: Role[] = ['HR_ADMIN', 'HIRING_MANAGER'];
const HR_REC: Role[] = ['HR_ADMIN', 'RECRUITER'];
const HR_REC_HM: Role[] = ['HR_ADMIN', 'RECRUITER', 'HIRING_MANAGER'];

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);
const countBy = <T>(items: T[], key: (t: T) => string) =>
  items.reduce<Record<string, number>>((acc, i) => {
    const k = key(i);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
const toBars = (rec: Record<string, number>) =>
  Object.entries(rec)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));

/** Shared period label — the prototype store holds a single current period. */
const period = () =>
  `As at ${new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Dubai', day: 'numeric', month: 'long', year: 'numeric' })}`;

const base = (d: Pick<ReportDefinition, 'id' | 'name' | 'agentId' | 'agentLabel'>) => ({
  id: d.id,
  name: d.name,
  agentId: d.agentId,
  agentLabel: d.agentLabel,
  generatedAt: new Date().toISOString(),
  period: period(),
});

/* ==================================================================== */
/* Recruitment                                                          */
/* ==================================================================== */

function recruitmentFunnel(): ReportResult {
  const open = db.jobs.filter((j) => j.status === 'Open');
  const c = db.candidates;
  const at = (...stages: string[]) => c.filter((x) => stages.includes(x.stage)).length;

  const applications = c.length;
  const screened = at('Screened', 'Shortlisted', 'Interviewing', 'Offered', 'Hired');
  const shortlisted = at('Shortlisted', 'Interviewing', 'Offered', 'Hired');
  const interviewed = at('Interviewing', 'Offered', 'Hired');
  const offered = at('Offered', 'Hired');
  const hired = at('Hired');
  const rejected = at('Rejected');

  const scored = c
    .map((cand) => {
      const job = db.jobs.find((j) => j.id === cand.jobId);
      return job ? screenCandidate(cand, job).overall : null;
    })
    .filter((n): n is number => n !== null);
  const avgMatch = scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : 0;

  const byDept = db.jobs
    .filter((j) => j.status === 'Open')
    .reduce<Record<string, number>>((acc, j) => {
      acc[deptName(j.departmentId)] = (acc[deptName(j.departmentId)] ?? 0) + j.openings;
      return acc;
    }, {});

  return {
    ...base({ id: 'recruitment-funnel', name: 'Recruitment funnel & hiring', agentId: 'talent-acquisition', agentLabel: 'Talent Acquisition Agent' }),
    kpis: [
      { label: 'Open requisitions', value: open.length, hint: `${open.reduce((a, j) => a + j.openings, 0)} openings`, accent: 'brand' },
      { label: 'Candidates in pipeline', value: applications, hint: `${rejected} closed out`, accent: 'cyan' },
      { label: 'Shortlisted', value: shortlisted, hint: `${pct(shortlisted, applications)}% of applications`, accent: 'mint' },
      { label: 'Hired', value: hired, hint: `${pct(hired, applications)}% conversion`, accent: 'mint' },
      { label: 'Average AI match', value: `${avgMatch}%`, hint: 'across scored candidates', accent: 'brand' },
    ],
    sections: [
      {
        kind: 'table',
        title: 'Funnel conversion',
        head: ['Stage', 'Candidates', 'Conversion from applications'],
        rows: [
          ['Applications', applications, '100%'],
          ['Screened', screened, `${pct(screened, applications)}%`],
          ['Shortlisted', shortlisted, `${pct(shortlisted, applications)}%`],
          ['Interviewed', interviewed, `${pct(interviewed, applications)}%`],
          ['Offered', offered, `${pct(offered, applications)}%`],
          ['Hired', hired, `${pct(hired, applications)}%`],
        ],
      },
      { kind: 'bars', title: 'Open headcount by department', data: toBars(byDept) },
      {
        kind: 'table',
        title: 'Open requisitions',
        head: ['Requisition', 'Department', 'Location', 'Openings', 'Priority'],
        rows: open.map((j) => [j.title, deptName(j.departmentId), j.location, j.openings, j.priority]),
      },
    ],
    narrative: `${open.length} open requisitions cover ${open.reduce((a, j) => a + j.openings, 0)} openings. The pipeline holds ${applications} candidates, converting ${applications} applications → ${shortlisted} shortlisted → ${interviewed} interviewed → ${hired} hired. Average AI match across scored candidates is ${avgMatch}%. No candidate has been advanced or rejected automatically — every stage change in this report was recorded against a named recruiter.`,
    methodology: [
      'Stage counts are cumulative: a candidate at "Offered" is counted in every earlier stage they passed.',
      'AI match is the Screening Agent score against the evaluation criteria approved on that candidate\'s requisition.',
      'Candidates with no linked requisition are excluded from the match average, not from the pipeline count.',
    ],
    caveats: [
      'Conversion is a point-in-time snapshot of the current pipeline, not a cohort analysis — candidates entered at different dates.',
      'Match scores are a recommendation for human review and are not a hiring decision.',
    ],
  };
}

function intakeAutomation(): ReportResult {
  const emails = db.emails;
  const apps = db.applications;
  const parsed = emails.filter((e) => e.attachments?.some((a) => a.isResume && a.validation.passed)).length;
  const quarantined = emails.filter((e) => e.attachments?.some((a) => a.validation.quarantined)).length;
  const matched = apps.filter((a) => a.jobId).length;
  const unassigned = apps.length - matched;
  const duplicates = emails.filter((e) => e.duplicateOf).length;

  const byMailbox = countBy(emails, (e) => e.mailboxAddress);
  const byStatus = countBy(emails, (e) => String(e.status));
  const candidateName = (id?: string) => db.candidates.find((c) => c.id === id)?.name;
  const jobTitle = (id?: string) => db.jobs.find((j) => j.id === id)?.title;

  return {
    ...base({ id: 'intake-automation', name: 'Zero-touch intake performance', agentId: 'email-intake', agentLabel: 'Email Intake Agent' }),
    kpis: [
      { label: 'Applications received', value: emails.length, hint: 'via monitored mailboxes', accent: 'brand' },
      { label: 'CVs auto-parsed', value: parsed, hint: `${pct(parsed, emails.length)}% of messages`, accent: 'mint' },
      { label: 'Auto-matched to a vacancy', value: matched, hint: `${unassigned} parked as unassigned`, accent: 'cyan' },
      { label: 'Duplicates linked', value: duplicates, hint: 'merged to existing profiles', accent: 'amber' },
      { label: 'Attachments quarantined', value: quarantined, hint: 'failed security validation', accent: quarantined ? 'rose' : 'mint' },
    ],
    sections: [
      { kind: 'bars', title: 'Applications by mailbox', data: toBars(byMailbox) },
      { kind: 'bars', title: 'Pipeline status', data: toBars(byStatus) },
      {
        kind: 'table',
        title: 'Recent inbound applications',
        head: ['Received', 'Candidate', 'Vacancy', 'Status'],
        rows: emails
          .slice(0, 15)
          .map((e) => [
            new Date(e.receivedAt).toLocaleString('en-GB', { timeZone: 'Asia/Dubai', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
            candidateName(e.candidateId) ?? e.fromName,
            jobTitle(apps.find((a) => a.emailId === e.id)?.jobId) ?? 'Unassigned',
            String(e.status),
          ]),
      },
    ],
    narrative: emails.length
      ? `${emails.length} applications arrived through the monitored recruitment mailboxes. ${parsed} had a CV parsed automatically (${pct(parsed, emails.length)}%), ${matched} were matched to a vacancy without recruiter input and ${unassigned} were parked as unassigned because the agent would not guess below its confidence bar. ${quarantined} attachment(s) failed security validation and were quarantined without being parsed.`
      : 'No inbound applications have been received yet. Connect a recruitment mailbox, or use "Simulate Incoming Application" in the Recruitment Inbox to run a candidate email through the full intake pipeline.',
    methodology: [
      'Counts cover every message the intake pipeline processed, including simulated messages — they travel the identical pipeline.',
      'A CV counts as auto-parsed only when the attachment passed every security check and yielded structured fields.',
      'A vacancy match counts as automatic only when the Job Matching Agent cleared its confidence threshold.',
    ],
    caveats: [
      'Quarantined attachments are never parsed, so those candidates carry no extracted data and need a recruiter to request a resend.',
      'Unassigned applications are a deliberate outcome, not a failure — the agent refuses to guess the vacancy.',
    ],
  };
}

function interviewActivity(): ReportResult {
  const iv = db.interviews;
  const byStatus = countBy(iv, (i) => String(i.status));
  const byRound = countBy(iv, (i) => i.round);
  const byMode = countBy(iv, (i) => i.mode);
  const withFeedback = iv.filter((i) => Boolean(i.feedback)).length;

  return {
    ...base({ id: 'interview-activity', name: 'Interview activity & evaluation', agentId: 'interview-evaluation', agentLabel: 'Interview Evaluation Agent' }),
    kpis: [
      { label: 'Interviews scheduled', value: iv.length, accent: 'brand' },
      { label: 'Feedback recorded', value: withFeedback, hint: `${pct(withFeedback, iv.length)}% of interviews`, accent: 'mint' },
      { label: 'Awaiting feedback', value: iv.length - withFeedback, accent: 'amber' },
    ],
    sections: [
      { kind: 'bars', title: 'By status', data: toBars(byStatus) },
      { kind: 'bars', title: 'By round', data: toBars(byRound) },
      { kind: 'bars', title: 'By mode', data: toBars(byMode) },
      {
        kind: 'table',
        title: 'Scheduled interviews',
        head: ['When', 'Candidate', 'Round', 'Mode', 'Status'],
        rows: iv
          .slice(0, 20)
          .map((i) => [
            new Date(i.scheduledAt).toLocaleString('en-GB', { timeZone: 'Asia/Dubai', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
            db.candidates.find((c) => c.id === i.candidateId)?.name ?? i.candidateId,
            i.round,
            i.mode,
            String(i.status),
          ]),
      },
    ],
    narrative: `${iv.length} interviews are on record, of which ${withFeedback} have panel feedback captured (${pct(withFeedback, iv.length)}%). Ratings are normalised against the role bar by the Interview Evaluation Agent and remain advisory — the hiring decision sits with the named panel and hiring manager.`,
    methodology: [
      'Interview times are shown in Gulf Standard Time (Asia/Dubai), the organisational timezone.',
      'Feedback completeness counts an interview as complete when at least one panel member has submitted structured feedback.',
    ],
    caveats: ['Panel ratings are self-reported and normalised, not calibrated across interviewers.'],
  };
}

function offersReport(): ReportResult {
  const offers = db.offers;
  const byStatus = countBy(offers, (o) => o.status);
  const accepted = offers.filter((o) => o.status === 'Accepted').length;
  const declined = offers.filter((o) => o.status === 'Declined').length;
  const decided = accepted + declined;

  return {
    ...base({ id: 'offers', name: 'Offers & acceptance', agentId: 'offer-onboarding', agentLabel: 'Offer & Onboarding Agent' }),
    kpis: [
      { label: 'Offers raised', value: offers.length, accent: 'brand' },
      { label: 'Accepted', value: accepted, hint: decided ? `${pct(accepted, decided)}% of decided offers` : 'none decided yet', accent: 'mint' },
      { label: 'Declined', value: declined, accent: 'rose' },
      { label: 'Awaiting decision', value: offers.length - decided, accent: 'amber' },
    ],
    sections: [
      { kind: 'bars', title: 'Offers by status', data: toBars(byStatus) },
      {
        kind: 'table',
        title: 'Offer register',
        head: ['Candidate', 'Role', 'Base salary', 'Joining date', 'Status', 'Approved by'],
        rows: offers.map((o) => [
          db.candidates.find((c) => c.id === o.candidateId)?.name ?? o.candidateId,
          db.jobs.find((j) => j.id === o.jobId)?.title ?? '—',
          o.baseSalary,
          new Date(o.joiningDate).toLocaleDateString('en-GB', { timeZone: 'Asia/Dubai', day: 'numeric', month: 'short', year: 'numeric' }),
          o.status,
          o.approvedBy ?? 'Pending approval',
        ]),
      },
    ],
    narrative: `${offers.length} offers are on record. ${accepted} accepted and ${declined} declined, giving an acceptance rate of ${decided ? pct(accepted, decided) : 0}% across decided offers, with ${offers.length - decided} still awaiting a candidate decision. Every offer in this register was drafted by the agent within the approved band and released only after a named human approver signed it off.`,
    methodology: [
      'Acceptance rate is calculated over decided offers only (accepted + declined); pending offers are excluded from the denominator.',
      'Salary figures are the offered base as drafted, excluding allowances and variable pay.',
    ],
    caveats: [
      'Acceptance rate over a small number of offers is volatile — treat it as directional, not as a benchmark.',
      'Compensation is reported as offered, not as finally contracted.',
    ],
  };
}

/* ==================================================================== */
/* Workforce                                                            */
/* ==================================================================== */

function headcount(): ReportResult {
  const emp = db.employees;
  const active = emp.filter((e) => e.status === 'Active');
  const byDept = countBy(emp, (e) => deptName(e.departmentId));
  const byLevel = countBy(emp, (e) => e.level);
  const byLocation = countBy(emp, (e) => e.location.split(',')[0].trim());
  const byType = countBy(emp, (e) => e.employmentType);
  const avgTenure = emp.length ? Math.round(emp.reduce((a, e) => a + e.tenureMonths, 0) / emp.length) : 0;

  return {
    ...base({ id: 'headcount', name: 'Headcount & workforce composition', agentId: 'workforce-planning', agentLabel: 'Workforce Planning Agent' }),
    kpis: [
      { label: 'Total employees', value: emp.length, hint: `${departments.length} departments`, accent: 'brand' },
      { label: 'Active', value: active.length, hint: `${emp.length - active.length} in notice or on leave`, accent: 'mint' },
      { label: 'Average tenure', value: `${avgTenure} months`, accent: 'cyan' },
      { label: 'Contract & part-time', value: emp.filter((e) => e.employmentType !== 'Full-time').length, accent: 'amber' },
    ],
    sections: [
      { kind: 'bars', title: 'Headcount by department', data: toBars(byDept) },
      { kind: 'bars', title: 'By seniority level', data: toBars(byLevel) },
      { kind: 'bars', title: 'By location', data: toBars(byLocation) },
      { kind: 'bars', title: 'By employment type', data: toBars(byType) },
      {
        kind: 'table',
        title: 'Department summary',
        head: ['Department', 'Headcount', 'Open roles', 'Attrition rate', 'Engagement'],
        rows: departments.map((d) => [
          d.name,
          emp.filter((e) => e.departmentId === d.id).length,
          d.openRoles,
          `${d.attritionRate}%`,
          d.engagementScore,
        ]),
      },
    ],
    narrative: `The organisation holds ${emp.length} employees across ${departments.length} departments, ${active.length} of them active. Average tenure is ${avgTenure} months. ${emp.filter((e) => e.employmentType !== 'Full-time').length} are on contract or part-time arrangements. Composition is reported on role, level, location and employment type only.`,
    methodology: [
      'Headcount is a person count, not full-time equivalent — part-time staff count as one.',
      'Location is grouped by city, taken from the employment record.',
    ],
    caveats: [
      `Composition is never segmented by ${REPORTING_EXCLUSIONS.join(', ').toLowerCase()} — those attributes are not held on the employee record.`,
      'Departmental attrition rates are supplied by the HR system of record and are not recalculated here.',
    ],
  };
}

function retention(): ReportResult {
  const assessed = db.employees.map((e) => ({ employee: e, risk: assessRetentionRisk(e) }));
  const high = assessed.filter((a) => a.risk.level === 'High');
  const medium = assessed.filter((a) => a.risk.level === 'Medium');

  const factorTally = assessed
    .flatMap((a) => a.risk.factors)
    .filter((f) => f.impact > 0)
    .reduce<Record<string, number>>((acc, f) => {
      acc[f.factor] = (acc[f.factor] ?? 0) + 1;
      return acc;
    }, {});

  const byDept = high.reduce<Record<string, number>>((acc, a) => {
    const d = deptName(a.employee.departmentId);
    acc[d] = (acc[d] ?? 0) + 1;
    return acc;
  }, {});

  return {
    ...base({ id: 'retention', name: 'Attrition & retention risk', agentId: 'retention', agentLabel: 'Retention Risk Agent' }),
    kpis: [
      { label: 'Employees assessed', value: assessed.length, accent: 'brand' },
      { label: 'High risk', value: high.length, hint: `${pct(high.length, assessed.length)}% of workforce`, accent: 'rose' },
      { label: 'Medium risk', value: medium.length, accent: 'amber' },
      { label: 'Low risk', value: assessed.length - high.length - medium.length, accent: 'mint' },
    ],
    sections: [
      { kind: 'bars', title: 'Most common contributing factors', data: toBars(factorTally) },
      { kind: 'bars', title: 'High-risk employees by department', data: toBars(byDept) },
      {
        kind: 'table',
        title: 'Employees flagged for a supportive conversation',
        head: ['Employee', 'Department', 'Level', 'Risk', 'Leading factor'],
        rows: [...high, ...medium]
          .sort((a, b) => b.risk.score - a.risk.score)
          .slice(0, 20)
          .map((a) => [
            a.employee.name,
            deptName(a.employee.departmentId),
            a.employee.level,
            a.risk.level,
            a.risk.factors[0]?.factor ?? '—',
          ]),
      },
    ],
    narrative: `${high.length} employees show elevated retention risk and ${medium.length} show moderate risk, out of ${assessed.length} assessed. The most frequent contributing factor is "${toBars(factorTally)[0]?.label ?? 'none recorded'}". Each assessment uses only work-related indicators and proposes a supportive conversation — this report never recommends termination, demotion or any adverse action.`,
    methodology: [
      'Risk is scored from work-related indicators only: engagement, performance, tenure, learning participation, internal mobility, workload and departmental attrition.',
      'Scores above 55 are High, 30–54 Medium, below 30 Low.',
    ],
    caveats: [
      `No protected attribute is used: ${REPORTING_EXCLUSIONS.join(', ').toLowerCase()} are excluded by design.`,
      'This is a prompt for a supportive management conversation, not a prediction about any individual, and must not be used in any adverse employment decision.',
    ],
  };
}

function skills(): ReportResult {
  const emp = db.employees;
  const coverage = emp
    .flatMap((e) => e.skills.map((s) => skillName(s.skillId)))
    .reduce<Record<string, number>>((acc, n) => {
      acc[n] = (acc[n] ?? 0) + 1;
      return acc;
    }, {});
  const top = toBars(coverage).slice(0, 12);
  const scarce = toBars(coverage).slice(-8).reverse();
  const avgTraining = emp.length ? Math.round(emp.reduce((a, e) => a + e.trainingCompletion, 0) / emp.length) : 0;
  const lowTraining = emp.filter((e) => e.trainingCompletion < 40).length;

  return {
    ...base({ id: 'skills', name: 'Skills coverage & learning', agentId: 'learning', agentLabel: 'Learning & Skills Agent' }),
    kpis: [
      { label: 'Distinct skills held', value: Object.keys(coverage).length, accent: 'brand' },
      { label: 'Average training completion', value: `${avgTraining}%`, accent: avgTraining >= 60 ? 'mint' : 'amber' },
      { label: 'Below 40% completion', value: lowTraining, hint: 'need protected learning time', accent: 'amber' },
      { label: 'Employees with expert depth', value: emp.filter((e) => e.skills.some((s) => s.level === 'Expert')).length, accent: 'cyan' },
    ],
    sections: [
      { kind: 'bars', title: 'Most widely held skills', data: top },
      { kind: 'bars', title: 'Scarcest skills (single points of failure)', data: scarce },
      {
        kind: 'table',
        title: 'Lowest learning participation',
        head: ['Employee', 'Department', 'Level', 'Training completion'],
        rows: [...emp]
          .sort((a, b) => a.trainingCompletion - b.trainingCompletion)
          .slice(0, 15)
          .map((e) => [e.name, deptName(e.departmentId), e.level, `${e.trainingCompletion}%`]),
      },
    ],
    narrative: `The workforce holds ${Object.keys(coverage).length} distinct skills. Average training completion is ${avgTraining}%, with ${lowTraining} employees below 40% who need protected learning time. The scarcest skills are held by very few people and represent single points of failure worth addressing through the learning plan or hiring.`,
    methodology: [
      'Skill coverage counts an employee once per skill held at any level.',
      'Scarcity is the inverse of coverage across the active workforce, not weighted by criticality to delivery.',
    ],
    caveats: [
      'Skill levels are self-reported and manager-confirmed, not independently assessed.',
      'Low learning participation is a resourcing signal, not a performance judgement.',
    ],
  };
}

/* ==================================================================== */
/* Employee experience                                                  */
/* ==================================================================== */

function engagement(): ReportResult {
  const analysis = analyseEngagement();
  const visible = analysis.themes.filter((t: { suppressed?: boolean }) => !t.suppressed);
  const suppressed = analysis.themes.length - visible.length;
  const avg = visible.length
    ? Number((visible.reduce((a: number, t: { sentiment: number }) => a + t.sentiment, 0) / visible.length).toFixed(2))
    : 0;

  // Sentiment is a signed -1..1 scale, so it is reported with its sign and
  // scaled to -100..100 for the chart, matching the Engagement Analytics screen.
  const lowest = visible.reduce<{ theme: string; sentiment: number } | null>(
    (worst, t: { theme: string; sentiment: number }) => (!worst || t.sentiment < worst.sentiment ? t : worst),
    null,
  );

  return {
    ...base({ id: 'engagement', name: 'Engagement & sentiment', agentId: 'engagement', agentLabel: 'Employee Engagement Agent' }),
    kpis: [
      { label: 'Themes analysed', value: analysis.themes.length, accent: 'brand' },
      {
        label: 'Average sentiment',
        value: `${avg > 0 ? '+' : ''}${avg}`,
        hint: 'on a −1 to +1 scale',
        accent: avg >= 0.2 ? 'mint' : avg >= 0 ? 'amber' : 'rose',
      },
      { label: 'Lowest theme', value: lowest?.theme ?? '—', hint: lowest ? `${lowest.sentiment > 0 ? '+' : ''}${lowest.sentiment}` : undefined, accent: 'amber' },
      { label: 'Suppressed segments', value: suppressed, hint: 'below 5 responses', accent: 'cyan' },
    ],
    sections: [
      {
        kind: 'bars',
        title: 'Sentiment by theme (−100 to +100)',
        data: visible.map((t: { theme: string; sentiment: number }) => ({ label: t.theme, value: Math.round(t.sentiment * 100) })),
      },
      {
        kind: 'table',
        title: 'Theme detail',
        head: ['Theme', 'Sentiment', 'Responses'],
        rows: analysis.themes.map((t: { theme: string; sentiment: number; responses: number; suppressed?: boolean }) =>
          t.suppressed ? [t.theme, 'Suppressed', '< 5'] : [t.theme, t.sentiment, t.responses],
        ),
      },
      { kind: 'list', title: 'Recommended actions', items: analysis.actions },
    ],
    narrative: `Sentiment averages ${avg > 0 ? '+' : ''}${avg} on a −1 to +1 scale across ${visible.length} reportable themes${lowest ? `, with "${lowest.theme}" lowest at ${lowest.sentiment > 0 ? '+' : ''}${lowest.sentiment}` : ''}. ${suppressed} segment(s) were suppressed because they hold fewer than five responses — anonymity is protected ahead of completeness. Actions below are suggestions for a named owner, not automated interventions.`,
    methodology: [
      'Aggregate analysis of submitted feedback grouped by theme.',
      'Sentiment runs from −1 (negative) through 0 (neutral) to +1 (positive); it is not a percentage or a 5-point rating.',
      'Any segment with fewer than five responses is suppressed and reported as such rather than shown.',
    ],
    caveats: [
      analysis.note,
      'Sentiment reflects who chose to respond and is not a representative survey of the whole workforce.',
    ],
  };
}

function leaveReport(): ReportResult {
  const leave = db.leave;
  const byStatus = countBy(leave, (l) => l.status);
  const byType = countBy(leave, (l) => l.type);
  const pending = leave.filter((l) => l.status === 'Pending');
  const totalDays = leave.filter((l) => l.status === 'Approved').reduce((a, l) => a + l.days, 0);
  const withConflicts = leave.filter((l) => l.conflicts && l.conflicts.length).length;

  return {
    ...base({ id: 'leave', name: 'Leave & absence', agentId: 'leave', agentLabel: 'Leave Management Agent' }),
    kpis: [
      { label: 'Requests on record', value: leave.length, accent: 'brand' },
      { label: 'Approved days', value: totalDays, hint: 'across approved requests', accent: 'mint' },
      { label: 'Pending decision', value: pending.length, accent: 'amber' },
      { label: 'Flagged conflicts', value: withConflicts, hint: 'coverage clashes detected', accent: withConflicts ? 'rose' : 'mint' },
    ],
    sections: [
      { kind: 'bars', title: 'Requests by type', data: toBars(byType) },
      { kind: 'bars', title: 'Requests by status', data: toBars(byStatus) },
      {
        kind: 'table',
        title: 'Leave register',
        head: ['Employee', 'Type', 'From', 'To', 'Days', 'Status', 'Conflicts'],
        rows: leave
          .slice(0, 20)
          .map((l) => [
            db.employees.find((e) => e.id === l.employeeId)?.name ?? l.employeeId,
            l.type,
            new Date(l.from).toLocaleDateString('en-GB', { timeZone: 'Asia/Dubai', day: 'numeric', month: 'short' }),
            new Date(l.to).toLocaleDateString('en-GB', { timeZone: 'Asia/Dubai', day: 'numeric', month: 'short' }),
            l.days,
            l.status,
            l.conflicts?.length ? l.conflicts.length : '—',
          ]),
      },
    ],
    narrative: `${leave.length} leave requests are on record, totalling ${totalDays} approved days. ${pending.length} await a line-manager decision and ${withConflicts} carry a detected coverage conflict. The agent parses, validates and routes requests; the approval itself remains with the named line manager.`,
    methodology: [
      'Day counts exclude weekends, as calculated by the Leave Management Agent when the request was parsed.',
      'Conflicts are detected against overlapping approved leave within the same team.',
    ],
    caveats: [
      'Sick leave is reported in aggregate only. No medical detail or reason is held or reported.',
      'Public holidays are not deducted in this prototype.',
    ],
  };
}

function performance(): ReportResult {
  const reviews = db.reviews;
  const byStatus = countBy(reviews, (r) => r.status);
  const finalised = reviews.filter((r) => r.status === 'Finalised');
  const avgRating = reviews.length ? Number((reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(2)) : 0;
  const goalRate = reviews.length
    ? pct(reviews.reduce((a, r) => a + r.goalsAchieved, 0), reviews.reduce((a, r) => a + r.goalsTotal, 0))
    : 0;
  const dist = countBy(reviews, (r) => `${Math.round(r.rating)} star`);

  return {
    ...base({ id: 'performance', name: 'Performance review cycle', agentId: 'performance', agentLabel: 'Performance Management Agent' }),
    kpis: [
      { label: 'Reviews in cycle', value: reviews.length, accent: 'brand' },
      { label: 'Finalised', value: finalised.length, hint: `${pct(finalised.length, reviews.length)}% complete`, accent: 'mint' },
      { label: 'Average rating', value: avgRating, hint: 'out of 5', accent: 'cyan' },
      { label: 'Goal achievement', value: `${goalRate}%`, hint: 'goals met across the cycle', accent: goalRate >= 70 ? 'mint' : 'amber' },
    ],
    sections: [
      { kind: 'bars', title: 'Rating distribution', data: toBars(dist) },
      { kind: 'bars', title: 'Review status', data: toBars(byStatus) },
      {
        kind: 'table',
        title: 'Review register',
        head: ['Employee', 'Cycle', 'Goals met', 'Rating', 'Status'],
        rows: reviews
          .slice(0, 20)
          .map((r) => [
            db.employees.find((e) => e.id === r.employeeId)?.name ?? r.employeeId,
            r.cycle,
            `${r.goalsAchieved}/${r.goalsTotal}`,
            r.rating,
            r.status,
          ]),
      },
    ],
    narrative: `${reviews.length} reviews are in the current cycle, ${finalised.length} of them finalised (${pct(finalised.length, reviews.length)}%). The average rating is ${avgRating} out of 5 and ${goalRate}% of agreed goals were met. Review packs are assembled from evidence by the agent; the rating and the conversation belong to the manager.`,
    methodology: [
      'Goal achievement aggregates goals met against goals set across every review in the cycle.',
      'Ratings are as recorded by the manager, not adjusted or calibrated by the platform.',
    ],
    caveats: [
      'Ratings are not calibrated across managers, so cross-department comparison is unsafe.',
      'AI-generated review summaries are advisory and must be edited and owned by the manager before use.',
    ],
  };
}

/* ==================================================================== */
/* Governance                                                           */
/* ==================================================================== */

function automation(): ReportResult {
  const runs = db.runs;
  const tasks = runs.flatMap((r) => r.tasks ?? []);
  const completed = tasks.filter((t) => t.status === 'Completed').length;
  const failed = tasks.filter((t) => t.status === 'Failed').length;
  const awaiting = runs.filter((r) => r.status === 'Awaiting Approval').length;
  const byAgent = countBy(tasks, (t) => t.agentId);
  const byIntent = countBy(runs, (r) => r.intent ?? 'UNKNOWN');
  const totalMs = tasks.reduce((a, t) => a + (t.durationMs ?? 0), 0);

  return {
    ...base({ id: 'automation', name: 'Agent automation & throughput', agentId: 'coordinator', agentLabel: 'HR Coordinator Agent' }),
    kpis: [
      { label: 'Agent runs', value: runs.length, accent: 'brand' },
      { label: 'Agent tasks executed', value: tasks.length, hint: `${completed} completed`, accent: 'cyan' },
      { label: 'Awaiting human approval', value: awaiting, hint: 'stopped at an approval gate', accent: 'amber' },
      { label: 'Failed tasks', value: failed, accent: failed ? 'rose' : 'mint' },
      { label: 'Total agent runtime', value: `${(totalMs / 1000).toFixed(1)}s`, accent: 'brand' },
    ],
    sections: [
      { kind: 'bars', title: 'Tasks by agent', data: toBars(byAgent) },
      { kind: 'bars', title: 'Runs by intent', data: toBars(byIntent) },
      {
        kind: 'table',
        title: 'Recent runs',
        head: ['Requested', 'Intent', 'Actor', 'Tasks', 'Status'],
        rows: runs
          .slice(0, 20)
          .map((r) => [
            new Date(r.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Dubai', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
            r.intent ?? '—',
            r.actor,
            (r.tasks ?? []).length,
            r.status,
          ]),
      },
    ],
    narrative: runs.length
      ? `${runs.length} agent runs executed ${tasks.length} tasks, ${completed} completed and ${failed} failed, in ${(totalMs / 1000).toFixed(1)} seconds of total agent runtime. ${awaiting} run(s) stopped at an approval gate and are waiting on a named human — that is the control working as designed, not a backlog.`
      : 'No agent runs have been recorded yet. Use the AI HR Command Center to run a workflow, and this report will show the full task graph, durations and approval gates.',
    methodology: [
      'A run is one natural-language request routed by the Coordinator; a task is one specialist agent execution within that run.',
      'Runtime is the sum of reported task durations, not wall-clock time.',
    ],
    caveats: [
      'Runtime figures describe agent execution only and exclude the time a request waits for human approval.',
      'This report measures activity, not business benefit — no time-saved or cost-saved figure is asserted here.',
    ],
  };
}

function complianceAudit(): ReportResult {
  const audit = db.audit;
  const bySeverity = countBy(audit, (a) => a.severity ?? 'info');
  const byActorRole = countBy(audit, (a) => String(a.actorRole));
  const byAction = countBy(audit, (a) => a.action);
  const aiActions = audit.filter((a) => a.actorRole === 'AI Agent').length;
  const critical = audit.filter((a) => a.severity === 'critical').length;
  const approvals = db.approvals;

  return {
    ...base({ id: 'compliance', name: 'Compliance & audit trail', agentId: 'coordinator', agentLabel: 'HR Coordinator Agent' }),
    kpis: [
      { label: 'Audit entries', value: audit.length, hint: 'most recent first', accent: 'brand' },
      { label: 'Agent-attributed actions', value: aiActions, hint: `${pct(aiActions, audit.length)}% of entries`, accent: 'cyan' },
      { label: 'Approval gates on record', value: approvals.length, hint: `${approvals.filter((a) => a.status === 'Pending').length} pending`, accent: 'amber' },
      { label: 'Critical events', value: critical, accent: critical ? 'rose' : 'mint' },
    ],
    sections: [
      { kind: 'bars', title: 'Entries by severity', data: toBars(bySeverity) },
      { kind: 'bars', title: 'Entries by actor role', data: toBars(byActorRole) },
      { kind: 'bars', title: 'Most frequent actions', data: toBars(byAction).slice(0, 10) },
      {
        kind: 'table',
        title: 'Recent audit entries',
        head: ['When', 'Actor', 'Role', 'Action', 'Entity', 'Severity'],
        rows: audit
          .slice(0, 25)
          .map((a) => [
            new Date(a.at).toLocaleString('en-GB', { timeZone: 'Asia/Dubai', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
            a.actor,
            String(a.actorRole),
            a.action,
            a.entity,
            a.severity ?? 'info',
          ]),
      },
    ],
    narrative: `${audit.length} audit entries are held, ${aiActions} of them attributed to an agent rather than a person (${pct(aiActions, audit.length)}%). ${approvals.length} approval gates are on record with ${approvals.filter((a) => a.status === 'Pending').length} pending a decision. Every agent recommendation and every human decision is written with its actor, action, entity and reasoning.`,
    methodology: [
      'Entries are attributed to the acting identity: a named user, an AI Agent, or the System.',
      'Severity is assigned at write time by the agent or handler that raised the entry.',
    ],
    caveats: [
      'The prototype store retains the most recent 500 entries in memory; a production deployment writes to an append-only store with full retention.',
      'This report evidences that decisions were logged — it is not a substitute for a legal compliance review.',
    ],
  };
}

/* ==================================================================== */
/* Registry                                                             */
/* ==================================================================== */

export const REPORTS: ReportDefinition[] = [
  {
    id: 'recruitment-funnel',
    name: 'Recruitment funnel & hiring',
    description: 'Open requisitions, pipeline conversion stage by stage, and average AI match across scored candidates.',
    category: 'Recruitment',
    agentId: 'talent-acquisition',
    agentLabel: 'Talent Acquisition Agent',
    roles: HR_REC_HM,
    generate: recruitmentFunnel,
  },
  {
    id: 'intake-automation',
    name: 'Zero-touch intake performance',
    description: 'How much of the recruitment inbox was handled without a recruiter: parsed, matched, deduplicated, quarantined.',
    category: 'Recruitment',
    agentId: 'email-intake',
    agentLabel: 'Email Intake Agent',
    roles: HR_REC_HM,
    generate: intakeAutomation,
  },
  {
    id: 'interview-activity',
    name: 'Interview activity & evaluation',
    description: 'Scheduled interviews, panel feedback completeness and evaluation status.',
    category: 'Recruitment',
    agentId: 'interview-evaluation',
    agentLabel: 'Interview Evaluation Agent',
    roles: HR_REC_HM,
    generate: interviewActivity,
  },
  {
    id: 'offers',
    name: 'Offers & acceptance',
    description: 'Offer register, acceptance rate across decided offers and approval attribution.',
    category: 'Recruitment',
    agentId: 'offer-onboarding',
    agentLabel: 'Offer & Onboarding Agent',
    roles: HR_HM,
    generate: offersReport,
  },
  {
    id: 'headcount',
    name: 'Headcount & workforce composition',
    description: 'Headcount by department, level, location and employment type, with tenure and departmental attrition.',
    category: 'Workforce',
    agentId: 'workforce-planning',
    agentLabel: 'Workforce Planning Agent',
    roles: HR_HM,
    generate: headcount,
  },
  {
    id: 'retention',
    name: 'Attrition & retention risk',
    description: 'Explainable, work-related retention indicators with supportive actions. Never recommends adverse action.',
    category: 'Workforce',
    agentId: 'retention',
    agentLabel: 'Retention Risk Agent',
    roles: HR_HM,
    generate: retention,
  },
  {
    id: 'skills',
    name: 'Skills coverage & learning',
    description: 'Skill distribution across the workforce, scarce-skill single points of failure and learning participation.',
    category: 'Workforce',
    agentId: 'learning',
    agentLabel: 'Learning & Skills Agent',
    roles: HR_HM,
    generate: skills,
  },
  {
    id: 'engagement',
    name: 'Engagement & sentiment',
    description: 'Theme-level sentiment with small-sample suppression to protect anonymity, plus recommended actions.',
    category: 'Employee experience',
    agentId: 'engagement',
    agentLabel: 'Employee Engagement Agent',
    roles: HR_HM,
    generate: engagement,
  },
  {
    id: 'leave',
    name: 'Leave & absence',
    description: 'Leave by type and status, approved days, and detected coverage conflicts. No medical detail is held.',
    category: 'Employee experience',
    agentId: 'leave',
    agentLabel: 'Leave Management Agent',
    roles: HR_HM,
    generate: leaveReport,
  },
  {
    id: 'performance',
    name: 'Performance review cycle',
    description: 'Cycle completion, rating distribution and goal achievement across the review population.',
    category: 'Employee experience',
    agentId: 'performance',
    agentLabel: 'Performance Management Agent',
    roles: HR_HM,
    generate: performance,
  },
  {
    id: 'automation',
    name: 'Agent automation & throughput',
    description: 'Agent runs, tasks per agent, failures and how often work stopped at a human approval gate.',
    category: 'Governance',
    agentId: 'coordinator',
    agentLabel: 'HR Coordinator Agent',
    roles: HR_REC_HM,
    generate: automation,
  },
  {
    id: 'compliance',
    name: 'Compliance & audit trail',
    description: 'Audit entries by severity and actor, agent-versus-human attribution, and approval gate coverage.',
    category: 'Governance',
    agentId: 'coordinator',
    agentLabel: 'HR Coordinator Agent',
    roles: HR,
    generate: complianceAudit,
  },
];

export const reportsFor = (role: Role) => REPORTS.filter((r) => r.roles.includes(role));

export function generateReport(id: string, role: Role): ReportResult | null {
  const def = REPORTS.find((r) => r.id === id);
  if (!def || !def.roles.includes(role)) return null;
  return def.generate();
}

/** Flattens a report to CSV so it can leave the platform for a board pack. */
/**
 * Neutralise spreadsheet formula injection.
 *
 * Candidate names, employers and subject lines reach these reports from inbound
 * application email, which means an applicant controls them. Excel and Google
 * Sheets evaluate any cell beginning with = + - @ or a control character as a
 * formula, so an applicant called `=cmd|'/c calc'!A0` would execute on the
 * recruiter's machine the moment they opened an export. Prefixing with an
 * apostrophe forces the cell to be read as text; the apostrophe is not shown.
 */
export function csvSafeCell(value: string | number): string {
  const s = String(value);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

export function reportToCsv(r: ReportResult): string {
  const esc = (v: string | number) => {
    const s = csvSafeCell(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines: string[] = [`${r.name}`, r.period, `Generated by,${r.agentLabel}`, `Generated at,${r.generatedAt}`, ''];
  lines.push('Measure,Value,Note');
  r.kpis.forEach((k) => lines.push([k.label, k.value, k.hint ?? ''].map(esc).join(',')));
  r.sections.forEach((s) => {
    lines.push('', s.title);
    if (s.kind === 'table') {
      lines.push(s.head.map(esc).join(','));
      s.rows.forEach((row) => lines.push(row.map(esc).join(',')));
    } else if (s.kind === 'bars') {
      lines.push('Label,Value');
      s.data.forEach((d) => lines.push([d.label, d.value].map(esc).join(',')));
    } else {
      s.items.forEach((i) => lines.push(esc(i)));
    }
  });
  lines.push('', 'Method');
  r.methodology.forEach((m) => lines.push(esc(m)));
  lines.push('', 'Caveats');
  r.caveats.forEach((c) => lines.push(esc(c)));
  return lines.join('\n');
}
