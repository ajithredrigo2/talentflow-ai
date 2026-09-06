import { getSession } from '../session';
import { departments } from '@/lib/seed';
import { analyseEngagement } from '@/lib/agents/specialists';
import { AIPanel, Badge, Card, ExplainBlock, GuardrailNote, Kpi, Meter, PageHeader, Table } from '@/components/ui';
import { BarsChart, TrendChart } from '@/components/Charts';

export const dynamic = 'force-dynamic';

export default async function EngagementPage({ searchParams }: { searchParams: Promise<{ dept?: string }> }) {
  await getSession('/engagement');
  const sp = await searchParams;
  const eng = analyseEngagement(sp.dept);
  const latest = eng.trend[eng.trend.length - 1];
  const prev = eng.trend[eng.trend.length - 2];

  return (
    <>
      <PageHeader
        eyebrow="Employee Engagement Agent"
        title="Engagement Analytics"
        subtitle="Anonymised feedback analysed at aggregate level across seven engagement dimensions. Segments below five responses are suppressed, and no protected attribute is ever used as an analysis dimension."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Current sentiment" value={`${latest.sentiment > 0 ? '+' : ''}${latest.sentiment}`} delta={`${latest.sentiment - prev.sentiment > 0 ? '+' : ''}${(latest.sentiment - prev.sentiment).toFixed(2)}`} hint={latest.quarter} accent="brand" />
        <Kpi label="Responses analysed" value={eng.themes.reduce((a, t) => a + t.responses, 0)} accent="cyan" />
        <Kpi label="Themes tracked" value={eng.themes.length} accent="mint" />
        <Kpi label="Lowest theme" value={eng.themes[0]?.theme ?? '—'} hint={`${eng.themes[0]?.sentiment}`} accent="amber" />
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <a href="/engagement" className={`badge ${!sp.dept ? 'bg-ink-900 text-white' : 'bg-[#f0f2f8] text-[#5a6480]'}`}>Organisation-wide</a>
        {departments.map((d) => (
          <a key={d.id} href={`/engagement?dept=${d.id}`} className={`badge ${sp.dept === d.id ? 'bg-ink-900 text-white' : 'bg-[#f0f2f8] text-[#5a6480]'}`}>{d.name}</a>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Sentiment trend" subtitle="Rolling four quarters">
          <div className="p-4">
            <TrendChart data={eng.trend} x="quarter" series={[{ key: 'sentiment', name: 'Sentiment' }]} />
          </div>
        </Card>
        <Card title="Theme sentiment" subtitle="Lowest first">
          <div className="p-4">
            <BarsChart data={eng.themes.filter((t) => !t.suppressed).map((t) => ({ name: t.theme, Sentiment: Number((t.sentiment * 100).toFixed(0)) }))} x="name" y="Sentiment" horizontal color="#06b6d4" />
          </div>
        </Card>
      </div>

      <Card title="Theme breakdown" className="mt-4">
        <Table head={['Theme', 'Responses', 'Sentiment', 'QoQ trend', 'Representative anonymised comments']}>
          {eng.themes.map((t) => (
            <tr key={t.theme}>
              <td className="td font-medium">{t.theme}</td>
              <td className="td">{t.suppressed ? <Badge tone="neutral">suppressed</Badge> : t.responses}</td>
              <td className="td w-32">{t.suppressed ? '—' : <Meter value={(t.sentiment + 1) * 50} right={`${t.sentiment > 0 ? '+' : ''}${t.sentiment}`} />}</td>
              <td className="td">{t.suppressed ? '—' : <span className={t.trend >= 0 ? 'text-mint-600' : 'text-rose-500'}>{t.trend > 0 ? '▲' : t.trend < 0 ? '▼' : '—'} {Math.abs(t.trend)}</span>}</td>
              <td className="td text-[12px] text-[#7a839c]">{t.suppressed ? 'Withheld to protect anonymity' : t.sample.join(' · ')}</td>
            </tr>
          ))}
        </Table>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Recommended management actions"><div className="p-4"><ExplainBlock items={eng.actions} title="From the Engagement Agent" /></div></Card>
        <div className="space-y-4">
          <AIPanel title="Reading the trend">
            Sentiment moved from {prev.sentiment} in {prev.quarter} to {latest.sentiment} in {latest.quarter}. The lowest-scoring
            theme is {eng.themes[0]?.theme} at {eng.themes[0]?.sentiment}; the strongest is {eng.themes[eng.themes.length - 1]?.theme}.
            Treat the delta as the signal rather than the absolute number — the sample and phrasing change between pulses.
          </AIPanel>
          <GuardrailNote>{eng.note}</GuardrailNote>
        </div>
      </div>
    </>
  );
}
