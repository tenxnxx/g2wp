"use client";

import { createContext, useContext, type ReactNode } from "react";

const RoleContext = createContext(false);

export function RoleProvider({
  isAdmin,
  children,
}: {
  isAdmin: boolean;
  children: ReactNode;
}) {
  return <RoleContext.Provider value={isAdmin}>{children}</RoleContext.Provider>;
}

export function useIsAdmin(): boolean {
  return useContext(RoleContext);
}
