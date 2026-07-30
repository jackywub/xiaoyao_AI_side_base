import "server-only";

import { getPrisma } from "@/lib/prisma";

export async function readPublishedArticles(limit = 50) {
  return getPrisma().article.findMany({
    where: { status: "PUBLISHED" },
    include: {
      category: true,
      tags: { include: { tag: true } }
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: limit
  });
}

export async function readPublishedArticle(slug: string) {
  return getPrisma().article.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      category: true,
      tags: { include: { tag: true } },
      author: { select: { displayName: true, avatarUrl: true } }
    }
  });
}

export async function readPublishedAiTools() {
  return getPrisma().aiTool.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
  });
}

export async function readPublishedAiTool(slug: string) {
  return getPrisma().aiTool.findFirst({ where: { slug, status: "PUBLISHED" } });
}

export async function readPublishedProjects() {
  return getPrisma().project.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
  });
}
