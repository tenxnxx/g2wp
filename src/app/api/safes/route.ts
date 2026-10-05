import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prismaErrorResponse, readJsonBody } from "@/lib/api-errors";
import { cacheKey, CACHE_TTL, invalidateResource, remember } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { DESCRIPTION_MAX } from "@/lib/field-limits";
import {
  buildPaginationMeta,
  getSkip,
  parsePaginationParams,
  parseSearchQuery,
} from "@/lib/pagination";
import { safeInclude, serializeSafe } from "@/lib/safes";
import type { Prisma } from "@/generated/prisma/client";

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

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
    const skip = getSkip(page, limit);
    const search = parseSearchQuery(searchParams);
    const itemId = searchParams.get("itemId")?.trim() || undefined;
    const memberId = searchParams.get("memberId")?.trim() || undefined;

    const where: Prisma.SafeWhereInput = {
      ...(itemId ? { itemId } : {}),
      ...(memberId ? { memberId } : {}),
      ...(search
        ? {
            OR: [
              { description: { contains: search, mode: "insensitive" as const } },
              { item: { name: { contains: search, mode: "insensitive" as const } } },
              {
                member: {
                  name: { contains: search, mode: "insensitive" as const },
                },
              },
            ],
          }
        : {}),
    };

    const body = await remember(
      cacheKey("/api/safes", searchParams),
      ["safes"],
      CACHE_TTL.list,
      async () => {
        const [total, rows] = await Promise.all([
          prisma.safe.count({ where }),
          prisma.safe.findMany({
            where,
            orderBy: { depositItemAt: "desc" },
            skip,
            take: limit,
            include: safeInclude,
          }),
        ]);
        return {
          data: rows.map(serializeSafe),
          meta: buildPaginationMeta(total, page, limit),
        };
      },
    );

    return NextResponse.json(body);
  } catch (error) {
    console.error("GET /api/safes", error);
    return NextResponse.json(
      { error: "Failed to fetch safes" },
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

    const itemId = String(body.itemId ?? "").trim();
    const memberId = String(body.memberId ?? "").trim();
    const quantityResult = parseQuantity(body.quantity);
    const depositResult = parseDepositAt(body.depositItemAt);
    const descriptionRaw =
      body.description === undefined || body.description === null
        ? null
        : String(body.description).trim();
    const description =
      descriptionRaw && descriptionRaw.length > 0 ? descriptionRaw : null;

    if (!itemId) {
      return NextResponse.json({ error: "เลือกไอเท็ม" }, { status: 400 });
    }
    if (!memberId) {
      return NextResponse.json({ error: "เลือกสมาชิก" }, { status: 400 });
    }
    if (!quantityResult.ok) {
      return NextResponse.json({ error: quantityResult.error }, { status: 400 });
    }
    if (!depositResult.ok) {
      return NextResponse.json({ error: depositResult.error }, { status: 400 });
    }
    if (description && description.length > DESCRIPTION_MAX) {
      return NextResponse.json(
        { error: `รายละเอียดยาวเกินไป (สูงสุด ${DESCRIPTION_MAX} ตัวอักษร)` },
        { status: 400 },
      );
    }

    const [item, member] = await Promise.all([
      prisma.item.findUnique({ where: { id: itemId }, select: { id: true } }),
      prisma.member.findUnique({
        where: { id: memberId },
        select: { id: true },
      }),
    ]);
    if (!item) {
      return NextResponse.json({ error: "ไม่พบไอเท็ม" }, { status: 400 });
    }
    if (!member) {
      return NextResponse.json({ error: "ไม่พบสมาชิก" }, { status: 400 });
    }

    const safe = await prisma.safe.create({
      data: {
        itemId,
        memberId,
        quantity: quantityResult.quantity,
        description,
        depositItemAt: depositResult.date,
      },
      include: safeInclude,
    });

    await invalidateResource("safes");
    return NextResponse.json(serializeSafe(safe), { status: 201 });
  } catch (error) {
    return prismaErrorResponse(error, "Failed to create safe");
  }
}
