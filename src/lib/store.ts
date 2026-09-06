import type {
  AgentRun,
  ApprovalRequest,
  AuditLog,
  Candidate,
  Employee,
  Interview,
  Job,
  LeaveRequest,
  Notification,
  Offer,
  OnboardingTask,
  PerformanceReview,
  Role,
} from './types';
import {
  candidates as seedCandidates,
  employees as seedEmployees,
  interviews as seedInterviews,
  jobs as seedJobs,
  leaveRequests as seedLeave,
  offers as seedOffers,
  onboardingTasks as seedOnboarding,
  performanceReviews as seedReviews,
  seedApprovals,
  seedAuditLogs,
} from './seed';

/**
 * Prototype persistence layer.
 *
 * The production design targets PostgreSQL (see docs/SCHEMA.md); for the
 * hackathon prototype every write goes to a process-local store so judges can
 * exercise the full workflow with zero setup. The interface below is
 * intentionally repository-shaped so swapping in Prisma/Supabase is a
 * single-file change.
 */
export interface DataStore {
  jobs: Job[];
  candidates: Candidate[];
  employees: Employee[];
  interviews: Interview[];
  offers: Offer[];
  onboarding: OnboardingTask[];
  leave: LeaveRequest[];
  reviews: PerformanceReview[];
  approvals: ApprovalRequest[];
  audit: AuditLog[];
  runs: AgentRun[];
  notifications: Notification[];
}

function bootstrap(): DataStore {
  return {
    jobs: structuredClone(seedJobs),
    candidates: structuredClone(seedCandidates),
    employees: structuredClone(seedEmployees),
    interviews: structuredClone(seedInterviews),
    offers: structuredClone(seedOffers),
    onboarding: structuredClone(seedOnboarding),
    leave: structuredClone(seedLeave),
    reviews: structuredClone(seedReviews),
    approvals: structuredClone(seedApprovals),
    audit: structuredClone(seedAuditLogs),
    runs: [],
    notifications: [
      {
        id: 'ntf-1',
        at: new Date().toISOString(),
        title: 'Offer approval pending',
        body: 'Offer for Grace Adeyemi (Senior DevOps Engineer) is waiting for your decision.',
        forRole: ['HR_ADMIN', 'HIRING_MANAGER'],
        kind: 'approval',
        read: false,
      },
      {
        id: 'ntf-2',
        at: new Date().toISOString(),
        title: 'Screening batch complete',
        body: 'Resume Screening Agent scored 11 candidates for Cloud Engineer (Abu Dhabi).',
        forRole: ['HR_ADMIN', 'RECRUITER'],
        kind: 'agent',
        read: false,
      },
    ],
  };
}

const globalRef = globalThis as unknown as { __talentflow?: DataStore };
export const db: DataStore = globalRef.__talentflow ?? (globalRef.__talentflow = bootstrap());

export function resetStore() {
  globalRef.__talentflow = bootstrap();
}

let counter = 0;
export const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function audit(entry: {
  actor: string;
  actorRole: Role | 'AI Agent' | 'System';
  action: string;
  entity: string;
  entityId: string;
  detail: string;
  severity?: AuditLog['severity'];
}) {
  const log: AuditLog = {
    id: uid('aud'),
    at: new Date().toISOString(),
    severity: entry.severity ?? 'info',
    ip: '10.0.0.12',
    ...entry,
  };
  db.audit.unshift(log);
  if (db.audit.length > 500) db.audit.length = 500;
  return log;
}

export function notify(n: Omit<Notification, 'id' | 'at' | 'read'>) {
  db.notifications.unshift({ id: uid('ntf'), at: new Date().toISOString(), read: false, ...n });
  if (db.notifications.length > 100) db.notifications.length = 100;
}
