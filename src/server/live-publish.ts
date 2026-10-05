import { LIVE_CHANNEL, LIVE_EVENT, type LiveTopic } from "@/lib/live";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

/** Tell open /items and /bosses pages that a list changed. One HTTP call, no row data. */
export async function publishLiveTopics(topics: readonly LiveTopic[]): Promise<void> {
  const unique = [...new Set(topics)];
  if (unique.length === 0) return;

  try {
    const response = await fetch(`${getSupabaseUrl()}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        apikey: getSupabaseAnonKey(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: unique.map((topic) => ({
          topic: LIVE_CHANNEL,
          event: LIVE_EVENT,
          private: false,
          payload: { topic },
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
