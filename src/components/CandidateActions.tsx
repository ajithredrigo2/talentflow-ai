'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Card, GuardrailNote, Spinner } from './ui';
import type { InterviewQuestion } from '@/lib/types';

const CATEGORY_TONE: Record<string, 'brand' | 'cyan' | 'mint' | 'amber' | 'violet' | 'neutral'> = {
  Technical: 'brand', Scenario: 'cyan', Behavioral: 'violet', 'Problem Solving': 'amber', Leadership: 'mint', Culture: 'neutral',
};

export default function CandidateActions({
  candidateId,
  candidateName,
  interviewers,
  canOffer,
}: {
  candidateId: string;
  candidateName: string;
  interviewers: { id: string; name: string; title: string }[];
  canOffer: boolean;
}) {
  const router = useRouter();
  const [questions, setQuestions] = useState<InterviewQuestion[] | null>(null);
  const [slots, setSlots] = useState<{ iso: string; label: string }[] | null>(null);
  const [interviewer, setInterviewer] = useState(interviewers[0]?.id ?? '');
  const [round, setRound] = useState('Technical Screen');
  const [booked, setBooked] = useState('');
  const [offer, setOffer] = useState<{ letterDraft: string; baseSalary: string; joiningDate: string } | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function call(url: string, body: unknown, tag: string) {
    setBusy(tag);
    setError('');
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Request failed.');
      return data;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Agent actions" subtitle="Run a specialist agent against this candidate">
        <div className="flex flex-wrap gap-2 p-4">
          <button
            className="btn-ghost"
            disabled={!!busy}
            onClick={async () => {
              const d = await call('/api/interview-questions', { candidateId }, 'q');
              if (d) setQuestions(d.questions);
            }}
          >
            {busy === 'q' ? 'Generating…' : 'Generate interview guide'}
          </button>
          <button
            className="btn-ghost"
            disabled={!!busy || !interviewer}
            onClick={async () => {
              const d = await call('/api/schedule', { candidateId, interviewerId: interviewer }, 's');
              if (d) setSlots(d.slots);
            }}
          >
            {busy === 's' ? 'Checking availability…' : 'Find interview slots'}
          </button>
          {canOffer && (
            <button
              className="btn-primary"
              disabled={!!busy}
              onClick={async () => {
                const d = await call('/api/offer', { candidateId }, 'o');
                if (d) {
                  setOffer(d.offer);
                  router.refresh();
                }
              }}
            >
              {busy === 'o' ? 'Drafting…' : 'Draft offer for approval'}
            </button>
          )}
        </div>
        {error && <p className="px-4 pb-4 text-[12px] text-rose-600">{error}</p>}
        {busy && <div className="px-4 pb-4"><Spinner label="Agent running…" /></div>}
      </Card>

      {questions && (
        <Card title={`Interview guide — ${candidateName}`} subtitle="Interview Intelligence Agent">
          <div className="space-y-3 p-4">
            {questions.map((q, i) => (
              <div key={i} className="rounded-lg border border-[#e6e9f2] p-3.5">
                <div className="mb-1.5 flex items-center gap-2">
                  <Badge tone={CATEGORY_TONE[q.category]}>{q.category}</Badge>
                  <span className="text-[11px] text-[#9aa2b8]">Q{i + 1}</span>
                </div>
                <p className="text-[13px] font-medium leading-relaxed text-ink-950">{q.question}</p>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#7a839c]"><span className="font-semibold text-[#5a6480]">Why ask this: </span>{q.rationale}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {q.lookFor.map((l) => <span key={l} className="rounded bg-[#f6f7fb] px-1.5 py-0.5 text-[10.5px] text-[#5a6480]">✓ {l}</span>)}
                </div>
              </div>
            ))}
            <GuardrailNote>No question touches protected attributes or personal circumstances.</GuardrailNote>
          </div>
        </Card>
      )}

      {slots && (
        <Card title="Interview Scheduling Agent" subtitle="Conflict-free availability, Gulf Standard Time">
          <div className="space-y-3 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-ink-800">Interviewer</span>
                <select className="input" value={interviewer} onChange={(e) => setInterviewer(e.target.value)}>
                  {interviewers.map((i) => <option key={i.id} value={i.id}>{i.name} — {i.title}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-ink-800">Round</span>
                <select className="input" value={round} onChange={(e) => setRound(e.target.value)}>
                  {['Technical Screen', 'System Design', 'Hiring Manager', 'Culture & Values', 'Final Panel'].map((r) => <option key={r}>{r}</option>)}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {slots.map((s) => (
                <button
                  key={s.iso}
                  disabled={!!busy}
                  className="rounded-lg border border-[#e6e9f2] bg-white px-3 py-1.5 text-[12.5px] font-medium text-ink-800 transition hover:border-brand-400 hover:bg-brand-50"
                  onClick={async () => {
                    const d = await call('/api/schedule', { candidateId, interviewerId: interviewer, slot: s.iso, round }, 'b');
                    if (d) {
                      setBooked(s.label);
                      setSlots(null);
                      router.refresh();
                    }
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <GuardrailNote>Calendar integration (Google Calendar / Microsoft Teams) is simulated in this prototype — booking updates the candidate record and audit log, but no external invitation is sent.</GuardrailNote>
          </div>
        </Card>
      )}

      {booked && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700">
          Interview booked for {booked}. {candidateName} moved to Interviewing and an invitation was simulated.
        </div>
      )}

      {offer && (
        <Card title="Offer draft — awaiting human approval" subtitle={`${offer.baseSalary} · joining ${offer.joiningDate}`} actions={<Badge tone="amber">Pending approval</Badge>}>
          <div className="p-4">
            <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg border border-[#e6e9f2] bg-[#fafbfe] p-4 font-mono text-[11.5px] leading-relaxed text-[#4a5470]">{offer.letterDraft}</pre>
            <div className="mt-3">
              <GuardrailNote>An offer is never issued by an agent. This draft has been routed to the approvals queue for a named human approver.</GuardrailNote>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
