import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prismaErrorResponse, readJsonBody } from "@/lib/api-errors";
import { CACHE_TTL, invalidateResource, remember } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { NAME_MAX } from "@/lib/field-limits";
import { serializeItem } from "@/lib/items";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = await remember(`items:${id}`, ["items"], CACHE_TTL.detail, async () => {
      const item = await prisma.item.findUnique({
        where: { id },
        include: { _count: { select: { safes: true } } },
      });
      return item ? serializeItem(item) : null;
    });
    if (!body) {
      return NextResponse.json({ error: "ไม่พบไอเท็ม" }, { status: 404 });
    }
    return NextResponse.json(body);
  } catch (error) {
    console.error("GET /api/items/[id]", error);
    return NextResponse.json(
      { error: "Failed to fetch item" },
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

    const data: { name?: string } = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) {
        return NextResponse.json({ error: "กรอกชื่อไอเท็ม" }, { status: 400 });
      }
      if (name.length > NAME_MAX) {
        return NextResponse.json(
          { error: `ชื่อไอเท็มยาวเกินไป (สูงสุด ${NAME_MAX} ตัวอักษร)` },
          { status: 400 },
        );
      }
      data.name = name;
    }

    const item = await prisma.item.update({
      where: { id },
      data,
      include: { _count: { select: { safes: true } } },
    });

    await invalidateResource("items");
    return NextResponse.json(serializeItem(item));
  } catch (error) {
    return prismaErrorResponse(error, "Failed to update item");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    await prisma.item.delete({ where: { id } });
    await invalidateResource("items");
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return prismaErrorResponse(error, "Failed to delete item");
  }
}
