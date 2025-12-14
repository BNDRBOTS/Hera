
import type { AdaptiveTuning, HeraState, Phase } from "@/lib/types";
import { HeraEngine } from "@/lib/hera-engine";

type Posterior = { day: number; p: number };

export class Adaptive {
  static defaultTuning(): AdaptiveTuning {
    return {
      version: 1,
      stressImpact: 1.0,
      windowDays: 7,
      ovulationDay: 14,
      confidence: 0.25,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Local learning (offline):
   * - Never touches identity.
   * - Never uploads anything.
   * - Only adapts small knobs that improve phase timing + plan quality.
   */
  static update(state: HeraState, prev: AdaptiveTuning): AdaptiveTuning {
    const now = new Date().toISOString();

    const keys = Object.keys(state.entries).sort();
    const periodStarts = state.events.filter((e) => e.type === "PeriodStart").map((e) => e.date).sort();

    // If there isn't enough signal history yet, gently increase confidence without guessing.
    if (keys.length < 10 || periodStarts.length < 1) {
      return {
        ...prev,
        updatedAt: now,
        confidence: this.clamp(prev.confidence + 0.04, 0.20, 0.55)
      };
    }

    // Use the most recent cycle window (start -> start+25d) to avoid mixing cycles.
    const lastStart = periodStarts[periodStarts.length - 1]!;
    const scanKeys = keys.filter((k) => k >= lastStart).slice(0, 25);
    const docByKey = new Map<string, number>();
    for (const k of scanKeys) {
      const doc = HeraEngine.dayOfCycle(state, k);
      if (doc != null) docByKey.set(k, doc);
    }

    const posterior = this.estimateOvulationPosterior(state, scanKeys, prev.ovulationDay);
    const ovulationDay = this.posteriorToDay(posterior, prev.ovulationDay);

    const avgCycleLen = HeraEngine.averageCycleLength(periodStarts);
    const cycleVar = this.cycleVariability(periodStarts);
    const windowDays = this.adaptWindowDays(prev.windowDays, cycleVar, posterior);

    const stressImpact = this.adaptStressImpact(state, prev.stressImpact);

    const confidence = this.estimateConfidence(state, scanKeys, avgCycleLen, posterior);

    return {
      version: 1,
      stressImpact,
      windowDays,
      ovulationDay,
      confidence,
      updatedAt: now
    };
  }

  static phase(state: HeraState, tuning: AdaptiveTuning, dateKey: string): Phase {
    return HeraEngine.phaseForDate(state, tuning.ovulationDay, tuning.windowDays, dateKey);
  }

  static plan7(state: HeraState, tuning: AdaptiveTuning, fromDateKey: string): Array<{ date: string; phase: Phase; focus: string }> {
    const out: Array<{ date: string; phase: Phase; focus: string }> = [];
    const start = new Date(fromDateKey + "T00:00:00");

    const conf = this.clamp(tuning.confidence, 0, 1);
    const lowConf = conf < 0.45;

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const key = `${y}-${m}-${day}`;
      const phase = this.phase(state, tuning, key);

      const doc = HeraEngine.dayOfCycle(state, key);
      const withinFertile = doc != null && this.isWithinFertile(doc, tuning.ovulationDay, tuning.windowDays);

      const focus =
        withinFertile
          ? (lowConf
              ? "Fertile window likely. Log LH + mucus + temp. Keep stress low to reduce noise."
              : "Fertile window. Prioritize LH + mucus. Temp helps confirm the shift.")
          : phase === "Luteal"
            ? (lowConf
                ? "Luteal phase likely. Log temp if you can (stability improves accuracy)."
                : "Luteal phase. Focus on steady routines and trend review.")
            : phase === "Menstruation"
              ? "Menstruation. Comfort + rest. Mark period start when it begins."
              : phase === "Follicular"
                ? (lowConf
                    ? "Follicular build-up. Log mucus daily; add LH closer to mid-cycle."
                    : "Follicular phase. Log mucus; LH closer to predicted fertile days.")
                : "Log what you can. Missing days don’t break tracking.";

      out.push({ date: key, phase, focus });
    }
    return out;
  }

  // ---------------------------
  // Ovulation posterior (local)
  // ---------------------------

  static estimateOvulationPosterior(state: HeraState, scanKeys: string[], fallbackOvDay: number): Posterior[] {
    // Candidate day-of-cycle range (kept conservative).
    const days: number[] = [];
    for (let d = 8; d <= 22; d++) days.push(d);

    // Evidence: map to log-likelihood-ish weights.
    // Goal: sharp posterior when signals align; flatter when data is sparse.
    const evidence = new Map<number, number>(days.map((d) => [d, 0]));

    const addGaussian = (center: number, amp: number, sigma: number) => {
      for (const d of days) {
        const z = (d - center) / Math.max(0.8, sigma);
        const w = amp * Math.exp(-0.5 * z * z);
        evidence.set(d, (evidence.get(d) ?? 0) + w);
      }
    };

    // Collect signal days
    let lhPeakDay: number | null = null;
    let tempShiftDay: number | null = null;
    let mucusPeakDay: number | null = null;
    let cervixHighDay: number | null = null;

    for (const k of scanKeys) {
      const doc = HeraEngine.dayOfCycle(state, k);
      if (doc == null) continue;
      const e = state.entries[k];
      if (!e) continue;

      if (e.lh === "Peak") lhPeakDay = doc;
      const sig = HeraEngine.detectOvulationSignal(state, k);
      if (sig.tempShift) tempShiftDay = doc;

      if (e.mucus === "Eggwhite") mucusPeakDay = mucusPeakDay == null ? doc : Math.min(mucusPeakDay, doc);
      if (e.cervix === "High/Soft") cervixHighDay = cervixHighDay == null ? doc : Math.min(cervixHighDay, doc);
    }

    // Primary signals
    if (lhPeakDay != null) addGaussian(lhPeakDay, 3.2, 1.2);
    if (tempShiftDay != null) addGaussian(tempShiftDay - 1, 2.2, 1.6); // shift usually after ovulation
    if (mucusPeakDay != null) addGaussian(mucusPeakDay, 1.4, 2.2);
    if (cervixHighDay != null) addGaussian(cervixHighDay, 1.0, 2.4);

    // Fallback bias around prior (prevents wild jumps when data is sparse).
    addGaussian(this.clampInt(fallbackOvDay, 10, 20), 0.8, 3.5);

    // Convert to posterior
    const raw: Posterior[] = days.map((d) => ({ day: d, p: Math.exp(evidence.get(d) ?? 0) }));
    const sum = raw.reduce((a, b) => a + b.p, 0) || 1;
    const post = raw.map((x) => ({ day: x.day, p: x.p / sum }));

    return post;
  }

  static posteriorToDay(post: Posterior[], fallback: number): number {
    if (!post.length) return this.clampInt(fallback, 10, 20);
    // MAP with mild inertia against jitter
    const best = post.reduce((a, b) => (b.p > a.p ? b : a), post[0]!).day;
    return this.clampInt(best, 10, 20);
  }

  static isWithinFertile(doc: number, ovDay: number, windowDays: number): boolean {
    const half = Math.max(2, Math.floor(windowDays / 2));
    return doc >= (ovDay - half) && doc <= (ovDay + 1);
  }

  // ---------------------------
  // Window width + stress impact
  // ---------------------------

  static cycleVariability(periodStarts: string[]): number {
    const lens = HeraEngine.computeCycleLengths(periodStarts).filter((x) => x >= 21 && x <= 45);
    if (lens.length < 3) return 0;
    const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
    const v = lens.reduce((a, b) => a + (b - mean) * (b - mean), 0) / lens.length;
    return Math.sqrt(v); // days
  }

  static adaptWindowDays(prev: number, cycleVar: number, post: Posterior[]): number {
    // Posterior spread: higher spread -> widen window.
    const mean = post.reduce((a, b) => a + b.day * b.p, 0);
    const varr = post.reduce((a, b) => a + (b.day - mean) * (b.day - mean) * b.p, 0);
    const spread = Math.sqrt(varr); // days

    const base = 7;
    const widen = 0.6 * this.clamp(cycleVar / 3.5, 0, 1) + 0.6 * this.clamp(spread / 2.5, 0, 1);
    const target = base + Math.round(3 * widen);

    const alpha = 0.25;
    const next = Math.round((1 - alpha) * prev + alpha * target);
    return this.clampInt(next, 5, 10);
  }

  static adaptStressImpact(state: HeraState, prev: number): number {
    // If stress consistently coincides with lower LAS score, increase stress impact slightly.
    const keys = Object.keys(state.entries).sort().slice(-45);
    const xs: number[] = [];
    const ys: number[] = [];
    for (const k of keys) {
      const e = state.entries[k];
      if (!e) continue;
      const scored = HeraEngine.scoreEntry(state, e, 1.0).scorePct;
      xs.push(e.stress);
      ys.push(scored);
    }
    const r = this.correlation(xs, ys); // negative correlation -> stress likely suppresses score
    const target = this.clamp(1.0 + (-r) * 0.35, 0.65, 1.55);
    const alpha = 0.18;
    return this.clamp((1 - alpha) * prev + alpha * target, 0.65, 1.55);
  }

  // ---------------------------
  // Confidence
  // ---------------------------

  static estimateConfidence(state: HeraState, scanKeys: string[], avgCycleLen: number | null, post: Posterior[]): number {
    // Logging completeness
    const logged = scanKeys.filter((k) => !!state.entries[k]).length;
    const complete = scanKeys.length ? logged / scanKeys.length : 0;

    // Posterior sharpness (1 - normalized entropy)
    const eps = 1e-9;
    const H = -post.reduce((a, b) => a + b.p * Math.log(b.p + eps), 0);
    const Hmax = Math.log(Math.max(2, post.length));
    const sharp = Hmax > 0 ? 1 - (H / Hmax) : 0;

    // Cycle plausibility (avg within reasonable range)
    const cycleOk = avgCycleLen == null ? 0.35 : (avgCycleLen >= 21 && avgCycleLen <= 45 ? 0.9 : 0.45);

    const raw = 0.18 + 0.42 * complete + 0.30 * sharp + 0.10 * cycleOk;
    return this.clamp(raw, 0.20, 0.95);
  }

  // ---------------------------
  // Math helpers
  // ---------------------------

  static correlation(xs: number[], ys: number[]): number {
    const n = Math.min(xs.length, ys.length);
    if (n < 6) return 0;
    const x = xs.slice(0, n);
    const y = ys.slice(0, n);
    const mx = x.reduce((a, b) => a + b, 0) / n;
    const my = y.reduce((a, b) => a + b, 0) / n;
    let num = 0, dx = 0, dy = 0;
    for (let i = 0; i < n; i++) {
      const a = x[i] - mx;
      const b = y[i] - my;
      num += a * b;
      dx += a * a;
      dy += b * b;
    }
    const den = Math.sqrt(dx * dy);
    return den === 0 ? 0 : num / den;
  }

  static clamp(v: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, v));
  }
  static clampInt(v: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, Math.round(v)));
  }
}
