import { NextResponse } from "next/server";
import { actorLabel, requireAuth } from "@/lib/api-auth";
import { prismaErrorResponse, readJsonBody } from "@/lib/api-errors";
import { prisma } from "@/lib/db";
import {
  buildPaginationMeta,
  getSkip,
  parsePaginationParams,
} from "@/lib/pagination";

function serializePlayer(player: {
  id: string;
  name: string;
  memberId: string;
  createBy: string;
  createdAt: Date;
  updatedAt: Date;
  member: { id: string; name: string };
}) {
  return {
    id: player.id,
    name: player.name,
    memberId: player.memberId,
    member: {
      id: player.member.id,
      name: player.member.name,
    },
    createBy: player.createBy,
    createdAt: player.createdAt.toISOString(),
    updatedAt: player.updatedAt.toISOString(),
  };
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
    const skip = getSkip(page, limit);
    const memberId = searchParams.get("memberId")?.trim() || undefined;
    const search = searchParams.get("q")?.trim() || undefined;
    const where =
      memberId || search
        ? {
            ...(memberId ? { memberId } : {}),
            ...(search
              ? { name: { contains: search, mode: "insensitive" as const } }
              : {}),
          }
        : undefined;

    const [total, players] = await Promise.all([
      prisma.player.count({ where }),
      prisma.player.findMany({
        where,
        include: { member: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      data: players.map(serializePlayer),
      meta: buildPaginationMeta(total, page, limit),
    });
  } catch (error) {
    console.error("GET /api/players", error);
    return NextResponse.json(
      { error: "Failed to fetch players" },
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

    const name = String(body.name ?? "").trim();
    const memberId = String(body.memberId ?? "").trim();
    const createBy = actorLabel(auth.user);

    if (!name || !memberId) {
      return NextResponse.json(
        { error: "name and memberId are required" },
        { status: 400 },
      );
    }

    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 400 });
    }

    const player = await prisma.player.create({
      data: { name, memberId, createBy },
      include: { member: { select: { id: true, name: true } } },
    });

    return NextResponse.json(serializePlayer(player), { status: 201 });
  } catch (error) {
    return prismaErrorResponse(error, "Failed to create player");
  }
}
