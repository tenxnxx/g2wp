import { NextResponse } from "next/server";
import { actorLabel, requireAuth } from "@/lib/api-auth";
import { prismaErrorResponse, readJsonBody } from "@/lib/api-errors";
import { prisma } from "@/lib/db";
import {
  buildPaginationMeta,
  getSkip,
  parsePaginationParams,
} from "@/lib/pagination";

function toDateOnlyString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function parseDateOnly(value: unknown): Date | null {
  const raw = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const parsed = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function serializeSetDate(item: {
  id: string;
  date: Date;
  createBy: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: { checkEvents: number };
}) {
  return {
    id: item.id,
    date: toDateOnlyString(item.date),
    createBy: item.createBy,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    eventCount: item._count?.checkEvents ?? 0,
  };
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
    const skip = getSkip(page, limit);

    const [total, items] = await Promise.all([
      prisma.setDate.count(),
      prisma.setDate.findMany({
        orderBy: { date: "desc" },
        skip,
        take: limit,
        include: { _count: { select: { checkEvents: true } } },
      }),
    ]);

    return NextResponse.json({
      data: items.map(serializeSetDate),
      meta: buildPaginationMeta(total, page, limit),
    });
  } catch (error) {
    console.error("GET /api/set-dates", error);
    return NextResponse.json(
      { error: "Failed to fetch set dates" },
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

    const date = parseDateOnly(body.date);
    const createBy = actorLabel(auth.user);

    if (!date) {
      return NextResponse.json(
        { error: "date is required (YYYY-MM-DD)" },
        { status: 400 },
      );
    }

    const item = await prisma.setDate.create({
      data: { date, createBy },
    });

    return NextResponse.json(serializeSetDate(item), { status: 201 });
  } catch (error) {
    return prismaErrorResponse(error, "Failed to create set date");
  }
}
