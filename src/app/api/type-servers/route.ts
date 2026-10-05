import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prismaErrorResponse, readJsonBody } from "@/lib/api-errors";
import { cacheKey, CACHE_TTL, invalidateResource, remember } from "@/lib/cache";
import { prisma } from "@/lib/db";
import {
  buildPaginationMeta,
  getSkip,
  parsePaginationParams,
  parseSearchQuery,
} from "@/lib/pagination";
import { serializeTypeServer } from "@/lib/type-servers";
import {
  TYPE_SERVER_KINDS,
  TYPE_SERVER_LABEL,
  isTypeServerKind,
  type TypeServerKind,
} from "@/types/type-server";
import type { Prisma } from "@/generated/prisma/client";

function parseIsUse(searchParams: URLSearchParams): boolean | undefined {
  const isUseParam = searchParams.get("isUse");
  if (isUseParam === "true" || isUseParam === "1") return true;
  if (isUseParam === "false" || isUseParam === "0") return false;
  return undefined;
}

function kindsMatching(search: string): TypeServerKind[] {
  const q = search.toLowerCase();
  return TYPE_SERVER_KINDS.filter((kind) => {
    const label = TYPE_SERVER_LABEL[kind].toLowerCase();
    return kind.includes(q) || label.includes(q);
  });
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
    const matched = search ? kindsMatching(search) : undefined;

    if (matched && matched.length === 0) {
      return NextResponse.json({
        data: [],
        meta: buildPaginationMeta(0, page, limit),
      });
    }

    const where: Prisma.TypeServerWhereInput = {
      ...(isUse === undefined ? {} : { isUse }),
      ...(matched ? { type: { in: matched } } : {}),
    };

    const body = await remember(
      cacheKey("/api/type-servers", searchParams),
      ["type-servers"],
      CACHE_TTL.list,
      async () => {
        const [total, rows] = await Promise.all([
          prisma.typeServer.count({ where }),
          prisma.typeServer.findMany({
            where,
            orderBy: [{ isUse: "desc" }, { type: "desc" }],
            skip,
            take: limit,
            include: { _count: { select: { bosses: true } } },
          }),
        ]);
        return {
          data: rows.map(serializeTypeServer),
          meta: buildPaginationMeta(total, page, limit),
        };
      },
    );

    return NextResponse.json(body);
  } catch (error) {
    console.error("GET /api/type-servers", error);
    return NextResponse.json(
      { error: "Failed to fetch type servers" },
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

    const typeRaw = String(body.type ?? "").trim().toLowerCase();
    if (!isTypeServerKind(typeRaw)) {
      return NextResponse.json(
        { error: "เลือกประเภท official หรือ premium" },
        { status: 400 },
      );
    }
    const isUse = typeof body.isUse === "boolean" ? body.isUse : true;

    const row = await prisma.typeServer.create({
      data: { type: typeRaw, isUse },
      include: { _count: { select: { bosses: true } } },
    });

    await invalidateResource("type-servers");
    return NextResponse.json(serializeTypeServer(row), { status: 201 });
  } catch (error) {
    return prismaErrorResponse(error, "Failed to create type server");
  }
}
