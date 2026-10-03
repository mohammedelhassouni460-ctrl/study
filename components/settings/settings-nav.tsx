"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/settings/profile", label: "Profil" },
  { href: "/settings/billing", label: "Abonnement" },
  { href: "/settings/notifications", label: "Notifications" },
  { href: "/settings/data", label: "Données & compte" },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Paramètres" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
      <ul className="flex min-w-max gap-1 lg:grid lg:min-w-0">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground",
                  active && "bg-accent font-medium text-foreground",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
