import Link from 'next/link';
import { getSession } from '../session';
import { db } from '@/lib/store';
import { skillName } from '@/lib/seed';
import { screenAll } from '@/lib/agents/screening';
import { SKILL_LEVEL_VALUE } from '@/lib/types';
import { SkillRadar } from '@/components/Charts';
import { AIPanel, Avatar, Badge, Card, GuardrailNote, PageHeader, ScoreRing } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ job?: string; ids?: string }> }) {
  await getSession('/compare');
  const sp = await searchParams;
  const job = db.jobs.find((j) => j.id === (sp.job ?? 'job-001')) ?? db.jobs[0];
  const ranked = screenAll(db.candidates.filter((c) => c.jobId === job.id), job);

  const requested = sp.ids?.split(',').filter(Boolean) ?? [];
  const selected = (requested.length ? ranked.filter((r) => requested.includes(r.candidate.id)) : ranked.slice(0, 3)).slice(0, 4);

  const criteriaSkills = [...job.mandatorySkills, ...job.preferredSkills].slice(0, 7);
  const radar = criteriaSkills.map((name) => {
    const row: Record<string, string | number> = { subject: name };
    ['A', 'B', 'C'].forEach((k, i) => {
      const c = selected[i]?.candidate;
      if (!c) return;
      const s = c.skills.find((x) => skillName(x.skillId) === name);
      row[k] = s ? (SKILL_LEVEL_VALUE[s.level] / 4) * 100 : 0;
    });
    return row as { subject: string; A: number; B?: number; C?: number };
  });

  const best = selected[0];
  const runnerUp = selected[1];

  const insight = best
    ? `${best.candidate.name} leads at ${best.screening.overall}% — driven by ${best.screening.breakdown
        .slice()
        .sort((a, b) => b.score * b.weight - a.score * a.weight)[0].label.toLowerCase()} and ${best.candidate.experienceYears} years against the ${job.minExperience}-year minimum.${
        runnerUp
          ? ` ${runnerUp.candidate.name} sits ${best.screening.overall - runnerUp.screening.overall} points behind${
              runnerUp.screening.missingSkills.length ? `, mainly on ${runnerUp.screening.missingSkills.slice(0, 2).join(' and ')}` : ''
            }, but carries a shorter notice period in some cases and a lower expected salary — worth weighing if the start date matters more than the last few points of technical depth.`
          : ''
      } Every candidate here still requires human shortlisting approval, and the differences below are evidence for that conversation rather than a decision.`
    : '';

  const rows: { label: string; get: (r: (typeof selected)[number]) => React.ReactNode }[] = [
    { label: 'Overall match', get: (r) => <ScoreRing value={r.screening.overall} size={52} /> },
    { label: 'Recommendation', get: (r) => <Badge tone={r.screening.recommendation === 'Advance' ? 'mint' : r.screening.recommendation === 'Review' ? 'amber' : 'neutral'}>{r.screening.recommendation}</Badge> },
    { label: 'Experience', get: (r) => `${r.candidate.experienceYears} yrs` },
    { label: 'Current role', get: (r) => <span className="text-[12px]">{r.candidate.currentTitle}<br /><span className="text-[#9892a2]">{r.candidate.currentCompany}</span></span> },
    { label: 'Location', get: (r) => r.candidate.location },
    { label: 'Notice period', get: (r) => `${r.candidate.noticePeriodDays} days` },
    { label: 'Expected salary', get: (r) => r.candidate.expectedSalary },
    { label: 'Education', get: (r) => <span className="text-[12px]">{r.candidate.education}</span> },
    {
      label: 'Certifications',
      get: (r) => r.candidate.certifications.length
        ? <div className="space-y-1">{r.candidate.certifications.map((c) => <div key={c} className="text-[11.5px] text-[#5b5367]">{c}</div>)}</div>
        : <span className="text-[#a7a1b1]">None</span>,
    },
    ...criteriaSkills.map((name) => ({
      label: name,
      get: (r: (typeof selected)[number]) => {
        const s = r.candidate.skills.find((x) => skillName(x.skillId) === name);
        return s
          ? <Badge tone={s.level === 'Expert' ? 'mint' : s.level === 'Advanced' ? 'brand' : 'neutral'}>{s.level}</Badge>
          : <span className="text-[#ccc8d3]">—</span>;
      },
    })),
    { label: 'Missing requirements', get: (r) => r.screening.missingSkills.length ? <div className="flex flex-wrap gap-1">{r.screening.missingSkills.map((s) => <span key={s} className="rounded bg-rose-50 px-1.5 py-0.5 text-[10.5px] font-medium text-rose-600">{s}</span>)}</div> : <span className="text-mint-600">None</span> },
  ];

  return (
    <>
      <PageHeader
        eyebrow={job.title}
        title="Candidate Comparison"
        subtitle="Side-by-side comparison on the same approved criteria, with an AI-generated comparative read. Select two to four candidates."
      />

      <Card className="mb-4" title="Select candidates to compare">
        <div className="flex flex-wrap gap-2 p-4">
          {ranked.map((r) => {
            const on = selected.some((s) => s.candidate.id === r.candidate.id);
            const next = on
              ? selected.filter((s) => s.candidate.id !== r.candidate.id).map((s) => s.candidate.id)
              : [...selected.map((s) => s.candidate.id), r.candidate.id].slice(0, 4);
            return (
              <Link
                key={r.candidate.id}
                href={`/compare?job=${job.id}&ids=${next.join(',')}`}
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[12.5px] transition ${on ? 'border-brand-400 bg-brand-50 font-medium text-brand-700' : 'border-[#ebe9ef] text-[#6b6377] hover:border-[#d7d2de]'}`}
              >
                <Avatar name={r.candidate.name} size={20} />
                {r.candidate.name}
                <span className="text-[11px] text-[#a7a1b1]">{r.screening.overall}%</span>
              </Link>
            );
          })}
        </div>
        <div className="border-t border-[#f2f0f4] px-4 py-2.5">
          <div className="flex flex-wrap gap-1.5">
            {db.jobs.filter((j) => j.status === 'Open').map((j) => (
              <Link key={j.id} href={`/compare?job=${j.id}`} className={`badge ${j.id === job.id ? 'bg-brand-600 text-white' : 'bg-[#f4f2f6] text-[#6b6377]'}`}>{j.title}</Link>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card title="Comparison matrix">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse">
              <thead className="border-b border-[#f2f0f4] bg-[#fcfcfd]">
                <tr>
                  <th className="th w-44">Criteria</th>
                  {selected.map((r) => (
                    <th key={r.candidate.id} className="th">
                      <Link href={`/candidates/${r.candidate.id}`} className="text-[12.5px] font-semibold normal-case tracking-normal text-ink-950 hover:text-brand-600">{r.candidate.name}</Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f4f7]">
                {rows.map((row) => (
                  <tr key={row.label}>
                    <td className="td font-medium text-[#6b6377]">{row.label}</td>
                    {selected.map((r) => <td key={r.candidate.id} className="td">{row.get(r)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <Card title="Skill profile overlay" subtitle="Against this role's evaluated skills">
            <div className="p-3">
              <SkillRadar data={radar} />
            </div>
          </Card>
          <AIPanel title="Comparative insight">{insight}</AIPanel>
          <GuardrailNote>
            Comparison is limited to job-relevant evidence. No protected attribute appears in any row, and the ranking
            is advisory — shortlisting requires human approval.
          </GuardrailNote>
        </div>
      </div>
    </>
  );
}
