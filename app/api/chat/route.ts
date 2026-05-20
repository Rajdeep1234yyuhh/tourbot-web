import { NextRequest, NextResponse } from "next/server";
import { applyOverrides } from "@/lib/intentOverrides";

const HF_SPACE_URL = process.env.HF_SPACE_URL ?? "https://rajk12-assamese-tourism-chatbot.hf.space";
const TIMEOUT_MS   = 120_000;

type Turn = { role: string; content: string };

// ── Intent-aware noise filtering ───────────────────────────────────────────────
// Each category lists regex patterns that match sentences to REMOVE.
// Patterns are English-keyword-based so they work regardless of Assamese words.
const NOISE: Record<string, RegExp[]> = {
  hotel_accommodation: [
    /Indians?\s*:\s*₹|Foreigners?\s*:\s*₹/,
    /\bentry\b.{0,40}₹|₹.{0,40}\bentry fee\b/i,
    /\b(jeep|elephant)\s+safari\b/i,
    /\bsafari\b.{0,40}(₹|fee|cost|price|charge)/i,
    /\bcamera\s*(charge|fee|₹)\b/i,
    /\bvideo\s+camera\b/i,
    /\bstill\s+camera\b/i,
  ],
  entry_fee: [
    /\b(hotel|resort|lodge|stay|accommodation|guest\s*house|hostel)\b/i,
    /\b(jeep|elephant)\s+safari\b/i,
    /\bcamera\s*(charge|fee)\b/i,
    /\b(restaurant|cafe|food|dining)\b/i,
  ],
  safari: [
    /\b(hotel|resort|lodge|stay|accommodation|guest\s*house|hostel)\b/i,
    /Indians?\s*:\s*₹|Foreigners?\s*:\s*₹/,
    /\bentry\b.{0,40}₹/i,
    /\bcamera\s*(charge|fee|₹)\b/i,
    /\b(restaurant|cafe|food|dining)\b/i,
  ],
  food_restaurant: [
    /\b(hotel|resort|lodge|stay|accommodation|guest\s*house|hostel)\b/i,
    /Indians?\s*:\s*₹|Foreigners?\s*:\s*₹/,
    /\b(jeep|elephant)\s+safari\b/i,
    /\bcamera\s*(charge|fee)\b/i,
  ],
  transport: [
    /\b(hotel|resort|lodge|stay|accommodation|guest\s*house|hostel)\b/i,
    /Indians?\s*:\s*₹|Foreigners?\s*:\s*₹/,
    /\bcamera\s*(charge|fee)\b/i,
    /\b(jeep|elephant)\s+safari\b/i,
  ],
};

function getCategory(intent: string): string | null {
  const i = intent.toLowerCase();
  if (/hotel|stay|accommodation|lodge|resort|room|night|sleep/.test(i)) return "hotel_accommodation";
  if (/entry|ticket|fee|pass|permit|admission/.test(i))                 return "entry_fee";
  if (/safari|jeep|elephant/.test(i))                                   return "safari";
  if (/food|restaurant|eat|dining|cuisine|meal/.test(i))                return "food_restaurant";
  if (/transport|bus|train|flight|reach|distance|travel|route/.test(i)) return "transport";
  return null;
}

function filterByIntent(rawAnswer: string, intent: string): string {
  const category = getCategory(intent);
  if (!category) return rawAnswer;

  const patterns = NOISE[category];
  const sentences = rawAnswer.split(/(?<=\.)\s+|\n+/).filter(Boolean);
  const kept = sentences.filter(s => !patterns.some(p => p.test(s)));
  const result = kept.join(" ").trim();
  return result || rawAnswer; // fall back to raw if everything was removed
}

// ── Route handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Empty message" }, { status: 400 });
    }

    const { forwardQuery, overriddenIntent, fired } = applyOverrides(message);

    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(`${HF_SPACE_URL}/predict`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        signal:  abort.signal,
        body:    JSON.stringify({ message: forwardQuery, history: history ?? [] }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("HF Space error:", text);
        return NextResponse.json(
          { error: "HF Space unavailable. Please try again." },
          { status: 502 },
        );
      }

      const data = await res.json();

      if (data.error) {
        return NextResponse.json({ error: data.error }, { status: 503 });
      }

      // Restore original message in history if a prefix was added
      const newHistory: Turn[] = (data.history ?? []).map((t: Turn) =>
        t.role === "user" && t.content === forwardQuery
          ? { ...t, content: message }
          : t
      );
      const rawAnswer =
        [...newHistory].reverse().find(m => m.role === "assistant")?.content ?? "";

      // Filter out unrelated sentences based on detected intent
      const intentMatch = (data.debug ?? "").match(/\*\*Intent:\*\*[^\n]*?`([^`]+)`/);
      const intent      = intentMatch?.[1]?.trim() ?? "";
      const filtered    = filterByIntent(rawAnswer, intent);

      // Replace last assistant turn with filtered answer
      const outHistory = [...newHistory];
      const lastIdx    = outHistory.map(t => t.role).lastIndexOf("assistant");
      if (lastIdx !== -1 && filtered !== rawAnswer) {
        outHistory[lastIdx] = { role: "assistant", content: filtered };
      }

      const debugOut = fired && overriddenIntent
        ? `**Override:** \`${overriddenIntent}\` *(keyword rule)*\n\n${data.debug ?? ""}`
        : (data.debug ?? "");

      return NextResponse.json({
        history:   outHistory,
        debug:     debugOut,
        rawAnswer,
      });

    } finally {
      clearTimeout(timer);
    }

  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json(
        { error: "Request timed out. The Space may be waking up — try again in a moment." },
        { status: 504 },
      );
    }
    console.error("Chat API error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
