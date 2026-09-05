import { NextResponse } from "next/server";
import { actorLabel, requireAuth } from "@/lib/api-auth";
import {
  normalizeHttpUrl,
  prismaErrorResponse,
  readJsonBody,
} from "@/lib/api-errors";
import { prisma } from "@/lib/db";
import {
  buildPaginationMeta,
  getSkip,
  parsePaginationParams,
} from "@/lib/pagination";

function serializeMember(member: {
  id: string;
  name: string;
  age: number;
  facebookUrl: string | null;
  isLive: boolean;
  createBy: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: member.id,
    name: member.name,
    age: member.age,
    facebookUrl: member.facebookUrl,
    isLive: member.isLive,
    createBy: member.createBy,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
  };
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
    const skip = getSkip(page, limit);
    const search = searchParams.get("q")?.trim() || undefined;
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

    if (!name || !Number.isInteger(age) || age < 0 || age > 150) {
      return NextResponse.json(
        { error: "name and valid age are required" },
        { status: 400 },
      );
    }

    const member = await prisma.member.create({
      data: { name, age, facebookUrl, isLive, createBy },
    });

    return NextResponse.json(serializeMember(member), { status: 201 });
  } catch (error) {
    return prismaErrorResponse(error, "Failed to create member");
  }
}
