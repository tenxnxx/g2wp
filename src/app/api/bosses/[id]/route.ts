import { Prisma } from "@/generated/prisma/client";
import { after, NextResponse } from "next/server";
import { actorLabel, requireUser } from "@/lib/api-auth";
import { prismaErrorResponse, readJsonBody } from "@/lib/api-errors";
import { CACHE_TTL, invalidateResource, remember } from "@/lib/cache";
import { bossServerConflict } from "@/lib/boss-conflicts";
import { bossInclude, formatBossTime, readBoardLane, readClockValue, serializeBoss } from "@/lib/bosses";
import { prisma } from "@/lib/db";
import { notifyBossReady } from "@/server/notify";
import { TYPE_SERVER_LABEL } from "@/types/type-server";

type Params = { params: Promise<{ id: string }> };

/** A database that still rejects a null clock can still change the lane. */
function rejectsNullClock(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientValidationError) {
    return /must not be null/i.test(error.message);
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2011") {
    return true;
  }
  const message = error instanceof Error ? error.message : "";
  return /null value in column|23502|must not be null/i.test(message);
}

async function assertRefs(ids: {
  cityId?: string;
  serverId?: string;
  typeServerId?: string;
}) {
  const [city, server, typeServer] = await Promise.all([
    ids.cityId
      ? prisma.city.findUnique({
          where: { id: ids.cityId },
          select: { id: true },
        })
      : Promise.resolve(true),
    ids.serverId
      ? prisma.server.findUnique({
          where: { id: ids.serverId },
          select: { id: true },
        })
      : Promise.resolve(true),
    ids.typeServerId
      ? prisma.typeServer.findUnique({
          where: { id: ids.typeServerId },
          select: { id: true },
        })
      : Promise.resolve(true),
  ]);

  if (ids.cityId && !city) return "ไม่พบเมือง";
  if (ids.serverId && !server) return "ไม่พบเซิร์ฟเวอร์";
  if (ids.typeServerId && !typeServer) return "ไม่พบประเภทเซิร์ฟเวอร์";
  return null;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = await remember(`bosses:${id}`, ["bosses"], CACHE_TTL.detail, async () => {
      const boss = await prisma.boss.findUnique({
        where: { id },
        include: bossInclude,
      });
      return boss ? serializeBoss(boss) : null;
    });
    if (!body) {
      return NextResponse.json({ error: "ไม่พบบอส" }, { status: 404 });
    }
    return NextResponse.json(body);
  } catch (error) {
    console.error("GET /api/bosses/[id]", error);
    return NextResponse.json(
      { error: "Failed to fetch boss" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;

    const { id } = await params;
    const bodyResult = await readJsonBody(request);
    if (bodyResult.error) return bodyResult.error;
    const body = bodyResult.data as Record<string, unknown>;

    const data: {
      cityId?: string;
      serverId?: string;
      typeServerId?: string;
      hour?: number | null;
      minute?: number | null;
      second?: number | null;
      boardLane?: string | null;
      updateBy: string;
    } = { updateBy: actorLabel(auth.user) };

    if (body.cityId !== undefined) {
      const cityId = String(body.cityId).trim();
      if (!cityId) {
        return NextResponse.json({ error: "เลือกเมือง" }, { status: 400 });
      }
      data.cityId = cityId;
    }
    if (body.serverId !== undefined) {
      const serverId = String(body.serverId).trim();
      if (!serverId) {
        return NextResponse.json({ error: "เลือกเซิร์ฟเวอร์" }, { status: 400 });
      }
      data.serverId = serverId;
    }
    if (body.typeServerId !== undefined) {
      const typeServerId = String(body.typeServerId).trim();
      if (!typeServerId) {
        return NextResponse.json(
          { error: "เลือกประเภทเซิร์ฟเวอร์" },
          { status: 400 },
        );
      }
      data.typeServerId = typeServerId;
    }
    if (body.hour === null || body.minute === null || body.second === null) {
      data.hour = null;
      data.minute = null;
      data.second = null;
    } else {
      if (body.hour !== undefined) {
        const hour = readClockValue(body.hour, 23);
        if (hour === null) {
          return NextResponse.json({ error: "เลือกชั่วโมงให้ถูกต้อง" }, { status: 400 });
        }
        data.hour = hour;
      }
      if (body.minute !== undefined) {
        const minute = readClockValue(body.minute, 59);
        if (minute === null) {
          return NextResponse.json({ error: "เลือกนาทีให้ถูกต้อง" }, { status: 400 });
        }
        data.minute = minute;
      }
      if (body.second !== undefined) {
        const second = readClockValue(body.second, 59);
        if (second === null) {
          return NextResponse.json({ error: "เลือกวินาทีให้ถูกต้อง" }, { status: 400 });
        }
        data.second = second;
      } else if (data.hour !== undefined || data.minute !== undefined) {
        data.second = 0;
      }
    }
    if (body.boardLane !== undefined) {
      if (body.boardLane === null) {
        data.boardLane = null;
      } else {
        const lane = readBoardLane(body.boardLane);
        if (!lane) {
          return NextResponse.json({ error: "ช่องที่วางไม่ถูกต้อง" }, { status: 400 });
        }
        data.boardLane = lane;
      }
    }

    if (
      data.cityId === undefined &&
      data.serverId === undefined &&
      data.typeServerId === undefined &&
      data.hour === undefined &&
      data.minute === undefined &&
      data.second === undefined &&
      data.boardLane === undefined
    ) {
      return NextResponse.json(
        { error: "ไม่มีข้อมูลที่จะแก้ไข" },
        { status: 400 },
      );
    }

    const missing = await assertRefs(data);
    if (missing) {
      return NextResponse.json({ error: missing }, { status: 400 });
    }

    const current = await prisma.boss.findUnique({
      where: { id },
      select: {
        cityId: true,
        serverId: true,
        typeServerId: true,
        boardLane: true,
        hour: true,
        minute: true,
        second: true,
      },
    });
    if (!current) {
      return NextResponse.json({ error: "ไม่พบบอส" }, { status: 404 });
    }

    if (body.boardLane === undefined && (data.hour !== undefined || data.minute !== undefined)) {
      const nextHour = data.hour !== undefined ? data.hour : current.hour;
      const nextMinute = data.minute !== undefined ? data.minute : current.minute;
      const nextSecond = data.second !== undefined ? data.second : current.second;
      if (
        nextHour !== current.hour ||
        nextMinute !== current.minute ||
        nextSecond !== current.second
      ) {
        data.boardLane = null;
      }
    }

    const conflict = await bossServerConflict({
      cityId: data.cityId ?? current.cityId,
      serverId: data.serverId ?? current.serverId,
      typeServerId: data.typeServerId ?? current.typeServerId,
      exceptBossId: id,
    });
    if (conflict) {
      return NextResponse.json({ error: conflict }, { status: 409 });
    }

    const clearingClock =
      data.hour === null && data.minute === null && data.second === null;
    let boss;
    try {
      boss = await prisma.boss.update({
        where: { id },
        data,
        include: bossInclude,
      });
    } catch (error) {
      if (!clearingClock || !rejectsNullClock(error)) throw error;
      console.error("boss clock clear skipped: column rejects null");
      const laneData = { ...data };
      delete laneData.hour;
      delete laneData.minute;
      delete laneData.second;
      boss = await prisma.boss.update({
        where: { id },
        data: laneData,
        include: bossInclude,
      });
    }

    await invalidateResource("bosses");
    if (
      body.autoReady === true &&
      current.boardLane !== "ready" &&
      boss.boardLane === "ready"
    ) {
      const clock =
        boss.hour != null && boss.minute != null
          ? formatBossTime(boss.hour, boss.minute, boss.second ?? undefined)
          : null;
      after(() =>
        notifyBossReady(id, {
          cityName: boss.city.cityName,
          serverName: boss.server.serverName,
          typeLabel: TYPE_SERVER_LABEL[boss.typeServer.type],
          clock,
        }),
      );
    }
    return NextResponse.json(serializeBoss(boss));
  } catch (error) {
    return prismaErrorResponse(error, "Failed to update boss");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;

    const { id } = await params;
    await prisma.boss.delete({ where: { id } });
    await invalidateResource("bosses");
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return prismaErrorResponse(error, "Failed to delete boss");
  }
}
