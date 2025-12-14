"use client";
import type { ThemeKey } from "@/lib/types";
import { cn } from "@/lib/cn";

const THEMES: Record<ThemeKey, { name: string; grad: string; a: string; b: string }> = {
  blush: { name: "Blush", grad: "from-rose-400 to-rose-600", a: "var(--blushA)", b: "var(--blushB)" },
  serenity: { name: "Serenity", grad: "from-indigo-400 to-indigo-600", a: "var(--serA)", b: "var(--serB)" },
  nature: { name: "Nature", grad: "from-emerald-400 to-emerald-600", a: "var(--natA)", b: "var(--natB)" }
};

export function accent(theme: ThemeKey): { a: string; b: string } {
  const t = THEMES[theme] ?? THEMES.blush;
  return { a: t.a, b: t.b };
}

export function ThemePicker(props: { value: ThemeKey; onChange: (t: ThemeKey) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {(Object.keys(THEMES) as ThemeKey[]).map((k) => {
        const t = THEMES[k];
        const active = props.value === k;
        return (
          <button
            key={k}
            type="button"
            onClick={() => props.onChange(k)}
            className={cn(
              "rounded-x4 border tap px-3 py-3 text-left",
              active ? "bg-white/80 border-white/45" : "bg-white/65 border-white/25"
            )}
            aria-pressed={active}
          >
            <div className={cn("h-9 rounded-xl bg-gradient-to-r", t.grad)} />
            <div className="mt-2 text-sm font-semibold text-slate-950/90">{t.name}</div>
          </button>
        );
      })}
    </div>
  );
}
