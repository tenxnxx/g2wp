import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prismaErrorResponse, readJsonBody } from "@/lib/api-errors";
import { prisma } from "@/lib/db";
import { serializeGroup } from "@/lib/groups";
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
    const isUseParam = searchParams.get("isUse");
    const isUse =
      isUseParam === "true" || isUseParam === "1"
        ? true
        : isUseParam === "false" || isUseParam === "0"
          ? false
          : undefined;

    const where: Prisma.GroupWhereInput = {
      ...(isUse === undefined ? {} : { isUse }),
      ...(search
        ? { groupName: { contains: search, mode: "insensitive" as const } }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.group.count({ where }),
      prisma.group.findMany({
        where,
        orderBy: [{ isUse: "desc" }, { groupName: "asc" }],
        skip,
        take: limit,
        include: { _count: { select: { members: true } } },
      }),
    ]);

    return NextResponse.json({
      data: rows.map(serializeGroup),
      meta: buildPaginationMeta(total, page, limit),
    });
  } catch (error) {
    console.error("GET /api/groups", error);
    return NextResponse.json(
      { error: "Failed to fetch groups" },
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

    const groupName = String(body.groupName ?? "").trim();
    const isUse = typeof body.isUse === "boolean" ? body.isUse : true;

    if (!groupName) {
      return NextResponse.json({ error: "กรอกชื่อกลุ่ม" }, { status: 400 });
    }
    if (groupName.length > 100) {
      return NextResponse.json(
        { error: "ชื่อกลุ่มยาวเกินไป (สูงสุด 100 ตัวอักษร)" },
        { status: 400 },
      );
    }

    const group = await prisma.group.create({
      data: { groupName, isUse },
      include: { _count: { select: { members: true } } },
    });

    return NextResponse.json(serializeGroup(group), { status: 201 });
  } catch (error) {
    return prismaErrorResponse(error, "Failed to create group");
  }
}
