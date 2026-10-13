export const LIVE_CHANNEL = "g2wp-live";
export const LIVE_EVENT = "change";

export const LIVE_TOPICS = ["items", "bosses"] as const;

export type LiveTopic = (typeof LIVE_TOPICS)[number];

/** Optional row patch so open boards can merge without a full refetch. */
export type LivePayload = {
  topic: LiveTopic;
  boss?: {
    id: string;
    cityId: string;
    cityName: string;
    serverId: string;
    serverName: string;
    typeServerId: string;
    type: string;
    hour: number | null;
    minute: number | null;
    second: number | null;
    boardLane: string | null;
    createBy: string;
    updateBy: string | null;
    createdAt: string;
    updatedAt: string;
  };
  removedId?: string;
};

export function isLiveTopic(value: unknown): value is LiveTopic {
  return value === "items" || value === "bosses";
}

export function readLivePayload(value: unknown): LivePayload | null {
  if (!value || typeof value !== "object") return null;
  const topic = (value as { topic?: unknown }).topic;
  if (!isLiveTopic(topic)) return null;
  const removedId = (value as { removedId?: unknown }).removedId;
  const boss = (value as { boss?: unknown }).boss;
  return {
    topic,
    removedId: typeof removedId === "string" ? removedId : undefined,
    boss:
      boss && typeof boss === "object" && typeof (boss as { id?: unknown }).id === "string"
        ? (boss as LivePayload["boss"])
        : undefined,
  };
}
