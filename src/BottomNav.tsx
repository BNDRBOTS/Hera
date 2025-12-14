"use client";
import { cn } from "@/lib/cn";
import { BarChart3, CalendarDays, HeartPulse, Settings, Sparkles } from "lucide-react";

export type Tab = "Home" | "Log" | "Visual" | "Calendar" | "Settings";

export function BottomNav(props: { tab: Tab; setTab: (t: Tab) => void; accentA: string; accentB: string }) {
  const Item = (p: { t: Tab; label: string; icon: React.ReactNode }) => {
    const active = props.tab === p.t;
    return (
      <button
        type="button"
        onClick={() => props.setTab(p.t)}
        className={cn(
          "h-12 rounded-x4 border tap flex flex-col items-center justify-center gap-1",
          active ? "bg-white/82 border-white/45" : "bg-white/62 border-white/25"
        )}
        aria-pressed={active}
      >
        <div className={cn(active ? "text-slate-950" : "text-slate-800/80")}>{p.icon}</div>
        <div className={cn("text-[10px] font-bold tracking-wide", active ? "text-slate-950/90" : "text-slate-800/75")}>{p.label}</div>
      </button>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 safe-px safe-pb pb-3 z-40">
      <div className="mx-auto max-w-xl rounded-x5 glass p-2">
        <div className="grid grid-cols-5 gap-2 items-end">
          <Item t="Home" label="Home" icon={<HeartPulse size={18} />} />
          <Item t="Calendar" label="Calendar" icon={<CalendarDays size={18} />} />

          {/* Raised center action */}
          <button
            type="button"
            onClick={() => props.setTab("Log")}
            className="relative -mt-6 h-14 rounded-2xl tap shadow-lift border border-white/20"
            style={{ backgroundImage: `linear-gradient(90deg, ${props.accentA}, ${props.accentB})`, color: "white" }}
            aria-label="Quick Log"
          >
            <div className="absolute -inset-4 rounded-3xl blur-2xl opacity-30" style={{ backgroundImage: `radial-gradient(circle, ${props.accentA}, transparent 60%)` }} />
            <div className="relative h-full w-full flex items-center justify-center font-extrabold text-2xl">+</div>
          </button>

          <Item t="Visual" label="Visual" icon={<BarChart3 size={18} />} />
          <Item t="Settings" label="Settings" icon={<Settings size={18} />} />
        </div>
      </div>
    </nav>
  );
}
