/** A boss that just moved from รอเกิด to เกิดแล้ว on its own. */
export type BossReadyNotice = {
  cityName: string;
  serverName: string;
  typeLabel: string;
  clock: string | null;
};

/**
 * One outbound channel. Telegram is wired now.
 * A Discord channel later implements the same two methods and is added in index.ts.
 */
export type NotifyChannel = {
  id: string;
  enabled(): boolean;
  /** False when this channel has nowhere to deliver yet. */
  available(): Promise<boolean>;
  /** True when the green ready notice was delivered. */
  sendBossReady(notice: BossReadyNotice): Promise<boolean>;
  /** True when the yellow five-minute warning was delivered. */
  sendBossHourSoon(notice: BossReadyNotice): Promise<boolean>;
};
