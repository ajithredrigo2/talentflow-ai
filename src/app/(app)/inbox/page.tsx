'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Inbox, Paperclip, RefreshCw, Sparkles, ShieldAlert, Copy } from 'lucide-react';
import { AgentFlow } from '@/components/AgentResults';
import { AIPanel, Badge, Card, Empty, GuardrailNote, Kpi, Meter, PageHeader, Spinner, Table } from '@/components/ui';
import { stageTone } from '@/lib/tone';
import type { AgentRun } from '@/lib/types';

interface Row {
  id: string;
  receivedAt: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  mailboxAddress: string;
  provider: string;
  simulated: boolean;
  status: string;
  attachment: { filename: string; sizeBytes: number; quarantined: boolean } | null;
  candidateId?: string;
  candidateName: string;
  jobCode: string | null;
  jobTitle: string | null;
  matchScore: number | null;
  recommendation: string | null;
  reference: string | null;
  duplicateOf: string | null;
}

interface Mailbox { id: string; address: string; label: string; enabled: boolean; autoAcknowledge: boolean; receivedCount: number }
interface Connection { id: string; displayName: string; status: string; authMethod: string; detail: string; scopes: string[]; envVars: string[] }
interface Sample { key: string; label: string; note: string; mailbox: string; subject: string }

const FILTERS = ['All', 'New', 'Processing', 'Screening Complete', 'Needs Review', 'Shortlisted', 'Unassigned', 'Missing CV', 'Duplicate', 'Failed', 'Archived'] as const;

const matchesFilter = (r: Row, f: string) => {
  if (f === 'All') return true;
  if (f === 'Unassigned') return r.status === 'Needs Assignment';
  if (f === 'Duplicate') return Boolean(r.duplicateOf);
  if (f === 'Screening Complete') return r.matchScore !== null;
  return r.status === f;
};

export default function RecruitmentInbox() {
  const [rows, setRows] = useState<Row[]>([]);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [filter, setFilter] = useState<string>('All');
  const [busy, setBusy] = useState('');
  const [lastRun, setLastRun] = useState<{ run: AgentRun; narrative: string; emailId: string } | null>(null);
  const [message, setMessage] = useState('');
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/inbox');
    if (!res.ok) return;
    const d = await res.json();
    setRows(d.rows);
    setMailboxes(d.mailboxes);
    setConnections(d.connections);
    setSamples(d.samples);
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function simulate(key?: string) {
    setBusy(key ?? 'sim');
    setMessage('');
    setLastRun(null);
    const res = await fetch('/api/inbox/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });
    const d = await res.json();
    setBusy('');
    if (!res.ok) return setMessage(d.error ?? 'Simulation failed.');
    setLastRun({ run: d.run, narrative: d.narrative, emailId: d.emailId });
    load();
  }

  async function sync() {
    setBusy('sync');
    setMessage('');
    const res = await fetch('/api/inbox/sync', { method: 'POST' });
    const d = await res.json();
    setBusy('');
    setMessage(d.message ?? `${d.processed} new application(s) processed from ${d.connected} live connection(s).`);
    load();
  }

  const filtered = rows.filter((r) => matchesFilter(r, filter));
  const withScore = rows.filter((r) => r.matchScore !== null);
  const avgScore = withScore.length ? Math.round(withScore.reduce((a, r) => a + (r.matchScore ?? 0), 0) / withScore.length) : 0;
  const parsed = rows.filter((r) => r.attachment && !r.attachment.quarantined).length;
  const autoMatched = rows.filter((r) => r.jobTitle).length;
  const liveConnections = connections.filter((c) => c.status === 'Connected');

  return (
    <>
      <PageHeader
        eyebrow="Zero-Touch Candidate Intake"
        title="Recruitment Inbox"
        subtitle="Applications arriving at the recruitment mailboxes are detected, validated, parsed, matched to a vacancy and screened automatically. Every one stops here for a human recruiter decision."
        actions={
          <>
            <button className="btn-ghost" onClick={sync} disabled={!!busy}>
              <RefreshCw size={13} className={busy === 'sync' ? 'animate-spin' : ''} /> Sync mailboxes
            </button>
            <button className="btn-primary" onClick={() => simulate()} disabled={!!busy}>
              <Sparkles size={13} /> {busy === 'sim' ? 'Processing…' : 'Simulate Incoming Application'}
            </button>
          </>
        }
      />

      <div className="mb-5 grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Kpi label="Applications received" value={rows.length} hint="via email intake" accent="brand" />
        <Kpi label="CVs auto-parsed" value={parsed} hint={rows.length ? `${Math.round((parsed / rows.length) * 100)}% of messages` : '—'} accent="cyan" />
        <Kpi label="Auto-matched to a vacancy" value={autoMatched} accent="mint" />
        <Kpi label="Awaiting recruiter review" value={rows.filter((r) => r.status === 'Needs Review' || r.status === 'Needs Assignment').length} accent="amber" />
        <Kpi label="Average match score" value={avgScore ? `${avgScore}%` : '—'} accent="mint" />
      </div>

      {message && <div className="mb-4 rounded-xl border border-[#ebe9ef] bg-[#fcfbfd] px-4 py-3 text-[13px] text-[#5b5367]">{message}</div>}

      {lastRun && (
        <div className="mb-5 grid gap-4 lg:grid-cols-[340px_1fr]">
          <Card title="Intake pipeline" subtitle="The run that just completed">
            <div className="p-4"><AgentFlow run={lastRun.run} /></div>
          </Card>
          <div className="space-y-3">
            <AIPanel title="Email Intake Agent — outcome">
              <div className="whitespace-pre-line">{lastRun.narrative}</div>
            </AIPanel>
            <Link href={`/inbox/${lastRun.emailId}`} className="btn-primary">Open the application</Link>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {FILTERS.map((f) => {
              const count = rows.filter((r) => matchesFilter(r, f)).length;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`badge transition ${filter === f ? 'bg-brand-600 text-white' : 'bg-[#f4f2f6] text-[#6b6377] hover:bg-[#ebe9ef]'}`}
                >
                  {f} {count > 0 && <span className="opacity-60">{count}</span>}
                </button>
              );
            })}
          </div>

          <Card>
            {!loaded ? (
              <div className="p-6"><Spinner label="Loading recruitment inbox…" /></div>
            ) : filtered.length === 0 ? (
              <Empty
                title={rows.length === 0 ? 'No applications received yet' : `No messages match "${filter}"`}
                hint={
                  rows.length === 0
                    ? 'Click "Simulate Incoming Application" to send a realistic candidate email through the live intake pipeline, or connect a recruitment mailbox and sync.'
                    : 'Try a different filter.'
                }
              />
            ) : (
              <Table head={['Received', 'Candidate', 'Applied position', 'Job ID', 'CV', 'Source', 'AI status', 'Match', 'Status']}>
                {filtered.map((r) => (
                  <tr key={r.id} className="transition hover:bg-[#fcfbfd]">
                    <td className="td whitespace-nowrap text-[12px] text-[#898294]">
                      {new Date(r.receivedAt).toLocaleString('en-GB', { timeZone: 'Asia/Dubai', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="td">
                      <Link href={`/inbox/${r.id}`} className="font-medium text-ink-950 hover:text-brand-600">{r.candidateName}</Link>
                      <div className="text-[11.5px] text-[#9892a2]">{r.fromEmail}</div>
                      {r.duplicateOf && <Badge tone="violet"><Copy size={9} /> Linked to existing profile</Badge>}
                    </td>
                    <td className="td text-[#71697d]">
                      {r.jobTitle ?? <Badge tone="amber">Unassigned</Badge>}
                    </td>
                    <td className="td font-mono text-[11.5px] text-[#898294]">{r.jobCode ?? '—'}</td>
                    <td className="td">
                      {r.attachment ? (
                        r.attachment.quarantined ? (
                          <Badge tone="rose"><ShieldAlert size={10} /> Quarantined</Badge>
                        ) : (
                          <span className="flex items-center gap-1 text-[11.5px] text-[#6b6377]">
                            <Paperclip size={11} /> {r.attachment.filename.length > 20 ? r.attachment.filename.slice(0, 18) + '…' : r.attachment.filename}
                          </span>
                        )
                      ) : (
                        <span className="text-[11.5px] text-rose-500">None</span>
                      )}
                    </td>
                    <td className="td">
                      <Badge tone="neutral">Email</Badge>
                      <div className="mt-0.5 text-[10.5px] text-[#a7a1b1]">{r.mailboxAddress}</div>
                    </td>
                    <td className="td">
                      <Badge tone={r.recommendation === 'Advance' ? 'mint' : r.recommendation === 'Review' ? 'amber' : r.matchScore === null ? 'neutral' : 'neutral'}>
                        {r.matchScore !== null ? 'Screened' : r.status === 'Needs Assignment' ? 'Awaiting vacancy' : r.status === 'Failed' ? 'Blocked' : 'Not screened'}
                      </Badge>
                    </td>
                    <td className="td w-32">{r.matchScore !== null ? <Meter value={r.matchScore} right={`${r.matchScore}%`} /> : <span className="text-[#ccc8d3]">—</span>}</td>
                    <td className="td"><Badge tone={stageTone(r.status === 'Needs Assignment' ? 'Pending' : r.status === 'Needs Review' ? 'Pending' : r.status)} dot>{r.status}</Badge></td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Demonstration mailbox" subtitle="Each scenario runs the identical intake pipeline">
            <div className="space-y-2 p-3">
              {samples.map((s) => (
                <button
                  key={s.key}
                  onClick={() => simulate(s.key)}
                  disabled={!!busy}
                  className="block w-full rounded-lg border border-[#ebe9ef] px-3 py-2.5 text-left transition hover:border-brand-300 hover:bg-brand-50/40 disabled:opacity-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12.5px] font-semibold text-ink-950">{s.label}</span>
                    {busy === s.key && <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />}
                  </div>
                  <div className="mt-0.5 font-mono text-[10.5px] text-[#9892a2]">{s.subject}</div>
                  <p className="mt-1 text-[11.5px] leading-snug text-[#898294]">{s.note}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card title="Mailbox connections">
            <div className="divide-y divide-[#f5f4f7]">
              {connections.map((c) => (
                <div key={c.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12.5px] font-semibold text-ink-900">{c.displayName}</span>
                    <Badge tone={c.status === 'Connected' ? 'mint' : c.status === 'Demo mode' ? 'brand' : 'neutral'} dot>{c.status}</Badge>
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#a7a1b1]">{c.authMethod}{c.scopes.length ? ` · ${c.scopes.join(', ')}` : ''}</div>
                  <p className="mt-1 text-[11.5px] leading-snug text-[#898294]">{c.detail}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Recruitment mailboxes">
            <div className="divide-y divide-[#f5f4f7]">
              {mailboxes.map((m) => (
                <div key={m.id} className="flex items-start justify-between gap-2 px-4 py-2.5">
                  <div>
                    <div className="font-mono text-[12px] text-ink-900">{m.address}</div>
                    <div className="text-[11px] text-[#a7a1b1]">{m.label}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[12px] font-semibold text-ink-950">{m.receivedCount}</div>
                    <div className="text-[10px] text-[#a7a1b1]">{m.autoAcknowledge ? 'ack on' : 'ack off'}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <GuardrailNote>
            Mailbox credentials live only in server-side environment variables with least-privilege, read-only scopes.
            Attachments are validated by signature and never executed. No candidate is shortlisted or rejected
            automatically — every decision below is recorded against a named recruiter.
          </GuardrailNote>

          {liveConnections.length === 0 && (
            <div className="rounded-xl border border-[#ebe9ef] bg-[#fcfbfd] p-3.5 text-[11.5px] leading-relaxed text-[#898294]">
              <span className="font-semibold text-ink-900">Running in demo mode.</span> No live mailbox credentials are
              configured, so simulated applications stand in for real mail. They travel the same pipeline, the same
              agents and the same audit trail — only the transport differs.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
