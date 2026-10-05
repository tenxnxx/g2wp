export const LIVE_CHANNEL = "g2wp-live";
export const LIVE_EVENT = "change";

export const LIVE_TOPICS = ["items", "bosses"] as const;

export type LiveTopic = (typeof LIVE_TOPICS)[number];

export function isLiveTopic(value: unknown): value is LiveTopic {
  return value === "items" || value === "bosses";
}
