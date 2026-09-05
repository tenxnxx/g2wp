import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prismaErrorResponse, readJsonBody } from "@/lib/api-errors";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

function serializeBehavior(behavior: {
  id: string;
  description: string;
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
      memberId?: string;
      playerId?: string;
    } = {};

    if (body.description !== undefined) {
      const description = String(body.description).trim();
      if (!description) {
        return NextResponse.json(
          { error: "description is required" },
          { status: 400 },
        );
      }
      data.description = description;
    }

    if (body.memberId !== undefined) {
      const memberId = String(body.memberId).trim();
      if (!memberId) {
        return NextResponse.json(
          { error: "memberId is required" },
          { status: 400 },
        );
      }
      data.memberId = memberId;
    }

    if (body.playerId !== undefined) {
      const playerId = String(body.playerId).trim();
      if (!playerId) {
        return NextResponse.json(
          { error: "playerId is required" },
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
        return NextResponse.json({ error: "Player not found" }, { status: 400 });
      }
      if (player.memberId !== memberId) {
        return NextResponse.json(
          { error: "player does not belong to selected member" },
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
