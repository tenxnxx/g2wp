import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import {
  normalizeHttpUrl,
  prismaErrorResponse,
  readJsonBody,
} from "@/lib/api-errors";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

function serializeMember(member: {
  id: string;
  name: string;
  age: number;
  facebookUrl: string | null;
  isLive: boolean;
  createBy: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: member.id,
    name: member.name,
    age: member.age,
    facebookUrl: member.facebookUrl,
    isLive: member.isLive,
    createBy: member.createBy,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
  };
}

export async function GET(request: Request, { params }: Params) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const detail = searchParams.get("detail") === "1";

    if (!detail) {
      const member = await prisma.member.findUnique({ where: { id } });
      if (!member) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }
      return NextResponse.json(serializeMember(member));
    }

    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        players: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            createBy: true,
            createdAt: true,
          },
        },
        behaviors: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            description: true,
            createBy: true,
            createdAt: true,
            player: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...serializeMember(member),
      playerCount: member.players.length,
      behaviorCount: member.behaviors.length,
      players: member.players.map((player) => ({
        id: player.id,
        name: player.name,
        createBy: player.createBy,
        createdAt: player.createdAt.toISOString(),
      })),
      behaviors: member.behaviors.map((behavior) => ({
        id: behavior.id,
        description: behavior.description,
        createBy: behavior.createBy,
        createdAt: behavior.createdAt.toISOString(),
        player: behavior.player,
      })),
    });
  } catch (error) {
    console.error("GET /api/members/[id]", error);
    return NextResponse.json(
      { error: "Failed to fetch member" },
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
      name?: string;
      age?: number;
      facebookUrl?: string | null;
      isLive?: boolean;
    } = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) {
        return NextResponse.json({ error: "name is required" }, { status: 400 });
      }
      data.name = name;
    }

    if (body.age !== undefined) {
      const age = Number(body.age);
      if (!Number.isInteger(age) || age < 0 || age > 150) {
        return NextResponse.json({ error: "invalid age" }, { status: 400 });
      }
      data.age = age;
    }

    if (body.facebookUrl !== undefined) {
      const facebookResult = normalizeHttpUrl(body.facebookUrl);
      if (!facebookResult.ok) {
        return NextResponse.json(
          { error: facebookResult.error },
          { status: 400 },
        );
      }
      data.facebookUrl = facebookResult.url;
    }

    if (body.isLive !== undefined) {
      data.isLive = Boolean(body.isLive);
    }

    const member = await prisma.member.update({
      where: { id },
      data,
    });

    return NextResponse.json(serializeMember(member));
  } catch (error) {
    return prismaErrorResponse(error, "Failed to update member");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    await prisma.member.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return prismaErrorResponse(error, "Failed to delete member");
  }
}
