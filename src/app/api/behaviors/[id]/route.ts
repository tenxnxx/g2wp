import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import {
  normalizeHttpUrl,
  prismaErrorResponse,
  readJsonBody,
} from "@/lib/api-errors";
import { REPORT_EVIDENCE_URL_MAX } from "@/lib/behavior-reports";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

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

export async function GET(_request: Request, { params }: Params) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    const behavior = await prisma.behavior.findUnique({
      where: { id },
      include: includeRelations,
    });

    if (!behavior) {
      return NextResponse.json({ error: "Behavior not found" }, { status: 404 });
    }

    return NextResponse.json(serializeBehavior(behavior));
  } catch (error) {
    console.error("GET /api/behaviors/[id]", error);
    return NextResponse.json(
      { error: "Failed to fetch behavior" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    const bodyResult = await readJsonBody(request);
    if (bodyResult.error) return bodyResult.error;
    const body = bodyResult.data as Record<string, unknown>;

    const data: {
      description?: string;
      evidenceUrl?: string | null;
      memberId?: string;
      playerId?: string;
    } = {};

    if (body.description !== undefined) {
      const description = String(body.description).trim();
      if (!description) {
        return NextResponse.json(
          { error: "กรอกรายละเอียด" },
          { status: 400 },
        );
      }
      if (description.length > 2000) {
        return NextResponse.json(
          { error: "รายละเอียดยาวเกินไป (สูงสุด 2000 ตัวอักษร)" },
          { status: 400 },
        );
      }
      data.description = description;
    }

    if ("evidenceUrl" in body) {
      const evidenceResult = normalizeHttpUrl(body.evidenceUrl);
      if (!evidenceResult.ok) {
        return NextResponse.json(
          { error: evidenceResult.error },
          { status: 400 },
        );
      }
      if (
        evidenceResult.url &&
        evidenceResult.url.length > REPORT_EVIDENCE_URL_MAX
      ) {
        return NextResponse.json(
          { error: "ลิงก์หลักฐานยาวเกินไป" },
          { status: 400 },
        );
      }
      data.evidenceUrl = evidenceResult.url;
    }

    if (body.memberId !== undefined) {
      const memberId = String(body.memberId).trim();
      if (!memberId) {
        return NextResponse.json(
          { error: "เลือกสมาชิก" },
          { status: 400 },
        );
      }
      data.memberId = memberId;
    }

    if (body.playerId !== undefined) {
      const playerId = String(body.playerId).trim();
      if (!playerId) {
        return NextResponse.json(
          { error: "เลือกตัวละคร" },
          { status: 400 },
        );
      }
      data.playerId = playerId;
    }

    const nextMemberId = data.memberId;
    const nextPlayerId = data.playerId;

    if (nextMemberId || nextPlayerId) {
      const existing = await prisma.behavior.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json(
          { error: "Behavior not found" },
          { status: 404 },
        );
      }

      const memberId = nextMemberId ?? existing.memberId;
      const playerId = nextPlayerId ?? existing.playerId;
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

      data.memberId = memberId;
      data.playerId = playerId;
    }

    const behavior = await prisma.behavior.update({
      where: { id },
      data,
      include: includeRelations,
    });

    return NextResponse.json(serializeBehavior(behavior));
  } catch (error) {
    return prismaErrorResponse(error, "Failed to update behavior");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    await prisma.behavior.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return prismaErrorResponse(error, "Failed to delete behavior");
  }
}
