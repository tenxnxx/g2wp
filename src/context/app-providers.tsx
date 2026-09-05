"use client";

import { ToastViewport } from "@/components/ui/toast";
import { AuthProvider } from "@/context/auth-context";
import { QueryProvider } from "@/context/query-provider";
import { SidebarProvider } from "@/context/sidebar-context";
import { ToastProvider } from "@/context/toast-context";
import type { ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ToastProvider>
        <AuthProvider>
          <SidebarProvider>
            {children}
            <ToastViewport />
          </SidebarProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryProvider>
  );
}
