import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { applyOverrides } from "@/lib/intentOverrides";

const HF_SPACE_URL = process.env.HF_SPACE_URL ?? "https://rajk12-assamese-tourism-chatbot.hf.space";
const TIMEOUT_MS   = 120_000;
const GROQ_TIMEOUT = 15_000;

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

const SYSTEM_PROMPT =
  "You are TourBot, a friendly tourism assistant specialising in Assam, India. " +
  "A retrieval pipeline has already found the relevant factual answer. " +
  "Your task: rewrite it in a natural, conversational, helpful tone. " +
  "Rules — (1) keep every number, price, distance, and named detail exactly as given; " +
  "(2) add no facts that are not in the retrieved answer; " +
  "(3) be concise (2–4 sentences); " +
  "(4) if the user wrote in Assamese or code-mixed language, reply in the same friendly mixed style; " +
  "(5) never expose internal labels like 'Retrieved answer:' or 'Intent:'; " +
  "(6) NEVER use bullet points, dashes, hyphens, or numbered lists — write only in plain flowing prose sentences; " +
  "(7) NEVER use Bengali words — the language is Assamese, not Bengali; these words are forbidden: 'jemon', 'jonno', 'ache' — rephrase naturally without them instead of substituting a fixed replacement.";

type Turn = { role: string; content: string };

async function polish(
  message:    string,
  rawAnswer:  string,
  debugMd:    string,
  priorTurns: Turn[],
): Promise<string> {
  if (!groq || !rawAnswer) return rawAnswer;

  const intentMatch = debugMd.match(/\*\*Intent:\*\*[^\n]*?`([^`]+)`/);
  const destMatch   = debugMd.match(/\*\*Destination:\*\*\s*([^\n*]+)/);
  const ctx = [
    intentMatch?.[1] ? `Intent: ${intentMatch[1].trim()}`    : "",
    destMatch?.[1]   ? `Destination: ${destMatch[1].trim()}` : "",
  ].filter(Boolean).join("\n");

  const userPrompt =
    `User query: "${message}"\n` +
    (ctx ? `${ctx}\n` : "") +
    `\nRetrieved answer:\n${rawAnswer}\n\nRewrite this naturally.`;

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), GROQ_TIMEOUT);

  try {
    const completion = await groq.chat.completions.create(
      {
        model:       "llama-3.3-70b-versatile",
        temperature: 0.4,
        max_tokens:  350,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...priorTurns.slice(-6).map(t => ({
            role:    t.role as "user" | "assistant",
            content: t.content,
          })),
          { role: "user", content: userPrompt },
        ],
      },
      { signal: abort.signal },
    );
    return completion.choices[0]?.message?.content?.trim() || rawAnswer;
  } finally {
    clearTimeout(timer);
  }
}

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

      // Polish with Groq; silently fall back to raw on any failure
      let polished = rawAnswer;
      if (groq && rawAnswer) {
        try {
          polished = await polish(
            message,
            rawAnswer,
            data.debug ?? "",
            newHistory.slice(0, -2), // prior turns only, excluding current exchange
          );
        } catch (e) {
          console.warn("Groq polish failed, using raw answer:", e);
        }
      }

      // Replace last assistant turn in history with polished text
      const outHistory = [...newHistory];
      const lastIdx = outHistory.map(t => t.role).lastIndexOf("assistant");
      if (lastIdx !== -1 && polished !== rawAnswer) {
        outHistory[lastIdx] = { role: "assistant", content: polished };
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
