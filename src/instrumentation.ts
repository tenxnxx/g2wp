export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startBossClockSocket } = await import("@/server/boss-clock-socket");
  startBossClockSocket();
}
