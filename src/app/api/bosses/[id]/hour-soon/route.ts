import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prismaErrorResponse } from "@/lib/api-errors";
import {
  bossHourAlmostDone,
  bossInclude,
  formatBossTime,
  readBoardLane,
} from "@/lib/bosses";
import { prisma } from "@/lib/db";
import { notifyBossHourSoon } from "@/server/notify";
import { TYPE_SERVER_LABEL } from "@/types/type-server";

type Params = { params: Promise<{ id: string }> };

/** Yellow Telegram warning when รอเกิด has five minutes left in its hour. */
export async function POST(_request: Request, { params }: Params) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;

    const { id } = await params;
    const boss = await prisma.boss.findUnique({
      where: { id },
      include: bossInclude,
    });
    if (!boss) {
      return NextResponse.json({ error: "ไม่พบบอส" }, { status: 404 });
    }

    const lane = readBoardLane(boss.boardLane);
    if (
      !bossHourAlmostDone({
        hour: boss.hour,
        minute: boss.minute,
        second: boss.second,
        boardLane: lane,
      })
    ) {
      return NextResponse.json({ sent: false });
    }

    const clock =
      boss.hour != null && boss.minute != null
        ? formatBossTime(boss.hour, boss.minute, boss.second ?? undefined)
        : null;
    const sent = await notifyBossHourSoon(
      id,
      `${boss.hour}:${boss.minute}:${boss.second ?? 0}`,
      {
        cityName: boss.city.cityName,
        serverName: boss.server.serverName,
        typeLabel: TYPE_SERVER_LABEL[boss.typeServer.type],
        clock,
      },
    );
    return NextResponse.json({ sent });
  } catch (error) {
    return prismaErrorResponse(error, "Failed to warn boss hour");
  }
}
