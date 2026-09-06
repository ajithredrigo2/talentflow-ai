'use client';

import clsx from 'clsx';
import { ReactNode } from 'react';
import type { ToneName } from '@/lib/tone';

/* ------------------------------- Page shell ------------------------------ */
export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        {eyebrow && <div className="kpi-label mb-1.5">{eyebrow}</div>}
        <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink-950">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-[13.5px] leading-relaxed text-[#616b85]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className, title, subtitle, actions }: { children: ReactNode; className?: string; title?: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <section className={clsx('card', className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-[#eef0f6] px-5 py-3.5">
          <div>
            {title && <h2 className="section-title">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[12.5px] text-[#7a839c]">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

/* --------------------------------- KPI ---------------------------------- */
export function Kpi({ label, value, delta, hint, accent }: { label: string; value: string | number; delta?: string; hint?: string; accent?: 'brand' | 'mint' | 'amber' | 'rose' | 'cyan' }) {
  const bar = {
    brand: 'bg-brand-500',
    mint: 'bg-mint-500',
    amber: 'bg-amberx-500',
    rose: 'bg-rose-500',
    cyan: 'bg-accent-500',
  }[accent ?? 'brand'];
  return (
    <div className="card relative overflow-hidden px-5 py-4">
      <span className={clsx('absolute left-0 top-0 h-full w-[3px]', bar)} />
      <div className="kpi-label">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-[26px] font-semibold tracking-[-0.02em] text-ink-950">{value}</span>
        {delta && (
          <span className={clsx('text-[12px] font-semibold', delta.startsWith('-') ? 'text-rose-500' : 'text-mint-600')}>{delta}</span>
        )}
      </div>
      {hint && <div className="mt-1 text-[11.5px] text-[#8b93a9]">{hint}</div>}
    </div>
  );
}

/* -------------------------------- Badges -------------------------------- */
const TONES: Record<ToneName, string> = {
  neutral: 'bg-[#f0f2f8] text-[#5a6480]',
  brand: 'bg-brand-50 text-brand-700',
  mint: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-600',
  cyan: 'bg-cyan-50 text-cyan-700',
  dark: 'bg-ink-900 text-white',
  violet: 'bg-violet-50 text-violet-700',
};

export function Badge({ children, tone = 'neutral', dot }: { children: ReactNode; tone?: ToneName; dot?: boolean }) {
  return (
    <span className={clsx('badge', TONES[tone])}>
      {dot && <span className={clsx('h-1.5 w-1.5 rounded-full', tone === 'mint' ? 'bg-emerald-500' : tone === 'rose' ? 'bg-rose-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-brand-500')} />}
      {children}
    </span>
  );
}

/* ------------------------------ Score ring ------------------------------ */
export function ScoreRing({ value, size = 64, label }: { value: number; size?: number; label?: string }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const color = value >= 85 ? '#10b981' : value >= 70 ? '#375ef6' : value >= 55 ? '#f59e0b' : '#f43f5e';
  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#eef0f6" strokeWidth="6" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * Math.min(100, value)) / 100}
          style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(.4,0,.2,1)' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[13px] font-semibold" style={{ color, top: label ? -6 : 0 }}>
        {value}%
      </span>
      {label && <span className="mt-1 text-[10.5px] font-medium text-[#8b93a9]">{label}</span>}
    </div>
  );
}

export function Meter({ value, label, right, tone }: { value: number; label?: string; right?: string; tone?: string }) {
  const color = tone ?? (value >= 85 ? 'bg-emerald-500' : value >= 70 ? 'bg-brand-500' : value >= 50 ? 'bg-amber-500' : 'bg-rose-500');
  return (
    <div>
      {(label || right) && (
        <div className="mb-1 flex items-center justify-between text-[12px]">
          <span className="text-[#5a6480]">{label}</span>
          <span className="font-semibold text-ink-900">{right}</span>
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#eef0f6]">
        <div className={clsx('h-full rounded-full transition-all duration-700', color)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
}

/* ------------------------------ AI panels ------------------------------- */
export function AIPanel({ title, children, tone = 'brand' }: { title: string; children: ReactNode; tone?: 'brand' | 'amber' | 'mint' }) {
  const styles = {
    brand: 'border-brand-200 bg-gradient-to-br from-brand-50/80 to-white',
    amber: 'border-amber-200 bg-gradient-to-br from-amber-50/80 to-white',
    mint: 'border-emerald-200 bg-gradient-to-br from-emerald-50/70 to-white',
  }[tone];
  return (
    <div className={clsx('rounded-xl border p-4', styles)}>
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-brand-600 text-[10px] font-bold text-white">AI</span>
        <span className="text-[12.5px] font-semibold text-ink-900">{title}</span>
      </div>
      <div className="text-[13px] leading-relaxed text-[#3d4763]">{children}</div>
    </div>
  );
}

export function ExplainBlock({ items, title = 'Why this recommendation' }: { items: string[]; title?: string }) {
  return (
    <div className="rounded-lg border border-[#e6e9f2] bg-[#fafbfe] p-3.5">
      <div className="kpi-label mb-2">{title}</div>
      <ul className="space-y-1.5">
        {items.map((i, idx) => (
          <li key={idx} className="flex gap-2 text-[12.5px] leading-relaxed text-[#4a5470]">
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-brand-500" />
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GuardrailNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-lg border border-[#e6e9f2] bg-[#fafbfe] px-3.5 py-3 text-[12px] leading-relaxed text-[#5a6480]">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="mt-[1px] shrink-0 text-brand-600">
        <path d="M12 3l7 3v6c0 4.5-3 7.9-7 9-4-1.1-7-4.5-7-9V6l7-3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{children}</span>
    </div>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0f2f8] text-[#9aa2b8]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M4 7h16M4 12h10M4 17h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-[13.5px] font-medium text-ink-900">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-[12.5px] text-[#8b93a9]">{hint}</p>}
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] border-collapse">
        <thead className="border-b border-[#eef0f6] bg-[#fbfcfe]">
          <tr>{head.map((h) => <th key={h} className="th">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-[#f2f4f9]">{children}</tbody>
      </table>
    </div>
  );
}

export function Avatar({ name, size = 32, color }: { name: string; size?: number; color?: string }) {
  const initials = name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
  const palette = ['#375ef6', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
  const bg = color ?? palette[name.charCodeAt(0) % palette.length];
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.36 }}
    >
      {initials}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2.5 text-[13px] text-[#616b85]">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
      {label}
    </div>
  );
}

export function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg bg-[#f0f2f8] p-1">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={clsx(
            'rounded-md px-3 py-1.5 text-[12.5px] font-medium transition',
            active === t ? 'bg-white text-ink-900 shadow-sm' : 'text-[#616b85] hover:text-ink-900',
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
