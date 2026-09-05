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

    const liveMembers = await prisma.member.findMany({
      where: { isLive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    if (liveMembers.length === 0) {
      return NextResponse.json(
        { error: "No live members to check" },
        { status: 400 },
      );
    }

    const opened = await prisma.$transaction(async (tx) => {
      const otherOpen = await tx.checkEvent.findFirst({
        where: { status: "open", NOT: { id } },
        select: { id: true, title: true },
      });
      if (otherOpen) {
        throw new OpenConflictError(
          "มีอีเวนต์ที่เปิดอยู่แล้ว — ต้องปิดอีเวนต์นั้นก่อนเปิดอันใหม่",
        );
      }

      const claimed = await tx.checkEvent.updateMany({
        where: { id, status: "draft" },
        data: {
          status: "open",
          openedAt: new Date(),
        },
      });
      if (claimed.count === 0) {
        const existing = await tx.checkEvent.findUnique({ where: { id } });
        if (!existing) {
          throw new NotFoundError("Check event not found");
        }
        throw new BadRequestError("Only draft events can be opened");
      }

      await tx.checkEventMember.createMany({
        data: liveMembers.map((member) => ({
          checkEventId: id,
          memberId: member.id,
          memberNameSnapshot: member.name,
          status: "pending" as const,
        })),
      });

      return tx.checkEvent.findUniqueOrThrow({
        where: { id },
        include: checkEventInclude,
      });
    });

    return NextResponse.json(serializeCheckEvent(opened));
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof BadRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof OpenConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return prismaErrorResponse(error, "Failed to open check event");
  }
}

class NotFoundError extends Error {}
class BadRequestError extends Error {}
class OpenConflictError extends Error {}
