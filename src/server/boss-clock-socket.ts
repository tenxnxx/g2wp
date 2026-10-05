import { WebSocketServer, type WebSocket } from "ws";
import { BOSS_CLOCK_PATH, BOSS_CLOCK_PORT } from "@/lib/boss-clock";

type ClockGlobal = typeof globalThis & { bossClockStarted?: boolean };

/** Broadcasts the server clock once a second to every connected boss board. */
export function startBossClockSocket() {
  const g = globalThis as ClockGlobal;
  if (g.bossClockStarted) return;
  g.bossClockStarted = true;

  const clients = new Set<WebSocket>();
  const wss = new WebSocketServer({ port: BOSS_CLOCK_PORT, path: BOSS_CLOCK_PATH });

  wss.on("connection", (socket) => {
    clients.add(socket);
    socket.send(JSON.stringify({ now: Date.now() }));
    socket.on("close", () => clients.delete(socket));
    socket.on("error", () => clients.delete(socket));
  });

  const timer = setInterval(() => {
    const payload = JSON.stringify({ now: Date.now() });
    for (const socket of clients) {
      if (socket.readyState === socket.OPEN) socket.send(payload);
    }
  }, 1000);
  timer.unref();

  wss.on("listening", () => {
    console.log(
      `Boss clock socket ws://localhost:${BOSS_CLOCK_PORT}${BOSS_CLOCK_PATH}`,
    );
  });

  wss.on("error", (error) => {
    console.error("Boss clock socket failed", error);
  });
}
