'use client';

import { useEffect, useState } from 'react';
import { Download, FileBarChart, FileSpreadsheet, Sparkles } from 'lucide-react';
import { AIPanel, Badge, Card, Empty, ExplainBlock, GuardrailNote, Kpi, Meter, PageHeader, Spinner, Table } from '@/components/ui';
import type { ReportResult } from '@/lib/reports';

interface ReportMeta {
  id: string;
  name: string;
  description: string;
  category: string;
  agentId: string;
  agentLabel: string;
}

const CATEGORY_ORDER = ['Recruitment', 'Workforce', 'Employee experience', 'Governance'];

export default function ReportsPage() {
  const [catalogue, setCatalogue] = useState<ReportMeta[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [report, setReport] = useState<ReportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState<'xlsx' | 'csv' | null>(null);

  useEffect(() => {
    fetch('/api/reports')
      .then((r) => r.json())
      .then((d) => setCatalogue(d.reports ?? []))
      .finally(() => setLoaded(true));
  }, []);

  async function run(id: string) {
    setBusy(true);
    setError('');
    setActive(id);
    setReport(null);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? 'The report could not be generated.');
      else setReport(data.report);
    } catch {
      setError('The report could not be generated.');
    } finally {
      setBusy(false);
    }
  }

  async function download(id: string, format: 'xlsx' | 'csv') {
    setExporting(format);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, format }),
      });
      if (!res.ok) {
        setError('The export could not be produced.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${id}-${new Date().toISOString().slice(0, 10)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  }

  const categories = CATEGORY_ORDER.filter((c) => catalogue.some((r) => r.category === c));

  return (
    <div>
      <PageHeader
        eyebrow="Reporting"
        title="HR Reports"
        subtitle="Every report is produced by the agent that owns that domain, from live platform data — with the method it used, the caveats that apply and an audit entry for the disclosure."
      />

      {!loaded ? (
        <Card><div className="p-6"><Spinner label="Loading report catalogue…" /></div></Card>
      ) : catalogue.length === 0 ? (
        <Card><Empty title="No reports available for your role" hint="Reports are scoped by role. Speak to an HR administrator if you need access." /></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
          {/* Catalogue */}
          <div className="space-y-4">
            {categories.map((cat) => (
              <Card key={cat} title={cat}>
                <div className="space-y-1.5 p-3">
                  {catalogue
                    .filter((r) => r.category === cat)
                    .map((r) => (
                      <button
                        key={r.id}
                        onClick={() => run(r.id)}
                        disabled={busy}
                        className={`w-full rounded-lg border px-3.5 py-3 text-left transition disabled:opacity-60 ${
                          active === r.id
                            ? 'border-brand-300 bg-brand-50/70 ring-4 ring-brand-100'
                            : 'border-[#e7e3ec] hover:border-brand-200 hover:bg-brand-50/40'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <FileBarChart size={13} className={active === r.id ? 'text-brand-600' : 'text-[#9892a2]'} />
                          <span className="text-[13px] font-semibold text-ink-950">{r.name}</span>
                        </div>
                        <p className="mt-1 text-[11.5px] leading-snug text-[#71697d]">{r.description}</p>
                        <div className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-[#9892a2]">
                          <Sparkles size={9} className="text-brand-500" />
                          {r.agentLabel}
                        </div>
                      </button>
                    ))}
                </div>
              </Card>
            ))}

            <GuardrailNote>
              No report segments people by gender, race, ethnicity, religion, nationality, disability, marital status or age.
              Those attributes are not held on the record and are not a permitted analysis dimension.
            </GuardrailNote>
          </div>

          {/* Output */}
          <div>
            {busy ? (
              <Card>
                <div className="flex items-center gap-3 px-5 py-8">
                  <Spinner />
                  <div>
                    <div className="text-[13.5px] font-medium text-ink-950">Running the agent…</div>
                    <div className="text-[12px] text-[#9892a2]">Reading live data → computing measures → attaching method and caveats</div>
                  </div>
                </div>
              </Card>
            ) : error ? (
              <Card><div className="px-5 py-6 text-[13px] text-rose-600">{error}</div></Card>
            ) : !report ? (
              <Card>
                <Empty
                  title="Choose a report"
                  hint="Pick a report from the catalogue. It runs against live platform data and returns measures, breakdowns, the method used and the caveats that apply."
                />
              </Card>
            ) : (
              <div className="space-y-4">
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink-950">{report.name}</h2>
                        <Badge tone="brand"><Sparkles size={9} /> {report.agentLabel}</Badge>
                      </div>
                      <p className="mt-1 text-[12.5px] text-[#71697d]">
                        {report.period} · generated{' '}
                        {new Date(report.generatedAt).toLocaleString('en-GB', {
                          timeZone: 'Asia/Dubai',
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => download(report.id, 'xlsx')}
                        disabled={exporting !== null}
                        className="btn-primary disabled:opacity-60"
                      >
                        <FileSpreadsheet size={13} />
                        {exporting === 'xlsx' ? 'Building workbook…' : 'Export to Excel'}
                      </button>
                      <button
                        onClick={() => download(report.id, 'csv')}
                        disabled={exporting !== null}
                        className="btn-ghost disabled:opacity-60"
                      >
                        <Download size={13} /> CSV
                      </button>
                    </div>
                  </div>
                </Card>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {report.kpis.map((k) => (
                    <Kpi key={k.label} label={k.label} value={k.value} hint={k.hint} accent={k.accent} />
                  ))}
                </div>

                <AIPanel title="What this shows">{report.narrative}</AIPanel>

                {report.sections.map((s) => (
                  <Card key={s.title} title={s.title}>
                    {s.kind === 'bars' ? (
                      s.data.length ? (
                        <div className="space-y-3 p-5">
                          {(() => {
                            // Report labels are long and descriptive, so they are rendered
                            // full width rather than squeezed into a chart axis. Signed
                            // scales (sentiment) are centred so zero sits mid-track.
                            const max = Math.max(...s.data.map((d) => Math.abs(d.value)), 1);
                            const signed = s.data.some((d) => d.value < 0);
                            return s.data.map((d) => (
                              <Meter
                                key={d.label}
                                label={d.label}
                                right={String(d.value)}
                                value={signed ? ((d.value + max) / (2 * max)) * 100 : (d.value / max) * 100}
                                tone={d.value < 0 ? 'bg-rose-500' : 'bg-brand-500'}
                              />
                            ));
                          })()}
                        </div>
                      ) : (
                        <div className="px-5 py-6 text-[12.5px] text-[#9892a2]">No data in this period.</div>
                      )
                    ) : s.kind === 'table' ? (
                      s.rows.length ? (
                        <Table head={s.head}>
                          {s.rows.map((row, i) => (
                            <tr key={i} className="transition hover:bg-[#faf9fc]">
                              {row.map((cell, j) => (
                                <td key={j} className="td text-[#4e465a]">{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </Table>
                      ) : (
                        <div className="px-5 py-6 text-[12.5px] text-[#9892a2]">No rows in this period.</div>
                      )
                    ) : (
                      <div className="p-4"><ExplainBlock items={s.items} /></div>
                    )}
                  </Card>
                ))}

                <div className="grid gap-4 md:grid-cols-2">
                  <Card title="How this was calculated">
                    <div className="p-4"><ExplainBlock items={report.methodology} /></div>
                  </Card>
                  <Card title="Caveats">
                    <div className="p-4"><ExplainBlock items={report.caveats} /></div>
                  </Card>
                </div>

                <GuardrailNote>
                  Figures are a recommendation for human interpretation, not an automated decision. This generation was written
                  to the audit log against your name.
                </GuardrailNote>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
