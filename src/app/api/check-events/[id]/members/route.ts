import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { serializeCheckEventMember } from "@/lib/check-events";
import { prisma } from "@/lib/db";
import {
  buildPaginationMeta,
  getSkip,
  parsePaginationParams,
  parseSearchQuery,
} from "@/lib/pagination";
import type { CheckMemberStatus } from "@/types/check-event";
import type { Prisma } from "@/generated/prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    const event = await prisma.checkEvent.findUnique({ where: { id } });
    if (!event) {
      return NextResponse.json({ error: "Check event not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
    const skip = getSkip(page, limit);
    const statusParam = searchParams.get("status")?.trim();
    const q = parseSearchQuery(searchParams);

    const status: CheckMemberStatus | undefined =
      statusParam === "pending" ||
      statusParam === "approved" ||
      statusParam === "cancelled"
        ? statusParam
        : undefined;

    const where: Prisma.CheckEventMemberWhereInput = {
      checkEventId: id,
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              {
                memberNameSnapshot: {
                  contains: q,
                  mode: "insensitive",
                },
              },
              {
                member: {
                  name: { contains: q, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.checkEventMember.count({ where }),
      prisma.checkEventMember.findMany({
        where,
        include: {
          member: {
            select: { id: true, name: true, age: true, isLive: true },
          },
        },
        orderBy: [{ status: "asc" }, { memberNameSnapshot: "asc" }],
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      data: rows.map(serializeCheckEventMember),
      meta: buildPaginationMeta(total, page, limit),
      eventStatus: event.status,
    });
  } catch (error) {
    console.error("GET /api/check-events/[id]/members", error);
    return NextResponse.json(
      { error: "Failed to fetch check event members" },
      { status: 500 },
    );
  }
}
