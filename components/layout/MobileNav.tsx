"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Layers, FlaskConical, Sparkles, FileText, Target } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { EpochBrand } from "@/components/branding/EpochBrand";

const NAV_ITEMS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Path", href: "/phases", icon: Layers },
  { label: "Build", href: "/labs", icon: FlaskConical },
  { label: "For You", href: "/lens", icon: Sparkles },
  { label: "Proof", href: "/resume", icon: FileText },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-surface border-b border-border-warm">
        <div className="h-full px-4 flex items-center justify-between">
          <div className="min-w-0">
            <EpochBrand compact />
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/goals"
              aria-label="Open Focus"
              className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 transition-colors ${
                pathname.startsWith("/goals") ? "text-teal" : "text-muted"
              }`}
              style={{
                borderColor: "var(--border)",
                background: "var(--bg-page)",
              }}
            >
              <Target className="h-4 w-4" />
              <span className="text-[11px] font-semibold">Focus</span>
            </Link>
            <ThemeToggle compact />
          </div>
        </div>
      </header>

      {/* Bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-surface border-t border-border-warm">
        <div className="h-full grid grid-cols-5">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors ${
                  isActive ? "text-teal" : "text-hint"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
