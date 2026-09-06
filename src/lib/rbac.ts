import type { Role } from './types';

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  group: string;
  roles: Role[];
}

const ALL: Role[] = ['HR_ADMIN', 'RECRUITER', 'HIRING_MANAGER', 'EMPLOYEE'];
const HR = ['HR_ADMIN'] as Role[];
const HR_REC: Role[] = ['HR_ADMIN', 'RECRUITER'];
const HR_REC_HM: Role[] = ['HR_ADMIN', 'RECRUITER', 'HIRING_MANAGER'];
const HR_HM: Role[] = ['HR_ADMIN', 'HIRING_MANAGER'];

export const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Executive Dashboard', icon: 'layout-dashboard', group: 'Overview', roles: HR_REC_HM },
  { href: '/command-center', label: 'AI HR Command Center', icon: 'sparkles', group: 'Overview', roles: HR_REC_HM },
  { href: '/agents', label: 'AI Agents', icon: 'bot', group: 'Overview', roles: ALL },
  { href: '/agent-activity', label: 'Agent Activity', icon: 'activity', group: 'Overview', roles: HR_REC_HM },

  { href: '/inbox', label: 'Recruitment Inbox', icon: 'inbox', group: 'Recruitment', roles: HR_REC_HM },
  { href: '/jobs', label: 'Jobs', icon: 'briefcase', group: 'Recruitment', roles: HR_REC_HM },
  { href: '/jobs/new', label: 'Job Creation', icon: 'file-plus', group: 'Recruitment', roles: HR_REC },
  { href: '/candidates', label: 'Candidates', icon: 'users', group: 'Recruitment', roles: HR_REC_HM },
  { href: '/resume-analysis', label: 'Resume Analysis', icon: 'scan-search', group: 'Recruitment', roles: HR_REC_HM },
  { href: '/compare', label: 'Candidate Comparison', icon: 'columns-3', group: 'Recruitment', roles: HR_REC_HM },
  { href: '/interviews', label: 'Interview Management', icon: 'calendar', group: 'Recruitment', roles: HR_REC_HM },
  { href: '/evaluations', label: 'Interview Evaluation', icon: 'clipboard-check', group: 'Recruitment', roles: HR_REC_HM },
  { href: '/offers', label: 'Offer Management', icon: 'file-signature', group: 'Recruitment', roles: HR_HM },
  { href: '/onboarding', label: 'Onboarding', icon: 'plane-takeoff', group: 'Recruitment', roles: HR_REC },

  { href: '/employees', label: 'Employees', icon: 'contact', group: 'People', roles: HR_HM },
  { href: '/assistant', label: 'HR AI Assistant', icon: 'message-circle', group: 'People', roles: ALL },
  { href: '/leave', label: 'Leave Management', icon: 'calendar-days', group: 'People', roles: ALL },
  { href: '/performance', label: 'Performance', icon: 'target', group: 'People', roles: ALL },
  { href: '/learning', label: 'Learning & Skills', icon: 'graduation-cap', group: 'People', roles: ALL },
  { href: '/offboarding', label: 'Offboarding', icon: 'log-out', group: 'People', roles: HR },
  { href: '/policies', label: 'HR Policies', icon: 'book-open', group: 'People', roles: ALL },

  { href: '/reports', label: 'HR Reports', icon: 'file-bar-chart', group: 'Intelligence', roles: HR_REC_HM },
  { href: '/engagement', label: 'Engagement Analytics', icon: 'heart-pulse', group: 'Intelligence', roles: HR_HM },
  { href: '/workforce', label: 'Workforce Analytics', icon: 'bar-chart-3', group: 'Intelligence', roles: HR_HM },

  { href: '/approvals', label: 'Approvals', icon: 'shield-check', group: 'Governance', roles: HR_REC_HM },
  { href: '/audit', label: 'Audit Logs', icon: 'scroll-text', group: 'Governance', roles: HR },
  { href: '/settings', label: 'Settings', icon: 'settings', group: 'Governance', roles: ALL },
];

export function navFor(role: Role) {
  return NAV.filter((n) => n.roles.includes(role));
}

export function canAccess(role: Role, pathname: string) {
  const match = NAV.filter((n) => pathname === n.href || pathname.startsWith(n.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0];
  if (!match) return true;
  return match.roles.includes(role);
}

export const landingFor = (role: Role) => (role === 'EMPLOYEE' ? '/assistant' : '/dashboard');
