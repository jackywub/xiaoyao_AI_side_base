import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site";
import { readPublishedAiTools, readPublishedArticles } from "@/lib/content-storage";

const routes = [
  { path: "/", priority: 1 },
  { path: "/about", priority: 0.8 },
  { path: "/ai-side-business", priority: 0.9 },
  { path: "/ai-tools", priority: 0.85 },
  { path: "/talent-number", priority: 0.85 },
  { path: "/growth", priority: 0.75 },
  { path: "/cases", priority: 0.7 },
  { path: "/contact", priority: 0.8 }
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const [articles, tools] = await Promise.all([readPublishedArticles(), readPublishedAiTools()]);
  return [...routes.map((route) => ({
    url: new URL(route.path, siteConfig.url).toString(),
    lastModified,
    changeFrequency: "weekly",
    priority: route.priority
  } as const)), ...articles.map((article) => ({ url: new URL(`/growth/${article.slug}`, siteConfig.url).toString(), lastModified: article.updatedAt, changeFrequency: "monthly" as const, priority: 0.65 })), ...tools.map((tool) => ({ url: new URL(`/ai-tools/${tool.slug}`, siteConfig.url).toString(), lastModified: tool.updatedAt, changeFrequency: "monthly" as const, priority: 0.65 }))];
}
