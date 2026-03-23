"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

const GENERAL_SIDEBAR_KEY = "epoch_shell_sidebar_collapsed";
const LAB_SIDEBAR_KEY = "epoch_lab_sidebar_collapsed";

interface ShellContextValue {
  isLabRoute: boolean;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  sidebarWidth: string;
}

const ShellContext = createContext<ShellContextValue | null>(null);

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLabRoute = pathname.startsWith("/lab/");
  const [generalSidebarCollapsed, setGeneralSidebarCollapsed] = useState(false);
  const [labSidebarCollapsed, setLabSidebarCollapsed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const general = window.localStorage.getItem(GENERAL_SIDEBAR_KEY);
      const lab = window.localStorage.getItem(LAB_SIDEBAR_KEY);

      if (general !== null) setGeneralSidebarCollapsed(general === "true");
      if (lab !== null) setLabSidebarCollapsed(lab === "true");
    } catch {
      // Ignore storage failures and keep route defaults.
    }
  }, []);

  const sidebarCollapsed = isLabRoute ? labSidebarCollapsed : generalSidebarCollapsed;

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    if (isLabRoute) {
      setLabSidebarCollapsed(collapsed);
      try {
        window.localStorage.setItem(LAB_SIDEBAR_KEY, String(collapsed));
      } catch {
        // Ignore storage failures and keep in-memory state.
      }
      return;
    }

    setGeneralSidebarCollapsed(collapsed);
    try {
      window.localStorage.setItem(GENERAL_SIDEBAR_KEY, String(collapsed));
    } catch {
      // Ignore storage failures and keep in-memory state.
    }
  }, [isLabRoute]);

  const value = useMemo<ShellContextValue>(
    () => ({
      isLabRoute,
      sidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebar: () => setSidebarCollapsed(!sidebarCollapsed),
      sidebarWidth: sidebarCollapsed
        ? "var(--shell-sidebar-collapsed-width)"
        : "var(--shell-sidebar-expanded-width)",
    }),
    [isLabRoute, setSidebarCollapsed, sidebarCollapsed]
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell() {
  const value = useContext(ShellContext);
  if (!value) throw new Error("useShell must be used within a ShellProvider");
  return value;
}
