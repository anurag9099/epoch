"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { NudgeBanner } from "@/components/ui/NudgeBanner";
import { LearningSessionTracker } from "@/components/telemetry/LearningSessionTracker";
import { ShellProvider, useShell } from "@/components/layout/ShellProvider";

function AppShellFrame({ children }: { children: React.ReactNode }) {
  const { sidebarWidth } = useShell();

  return (
    <>
      <LearningSessionTracker />
      <MobileNav />

      <div
        className="hidden md:grid h-screen epoch-desktop-shell"
        style={{
          ["--shell-sidebar-width" as string]: sidebarWidth,
          gridTemplateColumns: "var(--shell-sidebar-width) minmax(0, 1fr) var(--unity-panel-width)",
          gap: "var(--shell-gap)",
          padding: "var(--shell-padding)",
          transition: "grid-template-columns 220ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div className="epoch-desktop-sidebar">
          <Sidebar />
        </div>
        <main
          className="min-w-0 overflow-y-auto epoch-desktop-main"
          style={{ height: "calc(100vh - (var(--shell-padding) * 2))" }}
        >
          <div
            className="animate-fade-in"
            style={{
              maxWidth: "var(--shell-content-max)",
              margin: "0 auto",
              width: "100%",
              padding: "var(--shell-content-padding)",
            }}
          >
            <NudgeBanner />
            {children}
          </div>
        </main>
        <ChatPanel mode="desktop" />
      </div>

      <div className="md:hidden">
        <main className="animate-fade-in" style={{ padding: "var(--mobile-content-padding)" }}>
          <NudgeBanner />
          {children}
        </main>
        <ChatPanel mode="mobile" />
      </div>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ShellProvider>
      <AppShellFrame>{children}</AppShellFrame>
    </ShellProvider>
  );
}
