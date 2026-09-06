import type {
  Candidate,
  Department,
  Employee,
  EmployeeFeedback,
  EmployeeGoal,
  Interview,
  Job,
  LeaveRequest,
  OffboardingCase,
  Offer,
  OnboardingTask,
  PerformanceReview,
  Policy,
  Skill,
  SkillLevel,
  TrainingCourse,
  User,
  AuditLog,
  ApprovalRequest,
} from './types';

/* ------------------------------------------------------------------ */
/* Deterministic PRNG so every environment renders identical demo data */
/* ------------------------------------------------------------------ */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260214);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const pickN = <T,>(arr: T[], n: number): T[] => {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]);
  return out;
};
const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
const dateOffset = (days: number) => {
  const d = new Date('2026-09-05T09:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const isoOffset = (days: number, hour = 10) => {
  const d = new Date('2026-09-05T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
};

/* ------------------------------- Skills ------------------------------- */
export const skills: Skill[] = [
  { id: 'sk-aws', name: 'AWS', category: 'Cloud' },
  { id: 'sk-azure', name: 'Azure', category: 'Cloud' },
  { id: 'sk-gcp', name: 'Google Cloud', category: 'Cloud' },
  { id: 'sk-k8s', name: 'Kubernetes', category: 'DevOps' },
  { id: 'sk-terraform', name: 'Terraform', category: 'DevOps' },
  { id: 'sk-cicd', name: 'CI/CD', category: 'DevOps' },
  { id: 'sk-docker', name: 'Docker', category: 'DevOps' },
  { id: 'sk-linux', name: 'Linux', category: 'DevOps' },
  { id: 'sk-python', name: 'Python', category: 'Engineering' },
  { id: 'sk-typescript', name: 'TypeScript', category: 'Engineering' },
  { id: 'sk-java', name: 'Java', category: 'Engineering' },
  { id: 'sk-react', name: 'React', category: 'Engineering' },
  { id: 'sk-node', name: 'Node.js', category: 'Engineering' },
  { id: 'sk-sql', name: 'SQL', category: 'Data' },
  { id: 'sk-dataeng', name: 'Data Engineering', category: 'Data' },
  { id: 'sk-ml', name: 'Machine Learning', category: 'Data' },
  { id: 'sk-k8ssec', name: 'Kubernetes Security', category: 'Security' },
  { id: 'sk-iam', name: 'Identity & Access Management', category: 'Security' },
  { id: 'sk-appsec', name: 'Application Security', category: 'Security' },
  { id: 'sk-finops', name: 'FinOps', category: 'Cloud' },
  { id: 'sk-observability', name: 'Observability', category: 'DevOps' },
  { id: 'sk-sre', name: 'Site Reliability', category: 'DevOps' },
  { id: 'sk-projmgmt', name: 'Project Management', category: 'Business' },
  { id: 'sk-stakeholder', name: 'Stakeholder Management', category: 'Business' },
  { id: 'sk-leadership', name: 'Team Leadership', category: 'Leadership' },
  { id: 'sk-mentoring', name: 'Mentoring', category: 'Leadership' },
  { id: 'sk-ifrs', name: 'IFRS Reporting', category: 'Finance' },
  { id: 'sk-fpa', name: 'FP&A', category: 'Finance' },
  { id: 'sk-payroll', name: 'Payroll Operations', category: 'People' },
  { id: 'sk-talentacq', name: 'Talent Acquisition', category: 'People' },
  { id: 'sk-crm', name: 'CRM / Salesforce', category: 'Business' },
  { id: 'sk-demandgen', name: 'Demand Generation', category: 'Business' },
];
export const skillName = (id: string) => skills.find((s) => s.id === id)?.name ?? id;
export const skillByName = (name: string) =>
  skills.find((s) => s.name.toLowerCase() === name.toLowerCase());

/* ---------------------------- Departments ---------------------------- */
export const departments: Department[] = [
  { id: 'dep-eng', name: 'Engineering', headcount: 0, openRoles: 3, attritionRate: 11.2, engagementScore: 78 },
  { id: 'dep-it', name: 'IT', headcount: 0, openRoles: 2, attritionRate: 9.4, engagementScore: 74 },
  { id: 'dep-fin', name: 'Finance', headcount: 0, openRoles: 1, attritionRate: 6.1, engagementScore: 81 },
  { id: 'dep-hr', name: 'Human Resources', headcount: 0, openRoles: 1, attritionRate: 7.8, engagementScore: 84 },
  { id: 'dep-ops', name: 'Operations', headcount: 0, openRoles: 1, attritionRate: 13.5, engagementScore: 69 },
  { id: 'dep-mkt', name: 'Marketing', headcount: 0, openRoles: 1, attritionRate: 12.0, engagementScore: 72 },
  { id: 'dep-sales', name: 'Sales', headcount: 0, openRoles: 1, attritionRate: 16.4, engagementScore: 66 },
  { id: 'dep-cs', name: 'Customer Success', headcount: 0, openRoles: 0, attritionRate: 10.7, engagementScore: 76 },
];
export const deptName = (id: string) => departments.find((d) => d.id === id)?.name ?? id;

/* ----------------------------- Employees ----------------------------- */
const firstNames = [
  'Aisha', 'Omar', 'Priya', 'Daniel', 'Fatima', 'Rahul', 'Sofia', 'Marcus', 'Layla', 'Kenji',
  'Nadia', 'Thomas', 'Zara', 'Ivan', 'Meera', 'Hassan', 'Elena', 'Karthik', 'Amara', 'Lucas',
  'Yasmin', 'Peter', 'Anjali', 'Samir', 'Grace', 'Noah', 'Hina', 'Andre', 'Reem', 'Vikram',
  'Chloe', 'Adnan', 'Divya', 'Erik', 'Salma', 'Joseph', 'Nour', 'Arjun', 'Isabella', 'Tariq',
  'Maya', 'Felix', 'Huda', 'Ravi', 'Clara', 'Bilal', 'Tanya', 'Gabriel', 'Sana', 'Mateo',
];
const lastNames = [
  'Al Mansoori', 'Khan', 'Nair', 'Whitfield', 'Haddad', 'Sharma', 'Rossi', 'Bennett', 'Aziz', 'Tanaka',
  'Farouk', 'Muller', 'Rahman', 'Petrov', 'Iyer', 'Al Balushi', 'Costa', 'Menon', 'Okafor', 'Silva',
  'Saeed', 'Novak', 'Kapoor', 'Yusuf', 'Adeyemi', 'Larsen', 'Park', 'Dubois', 'Al Suwaidi', 'Reddy',
];
const locations = ['Dubai, UAE', 'Abu Dhabi, UAE', 'Riyadh, KSA', 'Doha, Qatar', 'Bengaluru, India', 'London, UK'];

const titlesByDept: Record<string, string[]> = {
  'dep-eng': ['Software Engineer', 'Senior Software Engineer', 'DevOps Engineer', 'Cloud Engineer', 'QA Engineer', 'Engineering Manager', 'Platform Engineer'],
  'dep-it': ['IT Support Specialist', 'Systems Administrator', 'Network Engineer', 'IT Security Analyst', 'IT Manager'],
  'dep-fin': ['Financial Analyst', 'Accountant', 'Finance Manager', 'Treasury Analyst'],
  'dep-hr': ['HR Business Partner', 'Talent Acquisition Specialist', 'HR Operations Executive', 'HR Manager'],
  'dep-ops': ['Operations Analyst', 'Operations Manager', 'Supply Chain Coordinator', 'Process Excellence Lead'],
  'dep-mkt': ['Marketing Executive', 'Content Strategist', 'Demand Generation Manager', 'Brand Manager'],
  'dep-sales': ['Account Executive', 'Sales Manager', 'Business Development Manager', 'Inside Sales Representative'],
  'dep-cs': ['Customer Success Manager', 'Support Engineer', 'Onboarding Specialist'],
};
const deptSkillPool: Record<string, string[]> = {
  'dep-eng': ['sk-aws', 'sk-azure', 'sk-k8s', 'sk-terraform', 'sk-cicd', 'sk-docker', 'sk-linux', 'sk-python', 'sk-typescript', 'sk-react', 'sk-node', 'sk-sre', 'sk-observability', 'sk-k8ssec', 'sk-finops'],
  'dep-it': ['sk-linux', 'sk-iam', 'sk-appsec', 'sk-azure', 'sk-docker', 'sk-observability'],
  'dep-fin': ['sk-ifrs', 'sk-fpa', 'sk-sql', 'sk-projmgmt'],
  'dep-hr': ['sk-payroll', 'sk-talentacq', 'sk-stakeholder', 'sk-projmgmt'],
  'dep-ops': ['sk-projmgmt', 'sk-stakeholder', 'sk-sql', 'sk-leadership'],
  'dep-mkt': ['sk-demandgen', 'sk-crm', 'sk-stakeholder'],
  'dep-sales': ['sk-crm', 'sk-stakeholder', 'sk-demandgen'],
  'dep-cs': ['sk-crm', 'sk-stakeholder', 'sk-sql'],
};
const levels: Employee['level'][] = ['Junior', 'Mid', 'Senior', 'Lead', 'Manager'];
const skillLevels: SkillLevel[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

function buildEmployees(): Employee[] {
  const out: Employee[] = [];
  const deptCycle = ['dep-eng', 'dep-eng', 'dep-eng', 'dep-eng', 'dep-it', 'dep-it', 'dep-fin', 'dep-hr', 'dep-ops', 'dep-mkt', 'dep-sales', 'dep-cs'];
  for (let i = 0; i < 50; i++) {
    const departmentId = deptCycle[i % deptCycle.length];
    const first = firstNames[i % firstNames.length];
    const last = lastNames[(i * 7) % lastNames.length];
    const name = `${first} ${last}`;
    const tenureMonths = int(3, 96);
    const level = i % 11 === 0 ? 'Manager' : pick(levels);
    const pool = deptSkillPool[departmentId];
    const empSkills = pickN(pool, Math.min(pool.length, int(3, 6))).map((skillId) => ({
      skillId,
      level: pick(skillLevels),
    }));
    const engagement = int(42, 95);
    out.push({
      id: `emp-${String(i + 1).padStart(3, '0')}`,
      name,
      email: `${first.toLowerCase()}.${last.split(' ').join('').toLowerCase()}@talentflow.demo`,
      title: pick(titlesByDept[departmentId]),
      departmentId,
      location: pick(locations),
      joinDate: dateOffset(-tenureMonths * 30),
      status: i >= 47 ? 'Notice Period' : 'Active',
      level,
      leaveBalance: { annual: int(4, 25), sick: int(3, 12), casual: int(0, 5) },
      probationEnd: tenureMonths < 6 ? dateOffset(180 - tenureMonths * 30) : undefined,
      performanceScore: Math.round((2.6 + rnd() * 2.3) * 10) / 10,
      engagementScore: engagement,
      trainingCompletion: int(20, 100),
      tenureMonths,
      internalMobility: rnd() > 0.75 ? 1 : 0,
      workloadIndex: int(35, 98),
      skills: empSkills,
      employmentType: rnd() > 0.9 ? 'Contract' : 'Full-time',
    });
  }
  // Hand-tuned demo personas used by the internal-mobility scenario
  out[0] = {
    ...out[0],
    id: 'emp-001',
    name: 'Aisha Al Mansoori',
    email: 'aisha.almansoori@talentflow.demo',
    title: 'Senior Cloud Engineer',
    departmentId: 'dep-eng',
    level: 'Senior',
    location: 'Dubai, UAE',
    status: 'Active',
    performanceScore: 4.4,
    engagementScore: 88,
    trainingCompletion: 92,
    tenureMonths: 41,
    internalMobility: 1,
    workloadIndex: 72,
    leaveBalance: { annual: 18, sick: 9, casual: 3 },
    skills: [
      { skillId: 'sk-azure', level: 'Advanced' },
      { skillId: 'sk-aws', level: 'Intermediate' },
      { skillId: 'sk-k8s', level: 'Intermediate' },
      { skillId: 'sk-terraform', level: 'Beginner' },
      { skillId: 'sk-cicd', level: 'Advanced' },
      { skillId: 'sk-linux', level: 'Advanced' },
    ],
  };
  out[1] = {
    ...out[1],
    id: 'emp-002',
    name: 'Omar Khan',
    email: 'omar.khan@talentflow.demo',
    title: 'Platform Engineer',
    departmentId: 'dep-eng',
    level: 'Senior',
    location: 'Dubai, UAE',
    performanceScore: 4.1,
    engagementScore: 74,
    trainingCompletion: 78,
    tenureMonths: 29,
    workloadIndex: 91,
    skills: [
      { skillId: 'sk-aws', level: 'Advanced' },
      { skillId: 'sk-k8s', level: 'Advanced' },
      { skillId: 'sk-terraform', level: 'Intermediate' },
      { skillId: 'sk-observability', level: 'Advanced' },
      { skillId: 'sk-cicd', level: 'Advanced' },
    ],
  };
  out[2] = {
    ...out[2],
    id: 'emp-003',
    name: 'Priya Nair',
    email: 'priya.nair@talentflow.demo',
    title: 'Engineering Manager',
    departmentId: 'dep-eng',
    level: 'Manager',
    location: 'Dubai, UAE',
    performanceScore: 4.6,
    engagementScore: 90,
    trainingCompletion: 85,
    tenureMonths: 63,
    internalMobility: 2,
    workloadIndex: 80,
    skills: [
      { skillId: 'sk-leadership', level: 'Expert' },
      { skillId: 'sk-aws', level: 'Advanced' },
      { skillId: 'sk-k8s', level: 'Intermediate' },
      { skillId: 'sk-stakeholder', level: 'Advanced' },
      { skillId: 'sk-mentoring', level: 'Expert' },
    ],
  };
  out[3] = {
    ...out[3],
    id: 'emp-004',
    name: 'Daniel Whitfield',
    email: 'daniel.whitfield@talentflow.demo',
    title: 'DevOps Engineer',
    departmentId: 'dep-eng',
    level: 'Mid',
    location: 'Dubai, UAE',
    performanceScore: 3.4,
    engagementScore: 51,
    trainingCompletion: 34,
    tenureMonths: 22,
    internalMobility: 0,
    workloadIndex: 94,
    skills: [
      { skillId: 'sk-aws', level: 'Intermediate' },
      { skillId: 'sk-k8s', level: 'Intermediate' },
      { skillId: 'sk-docker', level: 'Advanced' },
      { skillId: 'sk-linux', level: 'Advanced' },
    ],
  };
  out[7] = {
    ...out[7],
    id: 'emp-008',
    name: 'Meera Iyer',
    email: 'meera.iyer@talentflow.demo',
    title: 'HR Business Partner',
    departmentId: 'dep-hr',
    level: 'Senior',
    location: 'Dubai, UAE',
    performanceScore: 4.2,
    engagementScore: 86,
    tenureMonths: 48,
  };
  // Managers
  out.forEach((e, idx) => {
    if (e.level !== 'Manager') {
      const managers = out.filter((m) => m.level === 'Manager' && m.departmentId === e.departmentId);
      e.managerId = managers.length ? managers[idx % managers.length].id : 'emp-003';
    }
  });
  departments.forEach((d) => (d.headcount = out.filter((e) => e.departmentId === d.id).length));
  return out;
}
export const employees: Employee[] = buildEmployees();
export const empName = (id: string) => employees.find((e) => e.id === id)?.name ?? id;

/* -------------------------------- Users ------------------------------- */
export const users: User[] = [
  { id: 'usr-1', email: 'demo@talentflow.ai', name: 'Layla Haddad', role: 'HR_ADMIN', employeeId: 'emp-008', avatarColor: '#7c3aed' },
  { id: 'usr-2', email: 'recruiter@talentflow.ai', name: 'Samir Yusuf', role: 'RECRUITER', employeeId: 'emp-008', avatarColor: '#06b6d4' },
  { id: 'usr-3', email: 'manager@talentflow.ai', name: 'Priya Nair', role: 'HIRING_MANAGER', employeeId: 'emp-003', avatarColor: '#10b981' },
  { id: 'usr-4', email: 'employee@talentflow.ai', name: 'Aisha Al Mansoori', role: 'EMPLOYEE', employeeId: 'emp-001', avatarColor: '#f59e0b' },
];

/* --------------------------------- Jobs ------------------------------- */
export const jobs: Job[] = [
  {
    id: 'job-001',
    jobCode: 'DEVOPS-2026-004',
    title: 'Senior DevOps Engineer',
    departmentId: 'dep-eng',
    location: 'Dubai, UAE',
    seniority: 'Senior',
    employmentType: 'Full-time',
    status: 'Open',
    openings: 2,
    postedAt: dateOffset(-18),
    hiringManagerId: 'emp-003',
    recruiterId: 'emp-008',
    minExperience: 5,
    salaryRange: 'AED 28,000 – 34,000 / month',
    summary:
      'Own the reliability, automation and delivery pipeline of our cloud platform. You will design self-service infrastructure, cut deployment friction for 60+ engineers and embed security into every stage of the release lifecycle.',
    responsibilities: [
      'Design and operate production Kubernetes clusters across multiple environments',
      'Build reusable Terraform modules and a self-service infrastructure catalogue',
      'Own CI/CD pipelines, release automation and progressive delivery',
      'Define SLOs, instrument observability and lead incident response',
      'Embed security and cost controls into platform defaults',
      'Mentor engineers on platform and reliability practices',
    ],
    mandatorySkills: ['Kubernetes', 'AWS', 'Terraform', 'CI/CD', 'Linux'],
    preferredSkills: ['Azure', 'Kubernetes Security', 'Observability', 'FinOps', 'Python'],
    education: "Bachelor's degree in Computer Science, Engineering or equivalent practical experience",
    evaluationCriteria: [
      { criterion: 'Technical skills match', weight: 35 },
      { criterion: 'Relevant experience', weight: 25 },
      { criterion: 'Cloud platform depth', weight: 20 },
      { criterion: 'Certifications', weight: 10 },
      { criterion: 'Location & availability', weight: 10 },
    ],
    priority: 'Critical',
    createdBy: 'AI Job Description Agent',
    approvedBy: 'Layla Haddad',
  },
  {
    id: 'job-002',
    jobCode: 'CLDSEC-2026-002',
    title: 'Cloud Security Engineer',
    departmentId: 'dep-eng',
    location: 'Dubai, UAE',
    seniority: 'Senior',
    employmentType: 'Full-time',
    status: 'Open',
    openings: 1,
    postedAt: dateOffset(-24),
    hiringManagerId: 'emp-003',
    recruiterId: 'emp-008',
    minExperience: 5,
    salaryRange: 'AED 27,000 – 33,000 / month',
    summary: 'Secure our multi-cloud estate: identity, workload protection, and cloud posture management.',
    responsibilities: ['Own cloud security posture management', 'Design IAM and least-privilege models', 'Lead threat modelling for platform services'],
    mandatorySkills: ['Kubernetes Security', 'Identity & Access Management', 'AWS', 'Application Security'],
    preferredSkills: ['Azure', 'Terraform', 'Python'],
    education: "Bachelor's degree in Computer Science or Cybersecurity",
    evaluationCriteria: [
      { criterion: 'Technical skills match', weight: 40 },
      { criterion: 'Relevant experience', weight: 25 },
      { criterion: 'Certifications', weight: 20 },
      { criterion: 'Location & availability', weight: 15 },
    ],
    priority: 'High',
    createdBy: 'AI Job Description Agent',
  },
  {
    id: 'job-003',
    jobCode: 'CLOUD-2026-007',
    title: 'Cloud Engineer',
    departmentId: 'dep-eng',
    location: 'Abu Dhabi, UAE',
    seniority: 'Mid',
    employmentType: 'Full-time',
    status: 'Open',
    openings: 2,
    postedAt: dateOffset(-11),
    hiringManagerId: 'emp-003',
    recruiterId: 'emp-008',
    minExperience: 3,
    salaryRange: 'AED 18,000 – 24,000 / month',
    summary: 'Build and run cloud landing zones and migration workloads as we move 40% of infrastructure to cloud.',
    responsibilities: ['Deliver landing zone components', 'Automate migration waves', 'Support cost optimisation'],
    mandatorySkills: ['AWS', 'Terraform', 'Linux', 'CI/CD'],
    preferredSkills: ['Azure', 'Kubernetes', 'FinOps'],
    education: "Bachelor's degree in a technical discipline",
    evaluationCriteria: [
      { criterion: 'Technical skills match', weight: 40 },
      { criterion: 'Relevant experience', weight: 30 },
      { criterion: 'Certifications', weight: 15 },
      { criterion: 'Location & availability', weight: 15 },
    ],
    priority: 'High',
    createdBy: 'AI Job Description Agent',
  },
  {
    id: 'job-004',
    jobCode: 'ITSEC-2026-001',
    title: 'IT Security Analyst',
    departmentId: 'dep-it',
    location: 'Dubai, UAE',
    seniority: 'Mid',
    employmentType: 'Full-time',
    status: 'Open',
    openings: 1,
    postedAt: dateOffset(-32),
    hiringManagerId: 'emp-003',
    recruiterId: 'emp-008',
    minExperience: 3,
    salaryRange: 'AED 16,000 – 21,000 / month',
    summary: 'Monitor, detect and respond to security events across corporate IT.',
    responsibilities: ['Run SOC triage', 'Manage vulnerability remediation', 'Support compliance audits'],
    mandatorySkills: ['Application Security', 'Identity & Access Management', 'Linux'],
    preferredSkills: ['Azure', 'Python'],
    education: "Bachelor's degree in IT or Cybersecurity",
    evaluationCriteria: [
      { criterion: 'Technical skills match', weight: 40 },
      { criterion: 'Relevant experience', weight: 30 },
      { criterion: 'Certifications', weight: 20 },
      { criterion: 'Location & availability', weight: 10 },
    ],
    priority: 'Medium',
    createdBy: 'Human',
  },
  {
    id: 'job-005',
    jobCode: 'SYSADM-2026-003',
    title: 'Systems Administrator',
    departmentId: 'dep-it',
    location: 'Dubai, UAE',
    seniority: 'Mid',
    employmentType: 'Full-time',
    status: 'Open',
    openings: 1,
    postedAt: dateOffset(-40),
    hiringManagerId: 'emp-003',
    recruiterId: 'emp-008',
    minExperience: 3,
    salaryRange: 'AED 14,000 – 18,000 / month',
    summary: 'Keep corporate systems, endpoints and directory services healthy and secure.',
    responsibilities: ['Manage directory services', 'Automate endpoint provisioning', 'Own patch compliance'],
    mandatorySkills: ['Linux', 'Identity & Access Management'],
    preferredSkills: ['Azure', 'Docker'],
    education: "Bachelor's degree or equivalent experience",
    evaluationCriteria: [
      { criterion: 'Technical skills match', weight: 45 },
      { criterion: 'Relevant experience', weight: 30 },
      { criterion: 'Location & availability', weight: 25 },
    ],
    priority: 'Medium',
    createdBy: 'Human',
  },
  {
    id: 'job-006',
    jobCode: 'FIN-2026-005',
    title: 'Finance Manager',
    departmentId: 'dep-fin',
    location: 'Dubai, UAE',
    seniority: 'Manager',
    employmentType: 'Full-time',
    status: 'Open',
    openings: 1,
    postedAt: dateOffset(-9),
    hiringManagerId: 'emp-003',
    recruiterId: 'emp-008',
    minExperience: 7,
    salaryRange: 'AED 30,000 – 36,000 / month',
    summary: 'Lead financial planning, reporting and controls for the regional business.',
    responsibilities: ['Own monthly close and IFRS reporting', 'Lead budgeting and forecasting', 'Manage a team of four'],
    mandatorySkills: ['IFRS Reporting', 'FP&A', 'Team Leadership'],
    preferredSkills: ['SQL', 'Project Management'],
    education: "Bachelor's in Finance or Accounting; CA / CPA / ACCA preferred",
    evaluationCriteria: [
      { criterion: 'Technical skills match', weight: 35 },
      { criterion: 'Relevant experience', weight: 35 },
      { criterion: 'Certifications', weight: 20 },
      { criterion: 'Location & availability', weight: 10 },
    ],
    priority: 'High',
    createdBy: 'AI Job Description Agent',
  },
  {
    id: 'job-007',
    jobCode: 'TA-2026-002',
    title: 'Talent Acquisition Specialist',
    departmentId: 'dep-hr',
    location: 'Dubai, UAE',
    seniority: 'Mid',
    employmentType: 'Full-time',
    status: 'Open',
    openings: 1,
    postedAt: dateOffset(-6),
    hiringManagerId: 'emp-008',
    recruiterId: 'emp-008',
    minExperience: 3,
    salaryRange: 'AED 14,000 – 19,000 / month',
    summary: 'Own technical hiring pipelines end to end, working alongside the TalentFlow agent stack.',
    responsibilities: ['Manage requisitions', 'Run structured interviews', 'Improve candidate experience'],
    mandatorySkills: ['Talent Acquisition', 'Stakeholder Management'],
    preferredSkills: ['Project Management'],
    education: "Bachelor's degree in HR, Business or related field",
    evaluationCriteria: [
      { criterion: 'Technical skills match', weight: 35 },
      { criterion: 'Relevant experience', weight: 35 },
      { criterion: 'Location & availability', weight: 30 },
    ],
    priority: 'Medium',
    createdBy: 'AI Job Description Agent',
  },
  {
    id: 'job-008',
    jobCode: 'OPS-2026-006',
    title: 'Operations Manager',
    departmentId: 'dep-ops',
    location: 'Riyadh, KSA',
    seniority: 'Manager',
    employmentType: 'Full-time',
    status: 'Open',
    openings: 1,
    postedAt: dateOffset(-15),
    hiringManagerId: 'emp-003',
    recruiterId: 'emp-008',
    minExperience: 6,
    salaryRange: 'SAR 28,000 – 34,000 / month',
    summary: 'Run regional service operations with a focus on process excellence and SLA performance.',
    responsibilities: ['Own SLA performance', 'Lead process improvement', 'Manage vendor relationships'],
    mandatorySkills: ['Project Management', 'Team Leadership', 'Stakeholder Management'],
    preferredSkills: ['SQL'],
    education: "Bachelor's degree in Business or Engineering",
    evaluationCriteria: [
      { criterion: 'Technical skills match', weight: 30 },
      { criterion: 'Relevant experience', weight: 40 },
      { criterion: 'Location & availability', weight: 30 },
    ],
    priority: 'Medium',
    createdBy: 'Human',
  },
  {
    id: 'job-009',
    jobCode: 'MKT-2026-004',
    title: 'Demand Generation Manager',
    departmentId: 'dep-mkt',
    location: 'Dubai, UAE',
    seniority: 'Manager',
    employmentType: 'Full-time',
    status: 'Open',
    openings: 1,
    postedAt: dateOffset(-21),
    hiringManagerId: 'emp-003',
    recruiterId: 'emp-008',
    minExperience: 5,
    salaryRange: 'AED 22,000 – 27,000 / month',
    summary: 'Build a pipeline engine across paid, content and lifecycle marketing.',
    responsibilities: ['Own pipeline targets', 'Run multi-channel campaigns', 'Report on marketing-sourced revenue'],
    mandatorySkills: ['Demand Generation', 'CRM / Salesforce'],
    preferredSkills: ['SQL', 'Stakeholder Management'],
    education: "Bachelor's degree in Marketing or Business",
    evaluationCriteria: [
      { criterion: 'Technical skills match', weight: 35 },
      { criterion: 'Relevant experience', weight: 35 },
      { criterion: 'Location & availability', weight: 30 },
    ],
    priority: 'Low',
    createdBy: 'Human',
  },
  {
    id: 'job-010',
    jobCode: 'SALES-2026-009',
    title: 'Account Executive',
    departmentId: 'dep-sales',
    location: 'Doha, Qatar',
    seniority: 'Mid',
    employmentType: 'Full-time',
    status: 'Open',
    openings: 2,
    postedAt: dateOffset(-13),
    hiringManagerId: 'emp-003',
    recruiterId: 'emp-008',
    minExperience: 3,
    salaryRange: 'QAR 18,000 – 24,000 / month',
    summary: 'Own new-business acquisition in the Qatar enterprise segment.',
    responsibilities: ['Own quota', 'Run enterprise sales cycles', 'Maintain accurate CRM hygiene'],
    mandatorySkills: ['CRM / Salesforce', 'Stakeholder Management'],
    preferredSkills: ['Demand Generation'],
    education: "Bachelor's degree",
    evaluationCriteria: [
      { criterion: 'Technical skills match', weight: 30 },
      { criterion: 'Relevant experience', weight: 40 },
      { criterion: 'Location & availability', weight: 30 },
    ],
    priority: 'Medium',
    createdBy: 'Human',
  },
];

/* ------------------------------ Candidates ---------------------------- */
const certPool = [
  'CKA – Certified Kubernetes Administrator',
  'CKS – Certified Kubernetes Security Specialist',
  'AWS Solutions Architect – Associate',
  'AWS Solutions Architect – Professional',
  'AWS DevOps Engineer – Professional',
  'HashiCorp Terraform Associate',
  'Azure Administrator Associate',
  'Google Professional Cloud Architect',
  'CISSP',
  'PMP',
  'ACCA',
  'Salesforce Administrator',
];
const companies = ['Emaar Digital', 'Careem', 'Majid Al Futtaim', 'Etisalat Digital', 'Noon', 'Chalhoub Group', 'Kearney Middle East', 'du', 'Aramex', 'Tabby', 'Property Finder', 'Bayut'];

function craftedCandidates(): Candidate[] {
  return [
    {
      id: 'cand-001',
      name: 'Rohan Verma',
      email: 'rohan.verma@example.com',
      phone: '+971 5X XXX 4412',
      jobId: 'job-001',
      stage: 'Shortlisted',
      appliedAt: dateOffset(-14),
      experienceYears: 7,
      currentTitle: 'Lead Platform Engineer',
      currentCompany: 'Careem',
      location: 'Dubai, UAE',
      noticePeriodDays: 30,
      expectedSalary: 'AED 32,000 / month',
      education: 'B.Tech Computer Science, NIT Trichy',
      certifications: ['CKA – Certified Kubernetes Administrator', 'AWS Solutions Architect – Professional'],
      skills: [
        { skillId: 'sk-k8s', level: 'Expert', years: 5 },
        { skillId: 'sk-aws', level: 'Expert', years: 7 },
        { skillId: 'sk-terraform', level: 'Advanced', years: 4 },
        { skillId: 'sk-cicd', level: 'Expert', years: 6 },
        { skillId: 'sk-linux', level: 'Expert', years: 7 },
        { skillId: 'sk-observability', level: 'Advanced', years: 3 },
        { skillId: 'sk-python', level: 'Advanced', years: 5 },
      ],
      resumeSummary:
        'Platform engineering lead running 40+ production Kubernetes services on AWS. Built an internal developer platform with Terraform modules and Argo-based progressive delivery, cutting deployment lead time from 3 days to 40 minutes. Owns SLOs and on-call for a 25-engineer org.',
      source: 'LinkedIn',
      consentGiven: true,
    },
    {
      id: 'cand-002',
      name: 'Elena Costa',
      email: 'elena.costa@example.com',
      phone: '+971 5X XXX 9087',
      jobId: 'job-001',
      stage: 'Shortlisted',
      appliedAt: dateOffset(-12),
      experienceYears: 6,
      currentTitle: 'Senior DevOps Engineer',
      currentCompany: 'Majid Al Futtaim',
      location: 'Dubai, UAE',
      noticePeriodDays: 60,
      expectedSalary: 'AED 30,000 / month',
      education: 'MSc Software Engineering, Politecnico di Milano',
      certifications: ['AWS Solutions Architect – Associate', 'HashiCorp Terraform Associate'],
      skills: [
        { skillId: 'sk-k8s', level: 'Advanced', years: 4 },
        { skillId: 'sk-aws', level: 'Advanced', years: 5 },
        { skillId: 'sk-terraform', level: 'Advanced', years: 4 },
        { skillId: 'sk-cicd', level: 'Advanced', years: 6 },
        { skillId: 'sk-linux', level: 'Advanced', years: 6 },
        { skillId: 'sk-docker', level: 'Expert', years: 6 },
      ],
      resumeSummary:
        'Senior DevOps engineer for a retail group operating 200+ microservices. Migrated legacy VM workloads to EKS, standardised CI/CD on GitHub Actions, and introduced Terraform state governance across 12 accounts.',
      source: 'Careers Page',
      consentGiven: true,
    },
    {
      id: 'cand-003',
      name: 'Bilal Saeed',
      email: 'bilal.saeed@example.com',
      phone: '+971 5X XXX 3311',
      jobId: 'job-001',
      stage: 'Screened',
      appliedAt: dateOffset(-10),
      experienceYears: 5,
      currentTitle: 'DevOps Engineer',
      currentCompany: 'du',
      location: 'Dubai, UAE',
      noticePeriodDays: 30,
      expectedSalary: 'AED 26,000 / month',
      education: 'BSc Computer Engineering, American University of Sharjah',
      certifications: ['Azure Administrator Associate'],
      skills: [
        { skillId: 'sk-k8s', level: 'Intermediate', years: 3 },
        { skillId: 'sk-aws', level: 'Advanced', years: 4 },
        { skillId: 'sk-azure', level: 'Advanced', years: 4 },
        { skillId: 'sk-terraform', level: 'Beginner', years: 1 },
        { skillId: 'sk-cicd', level: 'Advanced', years: 5 },
        { skillId: 'sk-linux', level: 'Advanced', years: 5 },
      ],
      resumeSummary:
        'DevOps engineer in a telecom environment. Strong CI/CD and Azure background, growing Kubernetes exposure through a container migration programme. Automated release pipelines for 30 internal applications.',
      source: 'Referral',
      consentGiven: true,
    },
    {
      id: 'cand-004',
      name: 'Grace Adeyemi',
      email: 'grace.adeyemi@example.com',
      phone: '+971 5X XXX 7754',
      jobId: 'job-001',
      stage: 'Interviewing',
      appliedAt: dateOffset(-16),
      experienceYears: 8,
      currentTitle: 'SRE Manager',
      currentCompany: 'Noon',
      location: 'Dubai, UAE',
      noticePeriodDays: 45,
      expectedSalary: 'AED 34,000 / month',
      education: 'BSc Computer Science, University of Lagos',
      certifications: ['CKA – Certified Kubernetes Administrator', 'CKS – Certified Kubernetes Security Specialist', 'AWS DevOps Engineer – Professional'],
      skills: [
        { skillId: 'sk-k8s', level: 'Expert', years: 6 },
        { skillId: 'sk-aws', level: 'Expert', years: 8 },
        { skillId: 'sk-terraform', level: 'Expert', years: 5 },
        { skillId: 'sk-cicd', level: 'Advanced', years: 7 },
        { skillId: 'sk-linux', level: 'Expert', years: 8 },
        { skillId: 'sk-k8ssec', level: 'Advanced', years: 3 },
        { skillId: 'sk-sre', level: 'Expert', years: 5 },
        { skillId: 'sk-finops', level: 'Intermediate', years: 2 },
      ],
      resumeSummary:
        'SRE manager for a high-traffic e-commerce platform (peak 1.2M req/min). Led multi-region EKS architecture, error-budget policy adoption and a FinOps programme that cut cloud spend 22%. Managed a team of seven.',
      source: 'Agency',
      consentGiven: true,
    },
    {
      id: 'cand-005',
      name: 'Tomas Novak',
      email: 'tomas.novak@example.com',
      phone: '+420 XXX XXX 221',
      jobId: 'job-001',
      stage: 'Applied',
      appliedAt: dateOffset(-4),
      experienceYears: 4,
      currentTitle: 'Cloud Engineer',
      currentCompany: 'Property Finder',
      location: 'Prague, Czechia',
      noticePeriodDays: 90,
      expectedSalary: 'AED 24,000 / month',
      education: 'BSc Informatics, Charles University',
      certifications: ['HashiCorp Terraform Associate'],
      skills: [
        { skillId: 'sk-aws', level: 'Advanced', years: 4 },
        { skillId: 'sk-terraform', level: 'Advanced', years: 3 },
        { skillId: 'sk-cicd', level: 'Intermediate', years: 3 },
        { skillId: 'sk-linux', level: 'Advanced', years: 4 },
        { skillId: 'sk-docker', level: 'Advanced', years: 4 },
      ],
      resumeSummary:
        'Cloud engineer focused on AWS infrastructure-as-code. Strong Terraform practice, limited production Kubernetes ownership so far. Currently based outside the UAE and would require relocation.',
      source: 'Careers Page',
      consentGiven: true,
    },
  ];
}

function buildCandidates(): Candidate[] {
  const out = craftedCandidates();
  const stages: Candidate['stage'][] = ['Applied', 'Applied', 'Applied', 'Screened', 'Screened', 'Shortlisted', 'Interviewing', 'Offered', 'Hired', 'Rejected'];
  const sources: Candidate['source'][] = ['Careers Page', 'LinkedIn', 'Referral', 'Agency', 'Talent Pool'];
  for (let i = out.length; i < 50; i++) {
    const job = jobs[i % jobs.length];
    const first = firstNames[(i * 3 + 5) % firstNames.length];
    const last = lastNames[(i * 5 + 2) % lastNames.length];
    const pool = deptSkillPool[job.departmentId];
    const exp = int(Math.max(1, job.minExperience - 2), job.minExperience + 5);
    out.push({
      id: `cand-${String(i + 1).padStart(3, '0')}`,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.split(' ').join('').toLowerCase()}@example.com`,
      phone: `+971 5X XXX ${int(1000, 9999)}`,
      jobId: job.id,
      stage: stages[i % stages.length],
      appliedAt: dateOffset(-int(2, 45)),
      experienceYears: exp,
      currentTitle: pick(titlesByDept[job.departmentId]),
      currentCompany: pick(companies),
      location: pick(locations),
      noticePeriodDays: pick([0, 30, 30, 60, 90]),
      expectedSalary: `AED ${int(14, 34)},000 / month`,
      education: pick([
        "Bachelor's in Computer Science",
        "Bachelor's in Business Administration",
        'MSc Information Systems',
        "Bachelor's in Engineering",
        'MBA',
      ]),
      certifications: rnd() > 0.45 ? pickN(certPool, int(1, 2)) : [],
      skills: pickN(pool, Math.min(pool.length, int(3, 6))).map((skillId) => ({
        skillId,
        level: pick(skillLevels),
        years: int(1, Math.max(2, exp)),
      })),
      resumeSummary: `${exp} years of experience in ${deptName(job.departmentId).toLowerCase()} roles, most recently as ${pick(titlesByDept[job.departmentId])}. Delivered measurable improvements in process efficiency and stakeholder outcomes.`,
      source: sources[i % sources.length],
      consentGiven: true,
    });
  }
  return out;
}
export const candidates: Candidate[] = buildCandidates();

/* ------------------------------ Interviews ---------------------------- */
function buildInterviews(): Interview[] {
  const out: Interview[] = [];
  const rounds = ['Technical Screen', 'System Design', 'Hiring Manager', 'Culture & Values', 'Final Panel'];
  const modes: Interview['mode'][] = ['Google Meet', 'Microsoft Teams', 'Onsite', 'Phone'];
  const interviewers = ['emp-003', 'emp-002', 'emp-001', 'emp-008', 'emp-004'];
  const pooled = candidates.filter((c) => ['Shortlisted', 'Interviewing', 'Offered', 'Hired'].includes(c.stage));
  for (let i = 0; i < 20; i++) {
    const c = pooled[i % pooled.length];
    const day = i < 8 ? int(-14, -1) : int(0, 12);
    out.push({
      id: `int-${String(i + 1).padStart(3, '0')}`,
      candidateId: c.id,
      jobId: c.jobId,
      interviewerId: interviewers[i % interviewers.length],
      round: rounds[i % rounds.length],
      scheduledAt: isoOffset(day, int(9, 17)),
      durationMins: pick([45, 60, 60, 90]),
      mode: modes[i % modes.length],
      status: day < 0 ? (i % 3 === 0 ? 'Awaiting Feedback' : 'Completed') : 'Scheduled',
    });
  }
  out[0] = {
    ...out[0],
    id: 'int-001',
    candidateId: 'cand-004',
    jobId: 'job-001',
    interviewerId: 'emp-002',
    round: 'Technical Screen',
    scheduledAt: isoOffset(-3, 11),
    status: 'Completed',
    mode: 'Google Meet',
    feedback: {
      ratings: { technical: 9, problemSolving: 9, communication: 8, leadership: 8 },
      notes:
        'Walked through a multi-region EKS failure scenario end to end. Diagnosed control-plane vs data-plane impact quickly and explained error-budget trade-offs clearly.',
      technicalFeedback:
        'Deep Kubernetes internals knowledge — described how she would triage rising pod restarts via events, kubelet logs, OOMKill signals and readiness probe configuration before touching the deployment.',
      behavioralFeedback:
        'Collaborative, structured communicator. Gave concrete examples of coaching engineers through incident reviews without blame.',
      submittedBy: 'Omar Khan',
      submittedAt: isoOffset(-3, 13),
      aiSummary:
        'Very strong platform and reliability depth with proven multi-region Kubernetes ownership. Communicates trade-offs crisply and has genuine leadership experience. Cost-optimisation background is a bonus for the FinOps objective on this team.',
      recommendation: 'Strong Hire',
      reasoning:
        'Technical 9/10 and problem solving 9/10 are both above the role bar of 7. All five mandatory skills evidenced with production examples. The only development area (deeper Terraform module design at org scale) is coachable inside the first quarter.',
    },
  };
  return out;
}
export const interviews: Interview[] = buildInterviews();

/* -------------------------------- Offers ------------------------------ */
export const offers: Offer[] = [
  {
    id: 'off-001',
    candidateId: 'cand-004',
    jobId: 'job-001',
    status: 'Pending Approval',
    baseSalary: 'AED 33,000 / month',
    joiningDate: dateOffset(46),
    createdAt: isoOffset(-1, 15),
    letterDraft: '',
  },
];

/* ------------------------------ Onboarding ---------------------------- */
const onboardingPeople = [
  { name: 'Hana Park', title: 'Software Engineer', dept: 'Engineering' },
  { name: 'Yusuf Adnan', title: 'Financial Analyst', dept: 'Finance' },
  { name: 'Clara Dubois', title: 'Customer Success Manager', dept: 'Customer Success' },
  { name: 'Ravi Reddy', title: 'Network Engineer', dept: 'IT' },
  { name: 'Sana Aziz', title: 'Marketing Executive', dept: 'Marketing' },
];
const onboardingTemplate: { task: string; owner: string; category: OnboardingTask['category']; day: number }[] = [
  { task: 'Collect signed offer & contract', owner: 'HR Operations', category: 'Documentation', day: -7 },
  { task: 'Collect identity and education documents', owner: 'HR Operations', category: 'Documentation', day: -6 },
  { task: 'Certificate & reference verification', owner: 'Compliance', category: 'Compliance', day: -4 },
  { task: 'Create employee ID and HRIS record', owner: 'HR Operations', category: 'HR', day: -3 },
  { task: 'Raise IT access request (SSO, VPN, repos)', owner: 'IT Service Desk', category: 'IT', day: -2 },
  { task: 'Provision laptop and peripherals', owner: 'IT Service Desk', category: 'IT', day: -2 },
  { task: 'Create corporate email account', owner: 'IT Service Desk', category: 'IT', day: -1 },
  { task: 'Day 1 orientation and policy walkthrough', owner: 'HR Business Partner', category: 'HR', day: 1 },
  { task: 'Manager introduction and team welcome', owner: 'Hiring Manager', category: 'Manager', day: 1 },
  { task: 'Assign buddy and 30-day plan', owner: 'Hiring Manager', category: 'Manager', day: 2 },
  { task: 'Mandatory compliance training', owner: 'Learning & Development', category: 'Training', day: 5 },
  { task: '30-day check-in and probation goal setting', owner: 'HR Business Partner', category: 'HR', day: 30 },
];
function buildOnboarding(): OnboardingTask[] {
  const out: OnboardingTask[] = [];
  onboardingPeople.forEach((p, pi) => {
    const startOffset = [-3, 2, 6, 10, 14][pi];
    onboardingTemplate.forEach((t, ti) => {
      const due = startOffset + t.day;
      out.push({
        id: `onb-${pi + 1}-${ti + 1}`,
        employeeName: p.name,
        jobTitle: p.title,
        department: p.dept,
        task: t.task,
        owner: t.owner,
        category: t.category,
        dueDate: dateOffset(due),
        day: t.day,
        status: due < -1 ? 'Completed' : due <= 1 ? (rnd() > 0.4 ? 'In Progress' : 'Completed') : 'Not Started',
      });
    });
  });
  return out;
}
export const onboardingTasks: OnboardingTask[] = buildOnboarding();

/* ------------------------------- Leave -------------------------------- */
function buildLeave(): LeaveRequest[] {
  const types: LeaveRequest['type'][] = ['Annual', 'Annual', 'Sick', 'Casual', 'Annual', 'Parental'];
  const statuses: LeaveRequest['status'][] = ['Pending', 'Approved', 'Approved', 'Rejected', 'Pending', 'Approved'];
  const reasons = ['Family holiday', 'Medical appointment', 'Personal errand', 'Travel abroad', 'Wedding in family', 'Rest and recovery'];
  const out: LeaveRequest[] = [];
  for (let i = 0; i < 10; i++) {
    const emp = employees[i * 3];
    const from = int(1, 40);
    const days = int(1, 7);
    out.push({
      id: `lv-${String(i + 1).padStart(3, '0')}`,
      employeeId: emp.id,
      type: types[i % types.length],
      from: dateOffset(from),
      to: dateOffset(from + days - 1),
      days,
      reason: reasons[i % reasons.length],
      status: statuses[i % statuses.length],
      approverId: emp.managerId ?? 'emp-003',
      createdAt: isoOffset(-int(1, 12), 9),
      conflicts: [],
      balanceAfter: Math.max(0, emp.leaveBalance.annual - days),
    });
  }
  return out;
}
export const leaveRequests: LeaveRequest[] = buildLeave();

/* ---------------------------- Performance ----------------------------- */
export const performanceReviews: PerformanceReview[] = employees.slice(0, 18).map((e, i) => ({
  id: `pr-${String(i + 1).padStart(3, '0')}`,
  employeeId: e.id,
  cycle: 'H1 2026',
  goalsAchieved: int(4, 10),
  goalsTotal: 10,
  rating: e.performanceScore,
  strengths: pickN(
    ['Infrastructure automation', 'Incident resolution', 'Cross-team collaboration', 'Customer empathy', 'Delivery predictability', 'Documentation quality', 'Cost awareness'],
    3,
  ),
  developmentAreas: pickN(['Kubernetes security', 'Leadership', 'Stakeholder communication', 'Data literacy', 'Delegation'], 2),
  suggestedObjectives: [
    'Implement Infrastructure as Code for two remaining legacy services',
    'Reduce deployment lead time by 20%',
    'Complete a role-relevant certification',
  ],
  managerId: e.managerId ?? 'emp-003',
  status: i < 3 ? 'Pending Approval' : 'Draft',
}));

export const employeeGoals: EmployeeGoal[] = employees.slice(0, 24).flatMap((e, i) => [
  {
    id: `goal-${i}-1`,
    employeeId: e.id,
    title: 'Deliver quarterly roadmap commitments',
    progress: int(30, 100),
    due: dateOffset(int(20, 90)),
    status: rnd() > 0.75 ? 'At Risk' : 'On Track',
  },
  {
    id: `goal-${i}-2`,
    employeeId: e.id,
    title: 'Complete role-relevant certification',
    progress: int(0, 90),
    due: dateOffset(int(40, 140)),
    status: rnd() > 0.85 ? 'At Risk' : 'On Track',
  },
]);

/* ------------------------------ Learning ------------------------------ */
export const trainingCourses: TrainingCourse[] = [
  { id: 'trn-01', title: 'Terraform: Infrastructure as Code at Scale', provider: 'HashiCorp Learn', skillIds: ['sk-terraform'], hours: 18, level: 'Advanced', format: 'Course', completionRate: 71 },
  { id: 'trn-02', title: 'Certified Kubernetes Security Specialist (CKS) Prep', provider: 'Linux Foundation', skillIds: ['sk-k8ssec', 'sk-k8s'], hours: 30, level: 'Advanced', format: 'Certification', completionRate: 48 },
  { id: 'trn-03', title: 'Cloud FinOps Practitioner', provider: 'FinOps Foundation', skillIds: ['sk-finops'], hours: 12, level: 'Intermediate', format: 'Certification', completionRate: 63 },
  { id: 'trn-04', title: 'AWS Solutions Architect – Associate', provider: 'AWS Skill Builder', skillIds: ['sk-aws'], hours: 40, level: 'Intermediate', format: 'Certification', completionRate: 77 },
  { id: 'trn-05', title: 'Production Observability with OpenTelemetry', provider: 'Internal Academy', skillIds: ['sk-observability'], hours: 10, level: 'Intermediate', format: 'Lab', completionRate: 55 },
  { id: 'trn-06', title: 'Leading Technical Teams', provider: 'Internal Academy', skillIds: ['sk-leadership', 'sk-mentoring'], hours: 16, level: 'Intermediate', format: 'Mentoring', completionRate: 82 },
  { id: 'trn-07', title: 'Platform Reliability Rotation', provider: 'Internal Academy', skillIds: ['sk-sre', 'sk-k8s'], hours: 60, level: 'Advanced', format: 'Internal Project', completionRate: 39 },
  { id: 'trn-08', title: 'IFRS Update Workshop 2026', provider: 'PwC Academy', skillIds: ['sk-ifrs'], hours: 8, level: 'Advanced', format: 'Course', completionRate: 90 },
  { id: 'trn-09', title: 'Data Storytelling for Business Teams', provider: 'Internal Academy', skillIds: ['sk-sql'], hours: 9, level: 'Beginner', format: 'Course', completionRate: 68 },
  { id: 'trn-10', title: 'Structured Interviewing & Bias Awareness', provider: 'Internal Academy', skillIds: ['sk-talentacq'], hours: 6, level: 'Intermediate', format: 'Course', completionRate: 86 },
];

/* ------------------------------ Policies ------------------------------ */
export const policies: Policy[] = [
  {
    id: 'pol-annual-leave',
    title: 'Annual Leave Policy',
    category: 'Leave',
    version: 'v4.2',
    updated: dateOffset(-120),
    tags: ['annual leave', 'vacation', 'holiday', 'leave balance', 'carry forward', 'days'],
    content: `Full-time employees accrue 25 working days of annual leave per calendar year, accrued monthly at 2.08 days per completed month of service.
Leave must be requested through the HR system at least 5 working days in advance, except in emergencies.
Approval sits with the direct line manager. Requests overlapping with more than 30% of the team already on leave may be declined for coverage reasons.
Up to 10 unused days may be carried forward into the following year and must be consumed by 31 March.
Employees serving notice may not carry leave forward; any balance is settled in the final payroll.
Public holidays announced by the UAE authorities are additional to annual leave.`,
  },
  {
    id: 'pol-sick-leave',
    title: 'Sick Leave Policy',
    category: 'Leave',
    version: 'v3.0',
    updated: dateOffset(-200),
    tags: ['sick leave', 'medical', 'illness', 'doctor', 'certificate'],
    content: `Employees are entitled to 15 days of paid sick leave per year after completing probation.
A medical certificate from a licensed practitioner is required for any absence of more than 2 consecutive days.
Sick leave must be reported to the line manager and logged in the HR system on the first day of absence.
Extended medical leave beyond the paid entitlement is handled case by case with HR and follows applicable labour law.`,
  },
  {
    id: 'pol-parental-leave',
    title: 'Parental Leave Policy',
    category: 'Leave',
    version: 'v2.1',
    updated: dateOffset(-95),
    tags: ['maternity', 'paternity', 'parental leave', 'newborn', 'adoption'],
    content: `Maternity leave: 60 calendar days — 45 days at full pay followed by 15 days at half pay — available from the expected date of delivery.
Paternity leave: 5 working days of paid parental leave, to be taken within 6 months of the birth or adoption.
Adoption is treated equivalently to birth for the purposes of this policy.
On return, an employee is entitled to nursing breaks of one hour per day for six months and may request a phased return over four weeks.
Notification should be given to HR at least 30 days before the intended start of leave where practicable.`,
  },
  {
    id: 'pol-remote-work',
    title: 'Remote & Hybrid Work Policy',
    category: 'Ways of Working',
    version: 'v5.0',
    updated: dateOffset(-40),
    tags: ['work from home', 'wfh', 'remote', 'hybrid', 'flexible'],
    content: `Eligible employees may work remotely up to 2 days per week, agreed with their line manager and recorded in the HR system.
Requests are submitted through Leave & Requests > Work From Home, at least 24 hours in advance except in emergencies.
Roles requiring physical presence (IT service desk, facilities, front office) are excluded and listed in Annex A.
Employees working remotely must be reachable during core hours 10:00–16:00 Gulf Standard Time and must use company-managed devices on the corporate VPN.
Requests to work from outside the country of employment require HR and Tax approval and are limited to 20 working days per year.`,
  },
  {
    id: 'pol-probation',
    title: 'Probation Policy',
    category: 'Employment',
    version: 'v2.4',
    updated: dateOffset(-260),
    tags: ['probation', 'confirmation', 'new joiner', 'six months'],
    content: `The standard probation period is 6 months from the date of joining.
A structured 30-day, 60-day and 90-day check-in is conducted by the line manager and recorded in the HR system.
Confirmation requires a manager recommendation and HR approval; the outcome is communicated in writing before the probation end date.
Probation may be extended once, by up to 3 months, with a documented improvement plan.
During probation, notice is 14 calendar days on either side.`,
  },
  {
    id: 'pol-insurance',
    title: 'Medical Insurance & Benefits',
    category: 'Benefits',
    version: 'v3.3',
    updated: dateOffset(-70),
    tags: ['insurance', 'medical', 'dependants', 'benefits', 'documents', 'enrolment'],
    content: `All employees are enrolled in the corporate medical scheme from their date of joining.
To enrol dependants, submit: passport copy, residence visa copy, Emirates ID copy, marriage certificate (for spouse) or birth certificate (for children), and a completed enrolment form.
Dependant enrolment must be requested within 30 days of joining or within 30 days of a qualifying life event.
Annual open enrolment runs each November for the following plan year.
Claims and card replacement are handled through the insurer's portal; HR Operations can assist with escalations.`,
  },
  {
    id: 'pol-performance',
    title: 'Performance Management Policy',
    category: 'Performance',
    version: 'v4.0',
    updated: dateOffset(-55),
    tags: ['performance', 'review', 'rating', 'goals', 'appraisal', 'calibration'],
    content: `Performance is managed on a half-yearly cycle (H1 review in July, H2 review in January) with continuous check-ins in between.
Every employee maintains 3–6 goals in the HR system, agreed with their manager at the start of the cycle.
Ratings run from 1 (Below Expectations) to 5 (Outstanding) and are calibrated at department level before release.
AI-generated performance summaries are decision support only; the rating is set by the manager and approved by HR.
Employees may add a written response to any review before it is finalised.`,
  },
  {
    id: 'pol-learning',
    title: 'Learning & Development Policy',
    category: 'Learning',
    version: 'v2.0',
    updated: dateOffset(-150),
    tags: ['training', 'learning', 'certification', 'course', 'development', 'sponsorship'],
    content: `Each employee has an annual learning entitlement of 40 hours and a sponsorship budget for one role-relevant certification per year.
Certification sponsorship requires manager approval and a commitment to remain for 12 months after completion.
Internal Academy courses do not consume the sponsorship budget.
Skill profiles are maintained in the HR system and reviewed each performance cycle.`,
  },
  {
    id: 'pol-code-conduct',
    title: 'Code of Conduct',
    category: 'Compliance',
    version: 'v6.1',
    updated: dateOffset(-30),
    tags: ['conduct', 'ethics', 'grievance', 'harassment', 'compliance'],
    content: `All employees are expected to act with integrity, respect and fairness.
Discrimination or harassment on any protected ground is prohibited and will be investigated under the Grievance Procedure.
Conflicts of interest must be declared to HR and the employee's line manager.
Concerns can be raised confidentially through the Speak Up channel without fear of retaliation.`,
  },
  {
    id: 'pol-data-privacy',
    title: 'Employee Data Privacy & AI Use',
    category: 'Compliance',
    version: 'v1.4',
    updated: dateOffset(-12),
    tags: ['privacy', 'data', 'ai', 'consent', 'gdpr', 'automation'],
    content: `Employee and candidate personal data is processed on the lawful bases of contract, legitimate interest and consent, and is retained per the Retention Schedule (candidate data: 12 months unless consent is renewed).
AI agents in the HR platform operate on the minimum data required for the task and never use gender, race, religion, nationality, disability, marital status, or age (unless legally required) as scoring inputs.
No employment decision — shortlisting, rejection, hiring, promotion, rating or termination — is made autonomously by an AI agent. Every such action requires a named human approver and is written to the audit log.
Candidates and employees may request an explanation of any AI-assisted recommendation affecting them, and may request human review.
All AI processing is logged with the model used, inputs referenced, and the approver of record.`,
  },
  {
    id: 'pol-offboarding',
    title: 'Resignation & Offboarding Policy',
    category: 'Employment',
    version: 'v3.1',
    updated: dateOffset(-88),
    tags: ['resignation', 'notice period', 'exit', 'offboarding', 'final settlement', 'clearance'],
    content: `The standard notice period after confirmation is 30 calendar days for individual contributors and 60 days for managers and above.
On receipt of a resignation, HR initiates the offboarding checklist: exit interview, asset return, access revocation, knowledge transfer, payroll notification and final settlement.
Final settlement, including end-of-service benefits and unused leave encashment, is processed within 14 days of the last working day.
System access is revoked at 18:00 on the last working day. Knowledge transfer must be signed off by the line manager before clearance.`,
  },
  {
    id: 'pol-expenses',
    title: 'Business Travel & Expenses',
    category: 'Finance',
    version: 'v4.5',
    updated: dateOffset(-165),
    tags: ['expenses', 'travel', 'reimbursement', 'per diem', 'claim'],
    content: `Business travel requires prior manager approval and must be booked through the corporate travel desk.
Expense claims are submitted within 30 days of expenditure with itemised receipts.
Per diem rates by destination are published in Annex B and are updated each January.
Reimbursement is paid with the next payroll cycle after approval.`,
  },
];

/* ------------------------- Employee feedback -------------------------- */
function buildFeedback(): EmployeeFeedback[] {
  const themes: EmployeeFeedback['theme'][] = ['Workload', 'Leadership', 'Compensation', 'Collaboration', 'Career Growth', 'Work-Life Balance', 'Tools & Environment'];
  const commentBank: Record<string, string[]> = {
    Workload: ['Sprint scope keeps growing after planning.', 'On-call load is heavy in a small rotation.', 'Workload is manageable since the team grew.'],
    Leadership: ['Direction from leadership is clearer this quarter.', 'Decisions take a long time to reach the team.', 'My manager gives useful, specific feedback.'],
    Compensation: ['Salary bands are not transparent.', 'Benefits package is competitive for the region.', 'Bonus criteria could be clearer.'],
    Collaboration: ['Cross-team handovers are slow.', 'Great support from platform team.', 'Documentation makes onboarding easier now.'],
    'Career Growth': ['Unclear what the next step looks like.', 'Internal mobility worked well for me.', 'Would like more exposure to architecture work.'],
    'Work-Life Balance': ['Hybrid policy works well.', 'Late releases affect weekends.', 'Flexible hours help a lot.'],
    'Tools & Environment': ['Build times slow us down.', 'New laptops made a real difference.', 'Access requests take too long.'],
  };
  const out: EmployeeFeedback[] = [];
  const quarters = ['Q4 2025', 'Q1 2026', 'Q2 2026', 'Q3 2026'];
  let n = 0;
  quarters.forEach((q) => {
    departments.forEach((d) => {
      themes.forEach((t) => {
        if (rnd() > 0.45) {
          const comments = commentBank[t];
          out.push({
            id: `fb-${++n}`,
            departmentId: d.id,
            theme: t,
            sentiment: Math.round((rnd() * 1.7 - 0.75) * 100) / 100,
            quarter: q,
            comment: pick(comments),
          });
        }
      });
    });
  });
  return out;
}
export const employeeFeedback: EmployeeFeedback[] = buildFeedback();

/* ----------------------------- Offboarding ---------------------------- */
export const offboardingCases: OffboardingCase[] = employees
  .filter((e) => e.status === 'Notice Period')
  .map((e, i) => {
    const tasks = [
      { task: 'Exit interview', owner: 'HR Business Partner' },
      { task: 'Asset return (laptop, access card, phone)', owner: 'IT Service Desk' },
      { task: 'Access revocation (SSO, VPN, repositories)', owner: 'IT Security' },
      { task: 'Knowledge transfer sign-off', owner: 'Line Manager' },
      { task: 'Payroll & final settlement notification', owner: 'Payroll' },
      { task: 'Experience certificate & HR documents', owner: 'HR Operations' },
      { task: 'Account deactivation', owner: 'IT Service Desk' },
    ].map((t, ti) => ({ ...t, status: (ti < 3 + i ? 'Completed' : 'Pending') as 'Pending' | 'Completed' }));
    return {
      id: `off-${i + 1}`,
      employeeId: e.id,
      lastDay: dateOffset(int(5, 30)),
      reason: (['Resignation', 'End of Contract', 'Relocation'] as const)[i % 3],
      tasks,
      exitInterviewDone: tasks[0].status === 'Completed',
      completion: Math.round((tasks.filter((t) => t.status === 'Completed').length / tasks.length) * 100),
    };
  });

/* ------------------------------ Audit log ----------------------------- */
export const seedAuditLogs: AuditLog[] = [
  { id: 'aud-1', at: isoOffset(-1, 9), actor: 'AI Screening Agent', actorRole: 'AI Agent', action: 'SCREENING_COMPLETED', entity: 'Candidate', entityId: 'cand-004', detail: 'Generated match score 94% for job-001 using approved evaluation criteria. Protected attributes excluded.', severity: 'info', ip: '10.0.0.12' },
  { id: 'aud-2', at: isoOffset(-1, 10), actor: 'Layla Haddad', actorRole: 'HR_ADMIN', action: 'SHORTLIST_APPROVED', entity: 'Candidate', entityId: 'cand-004', detail: 'Approved AI shortlist recommendation with note: proceed to hiring manager round.', severity: 'info', ip: '10.0.0.31' },
  { id: 'aud-3', at: isoOffset(-2, 14), actor: 'AI Job Description Agent', actorRole: 'AI Agent', action: 'JD_GENERATED', entity: 'Job', entityId: 'job-001', detail: 'Draft job description generated from workforce plan; sent for human approval.', severity: 'info', ip: '10.0.0.12' },
  { id: 'aud-4', at: isoOffset(-2, 15), actor: 'Priya Nair', actorRole: 'HIRING_MANAGER', action: 'JOB_PUBLISHED', entity: 'Job', entityId: 'job-001', detail: 'Approved and published job requisition after editing two responsibilities.', severity: 'info', ip: '10.0.0.44' },
  { id: 'aud-5', at: isoOffset(-3, 11), actor: 'System', actorRole: 'System', action: 'RBAC_DENY', entity: 'Route', entityId: '/audit', detail: 'Role EMPLOYEE denied access to audit logs.', severity: 'warning', ip: '10.0.0.77' },
  { id: 'aud-6', at: isoOffset(-4, 16), actor: 'AI Retention Risk Agent', actorRole: 'AI Agent', action: 'RISK_ASSESSED', entity: 'Employee', entityId: 'emp-004', detail: 'Retention risk assessed as High. Explainable factors returned; no employment action recommended.', severity: 'warning', ip: '10.0.0.12' },
  { id: 'aud-7', at: isoOffset(-5, 12), actor: 'Samir Yusuf', actorRole: 'RECRUITER', action: 'CANDIDATE_EXPORTED', entity: 'Candidate', entityId: 'cand-001', detail: 'Exported candidate profile PDF for hiring manager review.', severity: 'info', ip: '10.0.0.55' },
  { id: 'aud-8', at: isoOffset(-6, 10), actor: 'AI HR Helpdesk Agent', actorRole: 'AI Agent', action: 'POLICY_ANSWERED', entity: 'Policy', entityId: 'pol-annual-leave', detail: 'Answered employee query with citation to Annual Leave Policy v4.2.', severity: 'info', ip: '10.0.0.12' },
];

/* --------------------------- Approval queue --------------------------- */
export const seedApprovals: ApprovalRequest[] = [
  {
    id: 'apr-001',
    type: 'Offer Creation',
    title: 'Offer for Grace Adeyemi — Senior DevOps Engineer',
    summary: 'Offer & Onboarding Agent drafted an offer at AED 33,000/month with a joining date 46 days out.',
    requestedBy: 'AI Offer & Onboarding Agent',
    requestedAt: isoOffset(-1, 15),
    requiredRole: ['HR_ADMIN', 'HIRING_MANAGER'],
    status: 'Pending',
    payload: { candidateId: 'cand-004', jobId: 'job-001', offerId: 'off-001' },
    aiRecommendation: 'Proceed with offer',
    explanation: [
      'Interview panel recommendation: Strong Hire (technical 9/10, problem solving 9/10)',
      'Screening match 94% against the approved evaluation criteria for job-001',
      'Proposed base sits at the 78th percentile of the approved band AED 28,000–34,000',
      'Notice period 45 days aligns with the requested Q4 start',
    ],
  },
  {
    id: 'apr-002',
    type: 'Candidate Shortlist',
    title: 'Shortlist 3 candidates — Cloud Engineer (Abu Dhabi)',
    summary: 'Screening Agent recommends advancing 3 of 11 screened candidates to the technical round.',
    requestedBy: 'AI Resume Screening Agent',
    requestedAt: isoOffset(-1, 9),
    requiredRole: ['HR_ADMIN', 'RECRUITER'],
    status: 'Pending',
    payload: { jobId: 'job-003' },
    aiRecommendation: 'Advance 3 candidates',
    explanation: [
      'All three exceed the 3-year minimum experience requirement',
      'Each evidences AWS + Terraform + CI/CD, the three mandatory skills',
      'No candidate was scored on any protected attribute',
      'Two candidates require relocation — flagged for recruiter confirmation, not auto-rejected',
    ],
  },
  {
    id: 'apr-003',
    type: 'Performance Rating',
    title: 'H1 2026 rating — Daniel Whitfield',
    summary: 'Performance Agent produced a draft summary and suggested rating of 3.4 for manager review.',
    requestedBy: 'AI Performance Management Agent',
    requestedAt: isoOffset(-2, 11),
    requiredRole: ['HR_ADMIN', 'HIRING_MANAGER'],
    status: 'Pending',
    payload: { employeeId: 'emp-004' },
    aiRecommendation: 'Draft rating 3.4 — manager decision required',
    explanation: [
      '6 of 10 goals achieved in the cycle',
      'Strong delivery on container migration; two objectives slipped due to on-call load (workload index 94)',
      'Training completion at 34% against a 70% target',
      'Rating is advisory only — the manager sets the final rating under Performance Policy v4.0',
    ],
  },
];
