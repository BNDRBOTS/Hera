
"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";

export function LoadingIntro(props: { done: boolean; accentA: string; accentB: string }) {
  const [visible, setVisible] = useState(true);
  const [minHoldDone, setMinHoldDone] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setMinHoldDone(true), 1100);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!props.done || !minHoldDone) return;
    const t = window.setTimeout(() => setVisible(false), 520);
    return () => window.clearTimeout(t);
  }, [props.done, minHoldDone]);

  const orbA = useMemo(() => ({ background: `radial-gradient(circle at 30% 30%, ${props.accentA}, transparent 60%)` }), [props.accentA]);
  const orbB = useMemo(() => ({ background: `radial-gradient(circle at 70% 60%, ${props.accentB}, transparent 62%)` }), [props.accentB]);

  if (!visible) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-50 safe-px safe-pt safe-pb",
      "bg-[radial-gradient(1100px_820px_at_20%_10%,rgba(255,255,255,0.10),transparent_55%),linear-gradient(180deg,#0b0f19,#0f172a)]"
    )}>
      <div className="h-full flex flex-col items-center justify-center px-6">
        <div className="relative w-full max-w-sm">
          {/* Ambient color orbs */}
          <div className="absolute -inset-10 rounded-full blur-3xl opacity-80 animate-floaty" style={orbA} />
          <div className="absolute -inset-12 rounded-full blur-3xl opacity-60 animate-floaty [animation-delay:-0.9s]" style={orbB} />

          {/* Glass monolith */}
          <div className="relative rounded-[28px] glass border border-white/25 shadow-lift overflow-hidden">
            <div className="absolute inset-0 opacity-70 bg-[linear-gradient(110deg,rgba(255,255,255,0.10),rgba(255,255,255,0.28),rgba(255,255,255,0.10))] bg-[length:220%_100%] animate-shimmer" />
            <div className="relative p-8">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-white/75 border border-white/40 shadow-inner flex items-center justify-center">
                  <div className="h-5 w-5 rounded-full bg-slate-950/85" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-slate-950/55">Cycle Tracker</div>
                  <div className="text-xl font-extrabold tracking-tight text-slate-950/90">Hera’s Cycle</div>
                </div>
              </div>

              <div className="mt-7">
                <div className="h-2 w-full rounded-full bg-slate-950/10 overflow-hidden">
                  <div className="h-full w-[60%] rounded-full bg-slate-950/70 animate-loadingbar" />
                </div>
                <div className="mt-3 text-sm font-semibold text-slate-950/70">
                  Loading your local data…
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-950/55">
                  Works offline. No account.
                </div>
              </div>
            </div>
          </div>

          {/* subtle bottom glow */}
          <div className="mt-7 flex items-center justify-center">
            <div className="text-[11px] font-semibold text-white/65">
              Calm clarity. High signal. Low noise.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
