import "server-only";

import { Prisma } from "@prisma/client";

import type {
  AdminAiTool,
  AdminArticle,
  AdminCase,
  AdminProject,
  AdminTalentService,
  ContentAdminData
} from "@/lib/content-admin-types";
import { getPrisma } from "@/lib/prisma";
import {
  managedPageDefaults,
  managedPageSlugs,
  normalizeManagedPageContent,
  type ManagedPageContent,
  type ManagedPageSlug
} from "@/lib/site-content";
import { WorkspaceInputError } from "@/lib/workspace-validation";

function pageJson(content: ManagedPageContent) {
  return content as unknown as Prisma.InputJsonValue;
}

function stringArray(value: Prisma.JsonValue | null) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function projectFromDb(project: {
  id: string;
  title: string;
  slug: string;
  type: AdminProject["type"];
  description: string;
  detail: string | null;
  coverImage: string | null;
  targetAudience: string | null;
  costLevel: string | null;
  difficulty: string | null;
  monetization: string | null;
  meta: Prisma.JsonValue | null;
  status: AdminProject["status"];
  sortOrder: number;
  isFeatured: boolean;
}): AdminProject {
  const meta = project.meta && typeof project.meta === "object" && !Array.isArray(project.meta)
    ? project.meta as Prisma.JsonObject
    : null;
  return {
    id: project.id,
    title: project.title,
    slug: project.slug,
    type: project.type,
    description: project.description,
    detail: project.detail || "",
    coverImage: project.coverImage || "",
    targetAudience: project.targetAudience || "",
    costLevel: project.costLevel || "",
    difficulty: project.difficulty || "",
    monetization: project.monetization || "",
    tags: stringArray(meta?.tags ?? null),
    status: project.status,
    sortOrder: project.sortOrder,
    isFeatured: project.isFeatured
  };
}

function articleFromDb(article: {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  categoryId: string | null;
  status: AdminArticle["status"];
  isFeatured: boolean;
}): AdminArticle {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt || "",
    content: article.content,
    coverImage: article.coverImage || "",
    categoryId: article.categoryId || "",
    status: article.status,
    isFeatured: article.isFeatured
  };
}

function aiToolFromDb(tool: {
  id: string;
  name: string;
  slug: string;
  description: string;
  detail: string | null;
  category: string;
  toolUrl: string | null;
  embedUrl: string | null;
  iconImage: string | null;
  screenshot: string | null;
  tags: Prisma.JsonValue | null;
  status: AdminAiTool["status"];
  sortOrder: number;
  isFeatured: boolean;
}): AdminAiTool {
  return {
    id: tool.id,
    name: tool.name,
    slug: tool.slug,
    description: tool.description,
    detail: tool.detail || "",
    category: tool.category,
    toolUrl: tool.toolUrl || "",
    embedUrl: tool.embedUrl || "",
    iconImage: tool.iconImage || "",
    screenshot: tool.screenshot || "",
    tags: stringArray(tool.tags),
    status: tool.status,
    sortOrder: tool.sortOrder,
    isFeatured: tool.isFeatured
  };
}

function talentFromDb(service: {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  description: string;
  content: string | null;
  price: Prisma.Decimal | null;
  durationMinutes: number | null;
  suitableFor: string | null;
  deliverables: Prisma.JsonValue | null;
  process: Prisma.JsonValue | null;
  status: AdminTalentService["status"];
  sortOrder: number;
  isFeatured: boolean;
}): AdminTalentService {
  return {
    id: service.id,
    title: service.title,
    slug: service.slug,
    subtitle: service.subtitle || "",
    description: service.description,
    content: service.content || "",
    price: service.price?.toString() || "",
    durationMinutes: service.durationMinutes,
    suitableFor: service.suitableFor || "",
    deliverables: stringArray(service.deliverables),
    process: stringArray(service.process),
    status: service.status,
    sortOrder: service.sortOrder,
    isFeatured: service.isFeatured
  };
}

function caseFromDb(item: {
  id: string;
  title: string;
  slug: string;
  clientName: string | null;
  serviceType: string | null;
  summary: string;
  content: string | null;
  result: string | null;
  quote: string | null;
  rating: number | null;
  coverImage: string | null;
  status: AdminCase["status"];
  sortOrder: number;
  isFeatured: boolean;
}): AdminCase {
  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    clientName: item.clientName || "",
    serviceType: item.serviceType || "",
    summary: item.summary,
    content: item.content || "",
    result: item.result || "",
    quote: item.quote || "",
    rating: item.rating,
    coverImage: item.coverImage || "",
    status: item.status,
    sortOrder: item.sortOrder,
    isFeatured: item.isFeatured
  };
}

export async function readManagedPage(slug: ManagedPageSlug) {
  const page = await getPrisma().page.findUnique({
    where: { slug },
    include: { sections: { where: { sectionKey: "managed-content", isVisible: true }, take: 1 } }
  });
  const content = page?.sections[0]?.content;
  return normalizeManagedPageContent(slug, content);
}

export async function ensureManagedPages(userId: string) {
  const prisma = getPrisma();
  for (const slug of managedPageSlugs) {
    const content = managedPageDefaults[slug];
    let page = await prisma.page.findUnique({ where: { slug } });
    if (!page) {
      try {
        page = await prisma.page.create({
          data: {
            slug,
            title: content.label,
            navigationName: content.label,
            seoTitle: content.seoTitle,
            seoDescription: content.seoDescription,
            status: "PUBLISHED",
            isVisible: true,
            publishedAt: new Date(),
            createdById: userId
          }
        });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
        page = await prisma.page.findUnique({ where: { slug } });
        if (!page) throw error;
      }
    }

    try {
      await prisma.pageSection.upsert({
        where: { pageId_sectionKey: { pageId: page.id, sectionKey: "managed-content" } },
        update: {},
        create: { pageId: page.id, sectionKey: "managed-content", sectionType: "CUSTOM", heading: content.hero.title, content: pageJson(content), sortOrder: 0, isVisible: true }
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    }
  }
}

export async function saveManagedPage(userId: string, slug: ManagedPageSlug, input: unknown) {
  if (!managedPageSlugs.includes(slug)) throw new WorkspaceInputError("不支持的页面。");
  const content = normalizeManagedPageContent(slug, input);
  if (!content.seoTitle.trim() || !content.seoDescription.trim() || !content.hero.title.trim()) {
    throw new WorkspaceInputError("SEO 标题、SEO 描述和首屏标题不能为空。");
  }
  const links = [
    ...content.sections.flatMap((section) => section.items.map((item) => item.href || "")),
    content.cta?.primaryHref || "",
    content.cta?.secondaryHref || ""
  ].filter(Boolean);
  if (links.some((href) => !(href.startsWith("/") && !href.startsWith("//")) && !href.startsWith("mailto:") && !href.startsWith("https://"))) {
    throw new WorkspaceInputError("页面链接仅支持站内路径、HTTPS 地址或邮箱链接。");
  }
  const prisma = getPrisma();
  const page = await prisma.page.upsert({
    where: { slug },
    update: {
      title: content.label,
      navigationName: content.label,
      seoTitle: content.seoTitle,
      seoDescription: content.seoDescription,
      status: "PUBLISHED",
      isVisible: true,
      publishedAt: new Date()
    },
    create: {
      slug,
      title: content.label,
      navigationName: content.label,
      seoTitle: content.seoTitle,
      seoDescription: content.seoDescription,
      status: "PUBLISHED",
      isVisible: true,
      publishedAt: new Date(),
      createdById: userId
    }
  });
  await prisma.pageSection.upsert({
    where: { pageId_sectionKey: { pageId: page.id, sectionKey: "managed-content" } },
    update: { heading: content.hero.title, content: pageJson(content), isVisible: true },
    create: { pageId: page.id, sectionKey: "managed-content", sectionType: "CUSTOM", heading: content.hero.title, content: pageJson(content), isVisible: true }
  });
  return content;
}

export type ManagedPageBlock = "seo" | "hero" | "section" | "cta";

export async function saveManagedPageBlock(
  userId: string,
  slug: ManagedPageSlug,
  block: ManagedPageBlock,
  sectionKey: string,
  input: unknown
) {
  const current = await readManagedPage(slug);
  const incoming = normalizeManagedPageContent(slug, input);
  const merged = structuredClone(current);

  if (block === "seo") {
    merged.seoTitle = incoming.seoTitle;
    merged.seoDescription = incoming.seoDescription;
  } else if (block === "hero") {
    merged.hero = incoming.hero;
  } else if (block === "section") {
    const currentIndex = merged.sections.findIndex((section) => section.key === sectionKey);
    const nextSection = incoming.sections.find((section) => section.key === sectionKey);
    if (currentIndex < 0 || !nextSection) throw new WorkspaceInputError("页面板块不存在。");
    merged.sections[currentIndex] = nextSection;
  } else if (block === "cta") {
    if (!incoming.cta) throw new WorkspaceInputError("页面底部行动区不存在。");
    merged.cta = incoming.cta;
  } else {
    throw new WorkspaceInputError("不支持的页面板块。");
  }

  return saveManagedPage(userId, slug, merged);
}

export async function readPublicSiteProfile() {
  const prisma = getPrisma();
  const [settings, owner] = await Promise.all([
    prisma.siteSetting.findMany({
      where: { settingKey: { in: ["site.owner", "contact.wechat", "contact.email", "contact.phone", "contact.wechatQr"] }, isPublic: true }
    }),
    prisma.user.findFirst({ where: { role: "ADMIN", isActive: true }, orderBy: { createdAt: "asc" }, select: { avatarUrl: true } })
  ]);
  const values = new Map(settings.map((setting) => [setting.settingKey, setting.settingValue]));
  return {
    owner: values.get("site.owner") || "萧小遥",
    wechat: values.get("contact.wechat") || "yao899030",
    email: values.get("contact.email") || "363811256@qq.com",
    phone: values.get("contact.phone") || "",
    wechatQrUrl: values.get("contact.wechatQr") || "/wechat-qr.jpg",
    avatarUrl: owner?.avatarUrl || "/xiaoyao-avatar-optimized.jpg"
  };
}

export async function readPublishedCases() {
  return getPrisma().case.findMany({ where: { status: "PUBLISHED" }, orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }] });
}

export async function readActiveTalentServices() {
  return getPrisma().talentService.findMany({ where: { status: "ACTIVE" }, orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }] });
}

export async function readContentAdminData(userId: string): Promise<ContentAdminData> {
  await ensureManagedPages(userId);
  const prisma = getPrisma();
  const [pages, projects, articles, aiTools, talentServices, cases, categories] = await Promise.all([
    Promise.all(managedPageSlugs.map((slug) => readManagedPage(slug))),
    prisma.project.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.article.findMany({ orderBy: [{ updatedAt: "desc" }] }),
    prisma.aiTool.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.talentService.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.case.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } })
  ]);
  return {
    pages,
    projects: projects.map(projectFromDb),
    articles: articles.map(articleFromDb),
    aiTools: aiTools.map(aiToolFromDb),
    talentServices: talentServices.map(talentFromDb),
    cases: cases.map(caseFromDb),
    categories
  };
}

export async function saveAdminProject(input: AdminProject) {
  const prisma = getPrisma();
  const data = {
    title: input.title,
    slug: input.slug,
    type: input.type,
    description: input.description,
    detail: input.detail || null,
    coverImage: input.coverImage || null,
    targetAudience: input.targetAudience || null,
    costLevel: input.costLevel || null,
    difficulty: input.difficulty || null,
    monetization: input.monetization || null,
    meta: { tags: input.tags },
    status: input.status,
    sortOrder: input.sortOrder,
    isFeatured: input.isFeatured,
    publishedAt: input.status === "PUBLISHED" ? new Date() : null
  } as const;
  if (input.id) return prisma.project.update({ where: { id: input.id }, data });
  return prisma.project.create({ data });
}

export async function deleteAdminProject(id: string) {
  await getPrisma().project.delete({ where: { id } });
}

export async function saveAdminArticle(userId: string, input: AdminArticle) {
  const prisma = getPrisma();
  if (input.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: input.categoryId }, select: { id: true } });
    if (!category) throw new WorkspaceInputError("文章分类不存在。");
  }
  const data = {
    title: input.title,
    slug: input.slug,
    excerpt: input.excerpt || null,
    content: input.content,
    coverImage: input.coverImage || null,
    categoryId: input.categoryId || null,
    status: input.status,
    isFeatured: input.isFeatured,
    publishedAt: input.status === "PUBLISHED" ? new Date() : null,
    authorId: userId
  } as const;
  if (input.id) return prisma.article.update({ where: { id: input.id }, data });
  return prisma.article.create({ data });
}

export async function deleteAdminArticle(id: string) {
  await getPrisma().article.delete({ where: { id } });
}

export async function saveAdminAiTool(input: AdminAiTool) {
  const data = {
    name: input.name,
    slug: input.slug,
    description: input.description,
    detail: input.detail || null,
    category: input.category,
    toolUrl: input.toolUrl || null,
    embedUrl: input.embedUrl || null,
    iconImage: input.iconImage || null,
    screenshot: input.screenshot || null,
    tags: input.tags,
    status: input.status,
    sortOrder: input.sortOrder,
    isFeatured: input.isFeatured
  } as const;
  const prisma = getPrisma();
  if (input.id) return prisma.aiTool.update({ where: { id: input.id }, data });
  return prisma.aiTool.create({ data });
}

export async function deleteAdminAiTool(id: string) {
  await getPrisma().aiTool.delete({ where: { id } });
}

export async function saveAdminTalentService(input: AdminTalentService) {
  const data = {
    title: input.title,
    slug: input.slug,
    subtitle: input.subtitle || null,
    description: input.description,
    content: input.content || null,
    price: input.price ? new Prisma.Decimal(input.price) : null,
    durationMinutes: input.durationMinutes,
    suitableFor: input.suitableFor || null,
    deliverables: input.deliverables,
    process: input.process,
    status: input.status,
    sortOrder: input.sortOrder,
    isFeatured: input.isFeatured
  } as const;
  const prisma = getPrisma();
  if (input.id) return prisma.talentService.update({ where: { id: input.id }, data });
  return prisma.talentService.create({ data });
}

export async function deleteAdminTalentService(id: string) {
  await getPrisma().talentService.delete({ where: { id } });
}

export async function saveAdminCase(userId: string, input: AdminCase) {
  const data = {
    title: input.title,
    slug: input.slug,
    clientName: input.clientName || null,
    serviceType: input.serviceType || null,
    summary: input.summary,
    content: input.content || null,
    result: input.result || null,
    quote: input.quote || null,
    rating: input.rating,
    coverImage: input.coverImage || null,
    status: input.status,
    sortOrder: input.sortOrder,
    isFeatured: input.isFeatured,
    publishedAt: input.status === "PUBLISHED" ? new Date() : null,
    authorId: userId
  } as const;
  const prisma = getPrisma();
  if (input.id) return prisma.case.update({ where: { id: input.id }, data });
  return prisma.case.create({ data });
}

export async function deleteAdminCase(id: string) {
  await getPrisma().case.delete({ where: { id } });
}
