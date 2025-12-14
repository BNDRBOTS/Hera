"use client";
import { cn } from "@/lib/cn";

export function Card(props: { className?: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <section className={cn(props.strong ? "glass-strong" : "glass", "rounded-x5 p-5 fade-in", props.className)}>
      {props.children}
    </section>
  );
}

export function Pill(props: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border border-white/30 bg-white/70 px-3 py-1 text-[11px] font-semibold text-slate-900/90", props.className)}>
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
        tone === "dark" ? "bg-slate-950/90 text-white" : "bg-white/70 text-slate-950 border border-white/30",
        props.disabled ? "opacity-70" : "",
        props.className
      )}
    >
      {props.children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <div className="text-[11px] font-bold tracking-wide text-slate-800/75">{props.label}</div>
      <input
        {...props}
        className={cn(
          "mt-1 w-full rounded-x4 border border-white/30 bg-white/80 px-3 py-2 text-slate-950 outline-none focus:ring-2 focus:ring-white/40",
          props.className
        )}
      />
    </label>
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="block">
      <div className="text-[11px] font-bold tracking-wide text-slate-800/75">{props.label}</div>
      <select
        {...props}
        className={cn(
          "mt-1 w-full rounded-x4 border border-white/30 bg-white/80 px-3 py-2 text-slate-950 outline-none focus:ring-2 focus:ring-white/40",
          props.className
        )}
      />
    </label>
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="block">
      <div className="text-[11px] font-bold tracking-wide text-slate-800/75">{props.label}</div>
      <textarea
        {...props}
        className={cn(
          "mt-1 w-full rounded-x4 border border-white/30 bg-white/80 px-3 py-2 text-slate-950 outline-none focus:ring-2 focus:ring-white/40",
          props.className
        )}
      />
    </label>
  );
}
