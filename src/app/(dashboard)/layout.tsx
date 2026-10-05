import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { RoleProvider } from "@/context/role-context";
import { syncAppUser } from "@/lib/app-users";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const access = await syncAppUser(user);
  if (!access?.isUse) {
    await supabase.auth.signOut();
    redirect("/login?error=disabled");
  }

  return (
    <RoleProvider isAdmin={access.isAdmin}>
      <AppShell>{children}</AppShell>
    </RoleProvider>
  );
}
