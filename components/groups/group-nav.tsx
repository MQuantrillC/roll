"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dices, History, LayoutGrid, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

export function GroupNav({ groupId }: { groupId: string }) {
  const pathname = usePathname();
  const base = `/g/${groupId}`;

  const tabs = [
    { href: base, label: "Overview", icon: LayoutGrid, exact: true },
    { href: `${base}/list`, label: "My List", icon: ListChecks },
    { href: `${base}/decide`, label: "Decide", icon: Dices, hero: true },
    { href: `${base}/history`, label: "History", icon: History },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/90 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid w-full max-w-2xl grid-cols-4">
        {tabs.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.hero ? (
                <span
                  className={cn(
                    "flex size-9 -mt-4 items-center justify-center rounded-2xl shadow-lg transition-transform",
                    active
                      ? "bg-gradient-brand text-white shadow-primary/30 scale-110"
                      : "bg-gradient-brand text-white shadow-primary/25"
                  )}
                >
                  <Icon className="size-5" />
                </span>
              ) : (
                <Icon className="size-5" />
              )}
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
