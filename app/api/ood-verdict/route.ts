import { NextRequest, NextResponse } from "next/server";
import { updateVerdict } from "@/lib/firestoreLog";

export async function POST(req: NextRequest) {
  const { doc_id, verdict } = await req.json();
  const ok = updateVerdict(doc_id, verdict);
  return NextResponse.json({ ok, doc_id, verdict });
}
