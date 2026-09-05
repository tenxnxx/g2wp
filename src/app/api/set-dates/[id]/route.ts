import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prismaErrorResponse, readJsonBody } from "@/lib/api-errors";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

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
}) {
  return {
    id: item.id,
    date: toDateOnlyString(item.date),
    createBy: item.createBy,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    const item = await prisma.setDate.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: "Set date not found" }, { status: 404 });
    }
    return NextResponse.json(serializeSetDate(item));
  } catch (error) {
    console.error("GET /api/set-dates/[id]", error);
    return NextResponse.json(
      { error: "Failed to fetch set date" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    const bodyResult = await readJsonBody(request);
    if (bodyResult.error) return bodyResult.error;
    const body = bodyResult.data as Record<string, unknown>;

    const data: { date?: Date } = {};

    if (body.date !== undefined) {
      const date = parseDateOnly(body.date);
      if (!date) {
        return NextResponse.json(
          { error: "invalid date (YYYY-MM-DD)" },
          { status: 400 },
        );
      }
      data.date = date;
    }

    const item = await prisma.setDate.update({
      where: { id },
      data,
    });

    return NextResponse.json(serializeSetDate(item));
  } catch (error) {
    return prismaErrorResponse(error, "Failed to update set date");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    const eventCount = await prisma.checkEvent.count({
      where: { setDateId: id },
    });
    if (eventCount > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete this date because check events already exist for it",
        },
        { status: 400 },
      );
    }

    await prisma.setDate.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return prismaErrorResponse(error, "Failed to delete set date");
  }
}
