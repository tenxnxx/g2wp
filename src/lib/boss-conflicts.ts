import { TYPE_SERVER_LABEL } from "@/types/type-server";
import { prisma } from "@/lib/db";

/**
 * Same city and same server type (Official or Premium) cannot reuse a server.
 * The other type of that city, and other cities, may still use it.
 */
export async function bossServerConflict(input: {
  cityId: string;
  serverId: string;
  typeServerId: string;
  exceptBossId?: string;
}): Promise<string | null> {
  const typeServer = await prisma.typeServer.findUnique({
    where: { id: input.typeServerId },
    select: { type: true },
  });
  if (!typeServer) return null;

  const existing = await prisma.boss.findFirst({
    where: {
      cityId: input.cityId,
      serverId: input.serverId,
      typeServer: { type: typeServer.type },
      ...(input.exceptBossId ? { id: { not: input.exceptBossId } } : {}),
    },
    select: {
      city: { select: { cityName: true } },
      server: { select: { serverName: true } },
    },
  });
  if (!existing) return null;
  const typeLabel = TYPE_SERVER_LABEL[typeServer.type];
  return `เมือง ${existing.city.cityName} ประเภท ${typeLabel} มีเซิร์ฟเวอร์ ${existing.server.serverName} แล้ว`;
}
