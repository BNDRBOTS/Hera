export type ThemeKey = "blush" | "serenity" | "nature";

export type MucusType = "Eggwhite" | "Watery" | "Creamy" | "Sticky" | "Dry" | "None";
export type LHType = "Peak" | "Positive" | "Negative";
export type CervixType = "High/Soft" | "Medium/Firm" | "Low/Hard";
export type Phase = "Menstruation" | "Follicular" | "Fertile" | "Luteal" | "Unknown";

export type DayEntry = {
  date: string; // YYYY-MM-DD (local)
  mucus: MucusType;
  tempC?: number;
  lh: LHType;
  cervix: CervixType;
  stress: number; // 1..10
  notes?: string;
};

export type CycleEvent = { type: "PeriodStart"; date: string };

export type AdaptiveTuning = {
  version: 1;
  // These weights adapt from the user’s own patterns.
  stressImpact: number;   // 0.6..1.8 (higher = stress matters more)
  windowDays: number;     // 5..10 (fertile window width)
  ovulationDay: number;   // 10..20
  confidence: number;     // 0..1
  updatedAt: string;
};

export type HeraState = {
  version: 3;
  createdAt: string;
  updatedAt: string;
  theme: ThemeKey;
  events: CycleEvent[];
  entries: Record<string, DayEntry>;
  // User-facing text blocks saved on device
  planNotes: string;
  insightNotes: string;
};

export type ExportBundle = {
  app: "HeraCycle";
  exportedAt: string;
  state: HeraState;
  tuning: AdaptiveTuning;
};

export type InsightPayload = {
  // anonymized: no raw dates, no notes
  lastNDays: Array<{ dayIndex: number; phase: Phase; score: number; stress: number }>;
  summary: {
    avgCycleLen: number | null;
    ovulationDay: number;
    windowDays: number;
    confidence: number;
  };
  signals: {
    mucusCounts: Record<string, number>;
    lhCounts: Record<string, number>;
    tempLoggedPct: number; // 0..100
  };
};
