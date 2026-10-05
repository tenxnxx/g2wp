"use client";

import { useEffect, useState } from "react";
import { BOSS_CLOCK_PATH, BOSS_CLOCK_PORT } from "@/lib/boss-clock";

type ClockListener = (now: number, connected: boolean) => void;

let socket: WebSocket | null = null;
let retryTimer = 0;
let fallbackTimer = 0;
let now = 0;
let connected = false;
let generation = 0;

const listeners = new Set<ClockListener>();

function emit() {
  for (const listener of listeners) listener(now, connected);
}

function stopTimers() {
  window.clearTimeout(retryTimer);
  window.clearInterval(fallbackTimer);
  retryTimer = 0;
  fallbackTimer = 0;
}

function startFallback(gen: number) {
  window.clearInterval(fallbackTimer);
  fallbackTimer = window.setInterval(() => {
    if (gen !== generation) return;
    now = Date.now();
    emit();
  }, 1000);
}

function connect(gen: number) {
  if (gen !== generation) return;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const next = new WebSocket(
    `${protocol}//${window.location.hostname}:${BOSS_CLOCK_PORT}${BOSS_CLOCK_PATH}`,
  );
  socket = next;
  next.onopen = () => {
    if (gen !== generation) return;
    connected = true;
    window.clearInterval(fallbackTimer);
    emit();
  };
  next.onmessage = (event) => {
    if (gen !== generation) return;
    try {
      const data = JSON.parse(String(event.data)) as { now?: unknown };
      if (typeof data.now === "number") {
        now = data.now;
        emit();
      }
    } catch {
      // Ignore a malformed frame and wait for the next tick.
    }
  };
  next.onclose = () => {
    if (gen !== generation) return;
    connected = false;
    emit();
    startFallback(gen);
    retryTimer = window.setTimeout(() => connect(gen), 1500);
  };
  next.onerror = () => {
    next.close();
  };
}

function ensureStarted() {
  if (listeners.size !== 1) return;
  generation += 1;
  const gen = generation;
  now = Date.now();
  connected = false;
  emit();
  startFallback(gen);
  connect(gen);
}

function ensureStopped() {
  if (listeners.size !== 0) return;
  generation += 1;
  stopTimers();
  socket?.close();
  socket = null;
  connected = false;
}

/** One shared socket. Listeners that ignore unchanged values do not re-render the board. */
export function subscribeBossClock(listener: ClockListener) {
  listeners.add(listener);
  if (now > 0) listener(now, connected);
  ensureStarted();
  return () => {
    listeners.delete(listener);
    ensureStopped();
  };
}

export function useBossClock(): { now: number; connected: boolean } {
  const [state, setState] = useState(() => ({ now: Date.now(), connected: false }));

  useEffect(() => {
    return subscribeBossClock((nextNow, nextConnected) => {
      setState((prev) =>
        prev.now === nextNow && prev.connected === nextConnected
          ? prev
          : { now: nextNow, connected: nextConnected },
      );
    });
  }, []);

  return state;
}
