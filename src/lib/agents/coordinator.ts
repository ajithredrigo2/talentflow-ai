import type { AgentRun, AgentTask, Role } from '../types';
import { audit, db, notify, uid } from '../store';
import { candidates as seedCands, deptName, employees, jobs as seedJobs, skillByName } from '../seed';
import { llmJson, activeProvider } from '../ai';
import { screenAll, screenCandidate } from './screening';
import {
  analyseEngagement,
  analyseSkillGaps,
  answerFromPolicies,
  buildInterviewQuestions,
  buildJobDescription,
  buildOffboardingPlan,
  buildOnboardingPlan,
  buildPerformanceSummary,
  DOCUMENT_CHECKLIST,
  IT_ACCESS_CHECKLIST,
  assessRetentionRisk,
  parseLeaveRequest,
  planWorkforce,
  rankInternalCandidates,
  suggestSlots,
  TARGET_ROLE_PROFILES,
} from './specialists';

export type Intent =
  | 'RECRUIT_ROLE'
  | 'WORKFORCE_PLAN'
  | 'TOP_CANDIDATES'
  | 'INTERVIEW_QUESTIONS'
  | 'SCHEDULE_INTERVIEW'
  | 'ONBOARDING_PLAN'
  | 'LEAVE_REQUEST'
  | 'POLICY_QUESTION'
  | 'SKILL_GAPS'
  | 'INTERNAL_CANDIDATES'
  | 'RECRUITMENT_REPORT'
  | 'INTERVIEW_SCHEDULE_VIEW'
  | 'RETENTION_RISK'
  | 'ENGAGEMENT'
  | 'PERFORMANCE_SUMMARY'
  | 'OFFBOARDING'
  | 'UNKNOWN';

export interface ResultBlock {
  kind: string;
  title: string;
  data: unknown;
}

const RULES: { intent: Intent; re: RegExp; label: string }[] = [
  { intent: 'RECRUITMENT_REPORT', re: /(recruitment report|hiring report|pipeline report|monthly report|hr report|metrics report|this month.s .*report)/i, label: 'Recruitment reporting' },
  { intent: 'RECRUIT_ROLE', re: /\b(recruit\w*|hire|hiring for|need to hire|we need a|open a (req|role|position)|fill (the|a) (role|position))\b/i, label: 'End-to-end recruitment' },
  { intent: 'WORKFORCE_PLAN', re: /(workforce plan|moving .*(to |into )?cloud|restructur\w*|expand\w*|scal(e|ing) (the )?team|capacity plan|what roles do we need|skill shortage)/i, label: 'Workforce planning' },
  { intent: 'INTERNAL_CANDIDATES', re: /(internal candidate|from within|succession|who (in|on) (the|our) team|best internal|promote from)/i, label: 'Internal talent matching' },
  { intent: 'SKILL_GAPS', re: /(skill.?gaps?|upskill\w*|learning (plan|path|roadmap)|training (plan|recommend\w*)|development plan)/i, label: 'Skills & learning' },
  { intent: 'ONBOARDING_PLAN', re: /(onboard\w*|joining plan|first (30|ninety|90) days|induction)/i, label: 'Onboarding orchestration' },
  { intent: 'OFFBOARDING', re: /(offboard\w*|resign\w*|exit process|exit checklist|leaving the company|last working day)/i, label: 'Offboarding' },
  { intent: 'TOP_CANDIDATES', re: /(top candidates?|best candidates?|find candidates?|shortlist\w*|who (are|is) the (best|top)|rank candidates?|screen candidates?|compare candidates?)/i, label: 'Candidate screening & ranking' },
  { intent: 'INTERVIEW_QUESTIONS', re: /(interview questions?|questions for|prepare .*interview|interview guide)/i, label: 'Interview preparation' },
  { intent: 'INTERVIEW_SCHEDULE_VIEW', re: /(interviews? (scheduled|this week|today|coming up|next week)|show .*interviews|list .*interviews)/i, label: 'Interview schedule' },
  { intent: 'SCHEDULE_INTERVIEW', re: /(schedule|book|arrange|set up) (an? )?(interview|call|slot)/i, label: 'Interview scheduling' },
  { intent: 'LEAVE_REQUEST', re: /(annual leave|apply .*leave|take leave|request leave|book .*(leave|holiday|vacation)|time off|sick leave|day off|want .*leave)/i, label: 'Leave request' },
  { intent: 'RETENTION_RISK', re: /(retention|attrition|flight risk|likely to leave|at risk of leaving)/i, label: 'Retention analysis' },
  { intent: 'ENGAGEMENT', re: /(engagement|sentiment|morale|employee feedback|pulse survey)/i, label: 'Engagement analysis' },
  { intent: 'PERFORMANCE_SUMMARY', re: /(performance (review|summary|pack)|appraisal|review pack|rating for)/i, label: 'Performance preparation' },
  { intent: 'POLICY_QUESTION', re: /(policy|entitle\w*|how many .*(days|leave)|maternity|paternity|probation|insurance|work from home|wfh|expense\w*|notice period)/i, label: 'Policy question' },
];

export function classify(text: string): { intent: Intent; label: string } {
  for (const r of RULES) if (r.re.test(text)) return { intent: r.intent, label: r.label };
  return { intent: 'UNKNOWN', label: 'Unclassified request' };
}

/* ---------------------------- entity extraction --------------------------- */

const KNOWN_ROLES = [
  'Senior DevOps Engineer', 'DevOps Engineer', 'Cloud Platform Lead', 'Cloud Security Engineer', 'Cloud Engineer',
  'Senior Cloud Engineer', 'Software Engineer', 'Engineering Manager', 'Finance Manager', 'Financial Analyst',
  'Talent Acquisition Specialist', 'Operations Manager', 'Demand Generation Manager', 'Account Executive',
  'IT Security Analyst', 'Systems Administrator', 'Customer Success Manager', 'Data Engineer', 'Marketing Executive',
];
const KNOWN_LOCATIONS = ['Dubai', 'Abu Dhabi', 'Riyadh', 'Doha', 'Bengaluru', 'London'];

export function extract(text: string) {
  const role = KNOWN_ROLES.find((r) => text.toLowerCase().includes(r.toLowerCase()));
  const city = KNOWN_LOCATIONS.find((l) => text.toLowerCase().includes(l.toLowerCase()));
  const skillNames = [
    'Kubernetes', 'AWS', 'Azure', 'Google Cloud', 'Terraform', 'CI/CD', 'Linux', 'Python', 'TypeScript', 'React',
    'Node.js', 'SQL', 'Machine Learning', 'Kubernetes Security', 'Identity & Access Management', 'FinOps',
    'Observability', 'Site Reliability', 'IFRS Reporting', 'FP&A', 'Team Leadership', 'CRM / Salesforce', 'Docker',
  ].filter((s) => new RegExp(`\\b${s.replace(/[/.]/g, '.?')}\\b`, 'i').test(text) && skillByName(s));
  const seniority = /senior|lead|principal/i.test(text) ? 'Senior' : /junior|graduate|entry/i.test(text) ? 'Junior' : /manager|head|director/i.test(text) ? 'Manager' : 'Mid';
  const years = Number(text.match(/(\d+)\+?\s*(?:years|yrs)/i)?.[1] ?? 0);
  const person =
    [...employees, ...seedCands].find((p) => text.toLowerCase().includes(p.name.toLowerCase())) ??
    [...employees, ...seedCands].find((p) => new RegExp(`\\b${p.name.split(' ')[0]}\\b`, 'i').test(text));
  const job =
    seedJobs.find((j) => text.toLowerCase().includes(j.title.toLowerCase())) ??
    (role ? seedJobs.find((j) => j.title.toLowerCase() === role.toLowerCase()) : undefined);
  return { role, city: city ? `${city}, ${city === 'Riyadh' ? 'KSA' : city === 'Doha' ? 'Qatar' : city === 'Bengaluru' ? 'India' : city === 'London' ? 'UK' : 'UAE'}` : undefined, skillNames, seniority, years, person, job };
}

/* ------------------------------ run builder ------------------------------- */

interface RunContext {
  request: string;
  actor: string;
  role: Role;
  employeeId?: string;
}

const PLANS: Record<Intent, { agentId: string; label: string }[]> = {
  RECRUIT_ROLE: [
    { agentId: 'coordinator', label: 'Interpret request and build execution plan' },
    { agentId: 'workforce-planning', label: 'Validate role, skills and hiring priority' },
    { agentId: 'job-description', label: 'Draft job description and evaluation criteria' },
    { agentId: 'talent-acquisition', label: 'Assemble candidate pipeline for the requisition' },
    { agentId: 'screening', label: 'Score candidates against approved criteria' },
    { agentId: 'interview-intelligence', label: 'Prepare interview guide for the leading candidate' },
    { agentId: 'offer-onboarding', label: 'Stage offer and onboarding readiness' },
  ],
  WORKFORCE_PLAN: [
    { agentId: 'coordinator', label: 'Interpret business signal' },
    { agentId: 'workforce-planning', label: 'Derive roles, skills and priority' },
    { agentId: 'learning', label: 'Check internal capability before external hiring' },
  ],
  TOP_CANDIDATES: [
    { agentId: 'coordinator', label: 'Resolve requisition and scope' },
    { agentId: 'talent-acquisition', label: 'Retrieve candidate pipeline' },
    { agentId: 'screening', label: 'Score and rank against approved criteria' },
  ],
  INTERVIEW_QUESTIONS: [
    { agentId: 'coordinator', label: 'Resolve candidate and requisition' },
    { agentId: 'screening', label: 'Identify evidenced strengths and gaps' },
    { agentId: 'interview-intelligence', label: 'Generate tailored interview guide' },
  ],
  SCHEDULE_INTERVIEW: [
    { agentId: 'coordinator', label: 'Resolve candidate and interviewer' },
    { agentId: 'scheduling', label: 'Resolve availability and propose slots' },
  ],
  INTERVIEW_SCHEDULE_VIEW: [
    { agentId: 'coordinator', label: 'Resolve time window' },
    { agentId: 'scheduling', label: 'Retrieve scheduled interviews' },
  ],
  ONBOARDING_PLAN: [
    { agentId: 'coordinator', label: 'Resolve new joiner and role' },
    { agentId: 'offer-onboarding', label: 'Generate onboarding programme and checklists' },
  ],
  LEAVE_REQUEST: [
    { agentId: 'coordinator', label: 'Identify employee and intent' },
    { agentId: 'leave', label: 'Parse dates, validate balance and detect conflicts' },
    { agentId: 'helpdesk', label: 'Attach governing policy' },
  ],
  POLICY_QUESTION: [
    { agentId: 'coordinator', label: 'Classify as a policy question' },
    { agentId: 'helpdesk', label: 'Retrieve from the HR knowledge base and answer with citations' },
  ],
  SKILL_GAPS: [
    { agentId: 'coordinator', label: 'Resolve scope and target role' },
    { agentId: 'learning', label: 'Compute skill gaps and build roadmap' },
  ],
  INTERNAL_CANDIDATES: [
    { agentId: 'coordinator', label: 'Resolve target role profile' },
    { agentId: 'learning', label: 'Match employee skill graph to role requirements' },
    { agentId: 'performance', label: 'Layer performance and development evidence' },
  ],
  RECRUITMENT_REPORT: [
    { agentId: 'coordinator', label: 'Assemble reporting scope' },
    { agentId: 'talent-acquisition', label: 'Aggregate pipeline and funnel metrics' },
  ],
  RETENTION_RISK: [
    { agentId: 'coordinator', label: 'Resolve population' },
    { agentId: 'retention', label: 'Assess explainable retention indicators' },
  ],
  ENGAGEMENT: [
    { agentId: 'coordinator', label: 'Resolve scope' },
    { agentId: 'engagement', label: 'Analyse anonymised feedback themes and trend' },
  ],
  PERFORMANCE_SUMMARY: [
    { agentId: 'coordinator', label: 'Resolve employee and cycle' },
    { agentId: 'performance', label: 'Build evidence-based review pack' },
  ],
  OFFBOARDING: [
    { agentId: 'coordinator', label: 'Resolve leaver and last working day' },
    { agentId: 'offboarding', label: 'Generate exit checklist and owners' },
  ],
  UNKNOWN: [{ agentId: 'coordinator', label: 'Interpret request' }],
};

function task(runId: string, agentId: string, label: string, extra: Partial<AgentTask> = {}): AgentTask {
  return {
    id: uid('tsk'),
    runId,
    agentId,
    label,
    status: 'Completed',
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: 400 + Math.floor(Math.random() * 900),
    ...extra,
  };
}

export async function runCoordinator(ctx: RunContext): Promise<{ run: AgentRun; blocks: ResultBlock[]; narrative: string }> {
  const { intent, label } = classify(ctx.request);
  const ent = extract(ctx.request);
  const runId = uid('run');
  const plan = PLANS[intent];
  const tasks: AgentTask[] = [];
  const blocks: ResultBlock[] = [];
  let narrative = '';
  let approvals: string[] = [];

  const me = employees.find((e) => e.id === (ctx.employeeId ?? 'emp-001')) ?? employees[0];

  const add = (agentId: string, lbl: string, summary: string, extra: Partial<AgentTask> = {}) =>
    tasks.push(task(runId, agentId, lbl, { summary, ...extra }));

  add('coordinator', plan[0].label, `Intent classified as ${intent} (${label}). Plan built with ${plan.length} agent step(s).`);

  switch (intent) {
    case 'RECRUIT_ROLE':
    case 'WORKFORCE_PLAN': {
      const wp = planWorkforce(ctx.request);
      const targetRole = ent.role ?? wp.roles[0].title;
      add('workforce-planning', 'Validate role, skills and hiring priority', `Mapped to "${wp.driver}". ${wp.roles.length} role families recommended, priority ${wp.priority}.`, { output: wp });
      blocks.push({ kind: 'workforce', title: 'Workforce Planning Agent — recommendation', data: wp });

      if (intent === 'WORKFORCE_PLAN') {
        const internal = rankInternalCandidates(TARGET_ROLE_PROFILES[targetRole] ? targetRole : 'Senior Cloud Engineer', 3);
        add('learning', 'Check internal capability before external hiring', `Top internal readiness ${internal[0]?.readiness ?? 0}% — external hiring still recommended for ${wp.roles.length} role families.`, { output: internal });
        blocks.push({ kind: 'internal', title: 'Learning & Skills Agent — internal capability check', data: internal });
        narrative = `${wp.justification}\n\nBefore committing to external hiring, the Learning & Skills Agent checked internal readiness: the strongest internal match reaches ${internal[0]?.readiness ?? 0}% of the target skill profile, so a blended plan (hire for the critical gaps, develop for the rest) is the recommended route. Headcount approval remains a human decision.`;
        break;
      }

      // Full recruitment orchestration
      const skillList = ent.skillNames.length ? ent.skillNames : wp.roles[0].skills;
      const jd = buildJobDescription({
        title: targetRole,
        location: ent.city ?? 'Dubai, UAE',
        department: 'Engineering',
        seniority: ent.seniority,
        skills: skillList,
        minExperience: ent.years || (ent.seniority === 'Senior' ? 5 : 3),
      });
      add('job-description', 'Draft job description and evaluation criteria', `Drafted "${jd.title}" with ${jd.responsibilities.length} responsibilities and 5 weighted evaluation criteria. Inclusive-language check: ${jd.inclusiveLanguage.status}.`, {
        status: 'Needs Approval',
        requiresApproval: true,
        output: jd,
      });
      blocks.push({ kind: 'jd', title: 'Job Description Agent — draft for approval', data: jd });

      const job = ent.job ?? seedJobs.find((j) => j.title === targetRole) ?? seedJobs[0];
      const pipeline = seedCands.filter((c) => c.jobId === job.id);
      add('talent-acquisition', 'Assemble candidate pipeline for the requisition', `${pipeline.length} candidates in pipeline for ${job.title}; profiles parsed into structured skill records.`);

      const ranked = screenAll(pipeline, job);
      add('screening', 'Score candidates against approved criteria', `${ranked.length} candidates scored. Top match ${ranked[0]?.screening.overall ?? 0}% (${ranked[0]?.candidate.name ?? 'n/a'}). Shortlisting requires human approval.`, {
        status: 'Needs Approval',
        requiresApproval: true,
      });
      blocks.push({ kind: 'ranked-candidates', title: 'Resume Screening Agent — ranked candidates', data: { job, ranked: ranked.slice(0, 6) } });

      if (ranked[0]) {
        const qs = buildInterviewQuestions(ranked[0].candidate, job, ranked[0].screening.missingSkills.slice(0, 2));
        add('interview-intelligence', 'Prepare interview guide for the leading candidate', `${qs.length} tailored questions generated for ${ranked[0].candidate.name} across ${new Set(qs.map((q) => q.category)).size} categories.`, { output: qs });
        blocks.push({ kind: 'questions', title: `Interview Intelligence Agent — guide for ${ranked[0].candidate.name}`, data: { candidate: ranked[0].candidate, questions: qs } });
      }

      const onb = buildOnboardingPlan(ranked[0]?.candidate.name ?? 'New Joiner', job.title, deptName(job.departmentId), new Date(Date.now() + 45 * 864e5).toISOString());
      add('offer-onboarding', 'Stage offer and onboarding readiness', `Onboarding programme staged: ${onb.length} tasks from Day −10 to Day 30. Offer creation is gated on hiring approval.`, { status: 'Waiting', output: onb });
      blocks.push({ kind: 'onboarding', title: 'Offer & Onboarding Agent — staged programme', data: { tasks: onb, documents: DOCUMENT_CHECKLIST, it: IT_ACCESS_CHECKLIST } });

      approvals = ['Job publication', 'Candidate shortlist'];
      narrative = `I ran a seven-agent recruitment workflow for ${targetRole}${ent.city ? ` in ${ent.city}` : ''}.\n\nThe Workforce Planning Agent confirmed the role against the ${wp.driver.toLowerCase()} pattern at ${wp.priority} priority. The JD Agent drafted the description with five weighted evaluation criteria — those same weights then drove scoring, so the ranking is defensible against the approved requirement rather than against a black box. ${pipeline.length} candidates were parsed and scored; ${ranked[0]?.candidate.name ?? 'the leading candidate'} leads at ${ranked[0]?.screening.overall ?? 0}%${ranked[0] ? ` (${ranked[0].screening.matchedSkills.slice(0, 4).join(', ')} evidenced)` : ''}. A tailored interview guide is ready, and the onboarding programme is staged.\n\nTwo approvals are waiting for you: publishing the job description, and the shortlist. Nothing is published, nobody is advanced and nobody is rejected until you decide.`;
      break;
    }

    case 'TOP_CANDIDATES': {
      const job = ent.job ?? seedJobs[0];
      const pipeline = seedCands.filter((c) => c.jobId === job.id);
      add('talent-acquisition', 'Retrieve candidate pipeline', `${pipeline.length} candidates retrieved for ${job.title}.`);
      const ranked = screenAll(pipeline, job);
      add('screening', 'Score and rank against approved criteria', `Top match ${ranked[0]?.screening.overall ?? 0}%. Recommendations only — human approval required to shortlist.`, {
        status: 'Needs Approval',
        requiresApproval: true,
      });
      blocks.push({ kind: 'ranked-candidates', title: `Ranked candidates — ${job.title}`, data: { job, ranked: ranked.slice(0, 8) } });
      approvals = ['Candidate shortlist'];
      narrative = `${ranked.length} candidates scored against the approved evaluation criteria for ${job.title}. ${ranked
        .slice(0, 3)
        .map((r) => `${r.candidate.name} ${r.screening.overall}%`)
        .join(', ')}. Each score opens to a full breakdown with the evidence behind every dimension. No candidate has been advanced or rejected — shortlisting is your decision.`;
      break;
    }

    case 'INTERVIEW_QUESTIONS': {
      const cand = (ent.person && 'jobId' in ent.person ? ent.person : undefined) ?? seedCands.find((c) => c.stage === 'Interviewing') ?? seedCands[0];
      const job = seedJobs.find((j) => j.id === cand.jobId)!;
      const scr = screenCandidate(cand, job);
      add('screening', 'Identify evidenced strengths and gaps', `Match ${scr.overall}%. Gaps: ${scr.missingSkills.slice(0, 3).join(', ') || 'none'}.`);
      const qs = buildInterviewQuestions(cand, job, scr.missingSkills.slice(0, 2));
      add('interview-intelligence', 'Generate tailored interview guide', `${qs.length} questions across ${new Set(qs.map((q) => q.category)).size} categories, anchored to claimed experience.`, { output: qs });
      blocks.push({ kind: 'questions', title: `Interview guide — ${cand.name} · ${job.title}`, data: { candidate: cand, questions: qs } });
      narrative = `Interview guide ready for ${cand.name} (${job.title}). Questions are anchored to what the CV actually claims — ${cand.skills
        .slice(0, 3)
        .map((s) => `${s.years} years of the listed stack`)
        .slice(0, 1)
        .join('')} — with targeted probes on ${scr.missingSkills.slice(0, 2).join(' and ') || 'depth of ownership'}. Each question carries what good looks like, so the panel scores consistently.`;
      break;
    }

    case 'SCHEDULE_INTERVIEW': {
      const cand = (ent.person && 'jobId' in ent.person ? ent.person : undefined) ?? seedCands.find((c) => c.stage === 'Shortlisted')!;
      const interviewer = employees.find((e) => e.id === 'emp-002')!;
      const slots = suggestSlots(interviewer.id);
      add('scheduling', 'Resolve availability and propose slots', `${slots.length} conflict-free slots identified for ${interviewer.name}.`, { output: slots });
      blocks.push({ kind: 'slots', title: `Proposed slots — ${cand.name} with ${interviewer.name}`, data: { candidate: cand, interviewer, slots } });
      narrative = `${slots.length} conflict-free slots found with ${interviewer.name} over the next two working weeks, avoiding existing bookings and the Friday–Saturday weekend. Pick one and I will issue the invitation and move ${cand.name} to Interviewing. Calendar integration is simulated in this prototype — no external invites are sent.`;
      break;
    }

    case 'INTERVIEW_SCHEDULE_VIEW': {
      const now = new Date();
      const week = db.interviews
        .filter((i) => {
          const d = new Date(i.scheduledAt);
          return d >= now && d.getTime() - now.getTime() < 7 * 864e5;
        })
        .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
      add('scheduling', 'Retrieve scheduled interviews', `${week.length} interviews scheduled in the next 7 days.`);
      blocks.push({ kind: 'interviews', title: 'Interviews — next 7 days', data: week });
      narrative = `${week.length} interviews are scheduled in the next seven days${week.length ? `, starting with ${seedCands.find((c) => c.id === week[0].candidateId)?.name} on ${new Date(week[0].scheduledAt).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}` : ''}.`;
      break;
    }

    case 'ONBOARDING_PLAN': {
      const roleTitle = ent.role ?? ctx.request.match(/for (?:the |a |an )?(?:new )?([A-Z][A-Za-z ]{3,40})/)?.[1]?.trim() ?? 'New Joiner';
      const name = ent.person?.name ?? 'the new joiner';
      const start = new Date(Date.now() + 21 * 864e5).toISOString();
      const onb = buildOnboardingPlan(name, roleTitle, 'Finance', start);
      add('offer-onboarding', 'Generate onboarding programme and checklists', `${onb.length} tasks generated across HR, IT, Compliance and the hiring manager, from Day −10 to Day 30.`, { output: onb });
      blocks.push({ kind: 'onboarding', title: `Onboarding programme — ${roleTitle}`, data: { tasks: onb, documents: DOCUMENT_CHECKLIST, it: IT_ACCESS_CHECKLIST } });
      narrative = `A ${onb.length}-task onboarding programme for the ${roleTitle} is ready, sequenced from Day −10 through Day 30 and assigned across HR Operations, Compliance, IT Service Desk, Learning & Development and the hiring manager. Document collection and verification run before Day 1 so the joiner starts with access, not paperwork.`;
      break;
    }

    case 'LEAVE_REQUEST': {
      const parsed = parseLeaveRequest(ctx.request, me);
      add('leave', 'Parse dates, validate balance and detect conflicts', `${parsed.type} leave, ${parsed.from} → ${parsed.to} (${parsed.days} working days). Balance ${parsed.balance} → ${parsed.balanceAfter}. ${parsed.conflicts.length} conflict(s).`, {
        status: 'Needs Approval',
        requiresApproval: true,
        output: parsed,
      });
      add('helpdesk', 'Attach governing policy', `Cited ${parsed.policy.title} (${parsed.policy.version}).`);
      blocks.push({ kind: 'leave', title: 'Leave request prepared', data: { ...parsed, employee: me } });
      approvals = ['Leave approval'];
      narrative = `I read that as ${parsed.days} working days of ${parsed.type.toLowerCase()} leave from ${new Date(parsed.from).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} to ${new Date(parsed.to).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} — weekends excluded. Your balance goes from ${parsed.balance} to ${parsed.balanceAfter} days. ${
        parsed.conflicts.length ? `Two things to flag: ${parsed.conflicts.join('; ')}.` : 'No coverage conflicts detected in your team for that window.'
      } The request is routed to ${parsed.approver.name} for approval — I do not approve leave myself.`;
      break;
    }

    case 'POLICY_QUESTION': {
      const ans = answerFromPolicies(ctx.request, me);
      add('helpdesk', 'Retrieve from the HR knowledge base and answer with citations', `${ans.citations.length} policy source(s) retrieved. Confidence ${(ans.confidence * 100).toFixed(0)}%.${ans.escalate ? ' Escalated to a human HR partner.' : ''}`, {
        status: ans.escalate ? 'Needs Approval' : 'Completed',
        output: ans,
      });
      blocks.push({ kind: 'policy-answer', title: 'HR Helpdesk Agent — grounded answer', data: ans });
      narrative = ans.answer;
      break;
    }

    case 'SKILL_GAPS': {
      const targetRole = ent.role && TARGET_ROLE_PROFILES[ent.role] ? ent.role : 'Senior Cloud Engineer';
      if (ent.person && 'skills' in ent.person && 'leaveBalance' in ent.person) {
        const analysis = analyseSkillGaps(ent.person, targetRole);
        add('learning', 'Compute skill gaps and build roadmap', `${analysis.gaps.length} gaps against ${targetRole}; readiness ${analysis.readiness}%.`, { output: analysis });
        blocks.push({ kind: 'gaps', title: `Skill gap analysis — ${ent.person.name} → ${targetRole}`, data: { employee: ent.person, analysis } });
        narrative = analysis.explanation;
      } else {
        // Organisation-wide gap view
        const cohort = employees
          .filter((e) => e.departmentId === 'dep-eng' && e.status === 'Active')
          .map((e) => ({ employee: e, analysis: analyseSkillGaps(e, targetRole) }))
          .sort((a, b) => a.analysis.readiness - b.analysis.readiness)
          .slice(0, 8);
        add('learning', 'Compute skill gaps and build roadmap', `${cohort.length} employees analysed against ${targetRole}.`, { output: cohort });
        blocks.push({ kind: 'gap-cohort', title: `Cloud skill gaps — Engineering vs ${targetRole}`, data: { targetRole, cohort } });
        narrative = `Analysed the Engineering population against the ${targetRole} profile. ${cohort.filter((c) => c.analysis.readiness < 60).length} of ${cohort.length} sit below 60% readiness, with ${Array.from(
          new Set(cohort.flatMap((c) => c.analysis.gaps.slice(0, 2).map((g) => g.skill))),
        )
          .slice(0, 3)
          .join(', ')} the most common gaps. Each person has a phased roadmap with matched courses, labs and internal projects.`;
      }
      break;
    }

    case 'INTERNAL_CANDIDATES': {
      const targetRole = (ent.role && TARGET_ROLE_PROFILES[ent.role] ? ent.role : undefined) ?? 'Cloud Platform Lead';
      const ranked = rankInternalCandidates(targetRole, 5);
      add('learning', 'Match employee skill graph to role requirements', `${ranked.length} employees ranked against the ${targetRole} profile.`);
      add('performance', 'Layer performance and development evidence', `Top match ${ranked[0].employee.name} at ${ranked[0].score}% composite.`, { output: ranked });
      blocks.push({ kind: 'internal', title: `Internal candidates — ${targetRole}`, data: ranked });
      narrative = `Ranked the internal population against the ${targetRole} profile. ${ranked[0].employee.name} (${ranked[0].employee.title}) leads at ${ranked[0].score}% composite — ${ranked[0].readiness}% skill readiness, performance ${ranked[0].employee.performanceScore}/5. ${
        ranked[0].gaps.length ? `The remaining gaps — ${ranked[0].gaps.slice(0, 3).map((g) => g.skill).join(', ')} — each have a development path attached.` : 'No skill gaps remain against the profile.'
      } No promotion decision is made here: this is succession input for a human conversation.`;
      break;
    }

    case 'RECRUITMENT_REPORT': {
      const open = db.jobs.filter((j) => j.status === 'Open');
      const apps = db.candidates.length;
      const funnel = {
        Applications: apps,
        Screened: db.candidates.filter((c) => ['Screened', 'Shortlisted', 'Interviewing', 'Offered', 'Hired'].includes(c.stage)).length,
        Shortlisted: db.candidates.filter((c) => ['Shortlisted', 'Interviewing', 'Offered', 'Hired'].includes(c.stage)).length,
        Interviewed: db.candidates.filter((c) => ['Interviewing', 'Offered', 'Hired'].includes(c.stage)).length,
        Offered: db.candidates.filter((c) => ['Offered', 'Hired'].includes(c.stage)).length,
        Hired: db.candidates.filter((c) => c.stage === 'Hired').length,
      };
      const report = {
        openJobs: open.length,
        openings: open.reduce((a, j) => a + j.openings, 0),
        funnel,
        avgMatch: Math.round(
          db.candidates.slice(0, 20).reduce((a, c) => a + screenCandidate(c, db.jobs.find((j) => j.id === c.jobId) ?? db.jobs[0]).overall, 0) / 20,
        ),
        timeToHire: 34,
        costPerHire: 'AED 11,400',
        offerAcceptance: 82,
        byDepartment: db.jobs.reduce<Record<string, number>>((acc, j) => {
          if (j.status === 'Open') acc[deptName(j.departmentId)] = (acc[deptName(j.departmentId)] ?? 0) + j.openings;
          return acc;
        }, {}),
      };
      add('talent-acquisition', 'Aggregate pipeline and funnel metrics', `${open.length} open requisitions, ${apps} candidates, ${funnel.Hired} hires.`, { output: report });
      blocks.push({ kind: 'report', title: 'Recruitment report — current period', data: report });
      narrative = `${open.length} open requisitions covering ${report.openings} openings, with ${apps} candidates in pipeline. Conversion runs ${funnel.Applications} applications → ${funnel.Shortlisted} shortlisted → ${funnel.Interviewed} interviewed → ${funnel.Hired} hired. Average time-to-hire is ${report.timeToHire} days against a 45-day baseline, and offer acceptance is ${report.offerAcceptance}%. Average AI match score across the active pipeline is ${report.avgMatch}%.`;
      break;
    }

    case 'RETENTION_RISK': {
      const scoped = employees.filter((e) => e.status === 'Active').map((e) => ({ employee: e, risk: assessRetentionRisk(e) }));
      const high = scoped.filter((s) => s.risk.level === 'High').sort((a, b) => b.risk.score - a.risk.score);
      const medium = scoped.filter((s) => s.risk.level === 'Medium');
      add('retention', 'Assess explainable retention indicators', `${high.length} high, ${medium.length} medium risk across ${scoped.length} active employees.`, { output: high.slice(0, 6) });
      blocks.push({ kind: 'retention', title: 'Retention Risk Agent — explainable assessment', data: { high: high.slice(0, 6), counts: { high: high.length, medium: medium.length, low: scoped.length - high.length - medium.length } } });
      narrative = `Across ${scoped.length} active employees: ${high.length} at high retention risk, ${medium.length} medium. Every score is built only from work-related indicators — engagement, performance, tenure, learning participation, internal mobility, workload and department attrition — and each contributing factor is shown. The agent recommends supportive actions only; it never suggests termination, demotion or any adverse action.`;
      break;
    }

    case 'ENGAGEMENT': {
      const eng = analyseEngagement();
      add('engagement', 'Analyse anonymised feedback themes and trend', `${eng.themes.length} themes analysed. Lowest: ${eng.themes[0]?.theme}.`, { output: eng });
      blocks.push({ kind: 'engagement', title: 'Employee Engagement Agent — theme analysis', data: eng });
      narrative = `Organisational sentiment is trending ${eng.trend[3].sentiment > eng.trend[2].sentiment ? 'up' : 'down'} quarter on quarter (${eng.trend[2].sentiment} → ${eng.trend[3].sentiment}). ${eng.themes[0]?.theme} is the lowest-scoring theme at ${eng.themes[0]?.sentiment}. ${eng.note}`;
      break;
    }

    case 'PERFORMANCE_SUMMARY': {
      const emp = (ent.person && 'leaveBalance' in ent.person ? ent.person : undefined) ?? me;
      const pack = buildPerformanceSummary(emp);
      add('performance', 'Build evidence-based review pack', `${pack.goalsAchieved}/${pack.goalsTotal} goals. Suggested rating ${pack.suggestedRating}/5 (advisory).`, {
        status: 'Needs Approval',
        requiresApproval: true,
        output: pack,
      });
      blocks.push({ kind: 'performance', title: `Performance pack — ${emp.name}`, data: { employee: emp, pack } });
      approvals = ['Performance rating'];
      narrative = pack.summary;
      break;
    }

    case 'OFFBOARDING': {
      const emp = (ent.person && 'leaveBalance' in ent.person ? ent.person : undefined) ?? employees.find((e) => e.status === 'Notice Period') ?? employees[0];
      const lastDay = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
      const plan2 = buildOffboardingPlan(emp, lastDay);
      add('offboarding', 'Generate exit checklist and owners', `${plan2.tasks.length} tasks generated across HR, IT, Payroll and the line manager.`, { output: plan2 });
      blocks.push({ kind: 'offboarding', title: `Offboarding plan — ${emp.name}`, data: plan2 });
      narrative = `An ${plan2.tasks.length}-task offboarding plan for ${emp.name} is ready, sequenced against a last working day of ${lastDay} and assigned across HR Operations, the line manager, IT Service Desk, IT Security and Payroll. ${plan2.note}`;
      break;
    }

    default: {
      const ans = answerFromPolicies(ctx.request, me);
      if (ans.citations.length) {
        add('helpdesk', 'Attempt knowledge-base retrieval', `Matched ${ans.citations.length} policy source(s).`);
        blocks.push({ kind: 'policy-answer', title: 'HR Helpdesk Agent — grounded answer', data: ans });
        narrative = ans.answer;
      } else {
        tasks[0].status = 'Failed';
        tasks[0].summary = 'Could not map the request to a supported workflow.';
        narrative = `I could not confidently map that to one of the workflows I run, so I would rather ask than guess.\n\nI can handle: recruiting a role end to end, workforce planning, ranking or comparing candidates, generating interview guides, scheduling interviews, building onboarding or offboarding plans, leave requests, HR policy questions, skill-gap and learning plans, internal succession matching, performance packs, engagement analysis, retention risk and recruitment reporting.\n\nTry, for example: "Find the top candidates for Senior DevOps Engineer" or "Show employees with cloud skill gaps".`;
      }
    }
  }

  // Optional model-written narrative on top of deterministic, grounded results.
  let engine: 'llm' | 'deterministic' = 'deterministic';
  if (activeProvider() !== 'deterministic' && intent !== 'UNKNOWN') {
    const grounded = await llmJson<{ narrative?: string }>(
      `An HR user asked: "${ctx.request}"\n\nYour agents produced these grounded results (JSON):\n${JSON.stringify(blocks).slice(0, 6000)}\n\nWrite a 90-140 word executive summary for the HR user. Use ONLY facts present in the results — do not invent names, numbers or outcomes. State clearly what still needs human approval. Return JSON: {"narrative": "..."}`,
      {},
      600,
    );
    if (grounded.engine === 'llm' && grounded.value.narrative) {
      narrative = grounded.value.narrative;
      engine = 'llm';
    }
  }

  const run: AgentRun = {
    id: runId,
    request: ctx.request,
    intent,
    actor: ctx.actor,
    createdAt: new Date().toISOString(),
    status: tasks.some((t) => t.status === 'Needs Approval') ? 'Awaiting Approval' : tasks.some((t) => t.status === 'Failed') ? 'Failed' : 'Completed',
    plan,
    tasks,
    reasoning: `Intent "${intent}" (${label}) selected from ${RULES.length} workflow patterns. Entities resolved: ${[
      ent.role && `role=${ent.role}`,
      ent.city && `location=${ent.city}`,
      ent.skillNames.length && `skills=${ent.skillNames.join('/')}`,
      ent.person && `person=${ent.person.name}`,
    ]
      .filter(Boolean)
      .join(', ') || 'none'}. Plan: ${plan.map((p) => p.agentId).join(' → ')}.`,
    engine,
  };

  db.runs.unshift(run);
  if (db.runs.length > 60) db.runs.length = 60;

  audit({
    actor: 'HR Coordinator Agent',
    actorRole: 'AI Agent',
    action: 'AGENT_RUN',
    entity: 'AgentRun',
    entityId: run.id,
    detail: `Intent ${intent} executed for ${ctx.actor} across ${tasks.length} agent tasks. ${approvals.length ? `Approvals raised: ${approvals.join(', ')}.` : 'No approval gate triggered.'}`,
  });
  if (approvals.length) {
    notify({
      title: 'Agent run needs your approval',
      body: `${approvals.join(' and ')} pending from run ${run.id.slice(0, 12)}.`,
      forRole: ['HR_ADMIN', 'RECRUITER', 'HIRING_MANAGER'],
      kind: 'approval',
    });
  }

  return { run, blocks, narrative };
}
