import { NextResponse } from "next/server";
import { actorLabel, requireAuth } from "@/lib/api-auth";
import { prismaErrorResponse, readJsonBody } from "@/lib/api-errors";
import { serializeBehaviorReportDetail } from "@/lib/behavior-reports";
import { prisma } from "@/lib/db";
import { DECISION_NOTE_MAX } from "@/lib/field-limits";

type Params = { params: Promise<{ id: string }> };

const detailInclude = {
  player: { select: { id: true, name: true } },
  member: {
    select: {
      id: true,
      name: true,
      age: true,
      facebookUrl: true,
      isLive: true,
      _count: { select: { players: true, behaviors: true } },
      players: {
        orderBy: { name: "asc" as const },
        select: { id: true, name: true },
      },
      behaviors: {
        orderBy: { createdAt: "desc" as const },
        take: 8,
        select: {
          id: true,
          description: true,
          createdAt: true,
          player: { select: { id: true, name: true } },
        },
      },
    },
  },
} as const;

export async function POST(request: Request, { params }: Params) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
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

    const noteRaw =
      body.note === undefined || body.note === null
        ? null
        : String(body.note).trim();
    const decisionNote =
      noteRaw && noteRaw.length > 0
        ? noteRaw.slice(0, DECISION_NOTE_MAX)
        : null;
    const decidedBy = actorLabel(auth.user);

    const result = await prisma.$transaction(async (tx) => {
      const report = await tx.behaviorReport.findUnique({ where: { id } });
      if (!report) {
        throw new NotFoundError("Report not found");
      }
      if (report.status !== "pending") {
        throw new ConflictError("รายงานนี้ถูกตัดสินไปแล้ว");
      }

      const claimed = await tx.behaviorReport.updateMany({
        where: { id, status: "pending" },
        data: {
          status: decision,
          decidedBy,
          decidedAt: new Date(),
          decisionNote,
        },
      });
      if (claimed.count === 0) {
        throw new ConflictError("รายงานนี้ถูกตัดสินไปแล้ว");
      }

      if (decision === "approved") {
        const player = await tx.player.findFirst({
          where: {
            id: report.playerId,
            memberId: report.memberId,
          },
          select: { id: true },
        });
        if (!player) {
          throw new ConflictError(
            "ตัวละครกับสมาชิกในรายงานไม่ตรงกันหรือถูกลบแล้ว",
          );
        }

        const behavior = await tx.behavior.create({
          data: {
            description: report.message,
            evidenceUrl: report.evidenceUrl,
            memberId: report.memberId,
            playerId: report.playerId,
            createBy: decidedBy,
          },
        });
        await tx.behaviorReport.update({
          where: { id },
          data: { behaviorId: behavior.id },
        });
      }

      return tx.behaviorReport.findUniqueOrThrow({
        where: { id },
        include: detailInclude,
      });
    });

    return NextResponse.json(serializeBehaviorReportDetail(result));
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof ConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return prismaErrorResponse(error, "Failed to decide report");
  }
}

class NotFoundError extends Error {}
class ConflictError extends Error {}
