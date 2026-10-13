import type { BossReadyNotice, NotifyChannel } from "@/server/notify/types";

let resolvedChatId = "";

function botToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
}

async function resolveChatId(token: string): Promise<string | null> {
  const fromEnv = process.env.TELEGRAM_CHAT_ID?.trim() ?? "";
  if (fromEnv) return fromEnv;
  if (resolvedChatId) return resolvedChatId;

  const response = await fetch(
    `https://api.telegram.org/bot${token}/getUpdates?timeout=0&allowed_updates=${encodeURIComponent(JSON.stringify(["message"]))}`,
    { signal: AbortSignal.timeout(8_000) },
  );
  if (!response.ok) return null;
  const body = (await response.json().catch(() => null)) as {
    ok?: boolean;
    result?: { message?: { chat?: { id?: number; type?: string } } }[];
  } | null;
  const chats = (body?.result ?? []).flatMap((update) => {
    const chat = update.message?.chat;
    return chat?.id == null ? [] : [{ id: String(chat.id), type: chat.type ?? "" }];
  });
  const chat = chats.findLast((item) => item.type === "private") ?? chats.at(-1);
  if (!chat) return null;
  resolvedChatId = chat.id;
  console.log("telegram chat ready", chat.id);
  return chat.id;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function cardLines(notice: BossReadyNotice): string[] {
  const lines = [
    `<b>${escapeHtml(notice.cityName)}</b>`,
    `<b>${escapeHtml(notice.serverName)}</b>`,
    `<b>${escapeHtml(notice.typeLabel)}</b>`,
  ];
  if (notice.clock) lines.push(`<code>${escapeHtml(notice.clock)}</code>`);
  return lines;
}

function messageText(notice: BossReadyNotice): string {
  return ["🟢 <b>เกิดแล้ว</b>", ...cardLines(notice)].join("\n\n");
}

function hourSoonText(notice: BossReadyNotice): string {
  return ["🟡 <b>อีก 5 นาทีจะครบ 1 ชั่วโมง</b>", ...cardLines(notice)].join("\n\n");
}

/** Same-chat Telegram limit is ~1 msg/s — serialize sends with a small gap. */
const SEND_GAP_MS = 350;
let sendQueue: Promise<void> = Promise.resolve();

function enqueueSend(task: () => Promise<boolean>): Promise<boolean> {
  const run = sendQueue.then(task, task);
  sendQueue = run.then(
    () => new Promise((resolve) => setTimeout(resolve, SEND_GAP_MS)),
    () => new Promise((resolve) => setTimeout(resolve, SEND_GAP_MS)),
  );
  return run;
}

async function postHtmlNow(text: string): Promise<boolean> {
  const token = botToken();
  if (!token) return false;

  try {
    const chatId = await resolveChatId(token);
    if (!chatId) {
      console.error("telegram notify skipped: no chat");
      return false;
    }
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(8_000),
      },
    );

    if (response.ok) return true;

    const body = (await response.json().catch(() => null)) as {
      description?: unknown;
    } | null;
    const description =
      body && typeof body.description === "string" ? body.description : "";
    console.error("telegram notify failed", response.status, description);
    return false;
  } catch {
    console.error("telegram notify failed");
    return false;
  }
}

async function postHtml(text: string): Promise<boolean> {
  return enqueueSend(() => postHtmlNow(text));
}

export const telegramChannel: NotifyChannel = {
  id: "telegram",
  enabled() {
    return botToken() !== "";
  },
  async available() {
    const token = botToken();
    if (!token) return false;
    try {
      return (await resolveChatId(token)) !== null;
    } catch {
      return false;
    }
  },
  sendBossReady(notice) {
    return postHtml(messageText(notice));
  },
  sendBossHourSoon(notice) {
    return postHtml(hourSoonText(notice));
  },
};
