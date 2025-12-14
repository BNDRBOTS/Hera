import { NextResponse } from "next/server";
import type { InsightPayload } from "@/lib/types";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/insight";

type Provider = "openai" | "anthropic" | "gemini";

function provider(): Provider | null {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return null;
}

export async function POST(req: Request) {
  try {
    const p = provider();
    if (!p) return NextResponse.json({ ok: false, error: "Not configured" }, { status: 400 });

    const payload = (await req.json()) as InsightPayload;
    const userPrompt = buildUserPrompt(payload);

    if (p === "openai") {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY!}`
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
          temperature: 0.35,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt }
          ]
        })
      });
      if (!r.ok) return NextResponse.json({ ok: false, error: await r.text() }, { status: 502 });
      const j = await r.json() as any;
      const text = j?.choices?.[0]?.message?.content ?? "";
      return NextResponse.json({ ok: true, provider: p, text });
    }

    if (p === "anthropic") {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest",
          max_tokens: 650,
          temperature: 0.35,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }]
        })
      });
      if (!r.ok) return NextResponse.json({ ok: false, error: await r.text() }, { status: 502 });
      const j = await r.json() as any;
      const text = j?.content?.[0]?.text ?? "";
      return NextResponse.json({ ok: true, provider: p, text });
    }

    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(process.env.GEMINI_MODEL ?? "gemini-1.5-flash")}:generateContent?key=${process.env.GEMINI_API_KEY!}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: SYSTEM_PROMPT + "\n\n" + userPrompt }] }],
        generationConfig: { temperature: 0.35, maxOutputTokens: 750 }
      })
    });
    if (!r.ok) return NextResponse.json({ ok: false, error: await r.text() }, { status: 502 });
    const j = await r.json() as any;
    const text = j?.candidates?.[0]?.content?.parts?.map((x: any) => x?.text ?? "").join("") ?? "";
    return NextResponse.json({ ok: true, provider: p, text });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Request failed" }, { status: 400 });
  }
}
