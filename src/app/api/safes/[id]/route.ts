import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prismaErrorResponse, readJsonBody } from "@/lib/api-errors";
import { prisma } from "@/lib/db";
import { DESCRIPTION_MAX } from "@/lib/field-limits";
import { safeInclude, serializeSafe } from "@/lib/safes";

type Params = { params: Promise<{ id: string }> };

function parseDepositAt(
  value: unknown,
): { ok: true; date: Date } | { ok: false; error: string } {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return { ok: false, error: "ระบุวันเวลาฝากไอเท็ม" };
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: "วันเวลาฝากไอเท็มไม่ถูกต้อง" };
  }
  return { ok: true, date };
}

function parseQuantity(
  value: unknown,
): { ok: true; quantity: number } | { ok: false; error: string } {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { ok: false, error: "จำนวนต้องเป็นจำนวนเต็มอย่างน้อย 1" };
  }
  return { ok: true, quantity };
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    const safe = await prisma.safe.findUnique({
      where: { id },
      include: safeInclude,
    });
    if (!safe) {
      return NextResponse.json({ error: "ไม่พบบันทึกตู้เซฟ" }, { status: 404 });
    }
    return NextResponse.json(serializeSafe(safe));
  } catch (error) {
    console.error("GET /api/safes/[id]", error);
    return NextResponse.json(
      { error: "Failed to fetch safe" },
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

    const data: {
      itemId?: string;
      memberId?: string;
      quantity?: number;
      description?: string | null;
      depositItemAt?: Date;
    } = {};

    if (body.itemId !== undefined) {
      const itemId = String(body.itemId).trim();
      if (!itemId) {
        return NextResponse.json({ error: "เลือกไอเท็ม" }, { status: 400 });
      }
      const item = await prisma.item.findUnique({
        where: { id: itemId },
        select: { id: true },
      });
      if (!item) {
        return NextResponse.json({ error: "ไม่พบไอเท็ม" }, { status: 400 });
      }
      data.itemId = itemId;
    }

    if (body.memberId !== undefined) {
      const memberId = String(body.memberId).trim();
      if (!memberId) {
        return NextResponse.json({ error: "เลือกสมาชิก" }, { status: 400 });
      }
      const member = await prisma.member.findUnique({
        where: { id: memberId },
        select: { id: true },
      });
      if (!member) {
        return NextResponse.json({ error: "ไม่พบสมาชิก" }, { status: 400 });
      }
      data.memberId = memberId;
    }

    if (body.quantity !== undefined) {
      const quantityResult = parseQuantity(body.quantity);
      if (!quantityResult.ok) {
        return NextResponse.json(
          { error: quantityResult.error },
          { status: 400 },
        );
      }
      data.quantity = quantityResult.quantity;
    }

    if (body.depositItemAt !== undefined) {
      const depositResult = parseDepositAt(body.depositItemAt);
      if (!depositResult.ok) {
        return NextResponse.json(
          { error: depositResult.error },
          { status: 400 },
        );
      }
      data.depositItemAt = depositResult.date;
    }

    if ("description" in body) {
      const descriptionRaw =
        body.description === undefined || body.description === null
          ? null
          : String(body.description).trim();
      const description =
        descriptionRaw && descriptionRaw.length > 0 ? descriptionRaw : null;
      if (description && description.length > DESCRIPTION_MAX) {
        return NextResponse.json(
          { error: `รายละเอียดยาวเกินไป (สูงสุด ${DESCRIPTION_MAX} ตัวอักษร)` },
          { status: 400 },
        );
      }
      data.description = description;
    }

    const safe = await prisma.safe.update({
      where: { id },
      data,
      include: safeInclude,
    });

    return NextResponse.json(serializeSafe(safe));
  } catch (error) {
    return prismaErrorResponse(error, "Failed to update safe");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    await prisma.safe.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return prismaErrorResponse(error, "Failed to delete safe");
  }
}
