# TalentFlow AI — Database schema

The prototype persists to a process-local seeded store behind a repository-shaped
interface (`src/lib/store.ts`), so swapping in Prisma / Supabase / Firestore is a
single-file change. Below is the production PostgreSQL target, matching
`src/lib/types.ts` one-to-one.

```sql
-- ─────────────────────────────── Identity & org ───────────────────────────────

CREATE TYPE user_role AS ENUM ('HR_ADMIN','RECRUITER','HIRING_MANAGER','EMPLOYEE');

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         citext UNIQUE NOT NULL,
  name          text NOT NULL,
  role          user_role NOT NULL,
  employee_id   uuid REFERENCES employees(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE departments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text UNIQUE NOT NULL,
  manager_id      uuid REFERENCES employees(id),
  attrition_rate  numeric(5,2),
  engagement_score smallint
);

CREATE TYPE employment_status AS ENUM ('Active','Onboarding','Notice Period','Exited');

CREATE TABLE employees (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  email               citext UNIQUE NOT NULL,
  title               text NOT NULL,
  department_id       uuid NOT NULL REFERENCES departments(id),
  manager_id          uuid REFERENCES employees(id),
  location            text,
  join_date           date NOT NULL,
  status              employment_status NOT NULL DEFAULT 'Active',
  level               text,
  employment_type     text,
  probation_end       date,
  leave_annual        smallint NOT NULL DEFAULT 25,
  leave_sick          smallint NOT NULL DEFAULT 15,
  leave_casual        smallint NOT NULL DEFAULT 5,
  performance_score   numeric(2,1),
  engagement_score    smallint,
  training_completion smallint,
  tenure_months       int,
  internal_mobility   smallint DEFAULT 0,
  workload_index      smallint,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON employees (department_id, status);

-- ─────────────────────────────── Skill graph ───────────────────────────────

CREATE TYPE skill_level AS ENUM ('Beginner','Intermediate','Advanced','Expert');

CREATE TABLE skills (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name     text UNIQUE NOT NULL,
  category text NOT NULL
);

CREATE TABLE employee_skills (
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  skill_id    uuid NOT NULL REFERENCES skills(id),
  level       skill_level NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (employee_id, skill_id)
);

-- ─────────────────────────────── Recruitment ───────────────────────────────

CREATE TYPE job_status AS ENUM ('Draft','Pending Approval','Open','On Hold','Closed');

CREATE TABLE jobs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title               text NOT NULL,
  department_id       uuid NOT NULL REFERENCES departments(id),
  location            text NOT NULL,
  seniority           text,
  employment_type     text,
  status              job_status NOT NULL DEFAULT 'Draft',
  openings            smallint NOT NULL DEFAULT 1,
  posted_at           date,
  hiring_manager_id   uuid REFERENCES employees(id),
  recruiter_id        uuid REFERENCES employees(id),
  min_experience      smallint,
  salary_range        text,
  summary             text,
  responsibilities    text[],
  mandatory_skills    text[],
  preferred_skills    text[],
  education           text,
  evaluation_criteria jsonb NOT NULL,   -- [{criterion, weight}]  drives all scoring
  priority            text,
  created_by          text,             -- 'AI Job Description Agent' | 'Human'
  approved_by         uuid REFERENCES users(id),
  approved_at         timestamptz
);

CREATE TYPE candidate_stage AS ENUM
  ('Applied','Screened','Shortlisted','Interviewing','Offered','Hired','Rejected','Withdrawn');

CREATE TABLE candidates (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id             uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  name               text NOT NULL,
  email              citext NOT NULL,
  phone              text,               -- masked in list views
  stage              candidate_stage NOT NULL DEFAULT 'Applied',
  applied_at         date NOT NULL,
  experience_years   smallint,
  current_title      text,
  current_company    text,
  location           text,
  notice_period_days smallint,
  expected_salary    text,
  education          text,
  certifications     text[],
  source             text,
  consent_given      boolean NOT NULL DEFAULT false,
  retention_until    date,               -- data-minimisation window
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON candidates (job_id, stage);

CREATE TABLE candidate_skills (
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  skill_id     uuid NOT NULL REFERENCES skills(id),
  level        skill_level NOT NULL,
  years        smallint,
  PRIMARY KEY (candidate_id, skill_id)
);

CREATE TABLE resumes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  file_url     text,
  parsed_text  text,
  summary      text,
  parsed_at    timestamptz NOT NULL DEFAULT now()
);

-- Screening results are AI recommendations, never decisions.
CREATE TABLE screening_results (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id         uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_id               uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  overall              smallint NOT NULL,
  breakdown            jsonb NOT NULL,   -- [{label, score, weight, evidence}]
  matched_skills       text[],
  missing_skills       text[],
  strengths            text[],
  concerns             text[],
  interview_focus      text[],
  recommendation       text NOT NULL,    -- Advance | Review | Hold
  explanation          text NOT NULL,
  attributes_excluded  text[] NOT NULL,
  generated_by         text NOT NULL,
  generated_at         timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────── Interviews ───────────────────────────────

CREATE TYPE interview_status AS ENUM ('Scheduled','Completed','Cancelled','Awaiting Feedback');

CREATE TABLE interviews (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id   uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_id         uuid NOT NULL REFERENCES jobs(id),
  interviewer_id uuid NOT NULL REFERENCES employees(id),
  round          text NOT NULL,
  scheduled_at   timestamptz NOT NULL,
  duration_mins  smallint NOT NULL DEFAULT 60,
  mode           text,
  status         interview_status NOT NULL DEFAULT 'Scheduled',
  questions      jsonb            -- [{category, question, rationale, lookFor[]}]
);
CREATE INDEX ON interviews (interviewer_id, scheduled_at);

CREATE TABLE interview_feedback (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id        uuid UNIQUE NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  rating_technical    smallint CHECK (rating_technical BETWEEN 1 AND 10),
  rating_problem      smallint CHECK (rating_problem BETWEEN 1 AND 10),
  rating_communication smallint CHECK (rating_communication BETWEEN 1 AND 10),
  rating_leadership   smallint CHECK (rating_leadership BETWEEN 1 AND 10),
  notes               text,
  technical_feedback  text,
  behavioral_feedback text,
  ai_summary          text,
  recommendation      text,   -- advisory only
  reasoning           text,
  submitted_by        uuid NOT NULL REFERENCES users(id),
  submitted_at        timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────── Offer & onboarding ───────────────────────────

CREATE TYPE offer_status AS ENUM ('Draft','Pending Approval','Sent','Accepted','Declined');

CREATE TABLE offers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id  uuid NOT NULL REFERENCES candidates(id),
  job_id        uuid NOT NULL REFERENCES jobs(id),
  status        offer_status NOT NULL DEFAULT 'Draft',
  base_salary   text NOT NULL,
  joining_date  date NOT NULL,
  letter_draft  text,
  approved_by   uuid REFERENCES users(id),   -- never null once status <> Draft
  approved_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE onboarding_tasks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES candidates(id),
  employee_id  uuid REFERENCES employees(id),
  task         text NOT NULL,
  owner        text NOT NULL,
  category     text NOT NULL,     -- Documentation | IT | HR | Manager | Compliance | Training
  day_offset   smallint NOT NULL, -- negative = before start date
  due_date     date NOT NULL,
  status       text NOT NULL DEFAULT 'Not Started'
);

-- ─────────────────────── Employee experience & growth ───────────────────────

CREATE TYPE leave_status AS ENUM ('Pending','Approved','Rejected');

CREATE TABLE leave_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type          text NOT NULL,
  date_from     date NOT NULL,
  date_to       date NOT NULL,
  days          smallint NOT NULL,
  reason        text,
  status        leave_status NOT NULL DEFAULT 'Pending',
  approver_id   uuid NOT NULL REFERENCES employees(id),
  conflicts     text[],
  balance_after smallint,
  decided_by    uuid REFERENCES users(id),
  decided_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE performance_reviews (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id          uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  cycle                text NOT NULL,
  goals_achieved       smallint,
  goals_total          smallint,
  rating               numeric(2,1),        -- set by the manager, not the agent
  ai_summary           text,                -- advisory
  strengths            text[],
  development_areas    text[],
  suggested_objectives text[],
  manager_id           uuid NOT NULL REFERENCES employees(id),
  status               text NOT NULL DEFAULT 'Draft',
  approved_by          uuid REFERENCES users(id),
  UNIQUE (employee_id, cycle)
);

CREATE TABLE employee_goals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  title       text NOT NULL,
  progress    smallint NOT NULL DEFAULT 0,
  due_date    date,
  status      text NOT NULL DEFAULT 'On Track'
);

CREATE TABLE training_courses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  provider        text,
  hours           smallint,
  level           skill_level,
  format          text,
  completion_rate smallint
);

CREATE TABLE training_course_skills (
  course_id uuid NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  skill_id  uuid NOT NULL REFERENCES skills(id),
  PRIMARY KEY (course_id, skill_id)
);

CREATE TABLE learning_recommendations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  target_role text NOT NULL,
  readiness   smallint,
  gaps        jsonb,     -- [{skill, current, required}]
  roadmap     jsonb,     -- [{phase, weeks, items[]}]
  explanation text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Engagement feedback is stored WITHOUT any link back to the individual.
CREATE TABLE employee_feedback (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES departments(id),
  theme         text NOT NULL,
  sentiment     numeric(3,2) CHECK (sentiment BETWEEN -1 AND 1),
  quarter       text NOT NULL,
  comment       text
);

-- ─────────────────────────── Knowledge base ───────────────────────────

CREATE TABLE policies (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text NOT NULL,
  category   text NOT NULL,
  version    text NOT NULL,
  updated_at date NOT NULL,
  content    text NOT NULL,
  tags       text[],
  embedding  vector(768)   -- pgvector, for semantic retrieval in production
);
CREATE INDEX ON policies USING gin (to_tsvector('english', content));

-- ─────────────────────── Agents, approvals & audit ───────────────────────

CREATE TABLE agent_runs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request    text NOT NULL,
  intent     text NOT NULL,
  actor_id   uuid NOT NULL REFERENCES users(id),
  status     text NOT NULL,
  plan       jsonb NOT NULL,
  reasoning  text NOT NULL,
  engine     text NOT NULL,   -- 'llm' | 'deterministic'
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE agent_tasks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id            uuid NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  agent_id          text NOT NULL,
  label             text NOT NULL,
  status            text NOT NULL,
  summary           text,
  output            jsonb,
  requires_approval boolean NOT NULL DEFAULT false,
  approval_id       uuid REFERENCES approval_requests(id),
  started_at        timestamptz,
  finished_at       timestamptz,
  duration_ms       int
);

CREATE TABLE ai_recommendations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id       text NOT NULL,
  entity_type    text NOT NULL,
  entity_id      uuid NOT NULL,
  recommendation text NOT NULL,
  explanation    jsonb NOT NULL,   -- always populated: no unexplained output
  model          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE approval_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type           text NOT NULL,
  title          text NOT NULL,
  summary        text NOT NULL,
  requested_by   text NOT NULL,
  requested_at   timestamptz NOT NULL DEFAULT now(),
  required_roles user_role[] NOT NULL,
  status         text NOT NULL DEFAULT 'Pending',
  payload        jsonb NOT NULL,
  ai_recommendation text NOT NULL,
  explanation    text[] NOT NULL,
  run_id         uuid REFERENCES agent_runs(id),
  decided_by     uuid REFERENCES users(id),
  decided_at     timestamptz,
  note           text
);
CREATE INDEX ON approval_requests (status, requested_at DESC);

-- Append-only. No UPDATE or DELETE grant is issued on this table.
CREATE TABLE audit_logs (
  id          bigserial PRIMARY KEY,
  at          timestamptz NOT NULL DEFAULT now(),
  actor       text NOT NULL,
  actor_role  text NOT NULL,     -- user_role | 'AI Agent' | 'System'
  action      text NOT NULL,
  entity      text NOT NULL,
  entity_id   text NOT NULL,
  detail      text NOT NULL,
  severity    text NOT NULL DEFAULT 'info',
  ip          inet
);
CREATE INDEX ON audit_logs (at DESC);
CREATE INDEX ON audit_logs (entity, entity_id);

CREATE TABLE notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text NOT NULL,
  body       text NOT NULL,
  for_roles  user_role[] NOT NULL,
  kind       text NOT NULL,
  read       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

## Design notes

- **`jobs.evaluation_criteria` is the contract.** The same weights that a human
  approves on the requisition are the weights the Screening Agent uses. Scoring
  can never drift from what was approved.
- **`screening_results.attributes_excluded` is stored per result,** so an audit
  can prove which attributes were out of scope at the time of scoring.
- **`ai_recommendations.explanation` is `NOT NULL`.** The schema makes an
  unexplained AI output unrepresentable.
- **`audit_logs` is append-only** — the application role is granted `INSERT` and
  `SELECT` only.
- **`employee_feedback` carries no employee foreign key,** so engagement analysis
  cannot re-identify an individual even with full database access.
- **No table anywhere holds gender, race, religion, nationality, disability,
  marital status or date of birth.** The data those attributes would live in
  does not exist, which is a stronger guarantee than filtering them at query time.
