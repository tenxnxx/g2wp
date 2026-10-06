import { NextResponse } from "next/server";
import { actorLabel, requireUser } from "@/lib/api-auth";
import { prismaErrorResponse, readJsonBody } from "@/lib/api-errors";
import { cacheKey, CACHE_TTL, invalidateResource, remember } from "@/lib/cache";
import { bossServerConflict } from "@/lib/boss-conflicts";
import { bossInclude, clockForNewBoss, readClockValue, serializeBoss } from "@/lib/bosses";
import { prisma } from "@/lib/db";
import { BOSS_BOARD_MAX } from "@/lib/field-limits";
import {
  buildPaginationMeta,
  getSkip,
  parsePaginationParams,
  parseSearchQuery,
} from "@/lib/pagination";
import {
  TYPE_SERVER_KINDS,
  TYPE_SERVER_LABEL,
  type TypeServerKind,
} from "@/types/type-server";
import type { Prisma } from "@/generated/prisma/client";

function clockFilter(search: string): Prisma.BossWhereInput[] {
  const match = search.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return [];
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return [];
  return [{ hour, minute }];
}

function kindsMatching(search: string): TypeServerKind[] {
  const q = search.toLowerCase();
  return TYPE_SERVER_KINDS.filter((kind) => {
    const label = TYPE_SERVER_LABEL[kind].toLowerCase();
    return kind.includes(q) || label.includes(q);
  });
}

async function assertRefs(ids: {
  cityId: string;
  serverId: string;
  typeServerId: string;
}) {
  const [city, server, typeServer] = await Promise.all([
    prisma.city.findUnique({
      where: { id: ids.cityId },
      select: { id: true },
    }),
    prisma.server.findUnique({
      where: { id: ids.serverId },
      select: { id: true },
    }),
    prisma.typeServer.findUnique({
      where: { id: ids.typeServerId },
      select: { id: true },
    }),
  ]);

  if (!city) return "ไม่พบเมือง";
  if (!server) return "ไม่พบเซิร์ฟเวอร์";
  if (!typeServer) return "ไม่พบประเภทเซิร์ฟเวอร์";
  return null;
}

export async function GET(request: Request) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const board = searchParams.get("board") === "1";
    const { page, limit } = parsePaginationParams(searchParams);
    const skip = getSkip(page, limit);
    const search = parseSearchQuery(searchParams);
    const cityId = searchParams.get("cityId")?.trim() || undefined;
    const serverId = searchParams.get("serverId")?.trim() || undefined;
    const typeServerId = searchParams.get("typeServerId")?.trim() || undefined;
    const matchedTypes = search ? kindsMatching(search) : [];

    const where: Prisma.BossWhereInput = {
      ...(cityId ? { cityId } : {}),
      ...(serverId ? { serverId } : {}),
      ...(typeServerId ? { typeServerId } : {}),
      ...(search
        ? {
            OR: [
              {
                city: {
                  cityName: { contains: search, mode: "insensitive" as const },
                },
              },
              {
                server: {
                  serverName: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              },
              { createBy: { contains: search, mode: "insensitive" as const } },
              ...(matchedTypes.length
                ? [{ typeServer: { type: { in: matchedTypes } } }]
                : []),
              ...clockFilter(search),
            ],
          }
        : {}),
    };

    const body = await remember(
      cacheKey("/api/bosses", searchParams),
      ["bosses"],
      CACHE_TTL.list,
      async () => {
        const [total, rows] = await Promise.all([
          prisma.boss.count({ where }),
          prisma.boss.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: board ? 0 : skip,
            take: board ? BOSS_BOARD_MAX : limit,
            include: bossInclude,
          }),
        ]);
        return {
          data: rows.map(serializeBoss),
          meta: buildPaginationMeta(total, board ? 1 : page, board ? BOSS_BOARD_MAX : limit),
        };
      },
    );

    return NextResponse.json(body);
  } catch (error) {
    console.error("GET /api/bosses", error);
    return NextResponse.json(
      { error: "Failed to fetch bosses" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;

    const bodyResult = await readJsonBody(request);
    if (bodyResult.error) return bodyResult.error;
    const body = bodyResult.data as Record<string, unknown>;

    const cityId = String(body.cityId ?? "").trim();
    const serverId = String(body.serverId ?? "").trim();
    const typeServerId = String(body.typeServerId ?? "").trim();
    const hour = readClockValue(body.hour, 23);
    const minute = readClockValue(body.minute, 59);

    if (!cityId) {
      return NextResponse.json({ error: "เลือกเมือง" }, { status: 400 });
    }
    if (!serverId) {
      return NextResponse.json({ error: "เลือกเซิร์ฟเวอร์" }, { status: 400 });
    }
    if (!typeServerId) {
      return NextResponse.json(
        { error: "เลือกประเภทเซิร์ฟเวอร์" },
        { status: 400 },
      );
    }
    if (hour === null || minute === null) {
      return NextResponse.json({ error: "เลือกเวลาให้ถูกต้อง" }, { status: 400 });
    }

    const missing = await assertRefs({ cityId, serverId, typeServerId });
    if (missing) {
      return NextResponse.json({ error: missing }, { status: 400 });
    }

    const conflict = await bossServerConflict({ cityId, serverId, typeServerId });
    if (conflict) {
      return NextResponse.json({ error: conflict }, { status: 409 });
    }

    const clock = clockForNewBoss(hour, minute);
    const boss = await prisma.boss.create({
      data: {
        cityId,
        serverId,
        typeServerId,
        hour: clock.hour,
        minute: clock.minute,
        second: clock.second,
        boardLane: "wait",
        createBy: actorLabel(auth.user),
      },
      include: bossInclude,
    });

    await invalidateResource("bosses");
    return NextResponse.json(serializeBoss(boss), { status: 201 });
  } catch (error) {
    return prismaErrorResponse(error, "Failed to create boss");
  }
}
