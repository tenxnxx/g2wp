import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prismaErrorResponse, readJsonBody } from "@/lib/api-errors";
import {
  checkEventInclude,
  normalizeEventTitle,
  serializeCheckEvent,
} from "@/lib/check-events";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    const event = await prisma.checkEvent.findUnique({
      where: { id },
      include: checkEventInclude,
    });
    if (!event) {
      return NextResponse.json({ error: "Check event not found" }, { status: 404 });
    }
    return NextResponse.json(serializeCheckEvent(event));
  } catch (error) {
    console.error("GET /api/check-events/[id]", error);
    return NextResponse.json(
      { error: "Failed to fetch check event" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    const existing = await prisma.checkEvent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Check event not found" }, { status: 404 });
    }
    if (existing.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft events can be edited" },
        { status: 400 },
      );
    }

    const bodyResult = await readJsonBody(request);
    if (bodyResult.error) return bodyResult.error;
    const body = bodyResult.data as Record<string, unknown>;

    const data: { title?: string | null; setDateId?: string } = {};

    if (body.title !== undefined) {
      data.title = normalizeEventTitle(body.title);
    }

    if (body.setDateId !== undefined) {
      const setDateId = String(body.setDateId ?? "").trim();
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
        return NextResponse.json(
          { error: "Set date not found" },
          { status: 400 },
        );
      }
      data.setDateId = setDateId;
    }

    const event = await prisma.checkEvent.update({
      where: { id },
      data,
      include: checkEventInclude,
    });

    return NextResponse.json(serializeCheckEvent(event));
  } catch (error) {
    return prismaErrorResponse(error, "Failed to update check event");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    const existing = await prisma.checkEvent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Check event not found" }, { status: 404 });
    }
    if (existing.status === "open") {
      return NextResponse.json(
        { error: "Cannot delete an open event — close it first" },
        { status: 400 },
      );
    }

    await prisma.checkEvent.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return prismaErrorResponse(error, "Failed to delete check event");
  }
}
