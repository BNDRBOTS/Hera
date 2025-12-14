
"use client";

import type { DayEntry, Phase } from "@/lib/types";
import { Card, Pill } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Area,
  Line,
  Bar,
  ReferenceArea
} from "recharts";

type SeriesPoint = {
  date: string;            // YYYY-MM-DD
  phase: Phase;
  score: number;           // 0..100
  stress: number;          // 1..10
  lh: DayEntry["lh"];
  mucus: DayEntry["mucus"];
  cervix: DayEntry["cervix"];
  tempC?: number;
  tempShift: boolean;
  dayOfCycle: number | null;
  isPeriodStart: boolean;
};

function phaseLabel(p: Phase) {
  return p === "Menstruation" ? "Menstruation" :
         p === "Follicular" ? "Follicular" :
         p === "Fertile" ? "Fertile" :
         p === "Luteal" ? "Luteal" : "Unknown";
}

function phaseTone(p: Phase) {
  // Subtle, neutral tones for glass UI (not user-facing "AI-ish" color coding).
  if (p === "Fertile") return "bg-slate-950/90";
  if (p === "Menstruation") return "bg-slate-950/75";
  if (p === "Follicular") return "bg-slate-950/55";
  if (p === "Luteal") return "bg-slate-950/65";
  return "bg-slate-950/45";
}

function phaseBandFill(p: Phase) {
  // Ultra-light phase shading behind the score chart (kept understated).
  if (p === "Menstruation") return "rgba(15, 23, 42, 0.09)";
  if (p === "Follicular") return "rgba(15, 23, 42, 0.05)";
  if (p === "Fertile") return "rgba(15, 23, 42, 0.11)";
  if (p === "Luteal") return "rgba(15, 23, 42, 0.07)";
  return "rgba(15, 23, 42, 0.04)";
}

function fmtShort(d: string) {
  // YYYY-MM-DD -> M/D
  const [y, m, day] = d.split("-").map((x) => Number(x));
  if (!y || !m || !day) return d;
  return `${m}/${day}`;
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function ringDash(pct01: number): { strokeDasharray: string; strokeDashoffset: string } {
  const r = 44;
  const c = 2 * Math.PI * r;
  const clamped = clamp01(pct01);
  const filled = clamped * c;
  const offset = c - filled;
  return { strokeDasharray: `${c}`, strokeDashoffset: `${offset}` };
}

function majorSignalLabel(p: SeriesPoint): string | null {
  // One concise "headline signal" for visual scanning.
  if (p.lh === "Peak") return "LH Peak";
  if (p.tempShift) return "Temp shift";
  if (p.mucus === "Eggwhite") return "EW mucus";
  if (p.mucus === "Watery") return "Watery mucus";
  return null;
}

function ScoreTooltip(props: any) {
  const p = props?.payload?.[0]?.payload as SeriesPoint | undefined;
  if (!props?.active || !p) return null;
  return (
    <div className="rounded-x4 border border-white/35 bg-white/88 px-3 py-2 shadow-xl backdrop-blur-xl">
      <div className="text-xs font-semibold text-slate-950/70">{p.date}</div>
      <div className="mt-0.5 flex items-center gap-2">
        <div className="text-sm font-extrabold text-slate-950/90">{Math.round(p.score)}%</div>
        <span className={cn("h-2 w-2 rounded-full", phaseTone(p.phase))} />
        <div className="text-xs font-semibold text-slate-950/70">{phaseLabel(p.phase)}</div>
      </div>
      <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-950/70">
        <div>Stress</div><div className="text-right font-semibold text-slate-950/80">{p.stress}/10</div>
        <div>LH</div><div className="text-right font-semibold text-slate-950/80">{p.lh}</div>
        <div>Mucus</div><div className="text-right font-semibold text-slate-950/80">{p.mucus}</div>
        <div>Temp</div><div className="text-right font-semibold text-slate-950/80">{typeof p.tempC === "number" ? `${p.tempC.toFixed(2)}°C` : "—"}</div>
      </div>
    </div>
  );
}

export function VisualBoard(props: {
  todayKey: string;
  phaseToday: Phase;
  scoreToday: number | null;
  confidence: number;
  ovulationDay: number;
  windowDays: number;
  stressImpact: number;
  series: SeriesPoint[];
  todayEntry: DayEntry;
  plan7: Array<{ date: string; phase: Phase; focus: string }>;
  planNotes: string;
  insightNotes: string;
}) {
  const conf = clamp01(props.confidence);
  const ring = ringDash(conf);

  const series = props.series;
  const last = series.length ? series[series.length - 1] : null;

  const dominant = last ? majorSignalLabel(last) : null;

  // Phase bands by contiguous blocks for clean shading behind the line.
  const bands = (() => {
    if (series.length < 2) return [];
    const out: Array<{ x1: string; x2: string; phase: Phase }> = [];
    let cur = series[0].phase;
    let start = series[0].date;
    for (let i = 1; i < series.length; i++) {
      const p = series[i];
      if (p.phase !== cur) {
        out.push({ x1: start, x2: series[i - 1].date, phase: cur });
        cur = p.phase;
        start = p.date;
      }
    }
    out.push({ x1: start, x2: series[series.length - 1].date, phase: cur });
    return out;
  })();

  const peakLH = series.filter((p) => p.lh === "Peak").map((p) => p.date);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-950/60">Today</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <div className="text-xl font-extrabold tracking-tight text-slate-950/90">
                {props.scoreToday == null ? "—" : `${Math.round(props.scoreToday)}%`}
              </div>
              <Pill tone={phaseTone(props.phaseToday)}>{phaseLabel(props.phaseToday)}</Pill>
              {dominant ? <Pill tone="bg-white/80">{dominant}</Pill> : null}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div className="rounded-x4 border border-white/35 bg-white/70 px-3 py-2">
                <div className="text-[10px] font-semibold text-slate-950/55">Cycle avg</div>
                <div className="mt-0.5 text-sm font-extrabold text-slate-950/85">
                  {props.plan7?.[0]?.date ? "Tracking" : "—"}
                </div>
              </div>
              <div className="rounded-x4 border border-white/35 bg-white/70 px-3 py-2">
                <div className="text-[10px] font-semibold text-slate-950/55">Ovulation day</div>
                <div className="mt-0.5 text-sm font-extrabold text-slate-950/85">{props.ovulationDay}</div>
              </div>
              <div className="rounded-x4 border border-white/35 bg-white/70 px-3 py-2">
                <div className="text-[10px] font-semibold text-slate-950/55">Window</div>
                <div className="mt-0.5 text-sm font-extrabold text-slate-950/85">{props.windowDays} days</div>
              </div>
            </div>
          </div>

          <div className="shrink-0">
            <div className="relative h-28 w-28">
              <svg viewBox="0 0 120 120" className="h-full w-full">
                <circle cx="60" cy="60" r="44" stroke="rgba(15,23,42,0.10)" strokeWidth="10" fill="none" />
                <circle
                  cx="60"
                  cy="60"
                  r="44"
                  stroke="rgba(15,23,42,0.65)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  fill="none"
                  style={ring}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-[11px] font-semibold text-slate-950/60">Confidence</div>
                <div className="text-2xl font-extrabold tracking-tight text-slate-950/90">{Math.round(conf * 100)}%</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-extrabold text-slate-950/90">Signals over time</div>
            <div className="mt-0.5 text-xs font-semibold text-slate-950/60">
              Score trend with phase shading. Stress shown as bars. LH Peak marked by spikes in the line.
            </div>
          </div>
        </div>

        <div className="mt-3 h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series} margin={{ top: 8, right: 10, bottom: 0, left: -8 }}>
              <CartesianGrid stroke="rgba(15,23,42,0.08)" vertical={false} />
              {bands.map((b, idx) => (
                <ReferenceArea
                  key={idx}
                  x1={b.x1}
                  x2={b.x2}
                  y1={0}
                  y2={100}
                  ifOverflow="extendDomain"
                  fill={phaseBandFill(b.phase)}
                  strokeOpacity={0}
                />
              ))}
              <XAxis
                dataKey="date"
                tickFormatter={fmtShort}
                tick={{ fontSize: 11, fill: "rgba(15,23,42,0.65)" }}
                axisLine={{ stroke: "rgba(15,23,42,0.14)" }}
                tickLine={false}
                minTickGap={22}
              />
              <YAxis
                yAxisId="score"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "rgba(15,23,42,0.65)" }}
                axisLine={false}
                tickLine={false}
                width={26}
              />
              <YAxis
                yAxisId="stress"
                orientation="right"
                domain={[0, 10]}
                hide
              />
              <RechartsTooltip content={<ScoreTooltip />} />
              <Bar yAxisId="stress" dataKey="stress" barSize={10} fill="rgba(15,23,42,0.12)" radius={[6, 6, 6, 6]} />
              <Area
                yAxisId="score"
                type="monotone"
                dataKey="score"
                stroke="rgba(15,23,42,0.75)"
                fill="rgba(15,23,42,0.10)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                yAxisId="score"
                type="monotone"
                dataKey={(p: SeriesPoint) => (p.lh === "Peak" ? p.score : null)}
                stroke="rgba(15,23,42,0.0)"
                dot={{ r: 4, stroke: "rgba(15,23,42,0.85)", strokeWidth: 2, fill: "rgba(255,255,255,0.95)" }}
                activeDot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-x4 border border-white/35 bg-white/70 px-3 py-2">
            <div className="text-[10px] font-semibold text-slate-950/55">Stress impact</div>
            <div className="mt-0.5 text-sm font-extrabold text-slate-950/85">{props.stressImpact.toFixed(2)}×</div>
          </div>
          <div className="rounded-x4 border border-white/35 bg-white/70 px-3 py-2">
            <div className="text-[10px] font-semibold text-slate-950/55">LH peaks logged</div>
            <div className="mt-0.5 text-sm font-extrabold text-slate-950/85">{peakLH.length}</div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="text-sm font-extrabold text-slate-950/90">Next 7 days</div>
        <div className="mt-2 grid grid-cols-1 gap-2">
          {props.plan7.map((p) => (
            <div key={p.date} className="rounded-x4 border border-white/35 bg-white/70 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-slate-950/70">{p.date}</div>
                <Pill tone={phaseTone(p.phase)}>{phaseLabel(p.phase)}</Pill>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-950/85">{p.focus}</div>
            </div>
          ))}
        </div>
      </Card>

      {props.planNotes?.trim() ? (
        <Card>
          <div className="text-sm font-extrabold text-slate-950/90">Your notes</div>
          <div className="mt-2 whitespace-pre-wrap text-sm font-semibold text-slate-950/75">{props.planNotes}</div>
        </Card>
      ) : null}

      {props.insightNotes?.trim() ? (
        <Card>
          <div className="text-sm font-extrabold text-slate-950/90">Insight note</div>
          <div className="mt-2 whitespace-pre-wrap text-sm font-semibold text-slate-950/75">{props.insightNotes}</div>
        </Card>
      ) : null}
    </div>
  );
}
