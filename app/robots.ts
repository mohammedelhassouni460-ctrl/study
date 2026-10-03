import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/public-env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard", "/subjects", "/planner", "/settings", "/onboarding", "/auth/"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
