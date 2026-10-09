export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startBossHourSoonWatch } = await import("@/server/boss-hour-soon");
  startBossHourSoonWatch();
  if (process.env.NODE_ENV === "production") return;
  const { startBossClockSocket } = await import("@/server/boss-clock-socket");
  startBossClockSocket();
}
