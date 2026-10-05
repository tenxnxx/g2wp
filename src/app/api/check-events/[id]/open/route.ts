import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { invalidateResource } from "@/lib/cache";
import { prismaErrorResponse } from "@/lib/api-errors";
import {
  checkEventInclude,
  serializeCheckEvent,
} from "@/lib/check-events";
import { prisma } from "@/lib/db";
import {
  CHECK_EVENT_MEMBER_BATCH,
  CHECK_EVENT_OPEN_MEMBERS_MAX,
} from "@/lib/field-limits";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;

    const liveCount = await prisma.member.count({ where: { isLive: true } });
    if (liveCount === 0) {
      return NextResponse.json(
        { error: "No live members to check" },
        { status: 400 },
      );
    }
    if (liveCount > CHECK_EVENT_OPEN_MEMBERS_MAX) {
      return NextResponse.json(
        {
          error: `สมาชิกที่อยู่ในแคลนมีเกิน ${CHECK_EVENT_OPEN_MEMBERS_MAX} คน — ลดจำนวนหรือแบ่งอีเวนต์`,
        },
        { status: 400 },
      );
    }

    const liveMembers = await prisma.member.findMany({
      where: { isLive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: CHECK_EVENT_OPEN_MEMBERS_MAX,
    });

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

      for (let i = 0; i < liveMembers.length; i += CHECK_EVENT_MEMBER_BATCH) {
        const batch = liveMembers.slice(i, i + CHECK_EVENT_MEMBER_BATCH);
        await tx.checkEventMember.createMany({
          data: batch.map((member) => ({
            checkEventId: id,
            memberId: member.id,
            memberNameSnapshot: member.name,
            status: "pending" as const,
          })),
        });
      }

      return tx.checkEvent.findUniqueOrThrow({
        where: { id },
        include: checkEventInclude,
      });
    });

    await invalidateResource("check-events");
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
