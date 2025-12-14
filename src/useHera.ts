"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdaptiveTuning, DayEntry, ExportBundle, InsightPayload, HeraState, Phase, ThemeKey, LHType, MucusType, CervixType } from "@/lib/types";
import { readState, readTuning, writeState, writeTuning } from "@/lib/db";
import { HeraEngine } from "@/lib/hera-engine";
import { Adaptive } from "@/lib/adaptive";
import { freshState, freshTuning } from "@/lib/makeState";

export type HeraSession = {
  status: "booting" | "ready" | "error";
  error?: string;

  state: HeraState;
  tuning: AdaptiveTuning;

  setTheme: (t: ThemeKey) => Promise<void>;
  upsertEntry: (entry: DayEntry) => Promise<void>;
  togglePeriodStart: (dateKey: string) => Promise<void>;
  setPlanNotes: (text: string) => Promise<void>;
  setInsightNotes: (text: string) => Promise<void>;

  exportAll: () => Promise<ExportBundle>;
  importAll: (bundle: ExportBundle) => Promise<void>;

  derived: {
    todayKey: string;
    avgCycleLen: number | null;
    phaseToday: Phase;
    scoreToday: number | null;

    plan7: Array<{ date: string; phase: Phase; focus: string }>;

    lastNDays: Array<{ date: string; phase: Phase; score: number; stress: number }>;

    series: Array<{
      date: string;
      phase: Phase;
      score: number;
      stress: number;
      lh: LHType;
      mucus: MucusType;
      cervix: CervixType;
      tempC?: number;
      tempShift: boolean;
      dayOfCycle: number | null;
      isPeriodStart: boolean;
    }>;

    insightPayload: InsightPayload;
  };
};

export function useHera(): HeraSession {
  const [status, setStatus] = useState<HeraSession["status"]>("booting");
  const [error, setError] = useState<string | undefined>(undefined);

  const [state, setState] = useState<HeraState>(freshState());
  const [tuning, setTuning] = useState<AdaptiveTuning>(freshTuning());

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = (await readState()) ?? freshState();
        const t = (await readTuning()) ?? freshTuning();
        if (!alive) return;
        setState(s);
        setTuning(t);
        setStatus("ready");
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Failed to load");
        setStatus("error");
      }
    })();
    return () => { alive = false; };
  }, []);

  const persistState = useCallback(async (next: HeraState) => {
    const updated: HeraState = { ...next, updatedAt: new Date().toISOString() };
    await writeState(updated);
    setState(updated);
  }, []);

  const persistTuning = useCallback(async (next: AdaptiveTuning) => {
    await writeTuning(next);
    setTuning(next);
  }, []);

  const recomputeTuning = useCallback(async (nextState: HeraState) => {
    const nextTuning = Adaptive.update(nextState, tuning);
    await persistTuning(nextTuning);
    return nextTuning;
  }, [persistTuning, tuning]);

  const setTheme = useCallback(async (t: ThemeKey) => {
    await persistState({ ...state, theme: t });
  }, [persistState, state]);

  const setPlanNotes = useCallback(async (text: string) => {
    await persistState({ ...state, planNotes: text });
  }, [persistState, state]);

  const setInsightNotes = useCallback(async (text: string) => {
    await persistState({ ...state, insightNotes: text });
  }, [persistState, state]);

  const togglePeriodStart = useCallback(async (dateKey: string) => {
    const exists = state.events.some((e) => e.type === "PeriodStart" && e.date === dateKey);
    const events = exists
      ? state.events.filter((e) => !(e.type === "PeriodStart" && e.date === dateKey))
      : [...state.events, { type: "PeriodStart", date: dateKey }];
    const nextState = { ...state, events };
    await persistState(nextState);
    await recomputeTuning(nextState);
  }, [persistState, recomputeTuning, state]);

  const upsertEntry = useCallback(async (entry: DayEntry) => {
    const clean: DayEntry = {
      ...entry,
      stress: Math.max(1, Math.min(10, Math.round(entry.stress)))
    };
    const nextState: HeraState = { ...state, entries: { ...state.entries, [clean.date]: clean } };
    await persistState(nextState);
    await recomputeTuning(nextState);
  }, [persistState, recomputeTuning, state]);

  const exportAll = useCallback(async (): Promise<ExportBundle> => ({
    app: "HeraCycle",
    exportedAt: new Date().toISOString(),
    state,
    tuning
  }), [state, tuning]);

  const importAll = useCallback(async (bundle: ExportBundle) => {
    if (!bundle || bundle.app !== "HeraCycle") throw new Error("Invalid export file");
    if (!bundle.state || bundle.state.version !== 3) throw new Error("Unsupported data version");
    if (!bundle.tuning || bundle.tuning.version !== 1) throw new Error("Unsupported tuning version");

    await writeState(bundle.state);
    await writeTuning(bundle.tuning);
    setState(bundle.state);
    setTuning(bundle.tuning);
  }, []);

  const derived = useMemo(() => {
    const todayKey = HeraEngine.todayKey();
    const avgCycleLen = HeraEngine.averageCycleLength(state);

    const phaseToday = Adaptive.phase(state, tuning, todayKey);
    const todayEntry = state.entries[todayKey];
    const scoreToday = todayEntry ? HeraEngine.scoreEntry(state, todayEntry, tuning.stressImpact).scorePct : null;

    const plan7 = Adaptive.plan7(state, tuning, todayKey);

    const keys = Object.keys(state.entries).sort();
    const lastKeys = keys.slice(-30);
    const periodStarts = new Set(state.events.filter((ev) => ev.type === "PeriodStart").map((ev) => ev.date));

    const lastNDays = lastKeys.map((k) => {
      const e = state.entries[k]!;
      const scored = HeraEngine.scoreEntry(state, e, tuning.stressImpact).scorePct;
      const phase = Adaptive.phase(state, tuning, k);
      return { date: k, phase, score: scored, stress: e.stress };
    });

    const series = lastKeys.map((k) => {
      const e = state.entries[k]!;
      const scored = HeraEngine.scoreEntry(state, e, tuning.stressImpact).scorePct;
      const phase = Adaptive.phase(state, tuning, k);
      const sig = HeraEngine.detectOvulationSignal(state, k);
      const dayOfCycle = HeraEngine.dayOfCycle(state, k);
      return {
        date: k,
        phase,
        score: scored,
        stress: e.stress,
        lh: e.lh,
        mucus: e.mucus,
        cervix: e.cervix,
        tempC: e.tempC,
        tempShift: sig.tempShift,
        dayOfCycle,
        isPeriodStart: periodStarts.has(k)
      };
    });

    // signal summary
    const mucusCounts: Record<string, number> = {};
    const lhCounts: Record<string, number> = {};
    let tempLogged = 0;

    for (const k of lastKeys) {
      const e = state.entries[k];
      if (!e) continue;
      mucusCounts[e.mucus] = (mucusCounts[e.mucus] ?? 0) + 1;
      lhCounts[e.lh] = (lhCounts[e.lh] ?? 0) + 1;
      if (typeof e.tempC === "number" && Number.isFinite(e.tempC)) tempLogged++;
    }

    const insightPayload: InsightPayload = {
      lastNDays: lastNDays.map((x, i) => ({ dayIndex: i, phase: x.phase, score: x.score, stress: x.stress })),
      summary: {
        avgCycleLen,
        ovulationDay: tuning.ovulationDay,
        windowDays: tuning.windowDays,
        confidence: tuning.confidence
      },
      signals: {
        mucusCounts,
        lhCounts,
        tempLoggedPct: lastKeys.length ? Math.round((tempLogged / lastKeys.length) * 100) : 0
      }
    };

    return { todayKey, avgCycleLen, phaseToday, scoreToday, plan7, lastNDays, series, insightPayload };
  }, [state, tuning]);

  return {
    status,
    error,
    state,
    tuning,
    setTheme,
    upsertEntry,
    togglePeriodStart,
    setPlanNotes,
    setInsightNotes,
    exportAll,
    importAll,
    derived
  };
}
