"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useHera } from "@/hooks/useHera";
import type { CervixType, DayEntry, LHType, MucusType } from "@/lib/types";
import { HeraEngine } from "@/lib/hera-engine";
import { Card, Button, Input, Select, TextArea, Pill } from "@/components/ui";
import { ThemePicker, accent } from "@/components/ThemePicker";
import { BottomNav, type Tab } from "@/components/BottomNav";
import { AmbientBreather } from "@/components/AmbientBreather";
import { VisualBoard } from "@/components/VisualBoard";
import { FAQView } from "@/components/FAQ";
import { LoadingIntro } from "@/components/LoadingIntro";

function downloadJSON(filename: string, obj: unknown) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function monthGrid(year: number, month0: number): Array<{ key: string; inMonth: boolean }> {
  const first = new Date(year, month0, 1);
  const startDow = (first.getDay() + 6) % 7;
  const start = new Date(year, month0, 1 - startDow);
  const out: Array<{ key: string; inMonth: boolean }> = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    out.push({ key: `${y}-${m}-${day}`, inMonth: d.getMonth() === month0 });
  }
  return out;
}

export default function Page() {
  const hera = useHera();
  const [tab, setTab] = useState<Tab>("Home");
  const [homePane, setHomePane] = useState<"Overview" | "FAQ">("Overview");

  const [insightBusy, setInsightBusy] = useState(false);
  const [insightDraft, setInsightDraft] = useState("");

  const fileRef = useRef<HTMLInputElement | null>(null);

  // PWA SW register
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onLoad = () => { navigator.serviceWorker.register("/sw.js").catch(() => {}); };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  const doneBoot = hera.status === "ready" || hera.status === "error";
  const { a: accentA, b: accentB } = accent(hera.state.theme);

  const todayKey = hera.derived.todayKey;
  const todayEntry = hera.state.entries[todayKey] ?? null;

  const [draft, setDraft] = useState<DayEntry>(() => (
    todayEntry ?? { date: todayKey, mucus: "None", lh: "Negative", cervix: "Low/Hard", stress: 5 }
  ));

  useEffect(() => {
    setDraft(todayEntry ?? { date: todayKey, mucus: "None", lh: "Negative", cervix: "Low/Hard", stress: 5 });
  }, [todayEntry, todayKey]);

  const isPeriodStart = hera.state.events.some((e) => e.type === "PeriodStart" && e.date === todayKey);

  const calInit = useMemo(() => {
    const d = new Date();
    return { y: d.getFullYear(), m0: d.getMonth() };
  }, []);
  const [calYM, setCalYM] = useState(calInit);
  const calCells = useMemo(() => monthGrid(calYM.y, calYM.m0), [calYM]);

  const Top = (
    <div className="safe-pt safe-px pt-4">
      <div className="rounded-x5 glass-strong p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-950/90">Hera’s Cycle</div>
            <div className="text-xs text-slate-700/80">Clinical Zen • Visual-first • Offline-ready</div>
          </div>
          <Pill>Export weekly</Pill>
        </div>
      </div>
    </div>
  );

  const Home = (
    <div className="safe-px pt-4 pb-28 space-y-4">
      <Card strong>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold tracking-wide text-slate-700/80">Today</div>
            <div className="text-lg font-semibold text-slate-950/90">{todayKey}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Pill>{hera.derived.phaseToday}</Pill>
              <Pill>Confidence: {Math.round(hera.tuning.confidence * 100)}%</Pill>
            </div>
          </div>

          <div className="rounded-x5 border border-white/25 bg-white/70 px-4 py-3 text-center min-w-[130px]">
            <div className="text-[11px] text-slate-700/80 font-bold tracking-wide">Score</div>
            <div className="text-2xl font-semibold text-slate-950/90">{hera.derived.scoreToday ?? "—"}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-x4 border border-white/25 bg-white/70 p-3">
            <div className="text-[11px] text-slate-700/80 font-bold tracking-wide">Avg cycle length</div>
            <div className="text-base font-semibold text-slate-950/90">{hera.derived.avgCycleLen ? `${hera.derived.avgCycleLen} days` : "—"}</div>
            <div className="text-[11px] text-slate-700/75">Outliers removed: &lt;21 or &gt;45</div>
          </div>

          <div className="rounded-x4 border border-white/25 bg-white/70 p-3">
            <div className="text-[11px] text-slate-700/80 font-bold tracking-wide">Period start</div>
            <div className="text-base font-semibold text-slate-950/90">{isPeriodStart ? "Marked" : "Not marked"}</div>
            <button
              type="button"
              onClick={() => hera.togglePeriodStart(todayKey)}
              className="mt-2 w-full rounded-x4 tap font-semibold text-white"
              style={{ backgroundImage: `linear-gradient(90deg, ${accentA}, ${accentB})` }}
            >
              {isPeriodStart ? "Unmark" : "Mark"} today
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-slate-950/90">Home</div>
          <div className="flex gap-2">
            <button
              className={"rounded-x4 px-3 py-2 text-[12px] font-bold tracking-wide border tap " + (homePane === "Overview" ? "bg-white/82 border-white/45" : "bg-white/65 border-white/25")}
              onClick={() => setHomePane("Overview")}
              type="button"
            >
              Overview
            </button>
            <button
              className={"rounded-x4 px-3 py-2 text-[12px] font-bold tracking-wide border tap " + (homePane === "FAQ" ? "bg-white/82 border-white/45" : "bg-white/65 border-white/25")}
              onClick={() => setHomePane("FAQ")}
              type="button"
            >
              FAQ
            </button>
          </div>
        </div>

        {homePane === "FAQ" ? (
          <div className="mt-4"><FAQView /></div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="rounded-x4 border border-white/25 bg-white/70 p-3">
              <div className="text-sm font-semibold text-slate-950/90">Weekly focus</div>
              <div className="mt-2 text-sm text-slate-800/85">
                {hera.derived.plan7[0]?.focus ?? "Log what you can. Consistency is the win."}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-x4 border border-white/25 bg-white/70 p-3">
                <div className="text-[11px] font-bold tracking-wide text-slate-700/80">Ovulation day</div>
                <div className="text-base font-semibold text-slate-950/90">{hera.tuning.ovulationDay}</div>
              </div>
              <div className="rounded-x4 border border-white/25 bg-white/70 p-3">
                <div className="text-[11px] font-bold tracking-wide text-slate-700/80">Window</div>
                <div className="text-base font-semibold text-slate-950/90">{hera.tuning.windowDays} days</div>
              </div>
            </div>

            <div className="rounded-x4 border border-white/25 bg-white/70 p-3">
              <div className="text-sm font-semibold text-slate-950/90">Quick reset</div>
              <div className="mt-3">
                <AmbientBreather />
              </div>
            </div>

            <div className="rounded-x4 border border-white/25 bg-white/70 p-3">
              <div className="text-sm font-semibold text-slate-950/90">Written insight (optional)</div>
              <div className="mt-1 text-sm text-slate-800/85">
                Creates a focused note using anonymized summaries only.
              </div>

              <button
                type="button"
                disabled={insightBusy}
                onClick={async () => {
                  setInsightDraft("");
                  setInsightBusy(true);
                  try {
                    const r = await fetch("/api/insights", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(hera.derived.insightPayload)
                    });
                    const j = await r.json();
                    const text = j?.ok ? (j.text ?? "") : (j.error ?? "Unavailable");
                    setInsightDraft(text);
                    if (j?.ok && text) await hera.setInsightNotes(text);
                  } finally {
                    setInsightBusy(false);
                  }
                }}
                className="mt-3 w-full rounded-x4 tap font-semibold text-white"
                style={{ backgroundImage: `linear-gradient(90deg, ${accentA}, ${accentB})` }}
              >
                {insightBusy ? "Writing…" : "Create insight note"}
              </button>

              {insightDraft ? (
                <div className="mt-3 rounded-x4 border border-white/25 bg-white/80 p-3">
                  <div className="text-sm text-slate-950/90 whitespace-pre-wrap">{insightDraft}</div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </Card>
    </div>
  );

  const Log = (
    <div className="safe-px pt-4 pb-28 space-y-4">
      <Card strong>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-950/90">Daily log</div>
            <div className="text-xs text-slate-700/80">Fast entry. Saved on this device.</div>
          </div>
          <Pill>{todayKey}</Pill>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Select
            label="Mucus"
            value={draft.mucus}
            onChange={(e) => setDraft((d) => ({ ...d, mucus: e.target.value as MucusType }))}
          >
            {(["Eggwhite","Watery","Creamy","Sticky","Dry","None"] as MucusType[]).map((v) => <option key={v} value={v}>{v}</option>)}
          </Select>

          <Select
            label="LH"
            value={draft.lh}
            onChange={(e) => setDraft((d) => ({ ...d, lh: e.target.value as LHType }))}
          >
            {(["Peak","Positive","Negative"] as LHType[]).map((v) => <option key={v} value={v}>{v}</option>)}
          </Select>

          <Select
            label="Cervix"
            value={draft.cervix}
            onChange={(e) => setDraft((d) => ({ ...d, cervix: e.target.value as CervixType }))}
          >
            {(["High/Soft","Medium/Firm","Low/Hard"] as CervixType[]).map((v) => <option key={v} value={v}>{v}</option>)}
          </Select>

          <Input
            label="Temp (°C) optional"
            inputMode="decimal"
            placeholder="e.g. 36.60"
            value={draft.tempC ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, tempC: e.target.value === "" ? undefined : Number(e.target.value) }))}
          />

          <div className="col-span-2">
            <div className="text-[11px] font-bold tracking-wide text-slate-800/75">Stress (1–10)</div>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={draft.stress}
                onChange={(e) => setDraft((d) => ({ ...d, stress: Number(e.target.value) }))}
                className="w-full"
                aria-label="Stress level"
              />
              <div className="w-10 text-center text-sm font-semibold text-slate-950/90">{draft.stress}</div>
            </div>
          </div>

          <div className="col-span-2">
            <TextArea
              label="Notes (optional)"
              rows={3}
              value={draft.notes ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button onClick={async () => hera.upsertEntry({ ...draft, date: todayKey })}>Save</Button>
          <button
            type="button"
            onClick={() => hera.togglePeriodStart(todayKey)}
            className="rounded-x4 border border-white/25 bg-white/70 tap font-semibold text-slate-950"
          >
            {isPeriodStart ? "Period ✓" : "Mark period"}
          </button>
        </div>
      </Card>

      <Card>
        <div className="text-sm font-semibold text-slate-950/90">Plan notes</div>
        <div className="mt-2 text-sm text-slate-700/85">Your own words. Saved on this device.</div>
        <div className="mt-3">
          <TextArea
            label="Plan notes"
            rows={5}
            value={hera.state.planNotes}
            onChange={(e) => hera.setPlanNotes(e.target.value)}
          />
        </div>
      </Card>
    </div>
  );

  const Visual = (
    <div className="safe-px pt-4 pb-28">
      <VisualBoard
        todayKey={todayKey}
        phaseToday={hera.derived.phaseToday}
        scoreToday={hera.derived.scoreToday}
        confidence={hera.tuning.confidence}
        ovulationDay={hera.tuning.ovulationDay}
        windowDays={hera.tuning.windowDays}
        stressImpact={hera.tuning.stressImpact}
        series={hera.derived.series}
        todayEntry={todayEntry}
        plan7={hera.derived.plan7}
        planNotes={hera.state.planNotes}
        insightNotes={hera.state.insightNotes}
      />
    </div>
  );

  const Calendar = (
    <div className="safe-px pt-4 pb-28 space-y-4">
      <Card strong>
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-slate-950/90">Calendar</div>
            <div className="text-xs text-slate-700/80">Fast pattern scanning.</div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-x4 border border-white/25 bg-white/70 px-3 tap font-semibold text-slate-950"
              onClick={() => {
                const d = new Date(calYM.y, calYM.m0, 1); d.setMonth(d.getMonth() - 1);
                setCalYM({ y: d.getFullYear(), m0: d.getMonth() });
              }}
            >
              Prev
            </button>
            <button
              type="button"
              className="rounded-x4 border border-white/25 bg-white/70 px-3 tap font-semibold text-slate-950"
              onClick={() => {
                const d = new Date(calYM.y, calYM.m0, 1); d.setMonth(d.getMonth() + 1);
                setCalYM({ y: d.getFullYear(), m0: d.getMonth() });
              }}
            >
              Next
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-2 text-xs text-slate-700/80">
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => <div key={d} className="text-center">{d}</div>)}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-2">
          {calCells.map(({ key, inMonth }) => {
            const e = hera.state.entries[key];
            const isToday = key === todayKey;
            const phase = hera.derived.lastNDays.find((x) => x.date === key)?.phase
              ?? HeraEngine.phaseForDate(hera.state, hera.tuning.ovulationDay, hera.tuning.windowDays, key);
            const score = e ? HeraEngine.scoreEntry(hera.state, e, hera.tuning.stressImpact).scorePct : null;
            const dayNum = Number(key.slice(8, 10));
            return (
              <div
                key={key}
                className={[
                  "rounded-x4 border px-2 py-2",
                  inMonth ? "bg-white/70 border-white/25" : "bg-white/50 border-white/15",
                  isToday ? "ring-2 ring-white/45" : ""
                ].join(" ")}
              >
                <div className={inMonth ? "text-xs font-semibold text-slate-950/90" : "text-xs font-semibold text-slate-700/70"}>
                  {dayNum}
                </div>
                <div className="mt-1 text-[10px] text-slate-700/80 line-clamp-1">
                  {score ?? "—"} • {phase}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );

  const Settings = (
    <div className="safe-px pt-4 pb-28 space-y-4">
      <Card strong>
        <div className="text-lg font-semibold text-slate-950/90">Settings</div>
        <div className="mt-1 text-sm text-slate-700/85">One visual language. One steady experience.</div>
      </Card>

      <Card>
        <div className="text-sm font-semibold text-slate-950/90">Theme</div>
        <div className="mt-3">
          <ThemePicker value={hera.state.theme} onChange={(t) => hera.setTheme(t)} />
        </div>
      </Card>

      <Card>
        <div className="text-sm font-semibold text-slate-950/90">Backup</div>
        <div className="mt-2 text-sm text-slate-800/85">
          Export creates a complete snapshot. Import restores everything exactly.
        </div>

        <div className="mt-3 space-y-2">
          <Button
            onClick={async () => {
              const bundle = await hera.exportAll();
              downloadJSON(`hera-export-${new Date().toISOString().slice(0,10)}.json`, bundle);
            }}
          >
            Export (complete)
          </Button>

          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const text = await f.text();
              const bundle = JSON.parse(text);
              await hera.importAll(bundle);
              if (fileRef.current) fileRef.current.value = "";
            }}
          />

          <button
            type="button"
            className="w-full rounded-x4 border border-white/25 bg-white/70 tap font-semibold text-slate-950"
            onClick={() => fileRef.current?.click()}
          >
            Import (restore)
          </button>
        </div>

        <div className="mt-3 rounded-x4 border border-white/25 bg-white/70 p-3 text-xs text-slate-700/85">
          Recommended rhythm: export weekly, plus after major updates.
        </div>
      </Card>
    </div>
  );

  const content =
    tab === "Home" ? Home :
    tab === "Log" ? Log :
    tab === "Visual" ? Visual :
    tab === "Calendar" ? Calendar :
    Settings;

  return (
    <main className="min-h-[100dvh] overscroll-none">
      <LoadingIntro done={doneBoot} accentA={accentA} accentB={accentB} />
      {Top}

      {hera.status === "error" ? (
        <div className="safe-px pt-4 pb-28">
          <Card strong>
            <div className="text-sm font-semibold text-slate-950/90">Couldn’t load local data</div>
            <div className="mt-2 text-sm text-slate-800/85">{hera.error ?? "Unknown error"}</div>
          </Card>
        </div>
      ) : content}

      <BottomNav tab={tab} setTab={setTab} accentA={accentA} accentB={accentB} />
    </main>
  );
}
