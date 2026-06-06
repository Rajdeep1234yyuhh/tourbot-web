import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

export type LogRow = {
  id:                       string;
  timestamp:                string;
  query:                    string;
  predicted_intent:         string;
  confidence_pct:           number;
  routing_tier:             string;
  retrieved_answer_preview: string;
  verdict:                  string;
};

const LOG_FILE = join(process.cwd(), "ood_log.json");

function readAll(): LogRow[] {
  try {
    if (!existsSync(LOG_FILE)) return [];
    return JSON.parse(readFileSync(LOG_FILE, "utf-8")) as LogRow[];
  } catch { return []; }
}

function writeAll(rows: LogRow[]): void {
  writeFileSync(LOG_FILE, JSON.stringify(rows, null, 2), "utf-8");
}

export function logQuery(
  query: string, intent: string, confPct: number,
  routingTier: string, answerPreview: string,
): string {
  try {
    const rows = readAll();
    const id   = Date.now().toString();
    rows.push({
      id,
      timestamp:                new Date().toISOString().slice(0, 19),
      query:                    query.trim(),
      predicted_intent:         intent,
      confidence_pct:           parseFloat(confPct.toFixed(1)),
      routing_tier:             routingTier,
      retrieved_answer_preview: answerPreview.slice(0, 120),
      verdict:                  "",
    });
    writeAll(rows);
    return id;
  } catch (e) { console.error("logQuery error:", e); return ""; }
}

export function updateVerdict(docId: string, verdict: string): boolean {
  try {
    const rows = readAll();
    const row  = rows.find(r => r.id === docId);
    if (!row) return false;
    row.verdict = verdict;
    writeAll(rows);
    return true;
  } catch { return false; }
}

export function getAllLogs(): LogRow[] {
  return readAll().reverse();
}
