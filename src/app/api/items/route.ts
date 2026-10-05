import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prismaErrorResponse, readJsonBody } from "@/lib/api-errors";
import { cacheKey, CACHE_TTL, invalidateResource, remember } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { NAME_MAX } from "@/lib/field-limits";
import { serializeItem } from "@/lib/items";
import {
  buildPaginationMeta,
  getSkip,
  parsePaginationParams,
  parseSearchQuery,
} from "@/lib/pagination";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
    const skip = getSkip(page, limit);
    const search = parseSearchQuery(searchParams);

    const where: Prisma.ItemWhereInput = search
      ? { name: { contains: search, mode: "insensitive" as const } }
      : {};

    const body = await remember(
      cacheKey("/api/items", searchParams),
      ["items"],
      CACHE_TTL.list,
      async () => {
        const [total, rows] = await Promise.all([
          prisma.item.count({ where }),
          prisma.item.findMany({
            where,
            orderBy: { name: "asc" },
            skip,
            take: limit,
            include: { _count: { select: { safes: true } } },
          }),
        ]);
        return {
          data: rows.map(serializeItem),
          meta: buildPaginationMeta(total, page, limit),
        };
      },
    );

    return NextResponse.json(body);
  } catch (error) {
    console.error("GET /api/items", error);
    return NextResponse.json(
      { error: "Failed to fetch items" },
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
    if (!name) {
      return NextResponse.json({ error: "กรอกชื่อไอเท็ม" }, { status: 400 });
    }
    if (name.length > NAME_MAX) {
      return NextResponse.json(
        { error: `ชื่อไอเท็มยาวเกินไป (สูงสุด ${NAME_MAX} ตัวอักษร)` },
        { status: 400 },
      );
    }

    const item = await prisma.item.create({
      data: { name },
      include: { _count: { select: { safes: true } } },
    });

    await invalidateResource("items");
    return NextResponse.json(serializeItem(item), { status: 201 });
  } catch (error) {
    return prismaErrorResponse(error, "Failed to create item");
  }
}
