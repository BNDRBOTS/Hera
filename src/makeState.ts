import type { AdaptiveTuning, HeraState } from "@/lib/types";
import { Adaptive } from "@/lib/adaptive";

export function freshState(): HeraState {
  const now = new Date().toISOString();
  return {
    version: 3,
    createdAt: now,
    updatedAt: now,
    theme: "blush",
    events: [],
    entries: {},
    planNotes: "",
    insightNotes: ""
  };
}

export function freshTuning(): AdaptiveTuning {
  return Adaptive.defaultTuning();
}
