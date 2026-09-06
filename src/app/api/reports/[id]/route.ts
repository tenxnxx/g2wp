import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { serializeBehaviorReportDetail } from "@/lib/behavior-reports";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    const report = await prisma.behaviorReport.findUnique({
      where: { id },
      include: {
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
              orderBy: { name: "asc" },
              select: { id: true, name: true },
            },
            behaviors: {
              orderBy: { createdAt: "desc" },
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
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json(serializeBehaviorReportDetail(report));
  } catch (error) {
    console.error("GET /api/reports/[id]", error);
    return NextResponse.json(
      { error: "Failed to fetch report" },
      { status: 500 },
    );
  }
}
