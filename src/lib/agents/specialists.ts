import type {
  Candidate,
  Employee,
  InterviewFeedback,
  InterviewQuestion,
  Job,
  LeaveRequest,
  OnboardingTask,
  PerformanceReview,
  Policy,
  SkillLevel,
} from '../types';
import { SKILL_LEVEL_VALUE } from '../types';
import {
  departments,
  deptName,
  employeeFeedback,
  employees,
  policies,
  skillByName,
  skillName,
  trainingCourses,
} from '../seed';
import { db } from '../store';

/* ==================================================================== */
/* 2. Workforce Planning Agent                                          */
/* ==================================================================== */

const ROLE_LIBRARY: {
  match: RegExp;
  roles: { title: string; seniority: string; skills: string[]; count: number; rationale: string }[];
  driver: string;
}[] = [
  {
    match: /cloud|infrastructure|migrat|aws|azure|gcp|data ?cent(re|er)/i,
    driver: 'Cloud migration / infrastructure modernisation',
    roles: [
      { title: 'Cloud Engineer', seniority: 'Mid', count: 2, skills: ['AWS', 'Terraform', 'Linux', 'CI/CD'], rationale: 'Landing zones, migration waves and workload re-platforming need dedicated build capacity.' },
      { title: 'DevOps Engineer', seniority: 'Senior', count: 2, skills: ['Kubernetes', 'AWS', 'Terraform', 'CI/CD', 'Linux'], rationale: 'Automation and delivery pipelines determine whether the migration actually reduces lead time.' },
      { title: 'Cloud Security Engineer', seniority: 'Senior', count: 1, skills: ['Kubernetes Security', 'Identity & Access Management', 'AWS', 'Application Security'], rationale: 'Cloud posture and identity design must be owned from day one, not retro-fitted.' },
    ],
  },
  {
    match: /data|analytic|ml|machine learning|ai platform|reporting/i,
    driver: 'Data and analytics capability build',
    roles: [
      { title: 'Data Engineer', seniority: 'Mid', count: 2, skills: ['Data Engineering', 'SQL', 'Python'], rationale: 'Pipelines and modelled data are the prerequisite for any analytics or ML work.' },
      { title: 'Analytics Engineer', seniority: 'Mid', count: 1, skills: ['SQL', 'Python'], rationale: 'Converts raw pipelines into governed, business-ready metrics.' },
      { title: 'Machine Learning Engineer', seniority: 'Senior', count: 1, skills: ['Machine Learning', 'Python', 'AWS'], rationale: 'Required to productionise models rather than leave them in notebooks.' },
    ],
  },
  {
    match: /sales|revenue|market expansion|pipeline|go.?to.?market/i,
    driver: 'Revenue and market expansion',
    roles: [
      { title: 'Account Executive', seniority: 'Mid', count: 3, skills: ['CRM / Salesforce', 'Stakeholder Management'], rationale: 'Direct quota-carrying capacity for the new territory.' },
      { title: 'Sales Manager', seniority: 'Manager', count: 1, skills: ['Team Leadership', 'CRM / Salesforce'], rationale: 'Span of control and coaching for the expanded team.' },
      { title: 'Demand Generation Manager', seniority: 'Manager', count: 1, skills: ['Demand Generation', 'CRM / Salesforce'], rationale: 'Pipeline creation ahead of quota ramp.' },
    ],
  },
  {
    match: /finance|audit|ifrs|controller|close/i,
    driver: 'Finance function scaling',
    roles: [
      { title: 'Financial Analyst', seniority: 'Mid', count: 2, skills: ['FP&A', 'SQL'], rationale: 'Forecasting and management reporting load grows with entity count.' },
      { title: 'Finance Manager', seniority: 'Manager', count: 1, skills: ['IFRS Reporting', 'FP&A', 'Team Leadership'], rationale: 'Ownership of close, controls and team supervision.' },
    ],
  },
  {
    match: /support|customer|service desk|success/i,
    driver: 'Customer operations scaling',
    roles: [
      { title: 'Customer Success Manager', seniority: 'Mid', count: 2, skills: ['CRM / Salesforce', 'Stakeholder Management'], rationale: 'Retention and expansion coverage for the growing account base.' },
      { title: 'Support Engineer', seniority: 'Mid', count: 2, skills: ['Linux', 'SQL'], rationale: 'Technical resolution capacity to hold response SLAs.' },
    ],
  },
];

export function planWorkforce(input: string) {
  const entry = ROLE_LIBRARY.find((r) => r.match.test(input)) ?? ROLE_LIBRARY[0];
  const magnitude = Number(input.match(/(\d{1,3})\s?%/)?.[1] ?? 0);
  const urgency = /urgent|immediately|asap|critical|this quarter/i.test(input) || magnitude >= 40 ? 'Critical' : magnitude >= 20 ? 'High' : 'Medium';

  // Live skill-shortage detection across the current workforce
  const demandSkills = Array.from(new Set(entry.roles.flatMap((r) => r.skills)));
  const shortages = demandSkills
    .map((name) => {
      const skill = skillByName(name);
      if (!skill) return null;
      const holders = employees.filter((e) => e.skills.some((s) => s.skillId === skill.id));
      const advanced = holders.filter((e) => SKILL_LEVEL_VALUE[e.skills.find((s) => s.skillId === skill.id)!.level] >= 3);
      return {
        skill: name,
        holders: holders.length,
        advanced: advanced.length,
        coverage: Math.round((holders.length / employees.length) * 100),
        severity: advanced.length <= 2 ? 'Critical' : advanced.length <= 5 ? 'Watch' : 'Healthy',
      };
    })
    .filter(Boolean) as { skill: string; holders: number; advanced: number; coverage: number; severity: string }[];

  const justification = `Business signal: "${input.trim()}". Mapped to the ${entry.driver.toLowerCase()} capability pattern. Current workforce holds ${
    shortages.filter((s) => s.severity !== 'Healthy').length
  } of ${shortages.length} required skills at critical or watch level, which cannot be closed by internal development alone inside the stated timeframe. Recommended intake of ${entry.roles.reduce(
    (a, r) => a + r.count,
    0,
  )} roles across ${entry.roles.length} role families, prioritised ${urgency}. Headcount approval remains a human budget decision — this is a recommendation only.`;

  return {
    driver: entry.driver,
    priority: urgency,
    roles: entry.roles,
    skills: demandSkills,
    shortages: shortages.sort((a, b) => a.advanced - b.advanced),
    justification,
  };
}

/* ==================================================================== */
/* 3. Job Description Agent                                             */
/* ==================================================================== */

export interface JDInput {
  title: string;
  location: string;
  department: string;
  seniority: string;
  skills: string[];
  preferredSkills?: string[];
  minExperience: number;
  employmentType?: string;
  openings?: number;
}

const RESPONSIBILITY_BANK: Record<string, string[]> = {
  devops: [
    'Design and operate production Kubernetes clusters across multiple environments',
    'Build reusable Terraform modules and a self-service infrastructure catalogue',
    'Own CI/CD pipelines, release automation and progressive delivery',
    'Define SLOs, instrument observability and lead incident response',
    'Embed security and cost controls into platform defaults',
    'Mentor engineers on platform and reliability practices',
  ],
  cloud: [
    'Deliver and maintain cloud landing zones and shared platform services',
    'Automate provisioning with infrastructure-as-code',
    'Support migration waves and workload re-platforming',
    'Drive cost visibility and optimisation across accounts',
    'Document architecture decisions and operating runbooks',
  ],
  security: [
    'Own cloud security posture management and remediation',
    'Design identity and least-privilege access models',
    'Lead threat modelling for new platform services',
    'Run vulnerability management and support compliance audits',
  ],
  engineer: [
    'Design, build and ship production features with high quality standards',
    'Participate in code review and technical design discussions',
    'Instrument and support what you build in production',
    'Contribute to engineering standards and documentation',
  ],
  manager: [
    'Lead, coach and grow a team, owning hiring and development plans',
    'Own delivery outcomes, planning and stakeholder communication',
    'Set and track objectives aligned to business priorities',
    'Drive process improvement and operational discipline',
  ],
  finance: [
    'Own periodic close, reporting and control compliance',
    'Lead budgeting, forecasting and variance analysis',
    'Partner with business leaders on financial decision support',
    'Improve financial processes and reporting automation',
  ],
  default: [
    'Own the core deliverables of the role end to end',
    'Partner with stakeholders across functions to deliver outcomes',
    'Improve processes, documentation and operating standards',
    'Report on progress with clear metrics',
  ],
};

function responsibilityKey(title: string) {
  const t = title.toLowerCase();
  if (/devops|platform|sre|reliability/.test(t)) return 'devops';
  if (/security/.test(t)) return 'security';
  if (/cloud/.test(t)) return 'cloud';
  if (/manager|head|director|lead/.test(t)) return 'manager';
  if (/finance|account|controller/.test(t)) return 'finance';
  if (/engineer|developer/.test(t)) return 'engineer';
  return 'default';
}

const GENDER_CODED = ['rockstar', 'ninja', 'aggressive', 'dominant', 'young', 'energetic young', 'guru', 'he/she', 'salesman', 'manpower'];

export function buildJobDescription(input: JDInput) {
  const key = responsibilityKey(input.title);
  const responsibilities = RESPONSIBILITY_BANK[key];
  const criteria = [
    { criterion: 'Technical skills match', weight: 35 },
    { criterion: 'Relevant experience', weight: 25 },
    { criterion: /cloud|devops|platform|security/i.test(input.title) ? 'Cloud platform depth' : 'Domain depth', weight: 20 },
    { criterion: 'Certifications', weight: 10 },
    { criterion: 'Location & availability', weight: 10 },
  ];
  const biasFlags = GENDER_CODED.filter((w) => `${input.title}`.toLowerCase().includes(w));

  const summary = `Join the ${input.department} function in ${input.location} as a ${input.title}. You will own ${
    key === 'devops'
      ? 'the reliability, automation and delivery pipeline of our cloud platform'
      : key === 'security'
        ? 'the security posture of our cloud and platform estate'
        : key === 'manager'
          ? 'team performance, delivery outcomes and stakeholder alignment'
          : 'the core outcomes of this role'
  }, working with ${input.skills.slice(0, 4).join(', ')} in a modern engineering environment. We are looking for ${
    input.minExperience
  }+ years of relevant experience and a track record of measurable impact.`;

  return {
    title: input.title,
    seniority: input.seniority,
    location: input.location,
    department: input.department,
    employmentType: input.employmentType ?? 'Full-time',
    openings: input.openings ?? 1,
    minExperience: input.minExperience,
    summary,
    responsibilities,
    mandatorySkills: input.skills,
    preferredSkills: input.preferredSkills?.length
      ? input.preferredSkills
      : ['Observability', 'Python', 'Stakeholder Management'].filter((s) => !input.skills.includes(s)).slice(0, 3),
    education: "Bachelor's degree in a relevant discipline, or equivalent practical experience",
    evaluationCriteria: criteria,
    inclusiveLanguage: biasFlags.length
      ? { status: 'Flagged', flags: biasFlags, note: 'Replace flagged wording before publishing.' }
      : {
          status: 'Passed',
          flags: [],
          note: 'No gender-coded, age-coded or exclusionary phrasing detected. Requirements are stated as skills and outcomes rather than personal attributes.',
        },
    notice: 'Draft only. A named human approver must review, edit and approve this description before it is published.',
  };
}

/* ==================================================================== */
/* 6. Interview Intelligence Agent                                      */
/* ==================================================================== */

const SCENARIO_BANK: Record<string, string> = {
  Kubernetes:
    'Your production Kubernetes application suddenly shows increasing pod restart counts across two deployments. Walk us through how you would investigate and resolve it, and what you would check first.',
  AWS: 'A month-end AWS bill jumps 35% with no traffic change. How do you find the cause and what controls do you put in place afterwards?',
  Terraform:
    'A colleague applied Terraform locally and drifted production state. Describe how you would recover safely and how you would prevent it structurally.',
  'CI/CD': 'Deployments to production currently take three days of coordination. Design the pipeline you would build to get that to under an hour, and how you would prove it is safe.',
  Linux: 'A service is intermittently slow and the host shows high load but low CPU utilisation. How would you diagnose it?',
  'Kubernetes Security':
    'You inherit a cluster with cluster-admin bound to a shared service account. Describe your remediation plan and how you sequence it without breaking workloads.',
  'Identity & Access Management': 'Design a least-privilege access model for a team of 60 engineers across three environments.',
  'FP&A': 'Revenue came in 12% below forecast for two consecutive months. How do you rebuild the forecast and communicate it to leadership?',
  'IFRS Reporting': 'Walk us through how you would handle a revenue recognition judgement that your auditor initially disagrees with.',
  'CRM / Salesforce': 'Pipeline data quality is poor and forecasts are unreliable. What do you change in the first 60 days?',
  'Team Leadership': 'A high performer on your team is disengaging and their delivery has slipped. How do you approach it?',
};

export function buildInterviewQuestions(candidate: Candidate, job: Job, gaps: string[] = []): InterviewQuestion[] {
  const out: InterviewQuestion[] = [];
  const evidenced = candidate.skills.map((s) => ({ name: skillName(s.skillId), level: s.level, years: s.years }));

  // Technical — anchored to claimed depth
  evidenced
    .filter((s) => job.mandatorySkills.includes(s.name))
    .slice(0, 2)
    .forEach((s) => {
      out.push({
        category: 'Technical',
        question:
          SCENARIO_BANK[s.name] ??
          `You list ${s.name} at ${s.level} level with ${s.years} years of use. Describe the most complex problem you solved with it and the decisions you made.`,
        rationale: `Candidate claims ${s.name} — ${s.level}, ${s.years} years. This validates depth against the claim rather than accepting it at face value.`,
        lookFor: ['Specific, first-hand detail', 'Decision trade-offs, not just tooling names', 'What they would do differently now'],
      });
    });

  // Scenario — the role's hardest recurring problem
  const anchor = job.mandatorySkills.find((s) => SCENARIO_BANK[s]) ?? job.mandatorySkills[0];
  if (anchor && !out.some((q) => q.question === SCENARIO_BANK[anchor])) {
    out.push({
      category: 'Scenario',
      question: SCENARIO_BANK[anchor] ?? `Describe how you would approach the first 90 days owning ${anchor} for this team.`,
      rationale: `${anchor} is a mandatory requirement on the approved job description and a recurring failure mode for this team.`,
      lookFor: ['Structured diagnosis before action', 'Awareness of blast radius', 'Follow-up prevention, not just the fix'],
    });
  }

  // Gap probes
  gaps.slice(0, 2).forEach((g) => {
    out.push({
      category: 'Problem Solving',
      question: `We did not see ${g} evidenced on your CV. Tell us about the closest thing you have done, and how you would get productive with ${g} in the first month.`,
      rationale: `Screening identified ${g} as a gap against a mandatory requirement. This gives the candidate a fair opportunity to evidence it.`,
      lookFor: ['Honest calibration of their own level', 'Transferable reasoning', 'Concrete learning approach'],
    });
  });

  out.push({
    category: 'Behavioral',
    question:
      'Tell us about a time you disagreed with a technical decision that had already been made. What did you do, and what was the outcome?',
    rationale: 'Assesses influence, judgement and how the candidate handles disagreement in a delivery context.',
    lookFor: ['Evidence over opinion', 'Respectful escalation', 'Ownership of the outcome either way'],
  });

  if (candidate.experienceYears >= 6 || /senior|lead|manager|head/i.test(job.seniority + job.title)) {
    out.push({
      category: 'Leadership',
      question:
        'Describe how you have raised the capability of engineers around you — mentoring, standards, or documentation. What changed as a result?',
      rationale: `The role is at ${job.seniority} level, where multiplier impact matters as much as individual delivery.`,
      lookFor: ['Concrete before/after', 'Systems thinking, not heroics', 'Evidence of others growing'],
    });
  }

  out.push({
    category: 'Culture',
    question:
      'How do you prefer to work with product and stakeholders when priorities conflict, and what does a good working week look like for you?',
    rationale: 'Assesses working-style fit against how this team operates. Focused on ways of working only — never personal circumstances.',
    lookFor: ['Clarity on how they operate', 'Collaboration over blame', 'Realistic expectations'],
  });

  return out;
}

/* ==================================================================== */
/* 7. Interview Evaluation Agent                                        */
/* ==================================================================== */

export function evaluateInterview(feedback: InterviewFeedback, candidate: Candidate, job: Job) {
  const r = feedback.ratings;
  const avg = (r.technical + r.problemSolving + r.communication + r.leadership) / 4;
  const bar = /senior|lead|manager|head|director/i.test(job.seniority + ' ' + job.title) ? 7 : 6;
  const above = Object.entries(r).filter(([, v]) => v >= bar);
  const below = Object.entries(r).filter(([, v]) => v < bar);
  const label = (k: string) =>
    ({ technical: 'Technical', problemSolving: 'Problem solving', communication: 'Communication', leadership: 'Leadership' })[k] ?? k;

  const recommendation: NonNullable<InterviewFeedback['recommendation']> =
    avg >= 8.25 && r.technical >= bar ? 'Strong Hire' : avg >= 7 && r.technical >= bar ? 'Hire' : avg >= 6 ? 'No Decision' : 'No Hire';

  const summary = `${candidate.name} interviewed for ${job.title}. Panel scores average ${avg.toFixed(1)}/10 against a role bar of ${bar}. ${
    above.length ? `Above bar on ${above.map(([k]) => label(k).toLowerCase()).join(', ')}.` : ''
  } ${below.length ? `Below bar on ${below.map(([k]) => label(k).toLowerCase()).join(', ')}.` : ''} ${
    feedback.technicalFeedback ? `Technical evidence: ${feedback.technicalFeedback}` : ''
  }`.replace(/\s+/g, ' ').trim();

  const reasoning = `Recommendation "${recommendation}" derives from: average ${avg.toFixed(
    1,
  )}/10 across four dimensions; technical ${r.technical}/10 against the ${bar}/10 role bar; ${
    below.length ? `development areas in ${below.map(([k]) => label(k).toLowerCase()).join(' and ')}` : 'no dimension below the bar'
  }. The recommendation is advisory. Under the Performance and Hiring policy, the hiring manager records the final decision and it is written to the audit log with their name.`;

  return { summary, recommendation, reasoning, average: Number(avg.toFixed(1)), bar };
}

/* ==================================================================== */
/* 8. Interview Scheduling Agent                                        */
/* ==================================================================== */

export function suggestSlots(interviewerId: string, fromDayOffset = 1, count = 5) {
  const booked = db.interviews
    .filter((i) => i.interviewerId === interviewerId && i.status === 'Scheduled')
    .map((i) => i.scheduledAt.slice(0, 13));
  const slots: { iso: string; label: string; conflict: boolean }[] = [];
  const hours = [9, 10, 11, 13, 14, 15, 16];
  let day = fromDayOffset;
  while (slots.length < count && day < fromDayOffset + 14) {
    const d = new Date('2026-09-05T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + day);
    const dow = d.getUTCDay();
    if (dow !== 5 && dow !== 6) {
      for (const h of hours) {
        if (slots.length >= count) break;
        d.setUTCHours(h - 4, 0, 0, 0); // Gulf Standard Time = UTC+4
        const iso = d.toISOString();
        const conflict = booked.includes(iso.slice(0, 13));
        if (!conflict) {
          slots.push({
            iso,
            label: `${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Dubai' })} · ${String(h).padStart(2, '0')}:00 GST`,
            conflict,
          });
        }
      }
    }
    day++;
  }
  return slots;
}

/* ==================================================================== */
/* 9. Offer & Onboarding Agent                                          */
/* ==================================================================== */

export function draftOfferLetter(candidate: Candidate, job: Job, salary: string, joiningDate: string) {
  return `PRIVATE & CONFIDENTIAL
${new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Dubai', day: 'numeric', month: 'long', year: 'numeric' })}

${candidate.name}
${candidate.location}

Dear ${candidate.name.split(' ')[0]},

OFFER OF EMPLOYMENT — ${job.title.toUpperCase()}

Following your discussions with our team, we are pleased to offer you the position of ${job.title} in the ${deptName(
    job.departmentId,
  )} department, based in ${job.location}.

Position:           ${job.title} (${job.seniority})
Employment type:    ${job.employmentType}
Reporting to:       ${employees.find((e) => e.id === job.hiringManagerId)?.title ?? 'Hiring Manager'}
Base salary:        ${salary}
Proposed start:     ${new Date(joiningDate).toLocaleDateString('en-GB', { timeZone: 'Asia/Dubai', day: 'numeric', month: 'long', year: 'numeric' })}
Probation:          6 months, per the Probation Policy (v2.4)
Annual leave:       25 working days per calendar year
Benefits:           Corporate medical scheme from date of joining, including dependant enrolment within 30 days

This offer is subject to satisfactory completion of reference and certificate verification and to the standard terms set out in the attached employment contract.

Please confirm your acceptance by returning a signed copy of this letter. Should you have any questions, your recruitment contact will be glad to help.

We look forward to welcoming you.

Yours sincerely,

Human Resources
TalentFlow AI Demonstration Organisation

—
DRAFT generated by the Offer & Onboarding Agent. Not valid until reviewed, approved and signed by an authorised human approver.`;
}

const ONBOARDING_BLUEPRINT: { task: string; owner: string; category: OnboardingTask['category']; day: number }[] = [
  { task: 'Send offer acceptance confirmation and welcome pack', owner: 'HR Operations', category: 'HR', day: -10 },
  { task: 'Collect identity, education and experience documents', owner: 'HR Operations', category: 'Documentation', day: -7 },
  { task: 'Certificate and reference verification', owner: 'Compliance', category: 'Compliance', day: -5 },
  { task: 'Create employee ID and HRIS record', owner: 'HR Operations', category: 'HR', day: -3 },
  { task: 'Raise IT access request (SSO, VPN, repositories)', owner: 'IT Service Desk', category: 'IT', day: -2 },
  { task: 'Provision laptop and peripherals', owner: 'IT Service Desk', category: 'IT', day: -2 },
  { task: 'Create corporate email account and calendar', owner: 'IT Service Desk', category: 'IT', day: -1 },
  { task: 'Day 1 orientation and policy walkthrough', owner: 'HR Business Partner', category: 'HR', day: 1 },
  { task: 'Manager introduction and team welcome', owner: 'Hiring Manager', category: 'Manager', day: 1 },
  { task: 'Assign onboarding buddy and share 30-day plan', owner: 'Hiring Manager', category: 'Manager', day: 2 },
  { task: 'Department-specific systems and environment access', owner: 'Team Lead', category: 'IT', day: 3 },
  { task: 'Mandatory compliance and security training', owner: 'Learning & Development', category: 'Training', day: 5 },
  { task: 'First deliverable scoped with manager', owner: 'Hiring Manager', category: 'Manager', day: 10 },
  { task: '30-day check-in and probation goal setting', owner: 'HR Business Partner', category: 'HR', day: 30 },
];

export function buildOnboardingPlan(name: string, jobTitle: string, department: string, startDateISO: string) {
  const start = new Date(startDateISO);
  return ONBOARDING_BLUEPRINT.map((t, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + t.day);
    return {
      id: `onbnew-${i}`,
      employeeName: name,
      jobTitle,
      department,
      task: t.task,
      owner: t.owner,
      category: t.category,
      day: t.day,
      dueDate: d.toISOString().slice(0, 10),
      status: 'Not Started' as const,
    };
  });
}

export const DOCUMENT_CHECKLIST = [
  'Signed offer letter and employment contract',
  'Passport copy (valid 6+ months)',
  'National / Emirates ID copy',
  'Highest education certificate (attested)',
  'Professional certifications claimed on the CV',
  'Two professional references',
  'Bank account details for payroll',
  'Passport-size photograph for the employee record',
];

export const IT_ACCESS_CHECKLIST = [
  'SSO identity and MFA enrolment',
  'Corporate email and calendar',
  'VPN and device management enrolment',
  'Source control and CI/CD access (role-scoped)',
  'Cloud console access (least privilege, time-bound)',
  'HR system and payroll self-service',
  'Collaboration tools and team channels',
];

/* ==================================================================== */
/* 10. HR Helpdesk Agent — retrieval-augmented answering                 */
/* ==================================================================== */

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'do', 'does', 'i', 'my', 'me', 'what', 'how', 'when', 'can', 'to', 'for', 'of', 'and',
  'in', 'on', 'it', 'if', 'be', 'have', 'has', 'need', 'want', 'about', 'with', 'am', 'this', 'that', 'you', 'we',
]);

function tokenize(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

export interface RetrievedChunk {
  policy: Policy;
  score: number;
  passage: string;
}

/** Lightweight lexical retriever over the governed policy corpus (BM25-flavoured). */
export function retrievePolicies(query: string, k = 3): RetrievedChunk[] {
  const q = tokenize(query);
  const scored = policies.map((p) => {
    const hay = `${p.title} ${p.category} ${p.tags.join(' ')} ${p.content}`.toLowerCase();
    let score = 0;
    q.forEach((t) => {
      if (p.tags.some((tag) => tag.includes(t))) score += 4;
      if (p.title.toLowerCase().includes(t)) score += 3;
      const occurrences = hay.split(t).length - 1;
      score += Math.min(occurrences, 4);
    });
    // best matching passage
    const sentences = p.content.split('\n').filter(Boolean);
    const best = sentences
      .map((s) => ({ s, hits: q.filter((t) => s.toLowerCase().includes(t)).length }))
      .sort((a, b) => b.hits - a.hits)[0];
    return { policy: p, score, passage: best?.hits ? best.s : sentences[0] };
  });
  return scored.filter((s) => s.score > 2).sort((a, b) => b.score - a.score).slice(0, k);
}

export function answerFromPolicies(query: string, employee?: Employee) {
  const hits = retrievePolicies(query);
  const q = query.toLowerCase();

  // Personal-entitlement questions are answered from the employee record, still citing policy.
  if (employee) {
    if (/how many.*(annual )?leave|leave balance|vacation days|days left|balance/.test(q)) {
      const p = policies.find((x) => x.id === 'pol-annual-leave')!;
      return {
        answer: `You currently have **${employee.leaveBalance.annual} days of annual leave** remaining, plus ${employee.leaveBalance.sick} sick days and ${employee.leaveBalance.casual} casual days.\n\nUnder the Annual Leave Policy you accrue 25 working days per calendar year at 2.08 days per completed month. Up to 10 unused days may be carried into next year and must be used by 31 March. Requests should be submitted at least 5 working days in advance and are approved by your line manager.`,
        citations: [{ id: p.id, title: p.title, version: p.version, passage: p.content.split('\n')[0] }],
        confidence: 0.94,
        escalate: false,
      };
    }
    if (/probation/.test(q)) {
      const p = policies.find((x) => x.id === 'pol-probation')!;
      const end = employee.probationEnd;
      return {
        answer: end
          ? `Your probation period ends on **${new Date(end).toLocaleDateString('en-GB', { timeZone: 'Asia/Dubai', day: 'numeric', month: 'long', year: 'numeric' })}**.\n\nProbation runs for 6 months from your joining date, with 30/60/90-day check-ins recorded by your manager. Confirmation requires a manager recommendation and HR approval, communicated in writing before the end date.`
          : `Your probation period is already complete — you joined on ${new Date(employee.joinDate).toLocaleDateString('en-GB', { timeZone: 'Asia/Dubai', day: 'numeric', month: 'long', year: 'numeric' })} and the standard probation is 6 months.\n\nIf you need written confirmation of employment, HR Operations can issue it on request.`,
        citations: [{ id: p.id, title: p.title, version: p.version, passage: p.content.split('\n')[0] }],
        confidence: 0.92,
        escalate: false,
      };
    }
  }

  if (!hits.length) {
    return {
      answer:
        'I could not find a policy in the HR knowledge base that answers this reliably, so I am not going to guess. I have flagged it for your HR Business Partner, who will come back to you directly.\n\nIf you can rephrase the question or tell me which policy area it relates to (leave, benefits, performance, working arrangements, exit), I can try the retrieval again.',
      citations: [],
      confidence: 0.21,
      escalate: true,
    };
  }

  const top = hits[0];
  const body = top.policy.content
    .split('\n')
    .filter((line) => {
      const t = tokenize(query);
      return t.some((tok) => line.toLowerCase().includes(tok));
    })
    .slice(0, 4);

  return {
    answer: `${(body.length ? body : top.policy.content.split('\n').slice(0, 3)).join('\n\n')}\n\nThis is drawn from the ${top.policy.title} (${top.policy.version}, last updated ${top.policy.updated}). If your situation is an exception to the policy, your HR Business Partner can advise.`,
    citations: hits.map((h) => ({ id: h.policy.id, title: h.policy.title, version: h.policy.version, passage: h.passage })),
    confidence: Math.min(0.95, 0.55 + top.score / 30),
    escalate: false,
  };
}

/* ==================================================================== */
/* 11. Leave Management Agent                                           */
/* ==================================================================== */

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

export function parseLeaveRequest(text: string, employee: Employee) {
  const t = text.toLowerCase();
  const type: LeaveRequest['type'] = /sick|medical|unwell/.test(t)
    ? 'Sick'
    : /parental|maternity|paternity/.test(t)
      ? 'Parental'
      : /unpaid/.test(t)
        ? 'Unpaid'
        : /casual/.test(t)
          ? 'Casual'
          : 'Annual';

  const year = new Date().getFullYear();
  const dates: Date[] = [];
  const MONTH_RE = '(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*';
  const re = new RegExp(
    `(\\d{4}-\\d{2}-\\d{2})|(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH_RE}|${MONTH_RE}\\s+(\\d{1,2})(?:st|nd|rd|th)?`,
    'g',
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    if (m[1]) {
      dates.push(new Date(m[1] + 'T00:00:00Z'));
      continue;
    }
    const day = Number(m[2] ?? m[5]);
    const monthWord = (m[3] ?? m[4] ?? '').slice(0, 3);
    const mi = MONTHS.findIndex((mo) => mo.startsWith(monthWord));
    if (mi >= 0 && day >= 1 && day <= 31) dates.push(new Date(Date.UTC(year, mi, day)));
  }

  let from = dates[0];
  let to = dates[1] ?? dates[0];
  if (!from) {
    from = new Date();
    from.setDate(from.getDate() + 7);
    to = new Date(from);
    to.setDate(to.getDate() + 4);
  }
  if (to < from) to = from;

  // Working days excluding Fri/Sat weekend (Gulf) — configurable per country calendar
  let days = 0;
  const cursor = new Date(from);
  while (cursor <= to) {
    const dow = cursor.getUTCDay();
    if (dow !== 5 && dow !== 6) days++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  days = Math.max(1, days);

  const balance = type === 'Sick' ? employee.leaveBalance.sick : type === 'Casual' ? employee.leaveBalance.casual : employee.leaveBalance.annual;
  const conflicts: string[] = [];

  const teamOnLeave = db.leave.filter((l) => {
    const other = employees.find((e) => e.id === l.employeeId);
    if (!other || other.departmentId !== employee.departmentId || l.employeeId === employee.id) return false;
    if (l.status === 'Rejected') return false;
    return !(new Date(l.to) < from || new Date(l.from) > to);
  });
  if (teamOnLeave.length >= 2) conflicts.push(`${teamOnLeave.length} colleagues in ${deptName(employee.departmentId)} are already on leave in this window — coverage check required`);
  if (days > balance) conflicts.push(`Requested ${days} days exceeds your ${type.toLowerCase()} balance of ${balance} days`);
  const upcoming = db.interviews.filter((i) => {
    const at = new Date(i.scheduledAt);
    return i.interviewerId === employee.id && at >= from && at <= to && i.status === 'Scheduled';
  });
  if (upcoming.length) conflicts.push(`${upcoming.length} interview(s) you are scheduled to run fall inside this window`);

  const manager = employees.find((e) => e.id === employee.managerId);

  return {
    type,
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    days,
    balance,
    balanceAfter: balance - days,
    conflicts,
    approver: manager ?? employees.find((e) => e.level === 'Manager')!,
    policy: policies.find((p) => (type === 'Sick' ? p.id === 'pol-sick-leave' : type === 'Parental' ? p.id === 'pol-parental-leave' : p.id === 'pol-annual-leave'))!,
  };
}

/* ==================================================================== */
/* 12. Performance Management Agent                                     */
/* ==================================================================== */

export function buildPerformanceSummary(employee: Employee, review?: PerformanceReview) {
  const goals = db.reviews.find((r) => r.employeeId === employee.id) ?? review;
  const achieved = goals?.goalsAchieved ?? Math.round(employee.performanceScore * 2);
  const total = goals?.goalsTotal ?? 10;
  const strengths = goals?.strengths ?? ['Delivery consistency', 'Cross-team collaboration'];
  const dev = goals?.developmentAreas ?? ['Stakeholder communication'];

  const evidence = [
    `${achieved} of ${total} goals achieved in the ${goals?.cycle ?? 'current'} cycle`,
    `Training completion at ${employee.trainingCompletion}% against a 70% organisational target`,
    `Engagement score ${employee.engagementScore}/100`,
    `Workload index ${employee.workloadIndex}/100${employee.workloadIndex > 85 ? ' — sustained above the healthy band' : ''}`,
    `${employee.tenureMonths} months in role`,
  ];

  const summary = `${employee.name} (${employee.title}, ${deptName(employee.departmentId)}) achieved ${achieved} of ${total} goals this cycle. Strengths evidenced across ${strengths
    .join(', ')
    .toLowerCase()}. Development opportunities: ${dev.join(' and ').toLowerCase()}. ${
    employee.workloadIndex > 85
      ? 'Workload has run above the healthy band for the period, which is relevant context for any objectives that slipped. '
      : ''
  }${
    employee.trainingCompletion < 50 ? 'Training completion is below target and should be addressed in the next cycle plan. ' : ''
  }A suggested rating of ${employee.performanceScore.toFixed(1)}/5 is provided as decision support only — the manager sets the rating and HR approves it.`;

  return {
    summary,
    evidence,
    goalsAchieved: achieved,
    goalsTotal: total,
    strengths,
    developmentAreas: dev,
    suggestedObjectives: goals?.suggestedObjectives ?? [
      'Implement Infrastructure as Code for the two remaining legacy services',
      'Reduce deployment lead time by 20%',
      'Complete one role-relevant certification',
    ],
    suggestedRating: employee.performanceScore,
    disclaimer: 'Advisory only. Final rating is set by the manager and approved by HR under Performance Management Policy v4.0.',
  };
}

/* ==================================================================== */
/* 13. Learning & Skills Agent                                          */
/* ==================================================================== */

export const TARGET_ROLE_PROFILES: Record<string, { skill: string; required: SkillLevel }[]> = {
  'Senior Cloud Engineer': [
    { skill: 'AWS', required: 'Advanced' },
    { skill: 'Azure', required: 'Advanced' },
    { skill: 'Terraform', required: 'Advanced' },
    { skill: 'Kubernetes', required: 'Advanced' },
    { skill: 'Kubernetes Security', required: 'Intermediate' },
    { skill: 'FinOps', required: 'Intermediate' },
  ],
  'Cloud Platform Lead': [
    { skill: 'Kubernetes', required: 'Expert' },
    { skill: 'AWS', required: 'Advanced' },
    { skill: 'Terraform', required: 'Advanced' },
    { skill: 'Site Reliability', required: 'Advanced' },
    { skill: 'Kubernetes Security', required: 'Intermediate' },
    { skill: 'Team Leadership', required: 'Advanced' },
    { skill: 'Mentoring', required: 'Advanced' },
  ],
  'Senior DevOps Engineer': [
    { skill: 'Kubernetes', required: 'Advanced' },
    { skill: 'AWS', required: 'Advanced' },
    { skill: 'Terraform', required: 'Advanced' },
    { skill: 'CI/CD', required: 'Advanced' },
    { skill: 'Linux', required: 'Advanced' },
    { skill: 'Observability', required: 'Intermediate' },
  ],
  'Engineering Manager': [
    { skill: 'Team Leadership', required: 'Advanced' },
    { skill: 'Mentoring', required: 'Advanced' },
    { skill: 'Stakeholder Management', required: 'Advanced' },
    { skill: 'Project Management', required: 'Intermediate' },
  ],
  'Finance Manager': [
    { skill: 'IFRS Reporting', required: 'Advanced' },
    { skill: 'FP&A', required: 'Advanced' },
    { skill: 'Team Leadership', required: 'Intermediate' },
    { skill: 'SQL', required: 'Intermediate' },
  ],
};

export function analyseSkillGaps(employee: Employee, targetRole: string) {
  const profile = TARGET_ROLE_PROFILES[targetRole] ?? TARGET_ROLE_PROFILES['Senior Cloud Engineer'];
  const gaps = profile
    .map((req) => {
      const skill = skillByName(req.skill);
      const have = skill ? employee.skills.find((s) => s.skillId === skill.id)?.level : undefined;
      const haveVal = have ? SKILL_LEVEL_VALUE[have] : 0;
      const needVal = SKILL_LEVEL_VALUE[req.required];
      return { skill: req.skill, current: (have ?? 'None') as SkillLevel | 'None', required: req.required, delta: needVal - haveVal };
    })
    .filter((g) => g.delta > 0)
    .sort((a, b) => b.delta - a.delta);

  const readiness = Math.round(
    (profile.reduce((acc, req) => {
      const skill = skillByName(req.skill);
      const have = skill ? employee.skills.find((s) => s.skillId === skill.id)?.level : undefined;
      return acc + Math.min(1, (have ? SKILL_LEVEL_VALUE[have] : 0) / SKILL_LEVEL_VALUE[req.required]);
    }, 0) /
      profile.length) *
      100,
  );

  const courses = gaps.flatMap((g) => {
    const skill = skillByName(g.skill);
    return trainingCourses.filter((c) => skill && c.skillIds.includes(skill.id)).map((c) => ({ ...c, forSkill: g.skill }));
  });

  const roadmap = [
    {
      phase: 'Phase 1 — Foundations',
      weeks: 'Weeks 1–6',
      items: gaps.slice(0, 2).map((g) => `Close ${g.skill} from ${g.current} to ${g.required} via structured coursework and a sandbox lab`),
    },
    {
      phase: 'Phase 2 — Applied practice',
      weeks: 'Weeks 7–14',
      items: [
        `Take an internal project that requires ${gaps[0]?.skill ?? 'the target skill'} in production`,
        'Pair with a subject-matter expert in a fortnightly mentoring slot',
      ],
    },
    {
      phase: 'Phase 3 — Validation',
      weeks: 'Weeks 15–20',
      items: [
        courses.find((c) => c.format === 'Certification')
          ? `Sit ${courses.find((c) => c.format === 'Certification')!.title}`
          : 'Complete a role-relevant certification',
        'Present the delivered work at the engineering forum as evidence of applied capability',
      ],
    },
  ];

  return {
    targetRole,
    readiness,
    gaps,
    courses: Array.from(new Map(courses.map((c) => [c.id, c])).values()),
    roadmap,
    explanation: `Readiness ${readiness}% is the average attainment across the ${profile.length} skills defined for ${targetRole}. ${
      gaps.length ? `${gaps.length} gaps remain, largest first: ${gaps.slice(0, 3).map((g) => `${g.skill} (${g.current} → ${g.required})`).join(', ')}.` : 'No skill gaps remain against the target profile.'
    } Recommendations are developmental and are never used as grounds for adverse action.`,
  };
}

/** Internal mobility: rank existing employees against a target role profile. */
export function rankInternalCandidates(targetRole: string, limit = 5) {
  const profile = TARGET_ROLE_PROFILES[targetRole] ?? TARGET_ROLE_PROFILES['Cloud Platform Lead'];
  return employees
    .filter((e) => e.status === 'Active')
    .map((e) => {
      const analysis = analyseSkillGaps(e, targetRole);
      const perf = (e.performanceScore / 5) * 100;
      const growth = Math.min(100, e.trainingCompletion);
      const score = Math.round(analysis.readiness * 0.6 + perf * 0.28 + growth * 0.12);
      return {
        employee: e,
        score,
        readiness: analysis.readiness,
        gaps: analysis.gaps,
        roadmap: analysis.roadmap,
        explanation: `Composite ${score}% = skill readiness ${analysis.readiness}% (60%), performance ${Math.round(perf)}% (28%), learning participation ${growth}% (12%). ${
          analysis.gaps.length ? `Development needed in ${analysis.gaps.slice(0, 3).map((g) => g.skill).join(', ')}.` : 'Meets the full target skill profile.'
        } No promotion is made automatically — this ranking supports a human succession conversation.`,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => ({ ...r, profileSize: profile.length }));
}

/* ==================================================================== */
/* 14. Employee Engagement Agent                                        */
/* ==================================================================== */

export function analyseEngagement(departmentId?: string) {
  const scoped = employeeFeedback.filter((f) => !departmentId || f.departmentId === departmentId);
  const themes = Array.from(new Set(scoped.map((f) => f.theme)));
  const MIN_RESPONSES = 5; // small-sample suppression protects anonymity

  const byTheme = themes
    .map((theme) => {
      const items = scoped.filter((f) => f.theme === theme);
      const avg = items.reduce((a, f) => a + f.sentiment, 0) / (items.length || 1);
      const prev = items.filter((f) => f.quarter === 'Q2 2026');
      const curr = items.filter((f) => f.quarter === 'Q3 2026');
      const prevAvg = prev.length ? prev.reduce((a, f) => a + f.sentiment, 0) / prev.length : avg;
      const currAvg = curr.length ? curr.reduce((a, f) => a + f.sentiment, 0) / curr.length : avg;
      return {
        theme,
        responses: items.length,
        sentiment: Number(avg.toFixed(2)),
        trend: Number((currAvg - prevAvg).toFixed(2)),
        suppressed: items.length < MIN_RESPONSES,
        sample: items.length >= MIN_RESPONSES ? items.slice(0, 3).map((i) => i.comment) : [],
      };
    })
    .sort((a, b) => a.sentiment - b.sentiment);

  const quarters = ['Q4 2025', 'Q1 2026', 'Q2 2026', 'Q3 2026'];
  const trend = quarters.map((q) => {
    const items = scoped.filter((f) => f.quarter === q);
    return { quarter: q, sentiment: Number((items.reduce((a, f) => a + f.sentiment, 0) / (items.length || 1)).toFixed(2)), responses: items.length };
  });

  const worst = byTheme.filter((t) => !t.suppressed)[0];
  const actions = worst
    ? [
        `${worst.theme} is the lowest-scoring theme (${worst.sentiment}). Run a listening session with the affected teams before designing an intervention.`,
        worst.theme === 'Workload'
          ? 'Review on-call rotation size and sprint commitment ratios — workload index is above 85 for several engineers.'
          : worst.theme === 'Career Growth'
            ? 'Publish role progression frameworks and open the internal mobility board to all departments.'
            : 'Assign a named owner and report back to the department in the next all-hands.',
        'Re-measure in the next pulse cycle and track the delta rather than the absolute score.',
      ]
    : ['Insufficient responses to draw a conclusion at this scope. Widen the scope or wait for the next pulse.'];

  return {
    themes: byTheme,
    trend,
    actions,
    note: `Aggregate analysis only. Segments with fewer than ${MIN_RESPONSES} responses are suppressed and no protected attribute is used as an analysis dimension.`,
  };
}

/* ==================================================================== */
/* 15. Retention Risk Agent                                             */
/* ==================================================================== */

export function assessRetentionRisk(employee: Employee) {
  const factors: { factor: string; impact: number; detail: string }[] = [];

  if (employee.engagementScore < 55) factors.push({ factor: 'Engagement below threshold', impact: 28, detail: `Engagement score ${employee.engagementScore}/100 against an organisational median of 74.` });
  else if (employee.engagementScore < 68) factors.push({ factor: 'Engagement softening', impact: 14, detail: `Engagement score ${employee.engagementScore}/100, below the organisational median of 74.` });

  if (employee.workloadIndex > 88) factors.push({ factor: 'Sustained high workload', impact: 22, detail: `Workload index ${employee.workloadIndex}/100 — above the healthy band (≤85) for the period.` });

  if (employee.tenureMonths >= 18 && employee.tenureMonths <= 30 && employee.internalMobility === 0)
    factors.push({ factor: 'Tenure plateau without movement', impact: 18, detail: `${employee.tenureMonths} months in the same role with no internal move recorded.` });

  if (employee.trainingCompletion < 40) factors.push({ factor: 'Low learning participation', impact: 13, detail: `Training completion ${employee.trainingCompletion}% against a 70% target — often an early disengagement signal.` });

  if (employee.performanceScore >= 4 && employee.internalMobility === 0 && employee.tenureMonths > 24)
    factors.push({ factor: 'High performer without progression', impact: 16, detail: `Performance ${employee.performanceScore}/5 sustained with no role change in ${employee.tenureMonths} months.` });

  const dept = departments.find((d) => d.id === employee.departmentId);
  if (dept && dept.attritionRate > 13) factors.push({ factor: 'Elevated department attrition', impact: 9, detail: `${dept.name} attrition is ${dept.attritionRate}% against a company average of 10.9%.` });

  const score = Math.min(100, factors.reduce((a, f) => a + f.impact, 0));
  const level: 'Low' | 'Medium' | 'High' = score >= 55 ? 'High' : score >= 30 ? 'Medium' : 'Low';

  const supportiveActions =
    level === 'Low'
      ? ['Maintain the current cadence of one-to-ones and development conversations.']
      : [
          'Hold a structured stay conversation covering role, growth and workload.',
          employee.workloadIndex > 88 ? 'Rebalance workload or expand the on-call rotation before the next cycle.' : 'Agree a concrete development goal for the coming quarter.',
          employee.internalMobility === 0 ? 'Surface internal mobility options and a realistic progression path.' : 'Confirm the current role still matches the agreed direction.',
          employee.trainingCompletion < 40 ? 'Protect learning time in the delivery plan and agree one certification.' : 'Continue the existing learning plan.',
        ];

  return {
    level,
    score,
    factors: factors.length ? factors : [{ factor: 'No elevated indicators', impact: 0, detail: 'All monitored work-related indicators sit within healthy bands.' }],
    supportiveActions,
    guardrail:
      'This assessment uses only work-related indicators (engagement, performance, tenure, learning participation, internal mobility, workload, department attrition). No protected attribute is used. It never recommends termination, demotion or any adverse action, and is provided to support a supportive human conversation.',
  };
}

/* ==================================================================== */
/* 16. Offboarding Agent                                                */
/* ==================================================================== */

export function buildOffboardingPlan(employee: Employee, lastDay: string) {
  return {
    employee: employee.name,
    lastDay,
    tasks: [
      { task: 'Acknowledge resignation and confirm last working day in writing', owner: 'HR Operations', due: -30 },
      { task: 'Schedule and conduct exit interview', owner: 'HR Business Partner', due: -7 },
      { task: 'Knowledge transfer plan agreed and documented', owner: 'Line Manager', due: -14 },
      { task: 'Knowledge transfer sign-off', owner: 'Line Manager', due: -2 },
      { task: 'Asset return — laptop, access card, phone, peripherals', owner: 'IT Service Desk', due: 0 },
      { task: 'Access revocation — SSO, VPN, repositories, cloud consoles', owner: 'IT Security', due: 0 },
      { task: 'Payroll notification and final settlement calculation', owner: 'Payroll', due: -3 },
      { task: 'Leave encashment and end-of-service benefit calculation', owner: 'Payroll', due: -3 },
      { task: 'Experience certificate and HR documents issued', owner: 'HR Operations', due: 3 },
      { task: 'Account deactivation and mailbox delegation', owner: 'IT Service Desk', due: 1 },
      { task: 'Alumni record and rehire-eligibility flag set', owner: 'HR Operations', due: 5 },
    ].map((t) => {
      const d = new Date(lastDay);
      d.setDate(d.getDate() + t.due);
      return { ...t, dueDate: d.toISOString().slice(0, 10), status: 'Pending' as const };
    }),
    note: 'Access revocation occurs at 18:00 on the last working day per the Resignation & Offboarding Policy (v3.1). Final settlement is processed within 14 days.',
  };
}
