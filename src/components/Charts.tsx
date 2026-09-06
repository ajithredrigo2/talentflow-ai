'use client';

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

const PALETTE = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f43f5e', '#6b6377'];

const axis = { stroke: '#a7a1b1', fontSize: 11, tickLine: false, axisLine: false };
const tooltipStyle = {
  contentStyle: {
    borderRadius: 10,
    border: '1px solid #ebe9ef',
    boxShadow: '0 12px 30px -12px rgba(26,14,44,0.25)',
    fontSize: 12,
  },
};

export function TrendChart({ data, x, series }: { data: Record<string, unknown>[]; x: string; series: { key: string; name: string; color?: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color ?? PALETTE[i]} stopOpacity={0.25} />
              <stop offset="100%" stopColor={s.color ?? PALETTE[i]} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f2f0f4" vertical={false} />
        <XAxis dataKey={x} {...axis} />
        <YAxis {...axis} />
        <Tooltip {...tooltipStyle} />
        {series.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />}
        {series.map((s, i) => (
          <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color ?? PALETTE[i]} strokeWidth={2} fill={`url(#g-${s.key})`} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BarsChart({ data, x, y, name, horizontal, color }: { data: Record<string, unknown>[]; x: string; y: string; name?: string; horizontal?: boolean; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={horizontal ? Math.max(200, data.length * 34) : 230}>
      <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 16, left: horizontal ? 30 : -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f2f0f4" vertical={!horizontal} horizontal={horizontal} />
        {horizontal ? <XAxis type="number" {...axis} /> : <XAxis dataKey={x} {...axis} />}
        {horizontal ? <YAxis type="category" dataKey={x} width={112} {...axis} /> : <YAxis {...axis} />}
        <Tooltip {...tooltipStyle} cursor={{ fill: '#f8f7fa' }} />
        <Bar dataKey={y} name={name ?? y} radius={horizontal ? [0, 5, 5, 0] : [5, 5, 0, 0]} fill={color ?? '#7c3aed'} maxBarSize={horizontal ? 18 : 42} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data, height = 230 }: { data: { name: string; value: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={2} stroke="none">
          {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Tooltip {...tooltipStyle} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function SkillRadar({ data }: { data: { subject: string; A: number; B?: number; C?: number }[]; }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="#ebe9ef" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10.5, fill: '#898294' }} />
        <Radar name="Candidate A" dataKey="A" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.22} strokeWidth={2} />
        {data[0]?.B !== undefined && <Radar name="Candidate B" dataKey="B" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.16} strokeWidth={2} />}
        {data[0]?.C !== undefined && <Radar name="Candidate C" dataKey="C" stroke="#10b981" fill="#10b981" fillOpacity={0.14} strokeWidth={2} />}
        <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        <Tooltip {...tooltipStyle} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function LinesChart({ data, x, series }: { data: Record<string, unknown>[]; x: string; series: { key: string; name: string; color?: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f2f0f4" vertical={false} />
        <XAxis dataKey={x} {...axis} />
        <YAxis {...axis} />
        <Tooltip {...tooltipStyle} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        {series.map((s, i) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color ?? PALETTE[i]} strokeWidth={2} dot={{ r: 2.5 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function Funnel({ stages }: { stages: { name: string; value: number }[] }) {
  const max = Math.max(...stages.map((s) => s.value), 1);
  return (
    <div className="space-y-2.5 p-1">
      {stages.map((s, i) => {
        const prev = i > 0 ? stages[i - 1].value : s.value;
        const conv = prev ? Math.round((s.value / prev) * 100) : 100;
        return (
          <div key={s.name}>
            <div className="mb-1 flex items-center justify-between text-[11.5px]">
              <span className="font-medium text-[#6b6377]">{s.name}</span>
              <span className="text-[#a7a1b1]">{i > 0 && `${conv}% ·`} <span className="font-semibold text-ink-900">{s.value}</span></span>
            </div>
            <div className="h-7 overflow-hidden rounded-md bg-[#f4f2f6]">
              <div
                className="h-full rounded-md transition-all duration-700"
                style={{ width: `${Math.max(6, (s.value / max) * 100)}%`, background: `linear-gradient(90deg, ${PALETTE[0]}, ${PALETTE[i % 3 === 0 ? 1 : 2]})` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
