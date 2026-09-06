import { NextResponse } from "next/server";
import { normalizeHttpUrl, readJsonBody } from "@/lib/api-errors";
import {
  REPORT_EVIDENCE_URL_MAX,
  REPORT_MESSAGE_MAX,
  REPORT_MESSAGE_MIN,
  serializeBehaviorReport,
} from "@/lib/behavior-reports";
import { prisma } from "@/lib/db";
import {
  clientIp,
  maybeSweepRateLimits,
  rateLimit,
} from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    maybeSweepRateLimits();
    const limited = rateLimit(`public:report:${clientIp(request)}`, 5, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "ส่งรายงานบ่อยเกินไป ลองใหม่ภายหลัง" },
        {
          status: 429,
          headers: { "Retry-After": String(limited.retryAfterSec) },
        },
      );
    }

    const bodyResult = await readJsonBody(request);
    if (bodyResult.error) return bodyResult.error;
    const body = bodyResult.data as Record<string, unknown>;

    const playerId = String(body.playerId ?? "").trim();
    const message = String(body.message ?? "").trim();

    if (!playerId) {
      return NextResponse.json(
        { error: "เลือกตัวละคร" },
        { status: 400 },
      );
    }

    if (
      message.length < REPORT_MESSAGE_MIN ||
      message.length > REPORT_MESSAGE_MAX
    ) {
      return NextResponse.json(
        {
          error: `ข้อความต้องยาว ${REPORT_MESSAGE_MIN}–${REPORT_MESSAGE_MAX} ตัวอักษร`,
        },
        { status: 400 },
      );
    }

    const evidenceResult = normalizeHttpUrl(body.evidenceUrl);
    if (!evidenceResult.ok) {
      return NextResponse.json(
        { error: evidenceResult.error },
        { status: 400 },
      );
    }
    const evidenceUrl = evidenceResult.url;
    if (evidenceUrl && evidenceUrl.length > REPORT_EVIDENCE_URL_MAX) {
      return NextResponse.json(
        { error: "ลิงก์หลักฐานยาวเกินไป" },
        { status: 400 },
      );
    }

    const player = await prisma.player.findFirst({
      where: {
        id: playerId,
        member: { isLive: true },
      },
      select: {
        id: true,
        name: true,
        memberId: true,
        member: { select: { id: true, name: true } },
      },
    });
    if (!player) {
      return NextResponse.json(
        { error: "ไม่พบตัวละครของสมาชิกที่อยู่ในแคลน" },
        { status: 400 },
      );
    }

    // Soft idempotency against double-submit (same player + message within 2 min)
    const recent = await prisma.behaviorReport.findFirst({
      where: {
        playerId: player.id,
        message,
        createdAt: { gte: new Date(Date.now() - 2 * 60_000) },
      },
      orderBy: { createdAt: "desc" },
    });
    if (recent) {
      return NextResponse.json(serializeBehaviorReport(recent), {
        status: 200,
      });
    }

    const report = await prisma.behaviorReport.create({
      data: {
        memberId: player.member.id,
        playerId: player.id,
        message,
        evidenceUrl,
        memberNameSnap: player.member.name,
        playerNameSnap: player.name,
      },
    });

    return NextResponse.json(serializeBehaviorReport(report), { status: 201 });
  } catch (error) {
    console.error("POST /api/public/reports", error);
    return NextResponse.json(
      { error: "ส่งรายงานไม่สำเร็จ" },
      { status: 500 },
    );
  }
}
