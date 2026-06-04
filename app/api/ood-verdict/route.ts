import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const LOG_FILE    = join(process.cwd(), "ood_log.csv");
const LOG_HEADERS = "row_id,timestamp,query,predicted_intent,confidence_pct,routing_tier,retrieved_answer_preview,verdict";

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",");
  return lines.slice(1).map(line => {
    const values: string[] = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (line[i] === "," && !inQ) { values.push(cur); cur = ""; }
      else cur += line[i];
    }
    values.push(cur);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => (obj[h.trim()] = values[i] ?? ""));
    return obj;
  });
}

function csvEscape(s: string | number): string {
  const str = String(s).replace(/\r?\n/g, " ");
  return /[,"]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function serializeCSV(rows: Record<string, string>[]): string {
  const headers = LOG_HEADERS.split(",");
  const lines = [LOG_HEADERS];
  for (const row of rows)
    lines.push(headers.map(h => csvEscape(row[h] ?? "")).join(","));
  return lines.join("\n") + "\n";
}

export async function POST(req: NextRequest) {
  try {
    const { row_id, verdict } = await req.json();
    if (!existsSync(LOG_FILE))
      return NextResponse.json({ ok: false, error: "No log file" }, { status: 404 });

    const rows = parseCSV(readFileSync(LOG_FILE, "utf-8"));
    const row  = rows.find(r => String(r.row_id) === String(row_id));
    if (!row)
      return NextResponse.json({ ok: false, error: "Row not found" }, { status: 404 });

    row.verdict = verdict;
    writeFileSync(LOG_FILE, serializeCSV(rows), "utf-8");
    return NextResponse.json({ ok: true, row_id, verdict });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
