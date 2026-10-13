"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { subscribeLive, type LivePayload } from "@/components/live/live-channel";
import type { LiveTopic } from "@/lib/live";

type UseLiveTopicOptions = {
  /** When true, live invalidation waits until pause clears (e.g. mid-drag). */
  pause?: () => boolean;
  debounceMs?: number;
  /**
   * Return true when the payload was applied locally (skip full refetch).
   * Used for single-row boss patches.
   */
  onPayload?: (payload: LivePayload) => boolean;
};

/** Refetch the open list when another session changes it. */
export function useLiveTopic(topic: LiveTopic, options?: UseLiveTopicOptions) {
  const queryClient = useQueryClient();
  const pauseRef = useRef(options?.pause);
  const onPayloadRef = useRef(options?.onPayload);
  const debounceMs = options?.debounceMs ?? 400;

  useEffect(() => {
    pauseRef.current = options?.pause;
    onPayloadRef.current = options?.onPayload;
  });

  useEffect(() => {
    let timer = 0;
    let queued = false;

    const flush = () => {
      timer = 0;
      if (pauseRef.current?.()) {
        queued = true;
        timer = window.setTimeout(flush, debounceMs);
        return;
      }
      queued = false;
      void queryClient.invalidateQueries({ queryKey: [topic] });
    };

    const unsubscribe = subscribeLive((payload) => {
      if (payload.topic !== topic) return;
      if (onPayloadRef.current?.(payload)) return;
      queued = true;
      window.clearTimeout(timer);
      timer = window.setTimeout(flush, debounceMs);
    });

    return () => {
      window.clearTimeout(timer);
      unsubscribe();
      if (queued && !pauseRef.current?.()) {
        void queryClient.invalidateQueries({ queryKey: [topic] });
      }
    };
  }, [debounceMs, queryClient, topic]);
}
