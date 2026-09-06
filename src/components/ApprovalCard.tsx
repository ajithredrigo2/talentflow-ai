'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, ExplainBlock } from './ui';
import type { ApprovalRequest } from '@/lib/types';

export default function ApprovalCard({ approval }: { approval: ApprovalRequest }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [error, setError] = useState('');

  async function decide(decision: 'approve' | 'reject' | 'modify' | 'info') {
    setBusy(decision);
    setError('');
    const res = await fetch('/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: approval.id, decision, note }),
    });
    const data = await res.json();
    setBusy('');
    if (!res.ok) return setError(data.error ?? 'Decision failed.');
    router.refresh();
  }

  const decided = approval.status !== 'Pending';

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="amber">{approval.type}</Badge>
            <Badge tone={decided ? (approval.status === 'Approved' ? 'mint' : approval.status === 'Rejected' ? 'rose' : 'brand') : 'neutral'} dot>{approval.status}</Badge>
          </div>
          <h3 className="mt-2 text-[15px] font-semibold text-ink-950">{approval.title}</h3>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[#71697d]">{approval.summary}</p>
          <div className="mt-1.5 text-[11.5px] text-[#a7a1b1]">
            Raised by {approval.requestedBy} · {new Date(approval.requestedAt).toLocaleString('en-GB', { timeZone: 'Asia/Dubai', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <div className="text-right">
          <div className="kpi-label">AI recommendation</div>
          <div className="mt-0.5 text-[13px] font-semibold text-brand-600">{approval.aiRecommendation}</div>
        </div>
      </div>

      <div className="mt-4">
        <ExplainBlock items={approval.explanation} title="Why the agent recommends this" />
      </div>

      {decided ? (
        <div className="mt-4 rounded-lg border border-[#ebe9ef] bg-[#fcfbfd] px-3.5 py-3 text-[12.5px] text-[#5b5367]">
          <span className="font-semibold text-ink-900">{approval.status}</span> by {approval.decidedBy} on{' '}
          {approval.decidedAt && new Date(approval.decidedAt).toLocaleString('en-GB', { timeZone: 'Asia/Dubai', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          {approval.note && <div className="mt-1 italic text-[#898294]">“{approval.note}”</div>}
        </div>
      ) : (
        <>
          {showNote && (
            <input
              className="input mt-3"
              placeholder="Add a note for the audit record (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-primary" onClick={() => decide('approve')} disabled={!!busy}>{busy === 'approve' ? 'Approving…' : 'Approve'}</button>
            <button className="btn-ghost" onClick={() => decide('reject')} disabled={!!busy}>{busy === 'reject' ? 'Rejecting…' : 'Reject'}</button>
            <button className="btn-ghost" onClick={() => decide('modify')} disabled={!!busy}>Modify</button>
            <button className="btn-ghost" onClick={() => decide('info')} disabled={!!busy}>Request more information</button>
            <button className="btn-ghost" onClick={() => setShowNote((s) => !s)}>{showNote ? 'Hide note' : 'Add note'}</button>
          </div>
          {error && <p className="mt-2 text-[12px] text-rose-600">{error}</p>}
        </>
      )}
    </div>
  );
}
