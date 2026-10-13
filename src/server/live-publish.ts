import {
  LIVE_CHANNEL,
  LIVE_EVENT,
  type LivePayload,
  type LiveTopic,
} from "@/lib/live";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

async function broadcast(payloads: LivePayload[]): Promise<void> {
  if (payloads.length === 0) return;

  try {
    const response = await fetch(`${getSupabaseUrl()}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        apikey: getSupabaseAnonKey(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: payloads.map((payload) => ({
          topic: LIVE_CHANNEL,
          event: LIVE_EVENT,
          private: false,
          payload,
        })),
      }),
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) {
      console.error("live publish", response.status);
    }
  } catch (error) {
    console.error("live publish", error instanceof Error ? error.message : error);
  }
}

/** Tell open list pages that a topic changed (full refetch). */
export async function publishLiveTopics(topics: readonly LiveTopic[]): Promise<void> {
  const unique = [...new Set(topics)];
  await broadcast(unique.map((topic) => ({ topic })));
}

/** Push one boss row so open boards can merge without refetching the list. */
export async function publishLiveBossPatch(boss: NonNullable<LivePayload["boss"]>): Promise<void> {
  await broadcast([{ topic: "bosses", boss }]);
}

export async function publishLiveBossRemoved(removedId: string): Promise<void> {
  await broadcast([{ topic: "bosses", removedId }]);
}
