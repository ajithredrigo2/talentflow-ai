'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { DEMO_ACCOUNTS } from '@/lib/auth';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('demo@talentflow.ai');
  const [password, setPassword] = useState('Demo@2026');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? 'Sign-in failed.');
    router.push(params.get('next') || data.redirect);
    router.refresh();
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Left — brand panel */}
      <div className="relative hidden overflow-hidden bg-ink-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 grid-bg opacity-70" />
        <div className="absolute inset-x-0 top-0 h-[420px] glow" />
        <Link href="/" className="relative flex items-center gap-2.5">
          <svg width="26" height="26" viewBox="0 0 64 64">
            <rect width="64" height="64" rx="14" fill="#7c3aed" />
            <path d="M20 24h24M32 24v20" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
            <circle cx="20" cy="24" r="5" fill="#22d3ee" />
            <circle cx="44" cy="24" r="5" fill="#10b981" />
            <circle cx="32" cy="44" r="5" fill="#fff" />
          </svg>
          <span className="text-[15px] font-semibold">TalentFlow AI</span>
        </Link>

        <div className="relative max-w-md">
          <h1 className="text-[38px] font-semibold leading-[1.1] tracking-[-0.025em]">
            Your AI Workforce
            <br />
            <span className="bg-gradient-to-r from-brand-400 via-accent-400 to-mint-400 bg-clip-text text-transparent">for HR</span>
          </h1>
          <p className="mt-5 text-[14.5px] leading-relaxed text-white/60">
            Sixteen specialised agents across the employee lifecycle, coordinated by one orchestrator — with a named
            human approver on every employment decision.
          </p>
          <div className="mt-8 space-y-2.5">
            {['Recruit end to end from a single sentence', 'Explainable scoring with the evidence attached', 'Grounded policy answers with citations', 'Immutable audit trail on every agent run'].map((f) => (
              <div key={f} className="flex items-center gap-2.5 text-[13.5px] text-white/70">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-mint-500/20 text-[9px] text-mint-400">✓</span>
                {f}
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-[12px] text-white/35">
          Builders Pitch Fest 2026 · HR Automation Agents · Demonstration data only
        </p>
      </div>

      {/* Right — form */}
      <div className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          <h2 className="text-[24px] font-semibold tracking-[-0.02em] text-ink-950">Sign in</h2>
          <p className="mt-1.5 text-[13.5px] text-[#71697d]">Choose a demo role below, or enter credentials.</p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-ink-800">Work email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-ink-800">Password</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            </div>
            {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-[12.5px] text-rose-600">{error}</div>}
            <button className="btn-primary w-full py-2.5" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="my-7 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-[#a7a1b1]">
            <span className="h-px flex-1 bg-[#f2f0f4]" />
            Demo accounts
            <span className="h-px flex-1 bg-[#f2f0f4]" />
          </div>

          <div className="space-y-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => {
                  setEmail(a.email);
                  setPassword(a.password);
                }}
                className={`w-full rounded-lg border px-3.5 py-2.5 text-left transition ${
                  email === a.email ? 'border-brand-400 bg-brand-50/60 ring-4 ring-brand-100' : 'border-[#ebe9ef] hover:border-[#d7d2de] hover:bg-[#fcfbfd]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-ink-950">{a.label}</span>
                  <span className="font-mono text-[11px] text-[#9892a2]">{a.email}</span>
                </div>
                <p className="mt-0.5 text-[11.5px] leading-snug text-[#898294]">{a.description}</p>
              </button>
            ))}
          </div>

          <p className="mt-6 text-center text-[11.5px] text-[#a7a1b1]">
            All demo accounts use <span className="font-mono text-[#71697d]">Demo@2026</span>. No real personal data is stored.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-[13px] text-[#71697d]">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
