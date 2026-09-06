import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { serializeBehaviorReport } from "@/lib/behavior-reports";
import { prisma } from "@/lib/db";
import {
  buildPaginationMeta,
  getSkip,
  parsePaginationParams,
  parseSearchQuery,
} from "@/lib/pagination";
import type { BehaviorReportStatus } from "@/types/behavior-report";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
    const skip = getSkip(page, limit);
    const statusParam = searchParams.get("status")?.trim();
    const q = parseSearchQuery(searchParams);

    const status: BehaviorReportStatus | undefined =
      statusParam === "pending" ||
      statusParam === "approved" ||
      statusParam === "cancelled"
        ? statusParam
        : undefined;

    const where: Prisma.BehaviorReportWhereInput = {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { message: { contains: q, mode: "insensitive" } },
              { memberNameSnap: { contains: q, mode: "insensitive" } },
              { playerNameSnap: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.behaviorReport.count({ where }),
      prisma.behaviorReport.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      data: rows.map(serializeBehaviorReport),
      meta: buildPaginationMeta(total, page, limit),
    });
  } catch (error) {
    console.error("GET /api/reports", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 },
    );
  }
}
