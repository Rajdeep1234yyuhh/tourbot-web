import { NextResponse } from "next/server";
import { getAllLogs } from "@/lib/firestoreLog";

export async function GET() {
  return NextResponse.json(getAllLogs());
}
