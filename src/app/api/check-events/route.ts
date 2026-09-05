import { NextResponse } from "next/server";
import { actorLabel, requireAuth } from "@/lib/api-auth";
import { prismaErrorResponse, readJsonBody } from "@/lib/api-errors";
import {
  checkEventListInclude,
  countsFromGroupBy,
  emptyCounts,
  normalizeEventTitle,
  serializeCheckEvent,
} from "@/lib/check-events";
import { prisma } from "@/lib/db";
import {
  buildPaginationMeta,
  getSkip,
  parsePaginationParams,
} from "@/lib/pagination";
import type { CheckEventStatus } from "@/types/check-event";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
    const skip = getSkip(page, limit);
    const statusParam = searchParams.get("status")?.trim();
    const setDateId = searchParams.get("setDateId")?.trim() || undefined;

    const status: CheckEventStatus | undefined =
      statusParam === "draft" ||
      statusParam === "open" ||
      statusParam === "closed"
        ? statusParam
        : undefined;

    const where: Prisma.CheckEventWhereInput = {
      ...(status ? { status } : {}),
      ...(setDateId ? { setDateId } : {}),
    };

    const [total, events] = await Promise.all([
      prisma.checkEvent.count({ where }),
      prisma.checkEvent.findMany({
        where,
        include: checkEventListInclude,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const countRows =
      events.length === 0
        ? []
        : await prisma.checkEventMember.groupBy({
            by: ["checkEventId", "status"],
            where: { checkEventId: { in: events.map((event) => event.id) } },
            _count: { _all: true },
          });
    const countsMap = countsFromGroupBy(countRows);

    return NextResponse.json({
      data: events.map((event) =>
        serializeCheckEvent(event, countsMap.get(event.id) ?? emptyCounts()),
      ),
      meta: buildPaginationMeta(total, page, limit),
    });
  } catch (error) {
    console.error("GET /api/check-events", error);
    return NextResponse.json(
      { error: "Failed to fetch check events" },
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

    const setDateId = String(body.setDateId ?? "").trim();
    const title = normalizeEventTitle(body.title);
    const createBy = actorLabel(auth.user);

    if (!setDateId) {
      return NextResponse.json(
        { error: "setDateId is required" },
        { status: 400 },
      );
    }

    const setDate = await prisma.setDate.findUnique({
      where: { id: setDateId },
    });
    if (!setDate) {
      return NextResponse.json({ error: "Set date not found" }, { status: 400 });
    }

    const event = await prisma.checkEvent.create({
      data: { setDateId, title, createBy },
      include: checkEventListInclude,
    });

    return NextResponse.json(
      serializeCheckEvent(event, emptyCounts()),
      { status: 201 },
    );
  } catch (error) {
    return prismaErrorResponse(error, "Failed to create check event");
  }
}
