import "dotenv/config";

const url = process.env.DISCORD_WEBHOOK_URL?.trim();
if (!url) {
  console.error("FAIL: DISCORD_WEBHOOK_URL missing");
  process.exit(1);
}

const GAP = "\n\u200B\n";
const RULE = "────────────────────";

function escapeMd(value) {
  return value.replace(/([\\*_`~|])/g, "\\$1");
}

function formatNotice(title, notice) {
  const lines = [
    title,
    `**${escapeMd(notice.cityName)}**`,
    `**${escapeMd(notice.serverName)}**`,
    `**${escapeMd(notice.typeLabel)}**`,
  ];
  if (notice.clock) lines.push(`\`${escapeMd(notice.clock)}\``);
  lines.push(RULE);
  return lines.join(GAP);
}

const notice = {
  cityName: "แอร์พอต",
  serverName: "47",
  typeLabel: "Premium",
  clock: "07:35:00",
};

const messages = [
  formatNotice("🟢 **เกิดแล้ว**", notice),
  formatNotice("🟡 **อีก 5 นาทีจะครบ 1 ชั่วโมง**", notice),
];

async function send(content) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "BOSS เกิดแล้วจ้า",
      content,
      allowed_mentions: { parse: [] },
    }),
    signal: AbortSignal.timeout(8_000),
  });
  const ok = response.ok || response.status === 204;
  console.log(ok ? `OK ${response.status}` : `FAIL ${response.status}`);
  return ok;
}

let allOk = true;
for (const content of messages) {
  if (!(await send(content))) allOk = false;
  await new Promise((resolve) => setTimeout(resolve, 400));
}
process.exit(allOk ? 0 : 1);
