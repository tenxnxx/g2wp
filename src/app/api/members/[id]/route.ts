import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import {
  normalizeHttpUrl,
  prismaErrorResponse,
  readJsonBody,
} from "@/lib/api-errors";
import { prisma } from "@/lib/db";
import { parseGroupIdInput, serializeMember } from "@/lib/members";

type Params = { params: Promise<{ id: string }> };

const groupSelect = { id: true, groupName: true } as const;

async function resolveAssignableGroupId(
  groupId: string | null,
  currentGroupId: string | null,
): Promise<{ ok: true; groupId: string | null } | { ok: false; error: string }> {
  if (!groupId) return { ok: true, groupId: null };
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { id: true, isUse: true },
  });
  if (!group) {
    return { ok: false, error: "ไม่พบกลุ่มที่เลือก" };
  }
  // Allow keeping an already-assigned inactive group; block new assignment.
  if (!group.isUse && group.id !== currentGroupId) {
    return { ok: false, error: "กลุ่มนี้ปิดใช้งานแล้ว" };
  }
  return { ok: true, groupId: group.id };
}

export async function GET(request: Request, { params }: Params) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const detail = searchParams.get("detail") === "1";

    if (!detail) {
      const member = await prisma.member.findUnique({
        where: { id },
        include: { group: { select: groupSelect } },
      });
      if (!member) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }
      return NextResponse.json(serializeMember(member));
    }

    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        group: { select: groupSelect },
        players: {
          orderBy: { createdAt: "desc" },
          take: 100,
          select: {
            id: true,
            name: true,
            createBy: true,
            createdAt: true,
          },
        },
        behaviors: {
          orderBy: { createdAt: "desc" },
          take: 50,
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

    const [playerCount, behaviorCount] = await Promise.all([
      prisma.player.count({ where: { memberId: id } }),
      prisma.behavior.count({ where: { memberId: id } }),
    ]);

    return NextResponse.json({
      ...serializeMember(member),
      playerCount,
      behaviorCount,
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
      groupId?: string | null;
    } = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) {
        return NextResponse.json({ error: "name is required" }, { status: 400 });
      }
      if (name.length > 100) {
        return NextResponse.json(
          { error: "ชื่อสมาชิกยาวเกินไป (สูงสุด 100 ตัวอักษร)" },
          { status: 400 },
        );
      }
      data.name = name;
    }

    if (body.age !== undefined) {
      const age = Number(body.age);
      if (!Number.isInteger(age) || age < 0 || age > 150) {
        return NextResponse.json(
          { error: "อายุต้องเป็นจำนวนเต็มระหว่าง 0–150 ปี" },
          { status: 400 },
        );
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

    const groupParsed = parseGroupIdInput(body);
    if (!groupParsed.ok) {
      return NextResponse.json({ error: groupParsed.error }, { status: 400 });
    }
    if (groupParsed.present) {
      const current = await prisma.member.findUnique({
        where: { id },
        select: { groupId: true },
      });
      if (!current) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }
      const groupResolved = await resolveAssignableGroupId(
        groupParsed.groupId,
        current.groupId,
      );
      if (!groupResolved.ok) {
        return NextResponse.json(
          { error: groupResolved.error },
          { status: 400 },
        );
      }
      data.groupId = groupResolved.groupId;
    }

    const member = await prisma.member.update({
      where: { id },
      data,
      include: { group: { select: groupSelect } },
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
