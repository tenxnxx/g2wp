import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prismaErrorResponse, readJsonBody } from "@/lib/api-errors";
import { cacheKey, CACHE_TTL, invalidateResource, remember } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { serializeCity } from "@/lib/cities";
import { readRequiredName } from "@/lib/name-field";
import {
  buildPaginationMeta,
  getSkip,
  parsePaginationParams,
  parseSearchQuery,
} from "@/lib/pagination";
import type { Prisma } from "@/generated/prisma/client";

function parseIsUse(searchParams: URLSearchParams): boolean | undefined {
  const isUseParam = searchParams.get("isUse");
  if (isUseParam === "true" || isUseParam === "1") return true;
  if (isUseParam === "false" || isUseParam === "0") return false;
  return undefined;
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
    const skip = getSkip(page, limit);
    const search = parseSearchQuery(searchParams);
    const isUse = parseIsUse(searchParams);

    const where: Prisma.CityWhereInput = {
      ...(isUse === undefined ? {} : { isUse }),
      ...(search
        ? { cityName: { contains: search, mode: "insensitive" as const } }
        : {}),
    };

    const body = await remember(
      cacheKey("/api/cities", searchParams),
      ["cities"],
      CACHE_TTL.list,
      async () => {
        const [total, rows] = await Promise.all([
          prisma.city.count({ where }),
          prisma.city.findMany({
            where,
            orderBy: [{ isUse: "desc" }, { cityName: "asc" }],
            skip,
            take: limit,
            include: { _count: { select: { bosses: true } } },
          }),
        ]);
        return {
          data: rows.map(serializeCity),
          meta: buildPaginationMeta(total, page, limit),
        };
      },
    );

    return NextResponse.json(body);
  } catch (error) {
    console.error("GET /api/cities", error);
    return NextResponse.json(
      { error: "Failed to fetch cities" },
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

    const nameResult = readRequiredName(body.cityName, "ชื่อเมือง");
    if (nameResult.error) return nameResult.error;
    const isUse = typeof body.isUse === "boolean" ? body.isUse : true;

    const city = await prisma.city.create({
      data: { cityName: nameResult.name, isUse },
      include: { _count: { select: { bosses: true } } },
    });

    await invalidateResource("cities");
    return NextResponse.json(serializeCity(city), { status: 201 });
  } catch (error) {
    return prismaErrorResponse(error, "Failed to create city");
  }
}
