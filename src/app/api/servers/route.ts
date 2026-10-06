import { NextResponse } from "next/server";
import { requireAuth, requireUser } from "@/lib/api-auth";
import { prismaErrorResponse, readJsonBody } from "@/lib/api-errors";
import { cacheKey, CACHE_TTL, invalidateResource, remember } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { readRequiredName } from "@/lib/name-field";
import {
  buildPaginationMeta,
  getSkip,
  parsePaginationParams,
  parseSearchQuery,
} from "@/lib/pagination";
import { serializeServer } from "@/lib/servers";
import type { Prisma } from "@/generated/prisma/client";

function parseIsUse(searchParams: URLSearchParams): boolean | undefined {
  const isUseParam = searchParams.get("isUse");
  if (isUseParam === "true" || isUseParam === "1") return true;
  if (isUseParam === "false" || isUseParam === "0") return false;
  return undefined;
}

export async function GET(request: Request) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
    const skip = getSkip(page, limit);
    const search = parseSearchQuery(searchParams);
    const isUse = parseIsUse(searchParams);

    const where: Prisma.ServerWhereInput = {
      ...(isUse === undefined ? {} : { isUse }),
      ...(search
        ? { serverName: { contains: search, mode: "insensitive" as const } }
        : {}),
    };

    const body = await remember(
      cacheKey("/api/servers", searchParams),
      ["servers"],
      CACHE_TTL.list,
      async () => {
        const [total, rows] = await Promise.all([
          prisma.server.count({ where }),
          prisma.server.findMany({
            where,
            orderBy: [{ isUse: "desc" }, { serverName: "asc" }],
            skip,
            take: limit,
            include: { _count: { select: { bosses: true } } },
          }),
        ]);
        return {
          data: rows.map(serializeServer),
          meta: buildPaginationMeta(total, page, limit),
        };
      },
    );

    return NextResponse.json(body);
  } catch (error) {
    console.error("GET /api/servers", error);
    return NextResponse.json(
      { error: "Failed to fetch servers" },
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

    const nameResult = readRequiredName(body.serverName, "ชื่อเซิร์ฟเวอร์");
    if (nameResult.error) return nameResult.error;
    const isUse = typeof body.isUse === "boolean" ? body.isUse : true;

    const server = await prisma.server.create({
      data: { serverName: nameResult.name, isUse },
      include: { _count: { select: { bosses: true } } },
    });

    await invalidateResource("servers");
    return NextResponse.json(serializeServer(server), { status: 201 });
  } catch (error) {
    return prismaErrorResponse(error, "Failed to create server");
  }
}
