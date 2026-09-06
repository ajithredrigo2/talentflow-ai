'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Card, Spinner } from './ui';

interface Parsed {
  type: string; from: string; to: string; days: number; balance: number; balanceAfter: number;
  conflicts: string[]; approver: { name: string; title: string }; policy: { title: string; version: string };
}

const EXAMPLES = [
  'Apply annual leave from 21 September to 25 September.',
  'I need sick leave on 14 October.',
  'Book annual leave from 2 November to 12 November for a family holiday.',
];

export default function LeaveComposer() {
  const router = useRouter();
  const [text, setText] = useState('Apply annual leave from 21 September to 25 September.');
  const [reason, setReason] = useState('');
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const [error, setError] = useState('');

  async function call(confirm: boolean) {
    setBusy(true);
    setError('');
    const res = await fetch('/api/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, confirm, reason }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? 'Request failed.');
    if (confirm) {
      setDone(`Request submitted and routed to ${data.parsed.approver.name} for approval.`);
      setParsed(null);
      router.refresh();
    } else {
      setParsed(data.parsed);
      setDone('');
    }
  }

  return (
    <Card title="Request leave in plain language" subtitle="Leave Management Agent">
      <div className="space-y-3 p-4">
        <textarea className="input min-h-[76px]" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((x) => (
            <button key={x} onClick={() => setText(x)} className="rounded border border-[#e6e9f2] px-2 py-1 text-[11px] text-[#5a6480] transition hover:border-brand-300 hover:bg-brand-50/50">
              {x.slice(0, 34)}…
            </button>
          ))}
        </div>
        <button className="btn-primary w-full" onClick={() => call(false)} disabled={busy || !text.trim()}>
          {busy ? 'Parsing…' : 'Prepare request'}
        </button>
        {busy && <Spinner />}
        {error && <p className="text-[12px] text-rose-600">{error}</p>}
        {done && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-700">{done}</div>}

        {parsed && (
          <div className="space-y-3 rounded-lg border border-[#e6e9f2] bg-[#fafbfe] p-3.5">
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="brand">{parsed.type}</Badge>
              <Badge tone="neutral">{parsed.from} → {parsed.to}</Badge>
              <Badge tone="neutral">{parsed.days} working days</Badge>
            </div>
            <div className="text-[12.5px] text-[#4a5470]">
              Balance {parsed.balance} → <span className={parsed.balanceAfter < 0 ? 'font-semibold text-rose-600' : 'font-semibold text-emerald-600'}>{parsed.balanceAfter}</span> days ·
              routed to <span className="font-medium text-ink-900">{parsed.approver.name}</span> ({parsed.approver.title})
            </div>
            {parsed.conflicts.length > 0 && (
              <ul className="space-y-1">
                {parsed.conflicts.map((c) => <li key={c} className="flex gap-2 text-[11.5px] text-amber-700"><span>⚠</span>{c}</li>)}
              </ul>
            )}
            <input className="input" placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="text-[11px] text-[#8b93a9]">Governed by {parsed.policy.title} ({parsed.policy.version}).</div>
            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={() => call(true)} disabled={busy}>Submit for approval</button>
              <button className="btn-ghost" onClick={() => setParsed(null)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
