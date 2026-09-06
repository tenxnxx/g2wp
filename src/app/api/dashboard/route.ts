import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const [memberCount, playerCount, behaviorCount, members] =
      await Promise.all([
        prisma.member.count(),
        prisma.player.count(),
        prisma.behavior.count(),
        prisma.member.findMany({
          orderBy: { createdAt: "desc" },
          take: 100,
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

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("GET /api/dashboard", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard" },
      { status: 500 },
    );
  }
}
