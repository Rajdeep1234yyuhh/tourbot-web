import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { appendFileSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { applyOverrides } from "@/lib/intentOverrides";

// ── OOD CSV logger ─────────────────────────────────────────────────────────────
const LOG_FILE    = join(process.cwd(), "ood_log.csv");
const LOG_HEADERS = "row_id,timestamp,query,predicted_intent,confidence_pct,routing_tier,retrieved_answer_preview,verdict";

function csvEscape(s: string | number): string {
  const str = String(s).replace(/\r?\n/g, " ");
  return /[,"]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function logQuery(
  query: string, intent: string, confidencePct: number,
  routingTier: string, answerPreview: string,
): void {
  try {
    const fileExists = existsSync(LOG_FILE);
    const rowId = fileExists
      ? Math.max(0, readFileSync(LOG_FILE, "utf-8").split("\n").filter(Boolean).length - 1)
      : 0;
    const row = [
      rowId, new Date().toISOString().slice(0, 19), query.trim(),
      intent, confidencePct.toFixed(1), routingTier,
      answerPreview.slice(0, 120), "",
    ].map(csvEscape).join(",");
    if (!fileExists) appendFileSync(LOG_FILE, LOG_HEADERS + "\n", "utf-8");
    appendFileSync(LOG_FILE, row + "\n", "utf-8");
  } catch { /* silently fail — never break the main flow */ }
}

const HF_SPACE_URL = process.env.HF_SPACE_URL ?? "https://rajk12-assamese-tourism-chatbot.hf.space";
const TIMEOUT_MS   = 120_000;
const GROQ_TIMEOUT = 10_000;

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

type Turn = { role: string; content: string };

// ── Intent-aware noise filtering ───────────────────────────────────────────────
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
  const patterns  = NOISE[category];
  const sentences = rawAnswer.split(/(?<=\.)\s+|\n+/).filter(Boolean);
  const kept      = sentences.filter(s => !patterns.some(p => p.test(s)));
  return kept.join(" ").trim() || rawAnswer;
}

// ── LLM: remove formatting dashes, add minimal connecting intro ────────────────
async function cleanAnswer(answer: string): Promise<string> {
  if (!groq || !answer) return answer;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), GROQ_TIMEOUT);
  try {
    const completion = await groq.chat.completions.create(
      {
        model:       "llama-3.3-70b-versatile",
        temperature: 0,
        max_tokens:  350,
        messages: [{
          role:    "system",
          content:
            "Return ONLY the cleaned text — no explanation, no commentary.\n" +
            "Fix: remove 'Word t —' patterns (e.g. 'Kaziranga t —', 'Tezpur t —'). Keep topic labels before them (e.g. 'Crowd info —' → keep 'Crowd info'). Remove standalone '—' separators. Keep hyphens in ranges ('15-28°C', 'Oct-March', '₹1000-2000'). Do not change any fact, number, price, or place name.",
        }, {
          role:    "user",
          content: answer,
        }],
      },
      { signal: abort.signal },
    );
    return completion.choices[0]?.message?.content?.trim() || answer;
  } catch {
    return answer;
  } finally {
    clearTimeout(timer);
  }
}

// ── Fuzzy destination detection ────────────────────────────────────────────────
// Q&A bank destinations (exact names) + common Assam district/place names.
// Extra names not in the Q&A bank are still needed so fuzzy detection identifies
// them and the destination-mismatch guard returns "no info" instead of wrong data.
const KNOWN_DESTINATIONS = [
  // Q&A bank destinations
  "Kaziranga National Park", "Majuli Island", "Kamakhya Temple", "Guwahati",
  "Tezpur", "Haflong", "Sivasagar", "Dibru-Saikhowa National Park",
  "Pobitora Wildlife Sanctuary", "Orang National Park", "Jorhat", "Dibrugarh",
  "Manas National Park", "Barpeta", "Dhubri", "Goalpara", "Sadiya", "Hajo",
  "Sualkuchi", "Nameri National Park", "Charaideo Maidams",
  "Hoollongapar Gibbon Sanctuary", "Umananda Island", "Bhalukpong",
  "Madan Kamdev", "Garampani", "Kakochang Waterfall", "Panimoor Falls",
  "Chakrashila Wildlife Sanctuary", "Bishwanath Ghat", "Rudrasagar Lake",
  "Tocklai Tea Research Institute", "Padum Pukhuri", "Deepor Beel",
  "Chandubi Lake", "Batadrava Than", "Negheriting Shiva Dol",
  "Dhekiakhowa Bornamghar", "Bordowa", "Sarthebari",
  "Pani Dihing Bird Sanctuary", "Sonai Rupai Wildlife Sanctuary",
  "Joypur Rainforest", "Bura Chapori Wildlife Sanctuary",
  "Laokhowa Wildlife Sanctuary", "Navagraha Temple", "Basistha Ashram",
  "Doul Govinda Temple", "Barail Wildlife Sanctuary", "Abhayapuri", "Tawang",
  // Assam districts/places not in Q&A bank — detected so mismatch guard fires
  "Hailakandi", "Karimganj", "Silchar", "Cachar", "Nagaon", "Golaghat",
  "Lakhimpur", "Dhemaji", "Nalbari", "Bokakhat", "Diphu", "Hojai",
  "Morigaon", "Sonitpur", "Karbi Anglong", "Dima Hasao", "Bongaigaon",
  "Chirang", "Baksa", "Kokrajhar", "Darrang", "Udalguri", "Kamrup",
  "Lumding", "Tinsukia", "Sibsagar",
];

// Bigram Jaccard similarity — handles typos well
function bigrams(s: string): Set<string> {
  const bg = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) bg.add(s.slice(i, i + 2));
  return bg;
}

function jaccardSim(a: Set<string>, b: Set<string>): number {
  const intersection = [...a].filter(x => b.has(x)).length;
  const union        = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

// Assamese locative/genitive suffixes that get merged onto place names
const ASSAMESE_SUFFIXES = /(?:or|ot|te?)$/i;

function fuzzyDetectDestination(query: string, threshold = 0.45): string | null {
  const tokens = query.toLowerCase().replace(/[?!,।]/g, " ").split(/\s+/).filter(Boolean);

  let best: string | null = null;
  let bestScore = 0;

  for (const rawToken of tokens) {
    const variants = [rawToken, rawToken.replace(ASSAMESE_SUFFIXES, "")];
    for (const token of variants) {
      if (token.length < 3) continue;
      const tokenBg = bigrams(token);
      for (const dest of KNOWN_DESTINATIONS) {
        const score = jaccardSim(tokenBg, bigrams(dest.toLowerCase()));
        if (score > bestScore) { bestScore = score; best = dest; }
      }
    }
  }

  return bestScore >= threshold ? best : null;
}

// ── HF Space call ──────────────────────────────────────────────────────────────
async function callHF(
  query:   string,
  history: Turn[],
  signal:  AbortSignal,
): Promise<Response> {
  return fetch(`${HF_SPACE_URL}/predict`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body:    JSON.stringify({ message: query, history }),
  });
}

// ── Route handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Empty message" }, { status: 400 });
    }

    const { forwardQuery, overriddenIntent, fired } = applyOverrides(message);

    // ── Always prepend detected destination ─────────────────────────────────────
    // The frontend fuzzy detector handles typos and Assamese suffixes better than
    // the backend's keyword lookup (which only covers destinations in the Q&A bank).
    // Prepending the canonical name ensures the backend filters correctly even when
    // its own detection misses the destination.
    const detectedDest  = fuzzyDetectDestination(message);
    const alreadyInQuery = detectedDest
      ? forwardQuery.toLowerCase().includes(detectedDest.toLowerCase())
      : false;
    const queryWithDest = (detectedDest && !alreadyInQuery)
      ? `${detectedDest}: ${forwardQuery}`
      : forwardQuery;

    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);

    try {
      let res = await callHF(queryWithDest, history ?? [], abort.signal);

      if (!res.ok) {
        console.error("HF Space error:", await res.text());
        return NextResponse.json(
          { error: "HF Space unavailable. Please try again." },
          { status: 502 },
        );
      }

      let data = await res.json();

      if (data.error) {
        return NextResponse.json({ error: data.error }, { status: 503 });
      }

      // ── no_destination fallback (destination not in Q&A bank at all) ─────────
      const isNoDestination = (data.debug ?? "").includes("`no_destination`");
      if (isNoDestination && !detectedDest) {
        return NextResponse.json(
          { error: "Which destination are you asking about? Please mention the name." },
          { status: 200 },
        );
      }

      // ── Low-confidence retry with best-guess destination ─────────────────────
      // When backend returns "I am not sure I understood" (no destination detected,
      // confidence below LOW_CONF), retry with a lenient fuzzy threshold (0.15) to
      // find any partial destination match and force a cross-intent retrieval.
      const tempAnswer = [...(data.history ?? [])].reverse()
        .find((m: Turn) => m.role === "assistant")?.content ?? "";
      if (tempAnswer.includes("I am not sure I understood")) {
        const bestGuessDest = fuzzyDetectDestination(message, 0.15);
        if (bestGuessDest) {
          const retryQ   = `${bestGuessDest}: ${forwardQuery}`;
          const retryRes = await callHF(retryQ, history ?? [], abort.signal);
          if (retryRes.ok) {
            const retryData = await retryRes.json();
            const retryAns  = [...(retryData.history ?? [])].reverse()
              .find((m: Turn) => m.role === "assistant")?.content ?? "";
            if (!retryData.error && !retryAns.includes("I am not sure")) {
              data = retryData;
            }
          }
        }
      }

      // Restore original message in history (replace any prefixed query with original)
      const newHistory: Turn[] = (data.history ?? []).map((t: Turn) =>
        t.role === "user" && t.content !== message
          ? { ...t, content: message }
          : t
      );
      const rawAnswer =
        [...newHistory].reverse().find(m => m.role === "assistant")?.content ?? "";

      // Filter irrelevant sentences then clean formatting
      // Only run LLM cleaning when there's a real pipeline result (intent present).
      // Skip for backend error/fallback messages like "I am not sure I understood."
      const intentMatch = (data.debug ?? "").match(/\*\*Intent:\*\*[^\n]*?`([^`]+)`/);
      const intent      = intentMatch?.[1]?.trim() ?? "";
      const filtered    = filterByIntent(rawAnswer, intent);
      const cleaned     = intent ? await cleanAnswer(filtered) : filtered;

      // Replace last assistant turn with cleaned answer
      const outHistory = [...newHistory];
      const lastIdx    = outHistory.map(t => t.role).lastIndexOf("assistant");
      if (lastIdx !== -1 && cleaned !== rawAnswer) {
        outHistory[lastIdx] = { role: "assistant", content: cleaned };
      }

      const debugOut = fired && overriddenIntent
        ? `**Override:** \`${overriddenIntent}\` *(keyword rule)*\n\n${data.debug ?? ""}`
        : (data.debug ?? "");

      // Silent OOD logging
      if (intent) {
        const confPct    = parseFloat(debugOut.match(/—\s*([\d.]+)%/)?.[1] ?? "0");
        const routingRaw = debugOut.match(/\*\*Routing:\*\*\s*([^\n]+)/)?.[1]?.trim() ?? "";
        logQuery(message, intent, confPct, routingRaw, rawAnswer);
      }

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
