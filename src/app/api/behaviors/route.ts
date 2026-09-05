import { NextResponse } from "next/server";
import { actorLabel, requireAuth } from "@/lib/api-auth";
import { prismaErrorResponse, readJsonBody } from "@/lib/api-errors";
import { prisma } from "@/lib/db";
import {
  buildPaginationMeta,
  getSkip,
  parsePaginationParams,
} from "@/lib/pagination";

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

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
    const skip = getSkip(page, limit);
    const search = searchParams.get("q")?.trim() || undefined;
    const where = search
      ? { description: { contains: search, mode: "insensitive" as const } }
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
        { error: "description, memberId and playerId are required" },
        { status: 400 },
      );
    }

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

    const behavior = await prisma.behavior.create({
      data: { description, memberId, playerId, createBy },
      include: includeRelations,
    });

    return NextResponse.json(serializeBehavior(behavior), { status: 201 });
  } catch (error) {
    return prismaErrorResponse(error, "Failed to create behavior");
  }
}
