import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prismaErrorResponse, readJsonBody } from "@/lib/api-errors";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

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

export async function GET(_request: Request, { params }: Params) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    const player = await prisma.player.findUnique({
      where: { id },
      include: { member: { select: { id: true, name: true } } },
    });

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    return NextResponse.json(serializePlayer(player));
  } catch (error) {
    console.error("GET /api/players/[id]", error);
    return NextResponse.json(
      { error: "Failed to fetch player" },
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

    const data: { name?: string; memberId?: string } = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) {
        return NextResponse.json({ error: "name is required" }, { status: 400 });
      }
      if (name.length > 100) {
        return NextResponse.json(
          { error: "ชื่อตัวละครยาวเกินไป (สูงสุด 100 ตัวอักษร)" },
          { status: 400 },
        );
      }
      data.name = name;
    }

    if (body.memberId !== undefined) {
      const memberId = String(body.memberId).trim();
      if (!memberId) {
        return NextResponse.json(
          { error: "memberId is required" },
          { status: 400 },
        );
      }

      const member = await prisma.member.findUnique({ where: { id: memberId } });
      if (!member) {
        return NextResponse.json({ error: "Member not found" }, { status: 400 });
      }

      data.memberId = memberId;
    }

    const player = await prisma.player.update({
      where: { id },
      data,
      include: { member: { select: { id: true, name: true } } },
    });

    return NextResponse.json(serializePlayer(player));
  } catch (error) {
    return prismaErrorResponse(error, "Failed to update player");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    await prisma.player.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return prismaErrorResponse(error, "Failed to delete player");
  }
}
