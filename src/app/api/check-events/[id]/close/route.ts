import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prismaErrorResponse } from "@/lib/api-errors";
import {
  checkEventInclude,
  serializeCheckEvent,
} from "@/lib/check-events";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;

    const closed = await prisma.$transaction(async (tx) => {
      const event = await tx.checkEvent.findUnique({ where: { id } });
      if (!event) {
        throw new NotFoundError("Check event not found");
      }
      if (event.status !== "open") {
        throw new BadRequestError("Only open events can be closed");
      }

      const pendingCount = await tx.checkEventMember.count({
        where: { checkEventId: id, status: "pending" },
      });
      if (pendingCount > 0) {
        throw new BadRequestError(
          `ยังมีสมาชิกรอเช็ค ${pendingCount} คน — ต้องอนุมัติหรือยกเลิกให้ครบก่อนปิดอีเวนต์`,
        );
      }

      const claimed = await tx.checkEvent.updateMany({
        where: { id, status: "open" },
        data: {
          status: "closed",
          closedAt: new Date(),
        },
      });
      if (claimed.count === 0) {
        throw new ConflictError("อีเวนต์ถูกปิดไปแล้ว — รีเฟรชแล้วลองใหม่");
      }

      return tx.checkEvent.findUniqueOrThrow({
        where: { id },
        include: checkEventInclude,
      });
    });

    return NextResponse.json(serializeCheckEvent(closed));
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof BadRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof ConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return prismaErrorResponse(error, "Failed to close check event");
  }
}

class NotFoundError extends Error {}
class BadRequestError extends Error {}
class ConflictError extends Error {}
