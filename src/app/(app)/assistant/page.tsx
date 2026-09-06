'use client';

import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { ResultBlocks, type ResultBlock } from '@/components/AgentResults';
import { Badge, Card, PageHeader, Spinner } from '@/components/ui';

const SUGGESTIONS = [
  'How many annual leave days do I have?',
  'What is the maternity leave policy?',
  'How do I request work from home?',
  'When is my probation completed?',
  'What documents do I need to add my dependants to insurance?',
  'Apply annual leave from 21 September to 25 September.',
  'What is my notice period if I resign?',
  'How does the performance review cycle work?',
];

interface Msg {
  role: 'user' | 'agent';
  text: string;
  blocks?: ResultBlock[];
  intent?: string;
  at: string;
}

export default function Assistant() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'agent',
      at: '',
      text: "Hello — I'm the HR AI Assistant. I answer from the governed HR policy knowledge base and always show you the policy I used, so you can check it yourself. I can also prepare a leave request and route it to your manager for approval.\n\nWhat would you like to know?",
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const now = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Dubai', hour: '2-digit', minute: '2-digit' });
    setMessages((m) => [...m, { role: 'user', text, at: now }]);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Request failed.');
      setMessages((m) => [
        ...m,
        {
          role: 'agent',
          text: data.narrative,
          blocks: (data.blocks as ResultBlock[]).filter((b) => b.kind !== 'policy-answer'),
          intent: data.intent,
          at: new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Dubai', hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      // policy citations get their own rendered block
      const policyBlock = (data.blocks as ResultBlock[]).find((b) => b.kind === 'policy-answer');
      if (policyBlock) {
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { ...copy[copy.length - 1], blocks: [policyBlock, ...(copy[copy.length - 1].blocks ?? [])] };
          return copy;
        });
      }
    } catch (e) {
      setMessages((m) => [...m, { role: 'agent', text: (e as Error).message, at: '' }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="HR Helpdesk & Leave Agents"
        title="HR AI Assistant"
        subtitle="Ask anything about policies, entitlements or your own record. Answers are retrieved from the governed policy knowledge base and always cite the source and version — the assistant escalates rather than guessing."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card className="flex min-h-[560px] flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-5" style={{ maxHeight: '62vh' }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[92%] ${m.role === 'user' ? '' : 'w-full'}`}>
                  <div
                    className={`rounded-xl px-4 py-3 text-[13.5px] leading-relaxed ${
                      m.role === 'user' ? 'bg-brand-600 text-white' : 'border border-[#ebe9ef] bg-white text-[#4e465a]'
                    }`}
                  >
                    {m.role === 'agent' && (
                      <div className="mb-2 flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-brand-600 text-[10px] font-bold text-white">AI</span>
                        <span className="text-[11.5px] font-semibold text-ink-900">HR Assistant</span>
                        {m.intent && <Badge tone="neutral">{m.intent}</Badge>}
                      </div>
                    )}
                    <div className="whitespace-pre-line">{m.text}</div>
                  </div>
                  {m.blocks && m.blocks.length > 0 && (
                    <div className="mt-3">
                      <ResultBlocks blocks={m.blocks} />
                    </div>
                  )}
                  {m.at && <div className={`mt-1 text-[10.5px] text-[#a7a1b1] ${m.role === 'user' ? 'text-right' : ''}`}>{m.at}</div>}
                </div>
              </div>
            ))}
            {busy && (
              <div className="rounded-xl border border-[#ebe9ef] bg-white px-4 py-3">
                <Spinner label="Retrieving from the HR knowledge base…" />
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t border-[#f2f0f4] p-3"
          >
            <div className="flex gap-2">
              <input
                className="input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about leave, policies, probation, insurance…"
                disabled={busy}
              />
              <button className="btn-primary px-4" disabled={busy || !input.trim()}><Send size={15} /></button>
            </div>
          </form>
        </Card>

        <div className="space-y-4">
          <Card title="Try asking">
            <div className="space-y-1.5 p-3">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={busy}
                  className="block w-full rounded-lg border border-[#ebe9ef] px-3 py-2 text-left text-[12px] leading-snug text-[#6b6377] transition hover:border-brand-300 hover:bg-brand-50/50 hover:text-ink-900 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </Card>

          <Card title="How this works">
            <div className="space-y-2.5 p-4 text-[12px] leading-relaxed text-[#6b6377]">
              <p><span className="font-semibold text-ink-900">Retrieval first.</span> Your question is matched against the HR policy corpus. The agent answers from the retrieved passages, never from general knowledge.</p>
              <p><span className="font-semibold text-ink-900">Always cited.</span> Every answer names the policy and version it came from, so you can verify it.</p>
              <p><span className="font-semibold text-ink-900">Escalates honestly.</span> If nothing relevant is retrieved, the assistant says so and flags it for your HR Business Partner rather than guessing.</p>
              <p><span className="font-semibold text-ink-900">Never approves.</span> Leave requests are prepared, conflict-checked and routed — your manager decides.</p>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
