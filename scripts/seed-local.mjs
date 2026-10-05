/**
 * Dev seed for local Docker Postgres.
 * 30 rows per table, 60 players. Re-running replaces previous seed rows.
 *
 *   node --env-file=.env scripts/seed-local.mjs
 */

import pg from "pg";

const COUNT = 30;
const PLAYER_COUNT = 60;
const ACTOR = "test@gmail.com";

const GROUP_NAMES = [
  "หน่วย Alpha",
  "หน่วย Bravo",
  "หน่วย Charlie",
  "หน่วย Delta",
  "หน่วย Echo",
  "หน่วย Foxtrot",
  "หน่วย Scout",
  "หน่วย Medic",
  "หน่วย Engineer",
  "หน่วย Sniper",
  "หน่วย Assault",
  "หน่วย Support",
  "หน่วย Recon",
  "หน่วย Guard",
  "หน่วย Raid",
  "หน่วย Night",
  "หน่วย Dawn",
  "หน่วย Harbor",
  "หน่วย Ridge",
  "หน่วย Valley",
  "หน่วย North",
  "หน่วย South",
  "หน่วย East",
  "หน่วย West",
  "หน่วย Iron",
  "หน่วย Storm",
  "หน่วย Ember",
  "หน่วย Frost",
  "หน่วย Shadow",
  "หน่วย Vanguard",
];

const MEMBER_NAMES = [
  "สมชาย ใจดี",
  "สมหญิง รักษ์ดี",
  "อนันต์ กล้าหาญ",
  "พิมพ์ใจ สดใส",
  "วรพล นที",
  "กมลชนก ศรีสุข",
  "ธนกร พงษ์ไทย",
  "ณัฐวุฒิ แสงทอง",
  "ศิริพร บุญมา",
  "ภาณุวัฒน์ ชัยชนะ",
  "อรุณี ดวงจันทร์",
  "ชิษณุพงศ์ มั่นคง",
  "ปิยะดา วงศ์สุวรรณ",
  "ภูมิใจ ตั้งตรง",
  "ณิชา ภูวดล",
  "ศุภชัย อินทร",
  "มณีรัตน์ คำดี",
  "จักรพงษ์ วิริยะ",
  "หทัยรัตน์ สายชม",
  "รวิพล เกษตร",
  "ขวัญข้าว เมืองไทย",
  "เดชา ภักดี",
  "สุภาวดี รุ่งเรือง",
  "อิทธิพล นาคินทร์",
  "เบญจมาศ ทองคำ",
  "พีรพัฒน์ สุขสันต์",
  "กัญญารัตน์ พูลผล",
  "อดิศร ทะเล",
  "วรรณา ป่าไผ่",
  "ธีรศักดิ์ ขุนพล",
];

const ITEM_NAMES = [
  "เสื้อเกราะ",
  "หมวกเหล็ก",
  "กระสุน 5.56",
  "กระสุน 7.62",
  "ชุดปฐมพยาบาล",
  "ผ้าพันแผล",
  "น้ำดื่ม",
  "อาหารกระป๋อง",
  "ไฟฉาย",
  "วิทยุสื่อสาร",
  "เชือกไนลอน",
  "มีดพก",
  "ขวาน",
  "ถังน้ำมัน",
  "แบตเตอรี่",
  "เครื่องมือช่าง",
  "หน้ากากกันแก๊ส",
  "รองเท้าบูท",
  "ถุงมือ",
  "ผ้าคลุม",
  "แผนที่",
  "เข็มทิศ",
  "สัญญาณพลุ",
  "กับดัก",
  "ลวดหนาม",
  "ไม้กระดาน",
  "ตะปู",
  "เทปกาว",
  "ยาแก้ปวด",
  "น้ำยาฆ่าเชื้อ",
];

const CITY_NAMES = [
  "เมืองท่า",
  "เมืองเหนือ",
  "เมืองใต้",
  "เมืองตะวันออก",
  "เมืองตะวันตก",
  "ค่ายหน้า",
  "ค่ายหลัง",
  "สะพานเหล็ก",
  "ท่าเรือเก่า",
  "สถานีรถไฟ",
  "โรงพยาบาลร้าง",
  "ตลาดกลาง",
  "คลังอาวุธ",
  "ทุ่งนา",
  "เชิงเขา",
  "ป่าทึบ",
  "ชายหาด",
  "เกาะเล็ก",
  "เขื่อน",
  "เหมือง",
  "โรงงาน",
  "สนามบิน",
  "วัดเก่า",
  "โรงเรียน",
  "หอคอย",
  "อุโมงค์",
  "หมู่บ้าน",
  "ป้อมปราการ",
  "ลานจอดรถ",
  "ศูนย์บัญชาการ",
];

const BEHAVIOR_NOTES = [
  "เข้าเช็คชื่อตรงเวลา",
  "ช่วยเพื่อนเก็บของในเซฟ",
  "ไม่ตอบวิทยุระหว่างภารกิจ",
  "นำทีมเคลียร์พื้นที่เมืองท่า",
  "ฝากของผิดตู้",
  "รายงานศัตรูช้า",
  "ช่วยปฐมพยาบาลเพื่อนร่วมทีม",
  "ออกจากฐานโดยไม่บอกล่วงหน้า",
  "เก็บทรัพยากรครบตามที่สั่ง",
  "ใช้กระสุนเกินโควตา",
  "เฝ้าประตูครบกะ",
  "พาผู้เล่นใหม่เดินแผนที่",
  "ทิ้งของกลางทาง",
  "ประสานหน่วยสอดแนมได้ดี",
  "ทะเลาะในช่องแชท",
  "ซ่อมรถให้หน่วยทันเวลา",
  "ไม่สวมชุดตามที่กำหนด",
  "ยิงครอบคลุมให้หน่วยหน้า",
  "หลับระหว่างเฝ้ายาม",
  "ส่งรายงานประจำวันครบ",
  "แชร์พิกัดบอสให้ทั้งแคลน",
  "เก็บของส่วนตัวปนกับของกองกลาง",
  "นำทางหนีวงล้อมสำเร็จ",
  "พูดจาไม่สุภาพกับสมาชิกใหม่",
  "ช่วยขนของขึ้นฐาน",
  "ขาดการเช็คชื่อโดยไม่แจ้ง",
  "จัดคิวเข้าเมืองได้เรียบร้อย",
  "ใช้อาวุธของกองโดยไม่ขอ",
  "อยู่กับทีมจนจบภารกิจ",
  "แจ้งบั๊กแมพให้แอดมิน",
];

function id(prefix, index) {
  return `seed_${prefix}_${String(index + 1).padStart(2, "0")}`;
}

function dateOnly(offsetDays) {
  const date = new Date(Date.UTC(2026, 8, 1 + offsetDays));
  return date.toISOString().slice(0, 10);
}

function atHour(offsetDays, hour) {
  return new Date(Date.UTC(2026, 8, 1 + offsetDays, hour, 0, 0));
}

const NOW = new Date();

async function insertMany(client, table, columns, rows) {
  if (rows.length === 0) return;
  const width = columns.length;
  const values = [];
  const placeholders = rows.map((row, rowIndex) => {
    const cells = row.map((value, colIndex) => {
      values.push(value);
      return `$${rowIndex * width + colIndex + 1}`;
    });
    return `(${cells.join(", ")})`;
  });
  await client.query(
    `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${placeholders.join(", ")}`,
    values,
  );
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    await client.query("BEGIN");
    await client.query(`
      TRUNCATE TABLE
        behavior_reports,
        check_event_members,
        behaviors,
        safes,
        check_events,
        set_dates,
        players,
        members,
        groups,
        items,
        bosses,
        cities,
        servers,
        type_servers
      RESTART IDENTITY CASCADE
    `);

    await insertMany(
      client,
      "groups",
      ["id", "group_name", "is_use", "updated_at"],
      GROUP_NAMES.map((name, i) => [id("group", i), name, i < 27, NOW]),
    );

    await insertMany(
      client,
      "members",
      ["id", "name", "age", "facebook_url", "is_live", "group_id", "create_by", "updated_at"],
      MEMBER_NAMES.map((name, i) => [
        id("member", i),
        name,
        18 + (i % 23),
        i % 3 === 0 ? `https://facebook.com/g2wp.member.${i + 1}` : null,
        i < 26,
        i < 27 ? id("group", i) : null,
        ACTOR,
        NOW,
      ]),
    );

    const playerRows = [];
    for (let i = 0; i < PLAYER_COUNT; i += 1) {
      const memberIndex = i % COUNT;
      const slot = Math.floor(i / COUNT) + 1;
      playerRows.push([
        id("player", i),
        `${MEMBER_NAMES[memberIndex].split(" ")[0]}${slot}`,
        id("member", memberIndex),
        ACTOR,
        NOW,
      ]);
    }
    await insertMany(
      client,
      "players",
      ["id", "name", "member_id", "create_by", "updated_at"],
      playerRows,
    );

    await insertMany(
      client,
      "behaviors",
      ["id", "description", "evidence_url", "create_by", "member_id", "player_id", "updated_at"],
      BEHAVIOR_NOTES.map((note, i) => [
        id("behavior", i),
        note,
        i % 2 === 0 ? `https://example.com/evidence/${i + 1}` : null,
        ACTOR,
        id("member", i),
        id("player", i),
        NOW,
      ]),
    );

    const reportRows = [];
    for (let i = 0; i < COUNT; i += 1) {
      const status = i < 10 ? "approved" : i < 20 ? "pending" : "cancelled";
      const decided = status !== "pending";
      reportRows.push([
        id("report", i),
        id("member", i),
        id("player", i),
        BEHAVIOR_NOTES[i],
        i % 2 === 0 ? `https://example.com/report/${i + 1}` : null,
        status,
        MEMBER_NAMES[i],
        `${MEMBER_NAMES[i].split(" ")[0]}1`,
        decided ? ACTOR : null,
        decided ? atHour(i, 12) : null,
        decided ? (status === "approved" ? "อนุมัติเข้าระบบ" : "ยกเลิกรายงาน") : null,
        status === "approved" ? id("behavior", i) : null,
        NOW,
      ]);
    }
    await insertMany(
      client,
      "behavior_reports",
      [
        "id",
        "member_id",
        "player_id",
        "message",
        "evidence_url",
        "status",
        "member_name_snap",
        "player_name_snap",
        "decided_by",
        "decided_at",
        "decision_note",
        "behavior_id",
        "updated_at",
      ],
      reportRows,
    );

    await insertMany(
      client,
      "set_dates",
      ["id", "date", "create_by", "updated_at"],
      Array.from({ length: COUNT }, (_, i) => [id("date", i), dateOnly(i), ACTOR, NOW]),
    );

    const eventRows = [];
    for (let i = 0; i < COUNT; i += 1) {
      const status = i < 10 ? "draft" : i === 10 ? "open" : "closed";
      eventRows.push([
        id("event", i),
        id("date", i),
        `เช็คชื่อ ${dateOnly(i)}`,
        status,
        ACTOR,
        status === "draft" ? null : atHour(i, 1),
        status === "closed" ? atHour(i, 8) : null,
        NOW,
      ]);
    }
    await insertMany(
      client,
      "check_events",
      ["id", "set_date_id", "title", "status", "create_by", "opened_at", "closed_at", "updated_at"],
      eventRows,
    );

    const attendanceRows = [];
    for (let i = 0; i < COUNT; i += 1) {
      const status = i % 3 === 0 ? "approved" : i % 3 === 1 ? "pending" : "cancelled";
      const decided = status !== "pending";
      attendanceRows.push([
        id("attendance", i),
        id("event", i),
        id("member", i),
        MEMBER_NAMES[i],
        status,
        decided ? ACTOR : null,
        decided ? atHour(i, 3) : null,
        NOW,
      ]);
    }
    await insertMany(
      client,
      "check_event_members",
      [
        "id",
        "check_event_id",
        "member_id",
        "member_name_snapshot",
        "status",
        "decided_by",
        "decided_at",
        "updated_at",
      ],
      attendanceRows,
    );

    await insertMany(
      client,
      "items",
      ["id", "name", "updated_at"],
      ITEM_NAMES.map((name, i) => [id("item", i), name, NOW]),
    );

    await insertMany(
      client,
      "safes",
      ["id", "item_id", "quantity", "description", "deposit_item_at", "member_id", "updated_at"],
      ITEM_NAMES.map((name, i) => [
        id("safe", i),
        id("item", i),
        (i % 12) + 1,
        `ฝาก${name}`,
        atHour(i, 4),
        id("member", i),
        NOW,
      ]),
    );

    await insertMany(
      client,
      "servers",
      ["id", "server_name", "is_use"],
      Array.from({ length: COUNT }, (_, i) => [
        id("server", i),
        `WarzTH-${String(i + 1).padStart(2, "0")}`,
        i < 27,
      ]),
    );

    await insertMany(
      client,
      "cities",
      ["id", "city_name", "is_use"],
      CITY_NAMES.map((name, i) => [id("city", i), name, i < 27]),
    );

    await insertMany(
      client,
      "type_servers",
      ["id", "type", "is_use"],
      Array.from({ length: COUNT }, (_, i) => [
        id("type", i),
        i % 2 === 0 ? "premium" : "official",
        i < 28,
      ]),
    );

    await insertMany(
      client,
      "bosses",
      ["id", "city_id", "server_id", "type_server_id", "hour", "minute", "create_by", "update_by", "updated_at"],
      Array.from({ length: COUNT }, (_, i) => [
        id("boss", i),
        id("city", i),
        id("server", i),
        id("type", i),
        (8 + (i % 12)) % 24,
        (i * 7) % 60,
        ACTOR,
        i % 4 === 0 ? ACTOR : null,
        NOW,
      ]),
    );

    await client.query(`
      INSERT INTO teams (id, name, sort_order, is_use, updated_at)
      SELECT seed.id, seed.name, seed.sort_order, true, $1
      FROM (
        VALUES
          ('seed_team_01'::text, 'ทีม 1'::text, 1),
          ('seed_team_02'::text, 'ทีม 2'::text, 2),
          ('seed_team_03'::text, 'ทีม 3'::text, 3)
      ) AS seed(id, name, sort_order)
      WHERE NOT EXISTS (
        SELECT 1 FROM teams WHERE teams.name = seed.name
      )
    `, [NOW]);

    await client.query("COMMIT");

    const counts = await client.query(`
      SELECT 'groups' AS t, count(*)::int AS n FROM groups
      UNION ALL SELECT 'members', count(*)::int FROM members
      UNION ALL SELECT 'players', count(*)::int FROM players
      UNION ALL SELECT 'behaviors', count(*)::int FROM behaviors
      UNION ALL SELECT 'behavior_reports', count(*)::int FROM behavior_reports
      UNION ALL SELECT 'set_dates', count(*)::int FROM set_dates
      UNION ALL SELECT 'check_events', count(*)::int FROM check_events
      UNION ALL SELECT 'check_event_members', count(*)::int FROM check_event_members
      UNION ALL SELECT 'items', count(*)::int FROM items
      UNION ALL SELECT 'safes', count(*)::int FROM safes
      UNION ALL SELECT 'servers', count(*)::int FROM servers
      UNION ALL SELECT 'cities', count(*)::int FROM cities
      UNION ALL SELECT 'type_servers', count(*)::int FROM type_servers
      UNION ALL SELECT 'bosses', count(*)::int FROM bosses
      ORDER BY t
    `);
    for (const row of counts.rows) {
      console.log(`${row.t}\t${row.n}`);
    }
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
