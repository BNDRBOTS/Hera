"use client";
import { cn } from "@/lib/cn";

export function Card(props: { className?: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <section className={cn(props.strong ? "glass-strong" : "glass", "rounded-x5 p-5 fade-in", props.className)}>
      {props.children}
    </section>
  );
}

export function Pill(props: { className?: string; tone?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border border-white/35 bg-white/60 px-2.5 py-1 text-[11px] font-semibold text-slate-900/90", props.tone, props.className)}>
      {props.children}
    </span>
  );
}

export function Button(props: {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  tone?: "dark" | "soft";
}) {
  const tone = props.tone ?? "dark";
  return (
    <button
      type={props.type ?? "button"}
      disabled={props.disabled}
      onClick={props.onClick}
      className={cn(
        "w-full rounded-x4 px-4 tap font-semibold",
        tone === "dark"
          ? "bg-slate-950 text-white hover:bg-slate-900"
          : "bg-white/75 text-slate-950 hover:bg-white",
        props.disabled ? "opacity-50 pointer-events-none" : "",
        props.className
      )}
    >
      {props.children}
    </button>
  );
}

export function Toggle(props: {
  className?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className={cn("w-full flex items-center justify-between rounded-x4 border border-white/30 bg-white/60 px-4 py-3 tap", props.className)}
      onClick={() => props.onChange(!props.value)}
    >
      <span className="text-sm font-bold text-slate-950/80">{props.label}</span>
      <span
        className={cn(
          "relative h-6 w-11 rounded-full transition",
          props.value ? "bg-slate-950" : "bg-slate-300"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white transition",
            props.value ? "left-5" : "left-0.5"
          )}
        />
      </span>
    </button>
  );
}

export function Input(props: {
  className?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      placeholder={props.placeholder}
      type={props.type ?? "text"}
      className={cn(
        "w-full rounded-x4 border border-white/30 bg-white/60 px-4 py-3 text-sm font-semibold text-slate-950/90 outline-none placeholder:text-slate-500/70 focus:ring-2 focus:ring-slate-950/20",
        props.className
      )}
    />
  );
}

export function Divider() {
  return <div className="h-px w-full bg-white/30" />;
}
