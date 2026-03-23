"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Layers, Newspaper, FileText } from "lucide-react";

const NAV_ITEMS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Phases", href: "/phases", icon: Layers },
  { label: "Feed", href: "/feed", icon: Newspaper },
  { label: "Resume", href: "/resume", icon: FileText },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-base border-t border-border-default md:hidden">
      <div className="mx-auto max-w-3xl h-full grid grid-cols-4">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors duration-150 ease-cinema focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base ${
                isActive ? "text-accent" : "text-text-muted"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[11px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
