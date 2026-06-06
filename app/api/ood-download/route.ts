import { NextResponse } from "next/server";
import { getAllLogs } from "@/lib/firestoreLog";

export async function GET() {
  const rows = await getAllLogs();
  if (rows.length === 0)
    return NextResponse.json({ error: "No logs yet" }, { status: 404 });

  const headers = ["id","timestamp","query","predicted_intent","confidence_pct","routing_tier","retrieved_answer_preview","verdict"];
  const escape  = (s: string | number) => {
    const str = String(s).replace(/\r?\n/g, " ");
    return /[,"]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const csv = [
    headers.join(","),
    ...rows.map(r => headers.map(h => escape((r as Record<string,string|number>)[h] ?? "")).join(",")),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type":        "text/csv",
      "Content-Disposition": 'attachment; filename="ood_log.csv"',
    },
  });
}
