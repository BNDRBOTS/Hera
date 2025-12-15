"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui";

type Stage = "Inhale" | "Hold" | "Exhale";

export function AmbientBreather(props: { inhaleSec?: number; holdSec?: number; exhaleSec?: number }) {
  const inhaleSec = props.inhaleSec ?? 4;
  const holdSec = props.holdSec ?? 4;
  const exhaleSec = props.exhaleSec ?? 6;

  const plan = useMemo(() => ([
    { stage: "Inhale" as const, sec: inhaleSec, vibe: [30,40,30] as number[] },
    { stage: "Hold" as const, sec: holdSec, vibe: [60] as number[] },
    { stage: "Exhale" as const, sec: exhaleSec, vibe: [20,20,20,20] as number[] }
  ]), [inhaleSec, holdSec, exhaleSec]);

  const [running, setRunning] = useState(true);
  const [idx, setIdx] = useState(0);
  const [t, setT] = useState(plan[0]!.sec);

  const stage: Stage = plan[idx]!.stage;
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    tickRef.current = window.setInterval(() => {
      setT((prev) => {
        if (prev <= 1) {
          setIdx((i) => (i + 1) % plan.length);
          return plan[(idx + 1) % plan.length]!.sec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [running, plan, idx]);

  // Required haptics on stage changes
  const lastStageRef = useRef<Stage | null>(null);
  useEffect(() => {
    if (lastStageRef.current === stage) return;
    lastStageRef.current = stage;

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
  navigator.vibrate(plan[idx]!.vibe);
}
  }, [stage, plan, idx]);

  const scale =
    stage === "Inhale" ? "scale-110" :
    stage === "Hold" ? "scale-110" :
    "scale-95";

  return (
    <Card strong>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-950/90">Breather</div>
          <div className="text-xs text-slate-700/80">A quick reset to reduce noise in your reading.</div>
        </div>
        <button
          type="button"
          onClick={() => setRunning((r) => !r)}
          className="h-10 px-4 rounded-x4 bg-slate-950/90 text-white tap font-semibold"
        >
          {running ? "Pause" : "Resume"}
        </button>
      </div>

      <div className="mt-6 flex items-center justify-center">
        <div className={"relative h-52 w-52 rounded-full bg-slate-950/90 border border-white/15 shadow-soft transition-transform duration-1000 ease-in-out " + scale}>
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 to-transparent" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-white/92 text-2xl font-semibold">{stage}</div>
            <div className="text-white/70 text-sm mt-1">{t}s</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
