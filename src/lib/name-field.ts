import { NextResponse } from "next/server";
import { NAME_MAX } from "@/lib/field-limits";

export function readRequiredName(
  value: unknown,
  label: string,
): { name: string; error?: undefined } | { name?: undefined; error: NextResponse } {
  const name = String(value ?? "").trim();
  if (!name) {
    return {
      error: NextResponse.json({ error: `กรอก${label}` }, { status: 400 }),
    };
  }
  if (name.length > NAME_MAX) {
    return {
      error: NextResponse.json(
        { error: `${label}ยาวเกินไป (สูงสุด ${NAME_MAX} ตัวอักษร)` },
        { status: 400 },
      ),
    };
  }
  return { name };
}
