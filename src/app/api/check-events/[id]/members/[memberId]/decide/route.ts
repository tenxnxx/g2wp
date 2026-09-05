import { NextResponse } from "next/server";
import { actorLabel, requireAuth } from "@/lib/api-auth";
import { prismaErrorResponse, readJsonBody } from "@/lib/api-errors";
import {
  checkEventInclude,
  serializeCheckEvent,
  serializeCheckEventMember,
} from "@/lib/check-events";
import { prisma } from "@/lib/db";

type Params = {
  params: Promise<{ id: string; memberId: string }>;
};

export async function POST(request: Request, { params }: Params) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id, memberId } = await params;
    const bodyResult = await readJsonBody(request);
    if (bodyResult.error) return bodyResult.error;
    const body = bodyResult.data as Record<string, unknown>;

    const decision = String(body.status ?? "").trim();

    if (decision !== "approved" && decision !== "cancelled") {
      return NextResponse.json(
        { error: "status must be approved or cancelled" },
        { status: 400 },
      );
    }

    const decidedBy = actorLabel(auth.user);
    const isLive = decision === "approved";

    const [updatedRow, updatedEvent] = await prisma.$transaction(
      async (tx) => {
        const event = await tx.checkEvent.findUnique({ where: { id } });
        if (!event) {
          throw new NotFoundError("Check event not found");
        }
        if (event.status !== "open") {
          throw new BadRequestError(
            "Decisions are only allowed while event is open",
          );
        }

        const row = await tx.checkEventMember.findUnique({
          where: {
            checkEventId_memberId: {
              checkEventId: id,
              memberId,
            },
          },
        });
        if (!row) {
          throw new NotFoundError("Member is not in this check event");
        }

        const claimed = await tx.checkEventMember.updateMany({
          where: { id: row.id, status: "pending" },
          data: {
            status: decision,
            decidedBy,
            decidedAt: new Date(),
          },
        });
        if (claimed.count === 0) {
          throw new ConflictError(
            "สมาชิกนี้ถูกตัดสินไปแล้ว — รีเฟรชแล้วลองใหม่",
          );
        }

        await tx.member.update({
          where: { id: memberId },
          data: { isLive },
        });

        const nextRow = await tx.checkEventMember.findUniqueOrThrow({
          where: { id: row.id },
          include: {
            member: {
              select: { id: true, name: true, age: true, isLive: true },
            },
          },
        });

        const pendingLeft = await tx.checkEventMember.count({
          where: {
            checkEventId: id,
            status: "pending",
          },
        });

        if (pendingLeft === 0) {
          await tx.checkEvent.updateMany({
            where: { id, status: "open" },
            data: {
              status: "closed",
              closedAt: new Date(),
            },
          });
        }

        const nextEvent = await tx.checkEvent.findUniqueOrThrow({
          where: { id },
          include: checkEventInclude,
        });

        return [nextRow, nextEvent] as const;
      },
    );

    return NextResponse.json({
      member: serializeCheckEventMember(updatedRow),
      event: serializeCheckEvent(updatedEvent),
    });
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
    return prismaErrorResponse(error, "Failed to decide check member");
  }
}

class NotFoundError extends Error {}
class BadRequestError extends Error {}
class ConflictError extends Error {}
