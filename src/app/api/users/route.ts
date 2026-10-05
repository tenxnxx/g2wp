import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prismaErrorResponse, readJsonBody } from "@/lib/api-errors";
import { cacheKey, CACHE_TTL, invalidateResource, remember } from "@/lib/cache";
import { createManagedUser, readNewUserFields, serializeAppUser } from "@/lib/app-users";
import { prisma } from "@/lib/db";
import { createAuthAccount } from "@/lib/supabase/admin";
import {
  buildPaginationMeta,
  getSkip,
  parsePaginationParams,
  parseSearchQuery,
} from "@/lib/pagination";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
    const skip = getSkip(page, limit);
    const search = parseSearchQuery(searchParams);

    const where: Prisma.AppUserWhereInput = search
      ? { email: { contains: search, mode: "insensitive" } }
      : {};

    const body = await remember(
      cacheKey("/api/users", searchParams, auth.user.id),
      ["users"],
      CACHE_TTL.list,
      async () => {
        const [total, rows] = await Promise.all([
          prisma.appUser.count({ where }),
          prisma.appUser.findMany({
            where,
            orderBy: [{ role: "asc" }, { email: "asc" }],
            skip,
            take: limit,
            include: { member: { select: { id: true, name: true } } },
          }),
        ]);
        return {
          data: rows.map((row) => serializeAppUser(row, auth.user.id)),
          meta: buildPaginationMeta(total, page, limit),
        };
      },
    );

    return NextResponse.json(body);
  } catch (error) {
    console.error("GET /api/users", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
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
    const fields = await readNewUserFields(
      bodyResult.data as Record<string, unknown>,
    );
    if (!fields.ok) {
      return NextResponse.json({ error: fields.error }, { status: fields.status });
    }

    const created = await createAuthAccount(fields.email, fields.password);
    if (!created.ok) {
      return NextResponse.json({ error: created.error }, { status: 400 });
    }

    const result = await createManagedUser({
      id: created.id,
      email: fields.email,
      role: fields.role,
      isUse: fields.isUse,
      memberId: fields.memberId,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    await invalidateResource("users");
    return NextResponse.json(serializeAppUser(result.row, auth.user.id), {
      status: 201,
    });
  } catch (error) {
    return prismaErrorResponse(error, "Failed to create user");
  }
}
