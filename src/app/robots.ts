import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/legal/"],
        disallow: [
          "/api/",
          "/dashboard",
          "/sites/",
          "/alerts",
          "/history",
          "/runs/",
          "/settings",
          "/auth/",
          "/cli/",
        ],
      },
    ],
    sitemap: "https://perflabs.dev/sitemap.xml",
  };
}
