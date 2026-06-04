import { existsSync, readFileSync } from "fs";
import { join } from "path";
import IntentTable from "./IntentTable";

type Row = {
  row_id: string; timestamp: string; query: string;
  predicted_intent: string; confidence_pct: string;
  routing_tier: string; retrieved_answer_preview: string; verdict: string;
}

function parseCSV(content: string): Row[] {
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
    return obj as Row;
  });
}

export default function IntentHistoryPage() {
  const logFile = join(process.cwd(), "ood_log.csv");
  const rows    = existsSync(logFile) ? parseCSV(readFileSync(logFile, "utf-8")) : [];
  return <IntentTable initialRows={rows} />;
}
