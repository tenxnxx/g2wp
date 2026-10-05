import { WebSocketServer, type WebSocket } from "ws";
import { BOSS_CLOCK_PATH, BOSS_CLOCK_PORT } from "@/lib/boss-clock";

type ClockGlobal = typeof globalThis & {
  bossClockStarted?: boolean;
  liveClients?: Set<WebSocket>;
};

function liveClients() {
  const g = globalThis as ClockGlobal;
  if (!g.liveClients) g.liveClients = new Set();
  return g.liveClients;
}

function sendAll(payload: string) {
  for (const socket of liveClients()) {
    if (socket.readyState === socket.OPEN) socket.send(payload);
  }
}

/** Broadcasts the server clock once a second. List changes go through Supabase. */
export function startBossClockSocket() {
  const g = globalThis as ClockGlobal;
  if (g.bossClockStarted) return;
  g.bossClockStarted = true;

  const clients = liveClients();
  const wss = new WebSocketServer({ port: BOSS_CLOCK_PORT, path: BOSS_CLOCK_PATH });

  wss.on("connection", (socket) => {
    clients.add(socket);
    socket.send(JSON.stringify({ now: Date.now() }));
    socket.on("close", () => clients.delete(socket));
    socket.on("error", () => clients.delete(socket));
  });

  const timer = setInterval(() => {
    sendAll(JSON.stringify({ now: Date.now() }));
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
