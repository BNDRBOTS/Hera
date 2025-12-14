import type { CervixType, DayEntry, HeraState, LHType, MucusType, Phase } from "@/lib/types";

export class HeraEngine {
  static mucusScore(m: MucusType): number {
    switch (m) {
      case "Eggwhite": return 10;
      case "Watery": return 8;
      case "Creamy": return 5;
      case "Sticky": return 3;
      case "Dry": return 1;
      case "None": return 0;
      default: return 0;
    }
  }
  static lhScore(lh: LHType): number {
    switch (lh) {
      case "Peak": return 10;
      case "Positive": return 7;
      case "Negative": return 0;
      default: return 0;
    }
  }
  static cervixScore(c: CervixType): number {
    switch (c) {
      case "High/Soft": return 10;
      case "Medium/Firm": return 5;
      case "Low/Hard": return 1;
      default: return 1;
    }
  }

  static tempShiftScore(todayTempC: number | undefined, baselineTempsC: number[]): number {
    if (typeof todayTempC !== "number" || !Number.isFinite(todayTempC)) return 5;
    const vals = baselineTempsC.filter((v) => Number.isFinite(v));
    if (vals.length < 3) return 5;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return (todayTempC - avg) > 0.2 ? 10 : 5;
  }

  // REQUIRED formula (unchanged):
  // (Mucus^2.5 + Temp^2.2 + LH^1.9 + Cervix^1.5) / Stress^1.4
  static heraLAS(params: { mucus: number; temp: number; lh: number; cervix: number; stress: number }): number {
    const s = Math.max(1, Math.min(10, params.stress));
    return (
      Math.pow(params.mucus, 2.5) +
      Math.pow(params.temp, 2.2) +
      Math.pow(params.lh, 1.9) +
      Math.pow(params.cervix, 1.5)
    ) / Math.pow(s, 1.4);
  }

  static scoreToPercent(las: number): number {
    const x = Math.max(0, las);
    const p = 100 * (1 - Math.exp(-x / 280));
    return Math.round(p * 10) / 10;
  }

  static todayKey(now = new Date()): string {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  static listPeriodStarts(state: HeraState): string[] {
    return state.events.filter((e) => e.type === "PeriodStart").map((e) => e.date).sort();
  }

  static computeCycleLengths(periodStarts: string[]): number[] {
    const s = [...periodStarts].sort();
    const out: number[] = [];
    for (let i = 1; i < s.length; i++) {
      const a = new Date(s[i - 1] + "T00:00:00").getTime();
      const b = new Date(s[i] + "T00:00:00").getTime();
      const days = Math.round((b - a) / (1000 * 60 * 60 * 24));
      if (Number.isFinite(days)) out.push(days);
    }
    return out;
  }

  // Smart averaging with anomaly filter (<21 or >45 days removed)
  static averageCycleLength(state: HeraState): number | null {
    const starts = this.listPeriodStarts(state);
    const lengths = this.computeCycleLengths(starts).filter((d) => d >= 21 && d <= 45);
    if (lengths.length === 0) return null;
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    return Math.round(avg * 10) / 10;
  }

  static lastPeriodStartOnOrBefore(state: HeraState, dateKey: string): string | null {
    const starts = this.listPeriodStarts(state);
    const t = new Date(dateKey + "T00:00:00").getTime();
    let best: string | null = null;
    for (const s of starts) {
      const ts = new Date(s + "T00:00:00").getTime();
      if (ts <= t) best = s; else break;
    }
    return best;
  }

  static dayOfCycle(state: HeraState, dateKey: string): number | null {
    const start = this.lastPeriodStartOnOrBefore(state, dateKey);
    if (!start) return null;
    const a = new Date(start + "T00:00:00").getTime();
    const b = new Date(dateKey + "T00:00:00").getTime();
    return Math.floor((b - a) / (1000 * 60 * 60 * 24)) + 1;
  }

  static getBaselineTempsBefore(state: HeraState, dateKey: string, lookbackDays = 6): number[] {
    const keys = Object.keys(state.entries).sort();
    const idx = keys.indexOf(dateKey);
    if (idx <= 0) return [];
    const from = Math.max(0, idx - lookbackDays);
    const slice = keys.slice(from, idx);
    const out: number[] = [];
    for (const k of slice) {
      const t = state.entries[k]?.tempC;
      if (typeof t === "number" && Number.isFinite(t)) out.push(t);
    }
    return out;
  }

  static scoreEntry(state: HeraState, entry: DayEntry, stressImpact = 1.0): { las: number; scorePct: number } {
    const mucusN = this.mucusScore(entry.mucus);
    const lhN = this.lhScore(entry.lh);
    const cervixN = this.cervixScore(entry.cervix);
    const baselineTemps = this.getBaselineTempsBefore(state, entry.date, 6);
    const tempN = this.tempShiftScore(entry.tempC, baselineTemps);

    const las = this.heraLAS({
      mucus: mucusN,
      temp: tempN,
      lh: lhN,
      cervix: cervixN,
      stress: Math.max(1, Math.min(10, entry.stress * stressImpact))
    });

    return { las, scorePct: this.scoreToPercent(las) };
  }

  static detectOvulationSignal(state: HeraState, dateKey: string): { lhPeak: boolean; tempShift: boolean } {
    const e = state.entries[dateKey];
    if (!e) return { lhPeak: false, tempShift: false };
    const lhPeak = e.lh === "Peak";
    const baselineTemps = this.getBaselineTempsBefore(state, dateKey, 6);
    const tempN = this.tempShiftScore(e.tempC, baselineTemps);
    return { lhPeak, tempShift: tempN === 10 };
  }

  static phaseForDate(state: HeraState, ovulationDay: number, windowDays: number, dateKey: string): Phase {
    const doc = this.dayOfCycle(state, dateKey);
    if (!doc) return "Unknown";
    if (doc >= 1 && doc <= 5) return "Menstruation";

    const ovu = Math.max(10, Math.min(20, ovulationDay));
    const w = Math.max(5, Math.min(10, windowDays));
    const half = Math.floor(w / 2);

    const fertileStart = Math.max(1, Math.round(ovu - half));
    const fertileEnd = Math.round(ovu + 1);

    if (doc >= fertileStart && doc <= fertileEnd) return "Fertile";
    if (doc > fertileEnd) return "Luteal";
    return "Follicular";
  }
}
