import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

const authOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
} as const;

function mapAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("already") || lower.includes("registered")) {
    return "อีเมลนี้มีบัญชีอยู่แล้ว";
  }
  if (lower.includes("password")) {
    return "รหัสผ่านไม่ผ่านเงื่อนไข ใช้อย่างน้อย 6 ตัวอักษร";
  }
  if (lower.includes("email")) {
    return "อีเมลไม่ถูกต้อง";
  }
  return "สร้างบัญชีไม่สำเร็จ";
}

/** Creates a Supabase Auth user without touching the admin's browser session. */
export async function createAuthAccount(
  email: string,
  password: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    const admin = createClient(getSupabaseUrl(), serviceKey, authOptions);
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) return { ok: false, error: mapAuthError(error.message) };
    if (!data.user?.id) return { ok: false, error: "สร้างบัญชีไม่สำเร็จ" };
    return { ok: true, id: data.user.id };
  }

  const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey(), authOptions);
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { ok: false, error: mapAuthError(error.message) };
  if (!data.user?.id) return { ok: false, error: "สร้างบัญชีไม่สำเร็จ" };
  if (data.user.identities && data.user.identities.length === 0) {
    return { ok: false, error: "อีเมลนี้มีบัญชีอยู่แล้ว" };
  }
  return { ok: true, id: data.user.id };
}
