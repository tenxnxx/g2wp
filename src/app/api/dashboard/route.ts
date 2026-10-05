import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { CACHE_TTL, remember } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { DASHBOARD_MEMBERS_MAX } from "@/lib/field-limits";

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;

    const body = await remember("dashboard", ["dashboard"], CACHE_TTL.dashboard, async () => {
      const [memberCount, playerCount, behaviorCount, members] = await Promise.all([
        prisma.member.count(),
        prisma.player.count(),
        prisma.behavior.count(),
        prisma.member.findMany({
          orderBy: { createdAt: "desc" },
          take: DASHBOARD_MEMBERS_MAX,
          select: {
            id: true,
            name: true,
            age: true,
            facebookUrl: true,
            isLive: true,
            createBy: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                players: true,
                behaviors: true,
              },
            },
          },
        }),
      ]);
      return {
        summary: {
          members: memberCount,
          players: playerCount,
          behaviors: behaviorCount,
        },
        members: members.map((member) => ({
          id: member.id,
          name: member.name,
          age: member.age,
          facebookUrl: member.facebookUrl,
          isLive: member.isLive,
          createBy: member.createBy,
          createdAt: member.createdAt.toISOString(),
          updatedAt: member.updatedAt.toISOString(),
          playerCount: member._count.players,
          behaviorCount: member._count.behaviors,
        })),
      };
    });

    return NextResponse.json(body);
  } catch (error) {
    console.error("GET /api/dashboard", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard" },
      { status: 500 },
    );
  }
}
