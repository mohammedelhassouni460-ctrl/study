import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/public-env";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    { path: "", priority: 1, changeFrequency: "weekly" as const },
    { path: "/pricing", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/signup", priority: 0.6, changeFrequency: "yearly" as const },
    { path: "/login", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/privacy", priority: 0.2, changeFrequency: "yearly" as const },
    { path: "/terms", priority: 0.2, changeFrequency: "yearly" as const },
    { path: "/cookies", priority: 0.2, changeFrequency: "yearly" as const },
  ];
  return pages.map((p) => ({
    url: `${siteConfig.url}${p.path}`,
    lastModified: new Date("2026-10-02"),
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
