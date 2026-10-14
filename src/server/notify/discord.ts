import type { BossReadyNotice, NotifyChannel } from "@/server/notify/types";

/** Normalize env (Render sometimes wraps values in quotes). */
function webhookUrl(): string {
  const raw =
    process.env.DISCORD_WEBHOOK_URL?.trim() ||
    process.env.DISCORD_BOSS_WEBHOOK_URL?.trim() ||
    "";
  return raw.replace(/^['"]|['"]$/g, "").trim();
}

function isDiscordWebhook(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const okHost =
      host === "discord.com" ||
      host === "discordapp.com" ||
      host.endsWith(".discord.com") ||
      host.endsWith(".discordapp.com");
    return okHost && parsed.pathname.includes("/api/webhooks/");
  } catch {
    return false;
  }
}

/** Escape Discord markdown special characters in plain fields. */
function escapeMd(value: string): string {
  return value.replace(/([\\*_`~|])/g, "\\$1");
}

/**
 * Discord collapses plain blank lines — keep a zero-width space so spacing
 * matches Telegram's airy bubbles, then a light rule under each notice.
 */
const GAP = "\n\u200B\n";
const RULE = "────────────────────";

/** Same layout as Telegram: title + city + server + type + clock. */
function cardLines(notice: BossReadyNotice): string[] {
  const lines = [
    `**${escapeMd(notice.cityName)}**`,
    `**${escapeMd(notice.serverName)}**`,
    `**${escapeMd(notice.typeLabel)}**`,
  ];
  if (notice.clock) lines.push(`\`${escapeMd(notice.clock)}\``);
  return lines;
}

function formatNotice(title: string, notice: BossReadyNotice): string {
  return [title, ...cardLines(notice), RULE].join(GAP);
}

function messageText(notice: BossReadyNotice): string {
  return formatNotice("🟢 **เกิดแล้ว**", notice);
}

function hourSoonText(notice: BossReadyNotice): string {
  return formatNotice("🟡 **อีก 5 นาทีจะครบ 1 ชั่วโมง**", notice);
}

/** Same-channel Discord webhook limit — serialize sends with a small gap. */
const SEND_GAP_MS = 350;
let sendQueue: Promise<void> = Promise.resolve();
let invalidWebhookWarned = false;

function enqueueSend(task: () => Promise<boolean>): Promise<boolean> {
  const run = sendQueue.then(task, task);
  sendQueue = run.then(
    () => new Promise((resolve) => setTimeout(resolve, SEND_GAP_MS)),
    () => new Promise((resolve) => setTimeout(resolve, SEND_GAP_MS)),
  );
  return run;
}

async function postContentNow(content: string): Promise<boolean> {
  const url = webhookUrl();
  if (!url || !isDiscordWebhook(url)) {
    if (url && !invalidWebhookWarned) {
      invalidWebhookWarned = true;
      console.error(
        "discord notify skipped: DISCORD_WEBHOOK_URL is set but not a valid Discord webhook URL",
      );
    }
    return false;
  }

  try {
    // wait=true so Discord returns JSON errors instead of empty 204-only failures.
    const endpoint = url.includes("?")
      ? `${url}&wait=true`
      : `${url}?wait=true`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "BOSS เกิดแล้วจ้า",
        content,
        allowed_mentions: { parse: [] },
      }),
      signal: AbortSignal.timeout(8_000),
    });

    if (response.ok || response.status === 204) return true;

    if (response.status === 429) {
      const body = (await response.json().catch(() => null)) as {
        retry_after?: unknown;
      } | null;
      const retryAfter =
        typeof body?.retry_after === "number"
          ? body.retry_after
          : Number(response.headers.get("retry-after") ?? 1);
      const waitMs = Math.min(
        5_000,
        Math.max(350, Math.ceil((Number.isFinite(retryAfter) ? retryAfter : 1) * 1000)),
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      const retry = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "BOSS เกิดแล้วจ้า",
          content,
          allowed_mentions: { parse: [] },
        }),
        signal: AbortSignal.timeout(8_000),
      });
      if (retry.ok || retry.status === 204) return true;
      console.error("discord notify failed after 429 retry", retry.status);
      return false;
    }

    const body = await response.text().catch(() => "");
    console.error(
      "discord notify failed",
      response.status,
      body.slice(0, 200),
    );
    return false;
  } catch (error) {
    console.error(
      "discord notify failed",
      error instanceof Error ? error.message : "error",
    );
    return false;
  }
}

function postContent(content: string): Promise<boolean> {
  return enqueueSend(() => postContentNow(content));
}

export const discordChannel: NotifyChannel = {
  id: "discord",
  enabled() {
    return webhookUrl() !== "";
  },
  async available() {
    return isDiscordWebhook(webhookUrl());
  },
  sendBossReady(notice) {
    return postContent(messageText(notice));
  },
  sendBossHourSoon(notice) {
    return postContent(hourSoonText(notice));
  },
};
