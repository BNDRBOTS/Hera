
"use client";

import { Card, Pill } from "@/components/ui";

const FAQ: Array<{ title: string; items: Array<{ q: string; a: string }> }> = [
  {
    title: "Getting started",
    items: [
      {
        q: "What is Hera’s Cycle?",
        a: "A local-first cycle tracker that helps you spot patterns, predict likely phases, and keep a simple plan for what to watch next—without needing an account."
      },
      {
        q: "Do I need to create an account or sign in?",
        a: "No. Your data stays on this device. There is no login."
      },
      {
        q: "How do I add it to my phone like an app?",
        a: "Use “Add to Home Screen” in your browser menu. Hera opens full-screen and works offline once installed."
      }
    ]
  },
  {
    title: "Daily logging",
    items: [
      {
        q: "What should I log each day?",
        a: "If you only log one thing: stress + LH. If you can log more: add mucus, cervix, and temperature. More signals = higher confidence."
      },
      {
        q: "What if I miss days?",
        a: "Nothing breaks. Hera keeps going, but confidence drops until you add enough signal again."
      },
      {
        q: "Why does stress matter?",
        a: "Stress can blur patterns (sleep, temp stability, symptom noise). Hera adapts how much stress influences scoring based on your history."
      }
    ]
  },
  {
    title: "Period starts and cycle timing",
    items: [
      {
        q: "What does “Mark period start” do?",
        a: "It anchors your cycle timing. This is the single most important action for accurate day‑of‑cycle and phase estimates."
      },
      {
        q: "What if my cycle is irregular?",
        a: "Hera learns from your own history and avoids overreacting to outlier cycle lengths. Confidence will reflect irregularity instead of pretending certainty."
      }
    ]
  },
  {
    title: "Score and phases",
    items: [
      {
        q: "What does the daily percentage mean?",
        a: "It is a blended signal score from your logged inputs. It is designed for direction and timing—watch the trend more than the exact number."
      },
      {
        q: "What do the phase labels mean?",
        a: "They represent the most likely phase based on your anchored cycle timing and your logged signals. Confidence tells you how much to trust the label."
      },
      {
        q: "Does the app change its logic over time?",
        a: "It self-adjusts timing and planning based on your own signals—especially LH peaks and temperature shifts. The core score formula stays consistent."
      }
    ]
  },
  {
    title: "Visual screen (for visual learners)",
    items: [
      {
        q: "What is the Visual screen for?",
        a: "Fast pattern reading. You get a phase-shaded trend line, stress bars, and clear markers for major signals—so you can read the last weeks in seconds."
      },
      {
        q: "What should I look for first?",
        a: "Start with today’s phase + confidence. Then scan the trend for rises around mid-cycle and check whether LH Peak and/or a temperature shift appears near the rise."
      }
    ]
  },
  {
    title: "Calendar",
    items: [
      {
        q: "What does the calendar show?",
        a: "A clean month view with your recorded days, your likely phase, and a quick way to spot gaps."
      },
      {
        q: "Can I edit past days?",
        a: "Yes. Tap a day and update the entry. The plan and phase timing will adjust based on the new data."
      }
    ]
  },
  {
    title: "Optional insights",
    items: [
      {
        q: "What are insights?",
        a: "A summary note that turns your recent trend into a practical next-step plan. It is optional and can be used only when you want it."
      },
      {
        q: "What gets sent if I use insights?",
        a: "If you enable optional insights, only anonymous numbers and phase labels are sent (no identity, no raw dates). Otherwise, nothing leaves your device."
      }
    ]
  },
  {
    title: "Backup, export, and restore",
    items: [
      {
        q: "How do I back up my data?",
        a: "Use Export to save a backup file to your device or cloud storage. Keep at least two copies."
      },
      {
        q: "How often should I export?",
        a: "At minimum: weekly, and always before switching phones, clearing your browser data, or reinstalling the app."
      },
      {
        q: "What does Restore do?",
        a: "It loads an exported file and repopulates your entries and settings so you can continue seamlessly."
      }
    ]
  },
  {
    title: "Privacy and offline use",
    items: [
      {
        q: "Is my data stored online?",
        a: "No. Your cycle data stays on your device. Optional insights can be enabled, but they only use anonymous numbers and phase labels."
      },
      {
        q: "Will it work without internet?",
        a: "Yes. Logging, calendar, visuals, and planning work offline."
      }
    ]
  },
  {
    title: "Troubleshooting",
    items: [
      {
        q: "My confidence looks low—did I do something wrong?",
        a: "No. Confidence usually drops when data is sparse, signals conflict, or cycles are highly variable. Log a few consistent days and it will rise."
      },
      {
        q: "I imported a file but something looks missing.",
        a: "Restore loads everything in the backup export. If something looks off, export again from the original device and restore using the newest file."
      }
    ]
  }
];

export function FAQView() {
  return (
    <div className="space-y-4">
      {FAQ.map((sec) => (
        <Card key={sec.title}>
          <div className="flex items-center justify-between">
            <div className="text-sm font-extrabold text-slate-950/90">{sec.title}</div>
            <Pill tone="bg-white/75">FAQ</Pill>
          </div>
          <div className="mt-3 space-y-3">
            {sec.items.map((it) => (
              <div key={it.q} className="rounded-x4 border border-white/35 bg-white/70 px-3 py-2">
                <div className="text-sm font-extrabold text-slate-950/90">{it.q}</div>
                <div className="mt-1 text-sm font-semibold text-slate-950/75">{it.a}</div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
