'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LeaveDecision({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState('');

  async function decide(decision: 'Approved' | 'Rejected') {
    setBusy(decision);
    await fetch('/api/leave', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, decision }),
    });
    setBusy('');
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button className="btn-primary" onClick={() => decide('Approved')} disabled={!!busy}>{busy === 'Approved' ? '…' : 'Approve'}</button>
      <button className="btn-ghost" onClick={() => decide('Rejected')} disabled={!!busy}>{busy === 'Rejected' ? '…' : 'Reject'}</button>
    </div>
  );
}
