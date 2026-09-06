import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prismaErrorResponse, readJsonBody } from "@/lib/api-errors";
import { prisma } from "@/lib/db";
import { serializeGroup } from "@/lib/groups";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    const group = await prisma.group.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } },
    });
    if (!group) {
      return NextResponse.json({ error: "ไม่พบกลุ่ม" }, { status: 404 });
    }
    return NextResponse.json(serializeGroup(group));
  } catch (error) {
    console.error("GET /api/groups/[id]", error);
    return NextResponse.json(
      { error: "Failed to fetch group" },
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

    const data: { groupName?: string; isUse?: boolean } = {};

    if (body.groupName !== undefined) {
      const groupName = String(body.groupName).trim();
      if (!groupName) {
        return NextResponse.json({ error: "กรอกชื่อกลุ่ม" }, { status: 400 });
      }
      if (groupName.length > 100) {
        return NextResponse.json(
          { error: "ชื่อกลุ่มยาวเกินไป (สูงสุด 100 ตัวอักษร)" },
          { status: 400 },
        );
      }
      data.groupName = groupName;
    }

    if (body.isUse !== undefined) {
      data.isUse = Boolean(body.isUse);
    }

    const group = await prisma.group.update({
      where: { id },
      data,
      include: { _count: { select: { members: true } } },
    });

    return NextResponse.json(serializeGroup(group));
  } catch (error) {
    return prismaErrorResponse(error, "Failed to update group");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    await prisma.group.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return prismaErrorResponse(error, "Failed to delete group");
  }
}
