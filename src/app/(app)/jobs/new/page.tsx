'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Card, GuardrailNote, Meter, PageHeader, Spinner } from '@/components/ui';

const SKILL_OPTIONS = [
  'Kubernetes', 'AWS', 'Azure', 'Google Cloud', 'Terraform', 'CI/CD', 'Linux', 'Docker', 'Python', 'TypeScript',
  'React', 'Node.js', 'SQL', 'Data Engineering', 'Machine Learning', 'Kubernetes Security',
  'Identity & Access Management', 'Application Security', 'FinOps', 'Observability', 'Site Reliability',
  'Project Management', 'Stakeholder Management', 'Team Leadership', 'Mentoring', 'IFRS Reporting', 'FP&A',
  'Payroll Operations', 'Talent Acquisition', 'CRM / Salesforce', 'Demand Generation',
];

interface JD {
  title: string; seniority: string; location: string; department: string; employmentType: string; openings: number;
  minExperience: number; summary: string; responsibilities: string[]; mandatorySkills: string[];
  preferredSkills: string[]; education: string; evaluationCriteria: { criterion: string; weight: number }[];
  inclusiveLanguage: { status: string; flags: string[]; note: string }; notice: string;
}

export default function JobCreation() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: 'Senior DevOps Engineer',
    department: 'Engineering',
    location: 'Dubai, UAE',
    seniority: 'Senior',
    employmentType: 'Full-time',
    openings: 2,
    minExperience: 5,
  });
  const [skills, setSkills] = useState<string[]>(['Kubernetes', 'AWS', 'Terraform', 'CI/CD', 'Linux']);
  const [jd, setJd] = useState<JD | null>(null);
  const [engine, setEngine] = useState('');
  const [busy, setBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  const toggle = (s: string) => setSkills((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  async function generate() {
    setBusy(true);
    setError('');
    const res = await fetch('/api/jd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, skills }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? 'Generation failed.');
    setJd(data.jd);
    setEngine(data.engine);
  }

  async function publish() {
    if (!jd) return;
    setPublishing(true);
    const res = await fetch('/api/jd', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jd: { ...jd, salaryRange: 'Band on file' } }),
    });
    const data = await res.json();
    setPublishing(false);
    if (!res.ok) return setError(data.error ?? 'Publication failed.');
    router.push(`/jobs/${data.job.id}`);
    router.refresh();
  }

  const edit = <K extends keyof JD>(key: K, value: JD[K]) => setJd((p) => (p ? { ...p, [key]: value } : p));

  return (
    <>
      <PageHeader
        eyebrow="Job Description Agent"
        title="Job Creation"
        subtitle="Give the agent the role parameters. It drafts the description, checks the language for exclusionary phrasing and proposes the weighted evaluation criteria that will later drive candidate scoring. You edit and approve before anything is published."
      />

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <Card title="Role parameters">
          <div className="space-y-3.5 p-5">
            <Field label="Job title"><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Department">
                <select className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                  {['Engineering', 'IT', 'Finance', 'Human Resources', 'Operations', 'Marketing', 'Sales', 'Customer Success'].map((d) => <option key={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Seniority">
                <select className="input" value={form.seniority} onChange={(e) => setForm({ ...form, seniority: e.target.value })}>
                  {['Junior', 'Mid', 'Senior', 'Lead', 'Manager', 'Director'].map((d) => <option key={d}>{d}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Location">
              <select className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}>
                {['Dubai, UAE', 'Abu Dhabi, UAE', 'Riyadh, KSA', 'Doha, Qatar', 'Bengaluru, India', 'London, UK'].map((d) => <option key={d}>{d}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Type">
                <select className="input" value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })}>
                  {['Full-time', 'Contract', 'Part-time'].map((d) => <option key={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Openings"><input type="number" min={1} max={20} className="input" value={form.openings} onChange={(e) => setForm({ ...form, openings: Number(e.target.value) })} /></Field>
              <Field label="Min. yrs"><input type="number" min={0} max={30} className="input" value={form.minExperience} onChange={(e) => setForm({ ...form, minExperience: Number(e.target.value) })} /></Field>
            </div>
            <Field label={`Required skills (${skills.length} selected)`}>
              <div className="max-h-56 overflow-y-auto rounded-lg border border-[#e6e9f2] p-2">
                <div className="flex flex-wrap gap-1">
                  {SKILL_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggle(s)}
                      className={`rounded px-2 py-1 text-[11px] font-medium transition ${skills.includes(s) ? 'bg-brand-600 text-white' : 'bg-[#f0f2f8] text-[#5a6480] hover:bg-[#e6e9f2]'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </Field>
            <button onClick={generate} disabled={busy || !skills.length} className="btn-primary w-full py-2.5">
              {busy ? 'Drafting…' : 'Generate job description'}
            </button>
            {error && <p className="text-[12px] text-rose-600">{error}</p>}
          </div>
        </Card>

        <div className="space-y-4">
          {busy && <Card><div className="p-6"><Spinner label="Job Description Agent is drafting the requisition…" /></div></Card>}

          {!jd && !busy && (
            <Card>
              <div className="px-6 py-16 text-center">
                <p className="text-[14px] font-medium text-ink-900">No draft yet</p>
                <p className="mx-auto mt-1.5 max-w-md text-[12.5px] leading-relaxed text-[#8b93a9]">
                  Set the role parameters and generate. The draft appears here fully editable — the agent proposes,
                  you decide what gets published.
                </p>
              </div>
            </Card>
          )}

          {jd && (
            <>
              <Card
                title="Draft job description"
                subtitle={engine === 'llm' ? 'Generated with the configured language model, structured by the agent' : 'Generated by the deterministic agent engine'}
                actions={<Badge tone="amber">Awaiting your approval</Badge>}
              >
                <div className="space-y-4 p-5">
                  <div>
                    <div className="kpi-label mb-1.5">Job title</div>
                    <input className="input text-[15px] font-semibold" value={jd.title} onChange={(e) => edit('title', e.target.value)} />
                  </div>
                  <div>
                    <div className="kpi-label mb-1.5">Role summary</div>
                    <textarea className="input min-h-[96px] leading-relaxed" value={jd.summary} onChange={(e) => edit('summary', e.target.value)} />
                  </div>
                  <div>
                    <div className="kpi-label mb-1.5">Responsibilities — edit any line</div>
                    <div className="space-y-1.5">
                      {jd.responsibilities.map((r, i) => (
                        <div key={i} className="flex gap-2">
                          <input
                            className="input"
                            value={r}
                            onChange={(e) => edit('responsibilities', jd.responsibilities.map((x, xi) => (xi === i ? e.target.value : x)))}
                          />
                          <button
                            className="rounded-lg border border-[#e6e9f2] px-2 text-[#9aa2b8] transition hover:border-rose-200 hover:text-rose-500"
                            onClick={() => edit('responsibilities', jd.responsibilities.filter((_, xi) => xi !== i))}
                            title="Remove"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="kpi-label mb-1.5">Mandatory skills</div>
                      <div className="flex flex-wrap gap-1">
                        {jd.mandatorySkills.map((s) => <span key={s} className="rounded bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">{s}</span>)}
                      </div>
                      <div className="kpi-label mb-1.5 mt-3">Preferred skills</div>
                      <div className="flex flex-wrap gap-1">
                        {jd.preferredSkills.map((s) => <span key={s} className="rounded bg-[#f0f2f8] px-2 py-0.5 text-[11px] font-medium text-[#5a6480]">{s}</span>)}
                      </div>
                      <div className="kpi-label mb-1.5 mt-3">Education</div>
                      <p className="text-[12.5px] text-[#5a6480]">{jd.education}</p>
                    </div>
                    <div>
                      <div className="kpi-label mb-2">Evaluation criteria (drives scoring)</div>
                      <div className="space-y-2">
                        {jd.evaluationCriteria.map((c) => <Meter key={c.criterion} value={c.weight * 2.5} label={c.criterion} right={`${c.weight}%`} tone="bg-brand-500" />)}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <div className={`rounded-xl border p-4 ${jd.inclusiveLanguage.status === 'Passed' ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/60'}`}>
                <div className="mb-1 flex items-center gap-2 text-[12.5px] font-semibold text-ink-900">
                  Inclusive-language check <Badge tone={jd.inclusiveLanguage.status === 'Passed' ? 'mint' : 'amber'}>{jd.inclusiveLanguage.status}</Badge>
                </div>
                <p className="text-[12.5px] leading-relaxed text-[#5a6480]">{jd.inclusiveLanguage.note}</p>
              </div>

              <GuardrailNote>{jd.notice}</GuardrailNote>

              <div className="flex flex-wrap gap-2">
                <button onClick={publish} disabled={publishing} className="btn-primary">
                  {publishing ? 'Publishing…' : 'Approve & publish requisition'}
                </button>
                <button onClick={generate} className="btn-ghost">Regenerate draft</button>
                <button onClick={() => setJd(null)} className="btn-ghost">Discard</button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-ink-800">{label}</span>
      {children}
    </label>
  );
}
