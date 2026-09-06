import Link from 'next/link';
import { AGENTS } from '@/lib/agents/registry';

const LIFECYCLE = [
  'Workforce Requirement', 'Job Creation', 'Candidate Screening', 'Interview', 'Hiring', 'Onboarding',
  'Employee Support', 'Performance', 'Learning', 'Retention', 'Offboarding',
];

const PROBLEMS = [
  { stat: '23 hrs', label: 'per week', text: 'lost to writing job descriptions, reviewing CVs and shortlisting for a single technical requisition.' },
  { stat: '44 days', label: 'average', text: 'from requisition to signed offer — most of it waiting on coordination, not on decisions.' },
  { stat: '60%', label: 'of HR tickets', text: 'are repeat policy questions that already have a documented answer.' },
  { stat: '11 systems', label: 'typical stack', text: 'holding employee data that nobody can query in one place when a decision is due.' },
];

const IMPACT = [
  { value: '60%', label: 'reduction in resume screening time' },
  { value: '40%', label: 'faster hiring cycles' },
  { value: '50%', label: 'less repetitive HR administration' },
  { value: '70%', label: 'faster employee query resolution' },
  { value: '30%', label: 'less onboarding administration' },
  { value: '100%', label: 'of AI recommendations explained' },
];

const RESPONSIBLE = [
  { title: 'Human-in-the-loop by design', body: 'Shortlisting, rejection, hiring, offers, ratings, promotion and termination all pass through a named human approver. No agent holds decision authority.' },
  { title: 'Protected attributes excluded', body: 'Gender, race, religion, nationality, disability, marital status and age never enter a scoring path. The exclusion list ships with every score.' },
  { title: 'Explainable every time', body: 'A score is never returned alone. Each dimension carries its weight, its result and the evidence sentence behind it.' },
  { title: 'Auditable end to end', body: 'Every agent run, recommendation and human decision is written to an immutable audit log with actor, action and reasoning.' },
  { title: 'Role-based access control', body: 'Four roles with distinct surfaces. Retention analytics and audit logs are restricted; employees see only their own record.' },
  { title: 'Data minimisation & consent', body: 'Agents receive the minimum fields required for the task. Candidate consent and retention windows are tracked in the record.' },
];

export default function Landing() {
  return (
    <main className="bg-white">
      {/* ---------------------------------------------------------- Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-ink-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo />
            <span className="text-[15px] font-semibold tracking-[-0.01em] text-white">TalentFlow AI</span>
          </Link>
          <div className="hidden items-center gap-7 text-[13px] text-white/60 md:flex">
            <a href="#problem" className="transition hover:text-white">Problem</a>
            <a href="#agents" className="transition hover:text-white">AI Agents</a>
            <a href="#how" className="transition hover:text-white">How it works</a>
            <a href="#responsible" className="transition hover:text-white">Responsible AI</a>
            <a href="#impact" className="transition hover:text-white">Impact</a>
          </div>
          <Link href="/login" className="rounded-lg bg-white px-4 py-2 text-[13px] font-semibold text-ink-950 transition hover:bg-white/90">
            Launch Command Center
          </Link>
        </div>
      </nav>

      {/* --------------------------------------------------------- Hero */}
      <header className="relative overflow-hidden bg-ink-950 text-white">
        <div className="absolute inset-0 grid-bg opacity-70" />
        <div className="absolute inset-x-0 top-0 h-[520px] glow" />
        <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-20 md:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[12px] font-medium text-white/75">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
              Builders Pitch Fest 2026 · HR Automation Agents
            </span>
            <h1 className="mt-6 text-[42px] font-semibold leading-[1.08] tracking-[-0.03em] md:text-[62px]">
              Your AI Workforce
              <br />
              <span className="bg-gradient-to-r from-brand-400 via-accent-400 to-mint-400 bg-clip-text text-transparent">for HR</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-relaxed text-white/65 md:text-[17px]">
              TalentFlow AI deploys specialised AI agents across recruitment, onboarding, employee experience, workforce
              development and HR operations — helping HR teams work faster while keeping humans in control of every
              employment decision.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link href="/login" className="rounded-xl bg-brand-600 px-6 py-3 text-[14px] font-semibold text-white shadow-[0_8px_30px_-8px_rgba(124,58,237,0.9)] transition hover:bg-brand-500">
                Launch HR Command Center
              </Link>
              <Link href="/login?demo=1" className="rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-[14px] font-semibold text-white transition hover:bg-white/10">
                Explore Demo →
              </Link>
            </div>
            <p className="mt-4 text-[12.5px] text-white/40">
              Demo access · demo@talentflow.ai · Demo@2026 — four role-based dashboards, seeded with 50 employees and 50 candidates
            </p>
          </div>

          {/* Lifecycle strip */}
          <div className="mt-16 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur">
            <div className="kpi-label mb-3 text-white/40">Complete employee lifecycle coverage</div>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
              {LIFECYCLE.map((s, i) => (
                <span key={s} className="flex items-center gap-1.5">
                  <span className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-[12px] font-medium text-white/80">{s}</span>
                  {i < LIFECYCLE.length - 1 && <span className="text-white/25">→</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------- Problem */}
      <section id="problem" className="mx-auto max-w-7xl px-6 py-20">
        <Eyebrow>The problem</Eyebrow>
        <h2 className="mt-3 max-w-3xl text-[32px] font-semibold leading-tight tracking-[-0.02em] text-ink-950">
          HR platforms today are systems of record. The work still lands on people.
        </h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[#71697d]">
          An HRMS stores the requisition. It does not write the job description, read 200 CVs, prepare the interview,
          chase the documents or answer the same leave question for the fortieth time. That work is where HR capacity
          goes — and where hiring speed and employee experience are lost.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROBLEMS.map((p) => (
            <div key={p.stat} className="card card-pad">
              <div className="text-[30px] font-semibold tracking-[-0.02em] text-ink-950">{p.stat}</div>
              <div className="kpi-label mt-0.5">{p.label}</div>
              <p className="mt-3 text-[13px] leading-relaxed text-[#71697d]">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------ Solution */}
      <section className="border-y border-[#eeebf2] bg-[#fcfbfd] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <Eyebrow>The solution</Eyebrow>
          <h2 className="mt-3 max-w-3xl text-[32px] font-semibold leading-tight tracking-[-0.02em] text-ink-950">
            A system of action: sixteen specialised agents, one coordinator, humans on every decision.
          </h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {[
              { t: 'Understands the request', b: 'Type "Recruit a Senior DevOps Engineer for Dubai with Kubernetes, AWS and Terraform." The Coordinator classifies intent, extracts role, location and skills, and builds an execution plan.' },
              { t: 'Coordinates the work', b: 'Workforce Planning validates the role. The JD Agent drafts it with weighted criteria. Screening scores every candidate on those same weights. Interview Intelligence writes the guide. Onboarding stages the programme.' },
              { t: 'Stops at the decisions', b: 'Publication, shortlisting, rejection, hiring, offers, ratings and promotions are gated. The agent presents the evidence; a named human approves, rejects, modifies or asks for more.' },
            ].map((c, i) => (
              <div key={c.t} className="card card-pad">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-[13px] font-bold text-white">{i + 1}</div>
                <h3 className="text-[15px] font-semibold text-ink-950">{c.t}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#71697d]">{c.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- Agents */}
      <section id="agents" className="mx-auto max-w-7xl px-6 py-20">
        <Eyebrow>The agent workforce</Eyebrow>
        <h2 className="mt-3 text-[32px] font-semibold leading-tight tracking-[-0.02em] text-ink-950">Sixteen agents, four functions</h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[#71697d]">
          Each agent owns a narrow, well-defined slice of HR work, with its own inputs, outputs and guardrails. The
          Coordinator composes them into workflows.
        </p>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {AGENTS.map((a) => (
            <div key={a.id} className="card p-4 transition hover:shadow-pop">
              <div className="mb-2 flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${a.category === 'Orchestration' ? 'bg-brand-500' : a.category === 'Talent Acquisition' ? 'bg-accent-500' : a.category === 'Employee Experience' ? 'bg-mint-500' : 'bg-amberx-500'}`} />
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#9892a2]">{a.category}</span>
              </div>
              <h3 className="text-[13.5px] font-semibold text-ink-950">{a.name}</h3>
              <p className="mt-1.5 line-clamp-4 text-[12px] leading-relaxed text-[#898294]">{a.mission}</p>
              {a.requiresApproval && (
                <span className="mt-3 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700">Human approval gate</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------- How it works */}
      <section id="how" className="border-y border-[#eeebf2] bg-ink-950 py-20 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <Eyebrow dark>How it works</Eyebrow>
          <h2 className="mt-3 text-[32px] font-semibold leading-tight tracking-[-0.02em]">One request, seven agents, two approval gates</h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/55">
            This is the live demo workflow. Every step below runs in the deployed prototype against seeded data — the
            scores, the questions and the onboarding plan are generated, not screenshots.
          </p>
          <div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {[
              { n: '01', t: 'HR Coordinator', d: 'Classifies intent, extracts role · location · skills, builds the plan.' },
              { n: '02', t: 'Workforce Planning', d: 'Validates the role against capability gaps and sets hiring priority.' },
              { n: '03', t: 'Job Description', d: 'Drafts the JD with five weighted evaluation criteria. Approval gate.' },
              { n: '04', t: 'Talent Acquisition', d: 'Parses the pipeline into structured, comparable candidate profiles.' },
              { n: '05', t: 'Resume Screening', d: 'Scores on the approved weights with per-dimension evidence. Approval gate.' },
              { n: '06', t: 'Interview Intelligence', d: 'Writes a tailored guide targeting evidenced claims and real gaps.' },
              { n: '07', t: 'Interview Evaluation', d: 'Turns panel ratings into a reasoned recommendation for the manager.' },
              { n: '08', t: 'Offer & Onboarding', d: 'Drafts the offer, then a 14-task programme from Day −10 to Day 30.' },
            ].map((s) => (
              <div key={s.n} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-[11px] font-semibold text-accent-400">{s.n}</div>
                <div className="mt-1.5 text-[13.5px] font-semibold">{s.t}</div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-white/50">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- Responsible AI */}
      <section id="responsible" className="mx-auto max-w-7xl px-6 py-20">
        <Eyebrow>Responsible AI</Eyebrow>
        <h2 className="mt-3 max-w-3xl text-[32px] font-semibold leading-tight tracking-[-0.02em] text-ink-950">
          Automation without transferring authority
        </h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[#71697d]">
          HR is a regulated, high-stakes domain. The constraint is not what an agent can do — it is what an agent is
          permitted to decide.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {RESPONSIBLE.map((r) => (
            <div key={r.title} className="card card-pad">
              <h3 className="text-[14px] font-semibold text-ink-950">{r.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[#71697d]">{r.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- Impact */}
      <section id="impact" className="border-y border-[#eeebf2] bg-[#fcfbfd] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <Eyebrow>Business impact</Eyebrow>
          <h2 className="mt-3 text-[32px] font-semibold leading-tight tracking-[-0.02em] text-ink-950">Prototype target outcomes</h2>
          <p className="mt-3 max-w-2xl text-[14px] text-[#71697d]">
            Modelled from the workflow time removed in the prototype against published HR benchmarks. These are target
            outcomes for a production pilot, not verified production results.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {IMPACT.map((i) => (
              <div key={i.label} className="card card-pad">
                <div className="text-[34px] font-semibold tracking-[-0.03em] text-brand-600">{i.value}</div>
                <p className="mt-1 text-[13.5px] text-[#5b5367]">{i.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- CTA */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="relative overflow-hidden rounded-2xl bg-ink-950 px-8 py-14 text-center text-white">
          <div className="absolute inset-0 grid-bg opacity-60" />
          <div className="absolute inset-x-0 top-0 h-72 glow" />
          <div className="relative">
            <h2 className="text-[30px] font-semibold tracking-[-0.02em] md:text-[36px]">
              Transforming HR from administration
              <br />
              into intelligent workforce orchestration.
            </h2>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/login" className="rounded-xl bg-white px-6 py-3 text-[14px] font-semibold text-ink-950 transition hover:bg-white/90">
                Launch HR Command Center
              </Link>
              <Link href="/agents" className="rounded-xl border border-white/20 px-6 py-3 text-[14px] font-semibold text-white transition hover:bg-white/10">
                Browse the agents
              </Link>
            </div>
            <div className="mx-auto mt-10 grid max-w-2xl gap-3 text-left sm:grid-cols-2">
              {[
                ['HR Administrator', 'demo@talentflow.ai'],
                ['Recruiter', 'recruiter@talentflow.ai'],
                ['Hiring Manager', 'manager@talentflow.ai'],
                ['Employee', 'employee@talentflow.ai'],
              ].map(([role, email]) => (
                <div key={email} className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-white/40">{role}</div>
                  <div className="mt-0.5 font-mono text-[12.5px] text-white/85">{email}</div>
                </div>
              ))}
            </div>
            <p className="mt-4 font-mono text-[12.5px] text-white/50">Password for all demo accounts · Demo@2026</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#eeebf2] py-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 text-[12.5px] text-[#9892a2]">
          <div className="flex items-center gap-2.5">
            <Logo dark />
            <span className="font-semibold text-ink-900">TalentFlow AI</span>
            <span>· Your AI Workforce for HR</span>
          </div>
          <div>Prototype built for Builders Pitch Fest 2026 · Demonstration data only</div>
        </div>
      </footer>
    </main>
  );
}

function Eyebrow({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${dark ? 'text-accent-400' : 'text-brand-600'}`}>
      {children}
    </div>
  );
}

function Logo({ dark }: { dark?: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 64 64" className="shrink-0">
      <rect width="64" height="64" rx="14" fill={dark ? '#10091b' : '#7c3aed'} />
      <path d="M20 24h24M32 24v20" stroke={dark ? '#7c3aed' : '#ffffff'} strokeWidth="5" strokeLinecap="round" />
      <circle cx="20" cy="24" r="5" fill="#22d3ee" />
      <circle cx="44" cy="24" r="5" fill="#10b981" />
      <circle cx="32" cy="44" r="5" fill={dark ? '#7c3aed' : '#ffffff'} />
    </svg>
  );
}
