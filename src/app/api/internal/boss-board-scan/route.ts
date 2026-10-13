import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";
import { runBossBoardScan } from "@/server/boss-board-watch";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Netlify scheduled function (and manual ops) trigger the boss-board watch once.
 * Auth: Authorization: Bearer $CRON_SECRET  or  x-cron-secret: $CRON_SECRET
 */
export async function POST(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runBossBoardScan();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error(
      "boss-board-scan",
      error instanceof Error ? error.message : "failed",
    );
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
