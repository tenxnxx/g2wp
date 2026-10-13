export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startBossBoardWatch } = await import("@/server/boss-board-watch");
  startBossBoardWatch();
  if (process.env.NODE_ENV === "production") return;
  const { startBossClockSocket } = await import("@/server/boss-clock-socket");
  startBossClockSocket();
}
