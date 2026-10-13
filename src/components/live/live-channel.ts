"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  LIVE_CHANNEL,
  LIVE_EVENT,
  readLivePayload,
  type LivePayload,
  type LiveTopic,
} from "@/lib/live";

type LiveListener = (payload: LivePayload) => void;

const listeners = new Set<LiveListener>();
let channel: RealtimeChannel | null = null;
let joined = false;

function emit(payload: LivePayload) {
  for (const listener of listeners) listener(payload);
}

function ensureStarted() {
  if (listeners.size !== 1 || channel) return;
  joined = false;
  const supabase = createClient();
  channel = supabase
    .channel(LIVE_CHANNEL, { config: { private: false } })
    .on("broadcast", { event: LIVE_EVENT }, ({ payload }) => {
      const next = readLivePayload(payload);
      if (next) emit(next);
    })
    .subscribe((status) => {
      if (status !== "SUBSCRIBED") return;
      if (!joined) {
        joined = true;
        return;
      }
      emit({ topic: "items" });
      emit({ topic: "bosses" });
    });
}

function ensureStopped() {
  if (listeners.size !== 0 || !channel) return;
  const current = channel;
  channel = null;
  joined = false;
  void createClient().removeChannel(current);
}

/** One shared Supabase channel for every open list page. */
export function subscribeLive(listener: LiveListener) {
  listeners.add(listener);
  ensureStarted();
  return () => {
    listeners.delete(listener);
    ensureStopped();
  };
}

export type { LivePayload, LiveTopic };
