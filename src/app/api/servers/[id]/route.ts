import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { requireAuth } from "@/lib/api-auth";
import { prismaErrorResponse, readJsonBody } from "@/lib/api-errors";
import { CACHE_TTL, invalidateResource, remember } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { readRequiredName } from "@/lib/name-field";
import { serializeServer } from "@/lib/servers";

type Params = { params: Promise<{ id: string }> };

const bossCount = { _count: { select: { bosses: true } } } as const;

export async function GET(_request: Request, { params }: Params) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = await remember(`servers:${id}`, ["servers"], CACHE_TTL.detail, async () => {
      const server = await prisma.server.findUnique({
        where: { id },
        include: bossCount,
      });
      return server ? serializeServer(server) : null;
    });
    if (!body) {
      return NextResponse.json({ error: "ไม่พบเซิร์ฟเวอร์" }, { status: 404 });
    }
    return NextResponse.json(body);
  } catch (error) {
    console.error("GET /api/servers/[id]", error);
    return NextResponse.json(
      { error: "Failed to fetch server" },
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

    const data: { serverName?: string; isUse?: boolean } = {};

    if (body.serverName !== undefined) {
      const nameResult = readRequiredName(body.serverName, "ชื่อเซิร์ฟเวอร์");
      if (nameResult.error) return nameResult.error;
      data.serverName = nameResult.name;
    }

    if (body.isUse !== undefined) {
      data.isUse = Boolean(body.isUse);
    }

    const server = await prisma.server.update({
      where: { id },
      data,
      include: bossCount,
    });

    await invalidateResource("servers");
    return NextResponse.json(serializeServer(server));
  } catch (error) {
    return prismaErrorResponse(error, "Failed to update server");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    await prisma.server.delete({ where: { id } });
    await invalidateResource("servers");
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        { error: "ลบเซิร์ฟเวอร์ไม่ได้ เพราะยังมีบอสที่ใช้อยู่" },
        { status: 409 },
      );
    }
    return prismaErrorResponse(error, "Failed to delete server");
  }
}
