import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";

export async function readJsonBody<T = unknown>(
  request: Request,
): Promise<{ data: T; error?: undefined } | { data?: undefined; error: NextResponse }> {
  try {
    const data = (await request.json()) as T;
    return { data };
  } catch {
    return {
      error: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }
}

export function prismaErrorResponse(error: unknown, fallback: string): NextResponse {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2003"
  ) {
    return NextResponse.json(
      {
        error:
          "ไม่สามารถลบได้ เพราะยังมีข้อมูลที่เกี่ยวข้องอยู่ (เช่น ประวัติอีเวนต์เช็ค)",
      },
      { status: 409 },
    );
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return NextResponse.json(
      {
        error:
          "ข้อมูลซ้ำหรือขัดกับกฎระบบ (เช่น มีอีเวนต์ที่เปิดอยู่แล้ว)",
      },
      { status: 409 },
    );
  }

  console.error(fallback, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

/** Allow only http(s) URLs; empty/null clears the field. */
export function normalizeHttpUrl(
  value: unknown,
): { ok: true; url: string | null } | { ok: false; error: string } {
  if (value == null) return { ok: true, url: null };
  if (typeof value !== "string") {
    return { ok: false, error: "URL must be a string" };
  }
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, url: null };

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: "URL ไม่ถูกต้อง" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "อนุญาตเฉพาะลิงก์ http หรือ https" };
  }

  return { ok: true, url: parsed.toString() };
}
