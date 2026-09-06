import { NextResponse } from "next/server";
import { actorLabel, requireAuth } from "@/lib/api-auth";
import {
  normalizeHttpUrl,
  prismaErrorResponse,
  readJsonBody,
} from "@/lib/api-errors";
import { REPORT_EVIDENCE_URL_MAX } from "@/lib/behavior-reports";
import { prisma } from "@/lib/db";
import {
  buildPaginationMeta,
  getSkip,
  parsePaginationParams,
  parseSearchQuery,
} from "@/lib/pagination";

function serializeBehavior(behavior: {
  id: string;
  description: string;
  evidenceUrl: string | null;
  createBy: string;
  memberId: string;
  playerId: string;
  createdAt: Date;
  updatedAt: Date;
  member: { id: string; name: string };
  player: { id: string; name: string };
}) {
  return {
    id: behavior.id,
    description: behavior.description,
    evidenceUrl: behavior.evidenceUrl,
    createBy: behavior.createBy,
    memberId: behavior.memberId,
    playerId: behavior.playerId,
    member: behavior.member,
    player: behavior.player,
    createdAt: behavior.createdAt.toISOString(),
    updatedAt: behavior.updatedAt.toISOString(),
  };
}

const includeRelations = {
  member: { select: { id: true, name: true } },
  player: { select: { id: true, name: true } },
} as const;

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
    const skip = getSkip(page, limit);
    const search = parseSearchQuery(searchParams);
    const where = search
      ? {
          OR: [
            { description: { contains: search, mode: "insensitive" as const } },
            { evidenceUrl: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : undefined;

    const [total, behaviors] = await Promise.all([
      prisma.behavior.count({ where }),
      prisma.behavior.findMany({
        where,
        include: includeRelations,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      data: behaviors.map(serializeBehavior),
      meta: buildPaginationMeta(total, page, limit),
    });
  } catch (error) {
    console.error("GET /api/behaviors", error);
    return NextResponse.json(
      { error: "Failed to fetch behaviors" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const bodyResult = await readJsonBody(request);
    if (bodyResult.error) return bodyResult.error;
    const body = bodyResult.data as Record<string, unknown>;

    const description = String(body.description ?? "").trim();
    const memberId = String(body.memberId ?? "").trim();
    const playerId = String(body.playerId ?? "").trim();
    const createBy = actorLabel(auth.user);

    if (!description || !memberId || !playerId) {
      return NextResponse.json(
        { error: "กรอกรายละเอียด และเลือกสมาชิกกับตัวละคร" },
        { status: 400 },
      );
    }
    if (description.length > 2000) {
      return NextResponse.json(
        { error: "รายละเอียดยาวเกินไป (สูงสุด 2000 ตัวอักษร)" },
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

    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) {
      return NextResponse.json({ error: "ไม่พบตัวละคร" }, { status: 400 });
    }
    if (player.memberId !== memberId) {
      return NextResponse.json(
        { error: "ตัวละครไม่ได้อยู่กับสมาชิกที่เลือก" },
        { status: 400 },
      );
    }

    const behavior = await prisma.behavior.create({
      data: { description, evidenceUrl, memberId, playerId, createBy },
      include: includeRelations,
    });

    return NextResponse.json(serializeBehavior(behavior), { status: 201 });
  } catch (error) {
    return prismaErrorResponse(error, "Failed to create behavior");
  }
}
