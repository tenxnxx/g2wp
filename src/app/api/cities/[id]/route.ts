import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { requireAuth } from "@/lib/api-auth";
import { prismaErrorResponse, readJsonBody } from "@/lib/api-errors";
import { CACHE_TTL, invalidateResource, remember } from "@/lib/cache";
import { serializeCity } from "@/lib/cities";
import { prisma } from "@/lib/db";
import { readRequiredName } from "@/lib/name-field";

type Params = { params: Promise<{ id: string }> };

const bossCount = { _count: { select: { bosses: true } } } as const;

export async function GET(_request: Request, { params }: Params) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = await remember(`cities:${id}`, ["cities"], CACHE_TTL.detail, async () => {
      const city = await prisma.city.findUnique({
        where: { id },
        include: bossCount,
      });
      return city ? serializeCity(city) : null;
    });
    if (!body) {
      return NextResponse.json({ error: "ไม่พบเมือง" }, { status: 404 });
    }
    return NextResponse.json(body);
  } catch (error) {
    console.error("GET /api/cities/[id]", error);
    return NextResponse.json(
      { error: "Failed to fetch city" },
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

    const data: { cityName?: string; isUse?: boolean } = {};

    if (body.cityName !== undefined) {
      const nameResult = readRequiredName(body.cityName, "ชื่อเมือง");
      if (nameResult.error) return nameResult.error;
      data.cityName = nameResult.name;
    }

    if (body.isUse !== undefined) {
      data.isUse = Boolean(body.isUse);
    }

    const city = await prisma.city.update({
      where: { id },
      data,
      include: bossCount,
    });

    await invalidateResource("cities");
    return NextResponse.json(serializeCity(city));
  } catch (error) {
    return prismaErrorResponse(error, "Failed to update city");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    await prisma.city.delete({ where: { id } });
    await invalidateResource("cities");
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        { error: "ลบเมืองไม่ได้ เพราะยังมีบอสที่ใช้อยู่" },
        { status: 409 },
      );
    }
    return prismaErrorResponse(error, "Failed to delete city");
  }
}
