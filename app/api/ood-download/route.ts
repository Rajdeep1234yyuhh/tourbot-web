import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const LOG_FILE = join(process.cwd(), "ood_log.csv");

export async function GET() {
  if (!existsSync(LOG_FILE))
    return NextResponse.json({ error: "No log file yet" }, { status: 404 });

  const content = readFileSync(LOG_FILE, "utf-8");
  return new NextResponse(content, {
    headers: {
      "Content-Type":        "text/csv",
      "Content-Disposition": 'attachment; filename="ood_log.csv"',
    },
  });
}
