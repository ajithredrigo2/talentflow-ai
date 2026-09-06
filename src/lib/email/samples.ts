import type { RawMessage } from './providers';

/**
 * Demonstration mailbox content.
 *
 * These are synthetic applications used when no live mailbox is connected.
 * They are handed to exactly the same `processIncomingEmail()` pipeline as real
 * mail — there is no separate demo workflow anywhere in this codebase.
 */

export interface SampleApplication {
  key: string;
  label: string;
  note: string;
  mailbox: string;
  message: Omit<RawMessage, 'receivedAt'> & { receivedAt?: string };
  resumeText: string;
}

const JOHN_DOE_CV = `JOHN DOE
Senior DevOps Engineer
Dubai, United Arab Emirates
john.doe@example.com | +971 5X XXX 8841
linkedin.com/in/johndoe-devops | github.com/johndoe-devops

PROFESSIONAL SUMMARY
DevOps and platform engineer with 6 years of experience building and operating
production Kubernetes platforms on AWS. Owns infrastructure-as-code, delivery
pipelines and reliability for a 40-engineer product organisation. Reduced
deployment lead time from two days to under one hour and cut cloud spend 19%
through rightsizing and scheduled scaling.

TECHNICAL SKILLS
Cloud & Infrastructure: AWS (EC2, EKS, RDS, S3, IAM, CloudFront), Terraform, CloudFormation
Containers & Orchestration: Kubernetes, Docker, Helm, Argo CD
CI/CD: Jenkins, GitHub Actions, GitLab CI, Argo Rollouts
Operating Systems: Linux (RHEL, Ubuntu), Bash
Observability: Prometheus, Grafana, OpenTelemetry, ELK
Languages: Python, Go (working knowledge), YAML, HCL

PROFESSIONAL EXPERIENCE

Senior DevOps Engineer — Tabby, Dubai
March 2023 – Present
- Own three production EKS clusters serving 1,100 req/s at peak
- Built a Terraform module library adopted by six product teams, cutting new
  service provisioning from three days to forty minutes
- Migrated Jenkins pipelines to GitHub Actions with Argo CD progressive delivery
- Introduced SLOs and error-budget policy; reduced Sev-1 incidents by 45%
- On-call rotation lead; authored the incident response runbook

DevOps Engineer — Property Finder, Dubai
July 2020 – February 2023
- Containerised 22 legacy services and moved them onto Kubernetes
- Built the GitLab CI templates used across the engineering organisation
- Implemented centralised logging and alerting on Prometheus and Grafana
- Managed AWS cost optimisation programme, saving USD 210k annually

Systems Engineer — Emaar Digital, Dubai
August 2019 – June 2020
- Linux server administration and automation with Ansible
- Supported the migration of on-premise workloads into AWS

CERTIFICATIONS
Certified Kubernetes Administrator (CKA) — 2024
AWS Certified Solutions Architect – Associate — 2023
HashiCorp Certified: Terraform Associate — 2022

EDUCATION
B.E. Computer Science, Anna University, 2019

PROJECTS
Internal Developer Platform — self-service environment provisioning portal built
on Terraform, Backstage and Argo CD, used by 40 engineers daily.
Chaos engineering programme — scheduled fault injection across staging EKS.

LANGUAGES
English (fluent), Hindi (native), Arabic (basic)

ADDITIONAL
Notice period: 30 days
Expected salary: AED 31,000 per month`;

const SARAH_KHAN_CV = `SARAH KHAN
Cloud Engineer
Abu Dhabi, United Arab Emirates
sarah.khan@example.com | +971 5X XXX 2210
linkedin.com/in/sarahkhan-cloud

PROFESSIONAL SUMMARY
Cloud engineer with 4 years of experience delivering AWS landing zones and
migration workloads for regulated enterprises. Strong infrastructure-as-code
practice and a growing platform reliability background.

TECHNICAL SKILLS
AWS, Terraform, Linux, CI/CD (GitHub Actions), Docker, Kubernetes (working),
Python scripting, CloudWatch, FinOps tagging and cost reporting

PROFESSIONAL EXPERIENCE

Cloud Engineer — Etisalat Digital, Abu Dhabi
September 2022 – Present
- Delivered a multi-account AWS landing zone with Control Tower and Terraform
- Automated migration waves for 30 workloads from on-premise to AWS
- Built cost-allocation tagging standards and monthly FinOps reporting

Associate Cloud Engineer — Aramex, Dubai
June 2021 – August 2022
- Managed EC2, RDS and S3 estates and their backup posture
- Wrote Python automation for routine operational tasks

CERTIFICATIONS
AWS Certified Solutions Architect – Associate — 2023
HashiCorp Certified: Terraform Associate — 2024

EDUCATION
B.Sc. Information Technology, University of Sharjah, 2021

LANGUAGES
English (fluent), Arabic (fluent), Urdu (native)

Notice period: 60 days`;

const AHMED_ALI_CV = `AHMED ALI
IT Professional
Dubai, United Arab Emirates
ahmed.ali@example.com | +971 5X XXX 6633

SUMMARY
IT professional with 5 years across systems administration, service desk
leadership and security operations. Seeking a role where I can combine
infrastructure and security responsibilities.

SKILLS
Linux administration, Active Directory, Identity & Access Management,
vulnerability management, Microsoft 365, Azure administration, incident response,
ITIL service management, PowerShell

EXPERIENCE

Senior Systems Administrator — Chalhoub Group, Dubai
2022 – Present
- Directory services, endpoint management and patch compliance for 900 users
- Led the rollout of conditional access and MFA across the organisation

IT Security Analyst — du, Dubai
2020 – 2022
- SOC triage, vulnerability remediation tracking, audit support

CERTIFICATIONS
Microsoft Certified: Azure Administrator Associate
CompTIA Security+

EDUCATION
B.Sc. Computer Science, Ajman University, 2019

LANGUAGES
Arabic (native), English (fluent)`;

const RETURNING_CV = `${SARAH_KHAN_CV}

ADDITIONAL NOTE
Applying again following our earlier conversation about the platform team.
Since my last application I have completed the Terraform Associate certification
and taken on Kubernetes responsibilities for two production services.`;

export const SAMPLE_APPLICATIONS: SampleApplication[] = [
  {
    key: 'job-code-subject',
    label: 'Application with job code in subject',
    note: 'The primary demo: subject carries the requisition code DEVOPS-2026-004, so job identification is exact.',
    mailbox: 'careers@talentflow.demo',
    message: {
      messageId: 'sim-john-doe',
      fromName: 'John Doe',
      fromEmail: 'john.doe@example.com',
      subject: 'Application – DEVOPS-2026-004',
      body: `Dear Talent Acquisition Team,

I would like to apply for the Senior DevOps Engineer position in Dubai
(reference DEVOPS-2026-004), advertised on your careers page.

I have six years of experience running production Kubernetes on AWS, building
Terraform module libraries and owning CI/CD and reliability for a 40-engineer
organisation. My CV is attached with full details.

I am currently on a 30-day notice period and available for interview at short notice.

Kind regards,
John Doe
+971 5X XXX 8841
linkedin.com/in/johndoe-devops`,
      attachments: [
        { filename: 'John_Doe_Resume.pdf', mimeType: 'application/pdf', sizeBytes: 214_312 },
      ],
    },
    resumeText: JOHN_DOE_CV,
  },
  {
    key: 'job-title-subject',
    label: 'Application with job title only',
    note: 'No requisition code — the Job Matching Agent resolves the vacancy from the title in the subject line.',
    mailbox: 'jobs@talentflow.demo',
    message: {
      messageId: 'sim-sarah-khan',
      fromName: 'Sarah Khan',
      fromEmail: 'sarah.khan@example.com',
      subject: 'Application for Cloud Engineer',
      body: `Hello,

Please find my CV attached for the Cloud Engineer role in Abu Dhabi.

I have four years of AWS and Terraform experience delivering landing zones and
migration programmes, most recently at Etisalat Digital.

Thank you for your consideration.

Sarah Khan`,
      attachments: [{ filename: 'Sarah_Khan_CV.pdf', mimeType: 'application/pdf', sizeBytes: 156_880 }],
    },
    resumeText: SARAH_KHAN_CV,
  },
  {
    key: 'ambiguous',
    label: 'Speculative application — vacancy inferred',
    note: 'Names no role at all. The Job Matching Agent falls through to skills inference and clears the higher bar that inference-only assignment requires.',
    mailbox: 'recruitment@talentflow.demo',
    message: {
      messageId: 'sim-ahmed-ali',
      fromName: 'Ahmed Ali',
      fromEmail: 'ahmed.ali@example.com',
      subject: 'Job application',
      body: `Hi,

I am interested in opportunities at your organisation and have attached my CV.
I have experience in IT infrastructure and security and would be glad to discuss
any suitable openings.

Best regards,
Ahmed Ali`,
      attachments: [{ filename: 'Ahmed_Ali_CV.pdf', mimeType: 'application/pdf', sizeBytes: 98_440 }],
    },
    resumeText: AHMED_ALI_CV,
  },
  {
    key: 'unassignable',
    label: 'Speculative application — cannot be matched',
    note: 'A background with no meaningful overlap with any open vacancy. Inference falls short of the bar, so the agent refuses to guess and parks it in Unassigned Applications.',
    mailbox: 'recruitment@talentflow.demo',
    message: {
      messageId: 'sim-lena-fischer',
      fromName: 'Lena Fischer',
      fromEmail: 'lena.fischer@example.com',
      subject: 'Open application',
      body: `Hello,

I am relocating to the UAE and would like to be considered for any suitable
opening. My background is in editorial and visual design. My CV is attached.

Best wishes,
Lena Fischer`,
      attachments: [{ filename: 'Lena_Fischer_CV.pdf', mimeType: 'application/pdf', sizeBytes: 187_620 }],
    },
    resumeText: `LENA FISCHER
Editorial Designer
Berlin, Germany — relocating to Dubai, United Arab Emirates
lena.fischer@example.com | +49 XXX XXX 4417

PROFESSIONAL SUMMARY
Editorial and brand designer with 8 years of experience across print and digital
publishing. Art-directed three national magazine relaunches and built the design
system used across a publisher's twelve titles.

SKILLS
Editorial design, typography, art direction, brand identity, print production,
Adobe InDesign, Illustrator, Photoshop, Figma, photo editing, colour management

PROFESSIONAL EXPERIENCE

Senior Editorial Designer — Verlagsgruppe Nord, Berlin
2021 – Present
- Art direction for two weekly titles and their digital editions
- Built and maintained the cross-title design system

Editorial Designer — Studio Kranz, Hamburg
2017 – 2021
- Magazine layout, cover design and print production management

EDUCATION
Diplom-Designer (FH), Communication Design, HAW Hamburg, 2017

LANGUAGES
German (native), English (fluent)

Notice period: 60 days`,
  },
  {
    key: 'duplicate',
    label: 'Returning candidate — second application',
    note: 'Same person applying for a different vacancy. Deduplication links a new application to the existing candidate profile.',
    mailbox: 'careers@talentflow.demo',
    message: {
      messageId: 'sim-sarah-khan-2',
      fromName: 'Sarah Khan',
      fromEmail: 'sarah.khan@example.com',
      subject: 'Application – DEVOPS-2026-004 – Senior DevOps Engineer',
      body: `Hello again,

Following my earlier application for the Cloud Engineer role, I would also like
to be considered for the Senior DevOps Engineer position (DEVOPS-2026-004).

I have since completed my Terraform Associate certification and taken on
Kubernetes responsibilities for two production services.

Kind regards,
Sarah Khan`,
      attachments: [{ filename: 'Sarah_Khan_CV_v2.pdf', mimeType: 'application/pdf', sizeBytes: 161_204 }],
    },
    resumeText: RETURNING_CV,
  },
  {
    key: 'no-attachment',
    label: 'Application with no CV attached',
    note: 'Exercises the missing-attachment path: flagged for a recruiter to request the CV, never silently dropped.',
    mailbox: 'careers@talentflow.demo',
    message: {
      messageId: 'sim-no-cv',
      fromName: 'Priya Menon',
      fromEmail: 'priya.menon@example.com',
      subject: 'Interested in the Senior DevOps Engineer role',
      body: `Hi there,

I saw the Senior DevOps Engineer opening and would like to apply. Could you let
me know the next steps?

Thanks,
Priya Menon`,
      attachments: [],
    },
    resumeText: '',
  },
  {
    key: 'malicious',
    label: 'Suspicious attachment',
    note: 'Exercises attachment security: a disguised executable is quarantined and never parsed or executed.',
    mailbox: 'careers@talentflow.demo',
    message: {
      messageId: 'sim-malicious',
      fromName: 'Unknown Sender',
      fromEmail: 'noreply@suspicious-domain.example',
      subject: 'Application – urgent – open attachment',
      body: 'Please open the attached document for my application details.',
      attachments: [
        { filename: 'Resume_2026.pdf.exe', mimeType: 'application/octet-stream', sizeBytes: 2_411_008 },
      ],
    },
    resumeText: '',
  },
];

export const sampleByKey = (key: string) => SAMPLE_APPLICATIONS.find((s) => s.key === key);
