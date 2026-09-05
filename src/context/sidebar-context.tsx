"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const DESKTOP_QUERY = "(min-width: 768px)";

type SidebarContextValue = {
  /** Expanded rail (desktop) or drawer open (mobile) */
  open: boolean;
  desktopExpanded: boolean;
  mobileOpen: boolean;
  isDesktop: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  closeMobile: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [desktopExpanded, setDesktopExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);
    const sync = () => {
      const desktop = media.matches;
      setIsDesktop(desktop);
      if (!desktop) setMobileOpen(false);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (isDesktop || !mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isDesktop, mobileOpen]);

  const open = isDesktop ? desktopExpanded : mobileOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (isDesktop) setDesktopExpanded(next);
      else setMobileOpen(next);
    },
    [isDesktop],
  );

  const toggle = useCallback(() => {
    setOpen(!open);
  }, [open, setOpen]);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      open,
      desktopExpanded,
      mobileOpen,
      isDesktop,
      setOpen,
      toggle,
      closeMobile,
    }),
    [
      open,
      desktopExpanded,
      mobileOpen,
      isDesktop,
      setOpen,
      toggle,
      closeMobile,
    ],
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return ctx;
}
