"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { subscribeLive } from "@/components/live/live-channel";
import type { LiveTopic } from "@/lib/live";

/** Refetch the open list when another session changes it. */
export function useLiveTopic(topic: LiveTopic) {
  const queryClient = useQueryClient();

  useEffect(() => {
    let timer = 0;
    const unsubscribe = subscribeLive((next) => {
      if (next !== topic) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: [topic] });
      }, 200);
    });
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [queryClient, topic]);
}
