// TalentFlow AI — domain model
// Every entity below maps 1:1 to a table in the production schema (see docs/SCHEMA.md).

export type Role = 'HR_ADMIN' | 'RECRUITER' | 'HIRING_MANAGER' | 'EMPLOYEE';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  employeeId?: string;
  avatarColor: string;
}

export interface Department {
  id: string;
  name: string;
  headcount: number;
  openRoles: number;
  managerId?: string;
  attritionRate: number;
  engagementScore: number;
}

export type EmploymentStatus = 'Active' | 'Onboarding' | 'Notice Period' | 'Exited';

export interface Employee {
  id: string;
  name: string;
  email: string;
  title: string;
  departmentId: string;
  managerId?: string;
  location: string;
  joinDate: string;
  status: EmploymentStatus;
  level: 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Manager' | 'Director';
  leaveBalance: { annual: number; sick: number; casual: number };
  probationEnd?: string;
  performanceScore: number; // 1-5
  engagementScore: number; // 0-100
  trainingCompletion: number; // 0-100
  tenureMonths: number;
  internalMobility: number; // count of internal role changes
  workloadIndex: number; // 0-100, derived from logged project allocation
  skills: { skillId: string; level: SkillLevel }[];
  employmentType: 'Full-time' | 'Contract' | 'Part-time';
}

export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
export const SKILL_LEVEL_VALUE: Record<SkillLevel, number> = {
  Beginner: 1,
  Intermediate: 2,
  Advanced: 3,
  Expert: 4,
};

export interface Skill {
  id: string;
  name: string;
  category: 'Cloud' | 'DevOps' | 'Security' | 'Data' | 'Engineering' | 'Business' | 'Leadership' | 'Finance' | 'People';
}

export type JobStatus = 'Draft' | 'Pending Approval' | 'Open' | 'On Hold' | 'Closed';

export interface Job {
  id: string;
  /** Human-facing requisition code used in candidate email subjects, e.g. DEVOPS-2026-004 */
  jobCode: string;
  title: string;
  departmentId: string;
  location: string;
  seniority: string;
  employmentType: string;
  status: JobStatus;
  openings: number;
  postedAt: string;
  hiringManagerId: string;
  recruiterId: string;
  minExperience: number;
  salaryRange: string;
  summary: string;
  responsibilities: string[];
  mandatorySkills: string[];
  preferredSkills: string[];
  education: string;
  evaluationCriteria: { criterion: string; weight: number }[];
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  createdBy: 'AI Job Description Agent' | 'Human';
  approvedBy?: string;
}

export type CandidateStage =
  | 'Applied'
  | 'Screened'
  | 'Shortlisted'
  | 'Interviewing'
  | 'Offered'
  | 'Hired'
  | 'Rejected'
  | 'Withdrawn';

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  jobId: string;
  stage: CandidateStage;
  appliedAt: string;
  experienceYears: number;
  currentTitle: string;
  currentCompany: string;
  location: string;
  noticePeriodDays: number;
  expectedSalary: string;
  education: string;
  certifications: string[];
  skills: { skillId: string; level: SkillLevel; years: number }[];
  resumeSummary: string;
  source: 'Careers Page' | 'LinkedIn' | 'Referral' | 'Agency' | 'Talent Pool';
  screening?: ScreeningResult;
  consentGiven: boolean;
}

export interface ScreeningResult {
  overall: number;
  breakdown: { label: string; score: number; weight: number; evidence: string }[];
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  concerns: string[];
  interviewFocus: string[];
  recommendation: 'Advance' | 'Review' | 'Hold';
  explanation: string;
  generatedBy: string;
  generatedAt: string;
  attributesExcluded: string[];
}

export type InterviewStatus = 'Scheduled' | 'Completed' | 'Cancelled' | 'Awaiting Feedback';

export interface Interview {
  id: string;
  candidateId: string;
  jobId: string;
  interviewerId: string;
  round: string;
  scheduledAt: string;
  durationMins: number;
  mode: 'Google Meet' | 'Microsoft Teams' | 'Onsite' | 'Phone';
  status: InterviewStatus;
  questions?: InterviewQuestion[];
  feedback?: InterviewFeedback;
}

export interface InterviewQuestion {
  category: 'Technical' | 'Scenario' | 'Behavioral' | 'Problem Solving' | 'Leadership' | 'Culture';
  question: string;
  rationale: string;
  lookFor: string[];
}

export interface InterviewFeedback {
  ratings: { technical: number; problemSolving: number; communication: number; leadership: number };
  notes: string;
  technicalFeedback: string;
  behavioralFeedback: string;
  aiSummary?: string;
  recommendation?: 'Strong Hire' | 'Hire' | 'No Decision' | 'No Hire';
  reasoning?: string;
  submittedBy: string;
  submittedAt: string;
}

export type OfferStatus = 'Draft' | 'Pending Approval' | 'Sent' | 'Accepted' | 'Declined';

export interface Offer {
  id: string;
  candidateId: string;
  jobId: string;
  status: OfferStatus;
  baseSalary: string;
  joiningDate: string;
  createdAt: string;
  letterDraft: string;
  approvedBy?: string;
}

export interface OnboardingTask {
  id: string;
  employeeName: string;
  candidateId?: string;
  employeeId?: string;
  jobTitle: string;
  department: string;
  task: string;
  owner: string;
  category: 'Documentation' | 'IT' | 'HR' | 'Manager' | 'Compliance' | 'Training';
  dueDate: string;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Blocked';
  day: number;
}

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: 'Annual' | 'Sick' | 'Casual' | 'Unpaid' | 'Parental';
  from: string;
  to: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  approverId: string;
  createdAt: string;
  conflicts: string[];
  balanceAfter: number;
}

export interface PerformanceReview {
  id: string;
  employeeId: string;
  cycle: string;
  goalsAchieved: number;
  goalsTotal: number;
  rating: number;
  strengths: string[];
  developmentAreas: string[];
  suggestedObjectives: string[];
  managerId: string;
  status: 'Draft' | 'Pending Approval' | 'Finalised';
  aiSummary?: string;
}

export interface EmployeeGoal {
  id: string;
  employeeId: string;
  title: string;
  progress: number;
  due: string;
  status: 'On Track' | 'At Risk' | 'Completed';
}

export interface TrainingCourse {
  id: string;
  title: string;
  provider: string;
  skillIds: string[];
  hours: number;
  level: SkillLevel;
  format: 'Course' | 'Certification' | 'Lab' | 'Mentoring' | 'Internal Project';
  completionRate: number;
}

export interface LearningRecommendation {
  employeeId: string;
  targetRole: string;
  gaps: { skillId: string; current: SkillLevel | 'None'; required: SkillLevel }[];
  roadmap: { phase: string; weeks: string; items: string[] }[];
  courses: string[];
  explanation: string;
}

export interface Policy {
  id: string;
  title: string;
  category: string;
  version: string;
  updated: string;
  content: string;
  tags: string[];
}

export interface EmployeeFeedback {
  id: string;
  departmentId: string;
  theme: 'Workload' | 'Leadership' | 'Compensation' | 'Collaboration' | 'Career Growth' | 'Work-Life Balance' | 'Tools & Environment';
  sentiment: number; // -1..1
  quarter: string;
  comment: string; // anonymised
}

export type AgentStatus = 'Idle' | 'Waiting' | 'Processing' | 'Completed' | 'Needs Approval' | 'Failed';

export interface AgentDefinition {
  id: string;
  name: string;
  shortName: string;
  category: 'Orchestration' | 'Talent Acquisition' | 'Employee Experience' | 'Workforce Intelligence';
  mission: string;
  capabilities: string[];
  inputs: string[];
  outputs: string[];
  requiresApproval: boolean;
  guardrails: string[];
  icon: string;
}

export interface AgentTask {
  id: string;
  runId: string;
  agentId: string;
  label: string;
  status: AgentStatus;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  output?: unknown;
  summary?: string;
  requiresApproval?: boolean;
  approvalId?: string;
}

export interface AgentRun {
  id: string;
  request: string;
  intent: string;
  actor: string;
  createdAt: string;
  status: 'Running' | 'Completed' | 'Awaiting Approval' | 'Failed';
  plan: { agentId: string; label: string }[];
  tasks: AgentTask[];
  reasoning: string;
  engine: 'llm' | 'deterministic';
}

export type ApprovalType =
  | 'Job Publication'
  | 'Candidate Shortlist'
  | 'Candidate Rejection'
  | 'Hiring Decision'
  | 'Offer Creation'
  | 'Performance Rating'
  | 'Promotion Recommendation'
  | 'Leave Request';

export interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  title: string;
  summary: string;
  requestedBy: string;
  requestedAt: string;
  requiredRole: Role[];
  status: 'Pending' | 'Approved' | 'Rejected' | 'Modified' | 'Info Requested';
  payload: Record<string, unknown>;
  aiRecommendation: string;
  explanation: string[];
  decidedBy?: string;
  decidedAt?: string;
  note?: string;
  runId?: string;
}

export interface AuditLog {
  id: string;
  at: string;
  actor: string;
  actorRole: Role | 'AI Agent' | 'System';
  action: string;
  entity: string;
  entityId: string;
  detail: string;
  severity: 'info' | 'warning' | 'critical';
  ip: string;
}

export interface Notification {
  id: string;
  at: string;
  title: string;
  body: string;
  forRole: Role[];
  kind: 'approval' | 'agent' | 'system';
  read: boolean;
}

export interface OffboardingCase {
  id: string;
  employeeId: string;
  lastDay: string;
  reason: 'Resignation' | 'End of Contract' | 'Relocation' | 'Retirement';
  tasks: { task: string; owner: string; status: 'Pending' | 'Completed' }[];
  exitInterviewDone: boolean;
  completion: number;
}

/* ==================================================================== */
/* Zero-Touch Candidate Intake — email client integration               */
/* ==================================================================== */

export type MailProvider = 'microsoft-graph' | 'gmail' | 'imap' | 'demo';

export interface EmailConnection {
  id: string;
  provider: MailProvider;
  displayName: string;
  status: 'Connected' | 'Not configured' | 'Error' | 'Demo mode';
  authMethod: 'OAuth 2.0' | 'App password (IMAP)' | 'Simulated';
  scopes: string[];
  detail: string;
  lastSyncAt?: string;
  envVars: string[];
}

export interface RecruitmentMailbox {
  id: string;
  address: string;
  connectionId: string;
  label: string;
  enabled: boolean;
  autoAcknowledge: boolean;
  receivedCount: number;
}

export type IntakeStatus =
  | 'New'
  | 'Processing'
  | 'Screening Complete'
  | 'Needs Review'
  | 'Shortlisted'
  | 'Needs Assignment'
  | 'Missing CV'
  | 'Duplicate'
  | 'Failed'
  | 'Archived';

export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  extension: string;
  isResume: boolean;
  sha256: string;
  validation: {
    passed: boolean;
    checks: { check: string; passed: boolean; detail: string }[];
    quarantined: boolean;
  };
  /** Extracted plain text. The original binary is never executed, only parsed. */
  extractedText?: string;
}

export interface IncomingEmail {
  id: string;
  mailboxId: string;
  mailboxAddress: string;
  provider: MailProvider;
  messageId: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  body: string;
  receivedAt: string;
  attachments: EmailAttachment[];
  status: IntakeStatus;
  /** Resolved during processing */
  candidateId?: string;
  applicationId?: string;
  jobId?: string;
  jobMatch?: JobMatchResult;
  parsing?: ResumeParsingResult;
  duplicateOf?: string;
  runId?: string;
  failureReason?: string;
  acknowledgementId?: string;
  simulated: boolean;
}

export interface ResumeParsingResult {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  summary: string;
  currentTitle?: string;
  currentEmployer?: string;
  previousEmployers: string[];
  totalExperienceYears: number;
  relevantExperience: string;
  technicalSkills: string[];
  softSkills: string[];
  certifications: string[];
  education: string[];
  projects: string[];
  languages: string[];
  noticePeriodDays?: number;
  expectedSalary?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  confidence: number;
  parsedBy: string;
  parsedAt: string;
  fieldsFound: number;
  fieldsAttempted: number;
}

export interface JobMatchResult {
  primary?: { jobId: string; jobCode: string; title: string; confidence: number; reason: string };
  alternatives: { jobId: string; jobCode: string; title: string; confidence: number; reason: string }[];
  method:
    | 'Job ID in subject'
    | 'Job title in subject'
    | 'Job ID in body'
    | 'Job title in body'
    | 'Skills & experience inference'
    | 'No confident match';
  explanation: string;
  confidentEnough: boolean;
}

export type ApplicationSource =
  | 'Email'
  | 'Career Portal'
  | 'LinkedIn'
  | 'Referral'
  | 'Agency'
  | 'Recruiter'
  | 'Internal Candidate'
  | 'Manual Entry';

export interface JobApplication {
  id: string;
  reference: string;
  candidateId: string;
  jobId?: string;
  source: ApplicationSource;
  sourceDetail?: string;
  emailId?: string;
  stage: CandidateStage | 'Needs Assignment';
  receivedAt: string;
  screening?: ScreeningResult;
  recruiterDecision?: {
    action: 'Shortlist' | 'Hold' | 'Reject' | 'Request More Information' | 'Assign to Different Job';
    by: string;
    at: string;
    note?: string;
  };
}

export interface EmailAcknowledgement {
  id: string;
  emailId: string;
  applicationId: string;
  to: string;
  subject: string;
  body: string;
  sentAt: string;
  delivery: 'Sent' | 'Simulated' | 'Disabled';
}
