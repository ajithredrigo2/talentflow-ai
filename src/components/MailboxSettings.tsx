'use client';

import { useEffect, useState } from 'react';
import { Badge, Card, GuardrailNote } from './ui';

interface Mailbox { id: string; address: string; label: string; enabled: boolean; autoAcknowledge: boolean; receivedCount: number }
interface Connection { id: string; displayName: string; status: string; authMethod: string; detail: string; scopes: string[]; envVars: string[] }

export default function MailboxSettings({ canEdit }: { canEdit: boolean }) {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    fetch('/api/inbox/mailboxes')
      .then((r) => (r.ok ? r.json() : { mailboxes: [], connections: [] }))
      .then((d) => {
        setMailboxes(d.mailboxes);
        setConnections(d.connections);
      })
      .catch(() => {});
  }, []);

  async function toggle(id: string, field: 'enabled' | 'autoAcknowledge', value: boolean) {
    setBusy(id + field);
    const res = await fetch('/api/inbox/mailboxes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, [field]: value }),
    });
    setBusy('');
    if (res.ok) {
      const { mailbox } = await res.json();
      setMailboxes((p) => p.map((m) => (m.id === mailbox.id ? mailbox : m)));
    }
  }

  return (
    <>
      <Card title="Recruitment mailboxes" subtitle="Zero-Touch Candidate Intake" className="mt-4">
        <div className="divide-y divide-[#f2f4f9]">
          {mailboxes.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
              <div>
                <div className="font-mono text-[12.5px] font-medium text-ink-950">{m.address}</div>
                <div className="text-[11.5px] text-[#8b93a9]">{m.label} · {m.receivedCount} received</div>
              </div>
              <div className="flex items-center gap-4">
                <Toggle
                  label="Intake"
                  on={m.enabled}
                  disabled={!canEdit || busy === m.id + 'enabled'}
                  onChange={(v) => toggle(m.id, 'enabled', v)}
                />
                <Toggle
                  label="Auto-acknowledge"
                  on={m.autoAcknowledge}
                  disabled={!canEdit || busy === m.id + 'autoAcknowledge'}
                  onChange={(v) => toggle(m.id, 'autoAcknowledge', v)}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-[#eef0f6] px-5 py-3.5">
          <GuardrailNote>
            Acknowledgement emails confirm receipt only and never imply that a candidate has been shortlisted or
            selected. {canEdit ? 'HR administrators control this per mailbox.' : 'Only HR administrators can change these settings.'}
          </GuardrailNote>
        </div>
      </Card>

      <Card title="Email client integrations" subtitle="Credentials are read from server-side environment variables only" className="mt-4">
        <div className="divide-y divide-[#f2f4f9]">
          {connections.map((c) => (
            <div key={c.id} className="px-5 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-ink-950">{c.displayName}</span>
                <Badge tone={c.status === 'Connected' ? 'mint' : c.status === 'Demo mode' ? 'brand' : 'neutral'} dot>{c.status}</Badge>
              </div>
              <div className="mt-0.5 text-[11.5px] text-[#9aa2b8]">
                {c.authMethod}{c.scopes.length ? ` · scopes: ${c.scopes.join(', ')}` : ''}
              </div>
              <p className="mt-1.5 text-[12px] leading-relaxed text-[#7a839c]">{c.detail}</p>
              {c.envVars.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {c.envVars.map((v) => (
                    <code key={v} className="rounded bg-[#f0f2f8] px-1.5 py-0.5 font-mono text-[10.5px] text-[#5a6480]">{v}</code>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function Toggle({ label, on, disabled, onChange }: { label: string; on: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={`flex items-center gap-2 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
      <span className="text-[11.5px] font-medium text-[#5a6480]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className={`relative h-5 w-9 rounded-full transition ${on ? 'bg-brand-600' : 'bg-[#d5dae6]'}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
    </label>
  );
}
