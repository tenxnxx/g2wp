import { NextResponse } from "next/server";
import { actorLabel, requireAuth } from "@/lib/api-auth";
import {
  normalizeHttpUrl,
  prismaErrorResponse,
  readJsonBody,
} from "@/lib/api-errors";
import { prisma } from "@/lib/db";
import { parseGroupIdInput, serializeMember } from "@/lib/members";
import {
  buildPaginationMeta,
  getSkip,
  parsePaginationParams,
  parseSearchQuery,
} from "@/lib/pagination";

const groupSelect = { id: true, groupName: true } as const;

async function resolveAssignableGroupId(
  groupId: string | null,
): Promise<{ ok: true; groupId: string | null } | { ok: false; error: string }> {
  if (!groupId) return { ok: true, groupId: null };
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { id: true, isUse: true },
  });
  if (!group) {
    return { ok: false, error: "ไม่พบกลุ่มที่เลือก" };
  }
  if (!group.isUse) {
    return { ok: false, error: "กลุ่มนี้ปิดใช้งานแล้ว" };
  }
  return { ok: true, groupId: group.id };
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
    const skip = getSkip(page, limit);
    const search = parseSearchQuery(searchParams);
    const where = search
      ? { name: { contains: search, mode: "insensitive" as const } }
      : undefined;

    const [total, members] = await Promise.all([
      prisma.member.count({ where }),
      prisma.member.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { group: { select: groupSelect } },
      }),
    ]);

    const meta = buildPaginationMeta(total, page, limit);

    return NextResponse.json({
      data: members.map(serializeMember),
      meta,
    });
  } catch (error) {
    console.error("GET /api/members", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const bodyResult = await readJsonBody(request);
    if (bodyResult.error) return bodyResult.error;
    const body = bodyResult.data as Record<string, unknown>;

    const name = String(body.name ?? "").trim();
    const age = Number(body.age);
    const facebookResult = normalizeHttpUrl(body.facebookUrl);
    if (!facebookResult.ok) {
      return NextResponse.json(
        { error: facebookResult.error },
        { status: 400 },
      );
    }
    const facebookUrl = facebookResult.url;
    const isLive = typeof body.isLive === "boolean" ? body.isLive : true;
    const createBy = actorLabel(auth.user);

    if (!name) {
      return NextResponse.json({ error: "กรอกชื่อสมาชิก" }, { status: 400 });
    }
    if (name.length > 100) {
      return NextResponse.json(
        { error: "ชื่อสมาชิกยาวเกินไป (สูงสุด 100 ตัวอักษร)" },
        { status: 400 },
      );
    }
    if (!Number.isInteger(age) || age < 0 || age > 150) {
      return NextResponse.json(
        { error: "อายุต้องเป็นจำนวนเต็มระหว่าง 0–150 ปี" },
        { status: 400 },
      );
    }

    const groupParsed = parseGroupIdInput(body);
    if (!groupParsed.ok) {
      return NextResponse.json({ error: groupParsed.error }, { status: 400 });
    }
    const groupResolved = await resolveAssignableGroupId(
      groupParsed.present ? groupParsed.groupId : null,
    );
    if (!groupResolved.ok) {
      return NextResponse.json({ error: groupResolved.error }, { status: 400 });
    }

    const member = await prisma.member.create({
      data: {
        name,
        age,
        facebookUrl,
        isLive,
        createBy,
        groupId: groupResolved.groupId,
      },
      include: { group: { select: groupSelect } },
    });

    return NextResponse.json(serializeMember(member), { status: 201 });
  } catch (error) {
    return prismaErrorResponse(error, "Failed to create member");
  }
}
