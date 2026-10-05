import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { requireAuth } from "@/lib/api-auth";
import { prismaErrorResponse, readJsonBody } from "@/lib/api-errors";
import { CACHE_TTL, invalidateResource, remember } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { serializeTypeServer } from "@/lib/type-servers";
import { isTypeServerKind } from "@/types/type-server";

type Params = { params: Promise<{ id: string }> };

const bossCount = { _count: { select: { bosses: true } } } as const;

export async function GET(_request: Request, { params }: Params) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = await remember(
      `type-servers:${id}`,
      ["type-servers"],
      CACHE_TTL.detail,
      async () => {
        const row = await prisma.typeServer.findUnique({
          where: { id },
          include: bossCount,
        });
        return row ? serializeTypeServer(row) : null;
      },
    );
    if (!body) {
      return NextResponse.json(
        { error: "ไม่พบประเภทเซิร์ฟเวอร์" },
        { status: 404 },
      );
    }
    return NextResponse.json(body);
  } catch (error) {
    console.error("GET /api/type-servers/[id]", error);
    return NextResponse.json(
      { error: "Failed to fetch type server" },
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

    const data: { type?: "official" | "premium"; isUse?: boolean } = {};

    if (body.type !== undefined) {
      const typeRaw = String(body.type).trim().toLowerCase();
      if (!isTypeServerKind(typeRaw)) {
        return NextResponse.json(
          { error: "เลือกประเภท official หรือ premium" },
          { status: 400 },
        );
      }
      data.type = typeRaw;
    }

    if (body.isUse !== undefined) {
      data.isUse = Boolean(body.isUse);
    }

    const row = await prisma.typeServer.update({
      where: { id },
      data,
      include: bossCount,
    });

    await invalidateResource("type-servers");
    return NextResponse.json(serializeTypeServer(row));
  } catch (error) {
    return prismaErrorResponse(error, "Failed to update type server");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    await prisma.typeServer.delete({ where: { id } });
    await invalidateResource("type-servers");
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        { error: "ลบประเภทเซิร์ฟเวอร์ไม่ได้ เพราะยังมีบอสที่ใช้อยู่" },
        { status: 409 },
      );
    }
    return prismaErrorResponse(error, "Failed to delete type server");
  }
}
