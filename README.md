# TalentFlow AI

### Your AI Workforce for HR

**Builders Pitch Fest 2026 — HR Automation Agents**

TalentFlow AI is an autonomous multi-agent HR platform. Sixteen specialised AI agents, coordinated by a single orchestrator, run workflows across the complete employee lifecycle — while every employment decision stops at a named human approver.

> **Live prototype:** `<DEPLOYMENT_URL>`
> **Demo access:** `demo@talentflow.ai` / `Demo@2026`

---

## Table of contents

1. [The problem](#the-problem)
2. [What makes this different](#what-makes-this-different)
3. [Features](#features)
4. [Agent architecture](#agent-architecture)
5. [Technology stack](#technology-stack)
6. [Architecture diagram](#architecture-diagram)
7. [Demo workflows](#demo-workflows)
8. [Getting started](#getting-started)
9. [Environment variables](#environment-variables)
10. [Deployment](#deployment)
11. [Project structure](#project-structure)
12. [Data model](#data-model)
13. [Security](#security)
14. [Responsible AI](#responsible-ai)
15. [Sample dataset](#sample-dataset)
16. [Business impact](#business-impact)
17. [Roadmap](#roadmap)

---

## The problem

HR teams lose their week to work that a system of record does not do for them:

| Signal | Reality |
| --- | --- |
| **23 hrs / week** | Writing job descriptions, reviewing CVs and shortlisting for a single technical requisition |
| **44 days** | Requisition to signed offer — most of it waiting on coordination, not decisions |
| **60% of HR tickets** | Repeat policy questions that already have a documented answer |
| **11 systems** | Employee data nobody can query in one place when a decision is due |

An HRMS stores the requisition. It does not write the description, read 200 CVs, prepare the interview, chase the documents, or answer the same leave question for the fortieth time.

## What makes this different

| | Traditional HRMS | Recruitment software | Generic AI copilot | **TalentFlow AI** |
| --- | --- | --- | --- | --- |
| Stores records | ✅ | ✅ | — | ✅ |
| Tracks applicants | partial | ✅ | — | ✅ |
| Answers questions | — | — | ✅ | ✅ |
| **Plans a multi-step workflow** | — | — | — | ✅ |
| **Coordinates specialist agents** | — | — | — | ✅ |
| **Executes HR tasks end to end** | — | — | — | ✅ |
| **Explains every recommendation** | — | — | partial | ✅ |
| **Enforces human approval gates** | — | — | — | ✅ |

TalentFlow AI is a **system of action**, not a system of record.

---

## Features

### Talent acquisition
- **AI HR Command Center** — one natural-language box that plans and runs multi-agent workflows
- **Workforce planning** — business signal → roles, skills, seniority, priority, plus a live skill-shortage scan of the actual workforce
- **Job creation** — AI-drafted JD with inclusive-language checking and weighted evaluation criteria; fully editable, human-approved before publication
- **Resume analysis** — every candidate scored on the *approved* criteria, with per-dimension evidence
- **Candidate comparison** — 2–4 candidates side by side with a skill-profile radar and AI comparative insight
- **Interview intelligence** — tailored question guides anchored to what the CV actually claims, with "what good looks like" for each question
- **Interview scheduling** — conflict-free slot resolution against interviewer availability (calendar integration simulated in the prototype)
- **Interview evaluation** — panel ratings normalised against a role bar into a reasoned recommendation
- **Offer & onboarding** — offer letter drafting within band, then a 14-task programme from Day −10 to Day 30 across HR, Compliance, IT and the hiring manager

### Employee experience
- **HR AI Assistant** — retrieval-augmented answering over a governed 12-policy knowledge base; every answer cites its source and version, and escalates rather than guessing
- **Leave management** — plain-language requests parsed into validated, conflict-checked, correctly-routed leave
- **Onboarding & offboarding** — sequenced, owner-assigned, completion-tracked

### Workforce intelligence
- **Performance** — evidence-based review packs; ratings advisory only
- **Learning & skills** — live skill graph, target-role gap analysis, phased roadmaps, internal succession ranking
- **Engagement analytics** — anonymised theme analysis with small-sample suppression
- **Retention risk** — six explainable, work-related indicators; supportive actions only
- **Workforce analytics** — headcount, capability coverage, attrition, learning uptake

### Governance
- **Approvals** — every sensitive action with Approve / Reject / Modify / Request more information
- **Agent activity** — the full task graph of every run: which agents ran, what they produced, where a human was required
- **Audit logs** — actor, action, entity, reasoning, timestamp, severity
- **RBAC** — four roles, enforced in navigation, page guards and API handlers independently

---

## Agent architecture

```
                              HR user (natural language)
                                        │
                          ┌─────────────▼─────────────┐
                          │  HR COORDINATOR AGENT     │
                          │  intent · plan · state    │
                          │  aggregate · approval gate│
                          └─────────────┬─────────────┘
        ┌──────────────┬────────────────┼────────────────┬──────────────┐
        ▼              ▼                ▼                ▼              ▼
  TALENT ACQUISITION            EMPLOYEE EXPERIENCE          WORKFORCE INTELLIGENCE
  ─────────────────             ───────────────────          ──────────────────────
  Workforce Planning            HR Helpdesk (RAG)            Performance Management
  Job Description               Leave Management             Learning & Skills
  Talent Acquisition            Offboarding                  Employee Engagement
  Resume Screening                                           Retention Risk
  Interview Intelligence
  Interview Evaluation
  Interview Scheduling
  Offer & Onboarding
        │              │                │                │              │
        └──────────────┴────────────────┼────────────────┴──────────────┘
                                        ▼
                      HR database + policy knowledge base
                                        ▼
                        HUMAN APPROVAL  →  AUDIT LOG
```

| # | Agent | Approval gate | Core guardrail |
| --- | --- | --- | --- |
| 1 | HR Coordinator | — | Never executes an employment decision itself |
| 2 | Workforce Planning | — | Headcount approval remains a human budget decision |
| 3 | Job Description | ✅ | Never publishes without human approval; flags exclusionary phrasing |
| 4 | Talent Acquisition | — | Protected attributes dropped at parse time |
| 5 | Resume Screening | ✅ | Cannot reject; every score ships with evidence |
| 6 | Interview Intelligence | — | No questions touching protected attributes |
| 7 | Interview Evaluation | ✅ | Hiring decision authority stays with the manager |
| 8 | Interview Scheduling | — | Calendar integrations simulated in prototype |
| 9 | Offer & Onboarding | ✅ | Offers never issued without a named approver |
| 10 | HR Helpdesk | — | Answers only from retrieved policy; escalates otherwise |
| 11 | Leave Management | ✅ | Never self-approves |
| 12 | Performance Management | ✅ | Ratings advisory; manager sets, HR approves |
| 13 | Learning & Skills | — | Development recommendations, never grounds for adverse action |
| 14 | Employee Engagement | — | Aggregate only; <5 responses suppressed |
| 15 | Retention Risk | — | Never recommends termination, demotion or adverse action |
| 16 | Offboarding | — | Access revocation logged, IT-confirmed |

---

## Technology stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router, React 19, Server Components) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 3 with a custom enterprise design system |
| Charts | Recharts |
| Icons | Lucide |
| API | Next.js Route Handlers (server-only) |
| AI | Google Gemini or OpenAI, with a deterministic reasoning engine as fallback |
| Retrieval | Lexical BM25-flavoured retriever over the governed policy corpus |
| Auth | HMAC-SHA256 signed HttpOnly session cookie (Auth0 / Supabase Auth / Firebase Auth drop-in ready) |
| Persistence | Seeded process-local store behind a repository-shaped interface (PostgreSQL / Supabase drop-in ready) |
| Hosting | Vercel |

### Dual-engine AI design

Every agent has a **deterministic implementation** that produces the complete, grounded result — scores, breakdowns, evidence, plans. When `GEMINI_API_KEY` or `OPENAI_API_KEY` is present, the model is layered **on top** to write the narrative summary and enrich prose, constrained to facts already present in the grounded result.

This means:
- The demo works with **zero configuration** — judges never hit a blank screen
- Scores and recommendations are **reproducible and auditable**, not model-temperature-dependent
- The model **cannot hallucinate a candidate, a number or an outcome** — it only rewrites what the agents computed

---

## Architecture diagram

```
┌──────────────────────────────────────────────────────────────────┐
│  FRONTEND — Next.js App Router, React Server Components          │
│  Landing · Login · 27 role-gated application pages               │
└───────────────────────────────┬──────────────────────────────────┘
                                │  fetch (same-origin)
┌───────────────────────────────▼──────────────────────────────────┐
│  MIDDLEWARE — route protection, session presence                 │
└───────────────────────────────┬──────────────────────────────────┘
┌───────────────────────────────▼──────────────────────────────────┐
│  API LAYER — Route Handlers                                      │
│  rate limiting · input validation · authn · RBAC                 │
│  /api/command  /api/assistant  /api/screen  /api/jd              │
│  /api/interview-questions  /api/schedule  /api/evaluate          │
│  /api/offer  /api/leave  /api/learning  /api/retention           │
│  /api/approvals  /api/audit  /api/health                         │
└───────────────────────────────┬──────────────────────────────────┘
┌───────────────────────────────▼──────────────────────────────────┐
│  HR COORDINATOR AGENT — intent classification, planning,         │
│  task-state machine, result aggregation, approval routing        │
└───────────────────────────────┬──────────────────────────────────┘
┌───────────────────────────────▼──────────────────────────────────┐
│  15 SPECIALIST AGENTS — deterministic engine + optional LLM      │
└───────────────────────────────┬──────────────────────────────────┘
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐   ┌────────────────────┐   ┌───────────────────┐
│ AI MODEL      │   │ HR DATABASE        │   │ KNOWLEDGE BASE    │
│ Gemini/OpenAI │   │ 25 entities        │   │ 12 HR policies    │
│ server-side   │   │ seeded demo data   │   │ lexically indexed │
└───────────────┘   └────────────────────┘   └───────────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │  APPROVALS + AUDIT LOG │
                    └────────────────────────┘
```

---

## Demo workflows

### 1 · End-to-end recruitment (primary demo)

Sign in as **HR Administrator** → **AI HR Command Center** → click *Recruit a Senior DevOps Engineer*, or type:

> *"We need to hire a Senior DevOps Engineer in Dubai with Kubernetes, AWS, Terraform and CI/CD experience."*

Seven agents run in sequence:

| Step | Agent | Output |
| --- | --- | --- |
| 1 | Coordinator | Intent `RECRUIT_ROLE`, entities extracted, 7-step plan built |
| 2 | Workforce Planning | Role validated against the cloud-modernisation pattern + live skill-shortage scan |
| 3 | Job Description | Draft JD, inclusive-language check, 5 weighted evaluation criteria — **approval gate** |
| 4 | Talent Acquisition | 9 candidates parsed into structured skill profiles |
| 5 | Resume Screening | Ranked with per-dimension evidence (top match 94%) — **approval gate** |
| 6 | Interview Intelligence | 7 tailored questions across 5 categories for the leading candidate |
| 7 | Offer & Onboarding | 14-task onboarding programme staged, Day −10 → Day 30 |

Then: **Approvals** → approve the shortlist → **Candidate profile** → generate the interview guide, find slots, book, evaluate → draft the offer → approve → **Onboarding**.

### 2 · Employee leave request

Sign in as **Employee** → **HR AI Assistant**:

> *"I want annual leave from 21 September to 25 September."*

Identify employee → check balance → calculate working days (Gulf weekend excluded) → detect team-coverage conflicts → identify manager → create request → route for approval → return status.

### 3 · Internal succession

Sign in as **HR Administrator** → **AI HR Command Center**:

> *"Who are the best internal candidates for our upcoming Cloud Platform Lead position?"*

Analyse the employee skill graph → compare against the role profile → identify gaps → rank by composite (60% skill readiness, 28% performance, 12% learning participation) → explain each ranking → attach a development plan. **No promotion decision is made automatically.**

---

## Getting started

```bash
git clone <repository-url>
cd talentflow-ai
npm install
cp .env.example .env.local     # optional — the app runs without any keys
npm run dev                    # http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

Health check: `GET /api/health` returns the active engine and entity counts.

### Demo accounts

| Role | Email | Password | Access |
| --- | --- | --- | --- |
| HR Administrator | `demo@talentflow.ai` | `Demo@2026` | Everything: recruitment, employees, agents, analytics, audit |
| Recruiter | `recruiter@talentflow.ai` | `Demo@2026` | Jobs, candidates, screening, interviews, recruitment agents |
| Hiring Manager | `manager@talentflow.ai` | `Demo@2026` | Assigned requisitions, shortlists, evaluations, hiring approvals |
| Employee | `employee@talentflow.ai` | `Demo@2026` | HR AI assistant, leave, profile, learning, performance goals |

All demo accounts are synthetic. No real personal data exists anywhere in this repository.

---

## Environment variables

Copy `.env.example` → `.env.local`. **Every variable is optional** — the platform runs its deterministic engine when no key is present.

| Variable | Purpose | Default |
| --- | --- | --- |
| `GEMINI_API_KEY` | Google Gemini API key | unset → deterministic engine |
| `OPENAI_API_KEY` | OpenAI API key | unset |
| `AI_PROVIDER` | `gemini` \| `openai` \| `deterministic` | `gemini` |
| `GEMINI_MODEL` | Gemini model id | `gemini-2.0-flash` |
| `OPENAI_MODEL` | OpenAI model id | `gpt-4o-mini` |
| `AUTH_SECRET` | Session signing secret (use a long random string) | dev fallback |
| `DATABASE_URL` | Reserved for the PostgreSQL/Supabase adapter | unset |
| `RATE_LIMIT_PER_MINUTE` | Per-IP, per-endpoint limit | `60` |

**No secret is ever committed, and no key is ever sent to the browser.** All model calls originate from server-side route handlers.

---

## Deployment

### Vercel (recommended)

1. Push this repository to GitHub.
2. In Vercel: **Add New → Project → Import** the repository. Framework preset is detected as Next.js; no build configuration is needed.
3. Add environment variables under **Settings → Environment Variables**:
   - `AUTH_SECRET` — a long random string (required for a stable session in production)
   - `GEMINI_API_KEY` or `OPENAI_API_KEY` — optional; enables model-written narratives
4. **Deploy.**

Or from the CLI:

```bash
npm i -g vercel
vercel login
vercel --prod
```

The application deploys and runs correctly **with no environment variables at all** — judges never need to configure anything.

### Other targets

Any Node 20+ host works: Netlify (Next runtime), Google Cloud Run, Firebase App Hosting, AWS Amplify, Azure Static Web Apps. Build with `npm run build`, serve with `npm start`.

---

## Project structure

```
talentflow-ai/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Public landing page
│   │   ├── login/                   # Authentication
│   │   ├── denied/                  # RBAC denial page
│   │   ├── (app)/                   # Authenticated shell (sidebar + topbar)
│   │   │   ├── layout.tsx           # Session guard + navigation
│   │   │   ├── session.ts           # Server-side session + RBAC helper
│   │   │   ├── dashboard/           # HR executive dashboard
│   │   │   ├── command-center/      # AI HR Command Center
│   │   │   ├── agents/              # Agent registry
│   │   │   ├── agent-activity/      # Run task graphs
│   │   │   ├── jobs/ jobs/new/ jobs/[id]/
│   │   │   ├── candidates/ candidates/[id]/
│   │   │   ├── resume-analysis/ compare/
│   │   │   ├── interviews/ evaluations/ offers/ onboarding/
│   │   │   ├── employees/ employees/[id]/
│   │   │   ├── assistant/ leave/ performance/ learning/
│   │   │   ├── engagement/ workforce/ offboarding/ policies/
│   │   │   └── approvals/ audit/ settings/
│   │   └── api/                     # Server-only route handlers
│   ├── components/                  # Design system + agent result renderers
│   ├── lib/
│   │   ├── types.ts                 # 25-entity domain model
│   │   ├── seed.ts                  # Deterministic demo dataset
│   │   ├── store.ts                 # Repository-shaped persistence layer
│   │   ├── auth.ts  rbac.ts  api.ts  tone.ts
│   │   ├── ai.ts                    # Provider abstraction + fallback
│   │   └── agents/
│   │       ├── registry.ts          # 16 agent definitions
│   │       ├── coordinator.ts       # Orchestration + intent classification
│   │       ├── screening.ts         # Explainable candidate scoring
│   │       └── specialists.ts       # All specialist agent logic
│   └── middleware.ts                # Route protection
├── .env.example
├── next.config.mjs                  # Security headers
└── tailwind.config.ts
```

---

## Data model

25 entities, defined in `src/lib/types.ts` and mapped 1:1 to the production PostgreSQL schema:

`User` · `Employee` · `Department` · `Job` · `Candidate` · `CandidateSkill` · `Resume` · `Interview` · `InterviewFeedback` · `Offer` · `OnboardingTask` · `LeaveRequest` · `PerformanceReview` · `EmployeeGoal` · `Skill` · `EmployeeSkill` · `TrainingCourse` · `LearningRecommendation` · `Policy` · `EmployeeFeedback` · `AgentTask` · `AgentRun` · `AIRecommendation` · `ApprovalRequest` · `AuditLog` · `Notification`

The prototype persists to a process-local store behind a repository interface so that swapping in Prisma, Supabase or Firestore is a single-file change (`src/lib/store.ts`).

---

## Security

| Control | Implementation |
| --- | --- |
| Server-side model calls | All provider calls originate in route handlers; no key reaches the browser |
| Secrets management | Environment variables only; `.env.example` ships with empty values; `.env*` is gitignored |
| Session | HMAC-SHA256 signed, HttpOnly, SameSite=Lax, Secure in production, 12-hour expiry |
| Route protection | Middleware on every non-public route; each page re-verifies server-side |
| Authorisation | RBAC enforced independently in navigation, page guards and API handlers |
| Input validation | Every request body length-capped and stripped of control characters |
| Rate limiting | Per-IP, per-endpoint token bucket, configurable |
| Secure headers | `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` |
| Audit logging | Every agent run, recommendation, human decision and denied access |
| PII protection | Candidate contact details masked in list views; agents receive task-relevant fields only |
| Data minimisation | Agents receive the minimum fields the task requires |
| Consent management | Candidate consent flag and 12-month retention window tracked on the record |

---

## Responsible AI

**Excluded from every assessment path, without exception:**
gender · race/ethnicity · religion · nationality · disability · marital status · age · photograph · name-derived inferences

**Enforced controls:**

- **Human-in-the-loop** — shortlisting, rejection, hiring, offers, ratings, promotion, termination and job publication all require a named human approver
- **Explainability** — no score is ever returned alone; each dimension carries its weight, result and evidence sentence
- **Auditability** — every agent run and human decision is written to an append-only log with reasoning
- **Bias safeguards** — inclusive-language checking on generated job descriptions; scoring restricted to the approved evaluation criteria
- **Small-sample suppression** — engagement segments below five responses are withheld to protect anonymity
- **No adverse-action automation** — the Retention Risk Agent never recommends termination, demotion or any adverse employment action
- **Right to explanation** — candidates and employees may request an explanation of any AI-assisted recommendation affecting them, and may request human review

These are documented in-product as *Employee Data Privacy & AI Use (v1.4)* in the policy knowledge base, and surfaced on every screen that shows an AI recommendation.

---

## Sample dataset

Deterministically generated so every environment renders identically:

| Entity | Count |
| --- | --- |
| Employees | 50 |
| Departments | 8 (Engineering, IT, Finance, Human Resources, Operations, Marketing, Sales, Customer Success) |
| Open positions | 10 requisitions / 13 openings |
| Candidates | 50 |
| Interviews | 20 |
| Employees onboarding | 5 (60 sequenced tasks) |
| Leave requests | 10 |
| Training programmes | 10 |
| Skills | 32 across 9 categories |
| HR policies | 12, retrieval-indexed |
| Performance reviews | 18 |
| Engagement feedback | ~150 anonymised entries across 4 quarters |

---

## Business impact

**Prototype target outcomes** — modelled from the workflow time removed in the prototype against published HR benchmarks. These are targets for a production pilot, not verified production results.

| Target | Metric |
| --- | --- |
| **60%** | reduction in resume screening time |
| **40%** | faster hiring cycles |
| **50%** | less repetitive HR administration |
| **70%** | faster employee HR query resolution |
| **30%** | less onboarding administration |
| **100%** | of AI recommendations delivered with an explanation |

Qualitative: improved candidate experience, improved workforce skill visibility, lower HR operational cost.

---

## Roadmap

```
Prototype (now)
   ↓
HR system integrations — HRIS, ATS, calendar, email, e-signature
   ↓
Enterprise pilots — production data, SOC 2, tenant isolation
   ↓
Payroll / ERP integrations — SAP, Oracle, Workday, regional payroll
   ↓
Advanced workforce intelligence — scenario planning, org design, internal marketplace
   ↓
Global HR AI platform — multi-country compliance, multilingual agents
```

---

## Licence & disclaimer

Built as a prototype for Builders Pitch Fest 2026. All employee, candidate, interview and feedback records are synthetic and contain no real personal data. No credentials in this repository are production credentials.

**TalentFlow AI — transforming HR from administration into intelligent workforce orchestration.**
