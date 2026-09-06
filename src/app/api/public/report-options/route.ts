import { NextResponse } from "next/server";
import { PUBLIC_REPORT_OPTIONS_MAX } from "@/lib/field-limits";
import { prisma } from "@/lib/db";
import {
  clientIp,
  maybeSweepRateLimits,
  rateLimit,
} from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    maybeSweepRateLimits();
    const limited = rateLimit(`public:options:${clientIp(request)}`, 30, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "คำขอมากเกินไป ลองใหม่ภายหลัง" },
        {
          status: 429,
          headers: { "Retry-After": String(limited.retryAfterSec) },
        },
      );
    }

    const players = await prisma.player.findMany({
      where: { member: { isLive: true } },
      select: {
        id: true,
        name: true,
        memberId: true,
        member: { select: { name: true } },
      },
      orderBy: [{ name: "asc" }],
      take: PUBLIC_REPORT_OPTIONS_MAX,
    });

    return NextResponse.json({
      players: players.map((player) => ({
        id: player.id,
        name: player.name,
        memberId: player.memberId,
        memberName: player.member.name,
      })),
    });
  } catch (error) {
    console.error("GET /api/public/report-options", error);
    return NextResponse.json(
      { error: "Failed to load options" },
      { status: 500 },
    );
  }
}
