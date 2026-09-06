'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import clsx from 'clsx';
import {
  Activity, BarChart3, Bell, Bot, BookOpen, Briefcase, Calendar, CalendarDays, ClipboardCheck, Columns3, Contact,
  FilePlus, FileSignature, GraduationCap, HeartPulse, Inbox, LayoutDashboard, LogOut, Menu, MessageCircle, PlaneTakeoff,
  ScanSearch, ScrollText, Settings, ShieldCheck, Sparkles, Target, Users, X, FileBarChart,
} from 'lucide-react';
import type { Role } from '@/lib/types';
import { navFor } from '@/lib/rbac';
import { AGENTS } from '@/lib/agents/registry';
import { ROLE_LABEL } from '@/lib/auth';
import { Avatar } from './ui';

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  'layout-dashboard': LayoutDashboard, sparkles: Sparkles, bot: Bot, activity: Activity, briefcase: Briefcase,
  'file-plus': FilePlus, inbox: Inbox, users: Users, 'scan-search': ScanSearch, 'columns-3': Columns3, calendar: Calendar,
  'clipboard-check': ClipboardCheck, 'file-signature': FileSignature, 'plane-takeoff': PlaneTakeoff, contact: Contact,
  'message-circle': MessageCircle, 'calendar-days': CalendarDays, target: Target, 'graduation-cap': GraduationCap,
  'log-out': LogOut, 'book-open': BookOpen, 'heart-pulse': HeartPulse, 'bar-chart-3': BarChart3,
  'shield-check': ShieldCheck, 'scroll-text': ScrollText, settings: Settings, 'file-bar-chart': FileBarChart,
};

export default function Shell({
  role,
  name,
  avatarColor,
  pendingApprovals,
  children,
}: {
  role: Role;
  name: string;
  avatarColor: string;
  pendingApprovals: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const items = navFor(role);
  const groups = Array.from(new Set(items.map((i) => i.group)));

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  const sidebar = (
    <div className="flex h-full flex-col border-r border-[#ebe9ef] bg-white text-ink-900">
      <div className="flex items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <svg width="24" height="24" viewBox="0 0 64 64" className="shrink-0">
            <rect width="64" height="64" rx="14" fill="#7c3aed" />
            <path d="M20 24h24M32 24v20" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
            <circle cx="20" cy="24" r="5" fill="#22d3ee" />
            <circle cx="44" cy="24" r="5" fill="#10b981" />
            <circle cx="32" cy="44" r="5" fill="#fff" />
          </svg>
          <span className="text-[14px] font-semibold tracking-[-0.01em]">TalentFlow AI</span>
        </Link>
        <button className="text-[#71697d] transition hover:text-ink-900 lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation">
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((g) => (
          <div key={g} className="mb-4">
            <div className="px-2.5 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#9892a2]">{g}</div>
            <div className="space-y-0.5">
              {items
                .filter((i) => i.group === g)
                .map((i) => {
                  const Icon = ICONS[i.icon] ?? Bot;
                  const active = pathname === i.href || (i.href !== '/dashboard' && pathname.startsWith(i.href + '/'));
                  return (
                    <Link
                      key={i.href}
                      href={i.href}
                      onClick={() => setOpen(false)}
                      className={clsx(
                        'group flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[12.5px] transition',
                        active ? 'bg-brand-50 font-medium text-brand-700' : 'text-[#5b5367] hover:bg-[#f4f2f6] hover:text-ink-900',
                      )}
                    >
                      <Icon size={15} className={active ? 'text-brand-600' : 'text-[#9892a2] group-hover:text-[#5b5367]'} />
                      <span className="flex-1 truncate">{i.label}</span>
                      {i.href === '/approvals' && pendingApprovals > 0 && (
                        <span className="rounded-full bg-amberx-500 px-1.5 text-[10px] font-bold text-ink-950">{pendingApprovals}</span>
                      )}
                    </Link>
                  );
                })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-[#ebe9ef] p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <Avatar name={name} size={30} color={avatarColor} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-medium">{name}</div>
            <div className="text-[11px] text-[#9892a2]">{ROLE_LABEL[role]}</div>
          </div>
          <button onClick={logout} className="rounded-md p-1.5 text-[#9892a2] transition hover:bg-[#f4f2f6] hover:text-ink-900" title="Sign out">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-[248px] shrink-0 lg:block">
        <div className="fixed h-screen w-[248px]">{sidebar}</div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/60" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[260px]">{sidebar}</div>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-[#eeebf2] bg-white/85 px-5 py-2.5 backdrop-blur-xl">
          <button className="rounded-md p-1.5 text-ink-700 hover:bg-[#f4f2f6] lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Menu size={18} />
          </button>
          <div className="hidden items-center gap-2 text-[12px] text-[#9892a2] sm:flex">
            <span className="flex h-1.5 w-1.5 rounded-full bg-mint-500" />
            Agent runtime online
            <span className="text-[#ddd9e2]">·</span>
            <span>{AGENTS.length} agents registered</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/command-center" className="hidden rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-[12.5px] font-medium text-brand-700 transition hover:border-brand-300 hover:bg-brand-100 sm:inline-flex">
              <Sparkles size={13} className="mr-1.5 mt-[2px]" /> Ask the Coordinator
            </Link>
            <Link href="/approvals" className="relative rounded-lg border border-[#ebe9ef] p-2 text-[#71697d] transition hover:bg-[#f8f7fa]" title="Approvals">
              <Bell size={15} />
              {pendingApprovals > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {pendingApprovals}
                </span>
              )}
            </Link>
            <Avatar name={name} size={30} color={avatarColor} />
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-5 py-6 lg:px-7">{children}</main>
      </div>
    </div>
  );
}
