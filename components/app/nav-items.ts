import { BookOpenIcon, CalendarDaysIcon, LayoutDashboardIcon, SettingsIcon } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboardIcon },
  { href: "/subjects", label: "Matières", icon: BookOpenIcon },
  { href: "/planner", label: "Planning", icon: CalendarDaysIcon },
  { href: "/settings/profile", label: "Paramètres", icon: SettingsIcon, match: "/settings" },
] as const;
