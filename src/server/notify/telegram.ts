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

function messageText(notice: BossReadyNotice): string {
  const city = escapeHtml(notice.cityName);
  const server = escapeHtml(notice.serverName);
  const type = escapeHtml(notice.typeLabel);
  const lines = [
    "🟢 <b>เกิดแล้ว</b>",
    `<b>${city}</b>`,
    server,
    type,
  ];
  if (notice.clock) lines.push(`<code>${escapeHtml(notice.clock)}</code>`);
  return lines.join("\n\n");
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
  async sendBossReady(notice) {
    const token = botToken();
    if (!token) return;

    try {
      const chatId = await resolveChatId(token);
      if (!chatId) {
        console.error("telegram notify skipped: no chat");
        return;
      }
      const response = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: messageText(notice),
            parse_mode: "HTML",
            disable_web_page_preview: true,
          }),
          signal: AbortSignal.timeout(8_000),
        },
      );

      if (response.ok) return;

      const body = (await response.json().catch(() => null)) as {
        description?: unknown;
      } | null;
      const description =
        body && typeof body.description === "string" ? body.description : "";
      console.error("telegram notify failed", response.status, description);
    } catch {
      console.error("telegram notify failed");
    }
  },
};
