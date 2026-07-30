import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import type {
  AdminAiTool,
  AdminArticle,
  AdminCase,
  AdminProject,
  AdminTalentService
} from "@/lib/content-admin-types";
import { isSameOrigin } from "@/lib/request-security";
import {
  deleteAdminAiTool,
  deleteAdminArticle,
  deleteAdminCase,
  deleteAdminProject,
  deleteAdminTalentService,
  readContentAdminData,
  saveAdminAiTool,
  saveAdminArticle,
  saveAdminCase,
  saveAdminProject,
  saveAdminTalentService,
  saveManagedPage,
  saveManagedPageBlock,
  type ManagedPageBlock
} from "@/lib/site-content-storage";
import { managedPageSlugs, type ManagedPageSlug } from "@/lib/site-content";
import {
  readEnum,
  readNumber,
  readOptionalNumber,
  readOptionalString,
  readString,
  WorkspaceInputError
} from "@/lib/workspace-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "请先登录。" }, { status: 401 });
}

function optional(value: unknown, label: string, max: number) {
  return readOptionalString(value, label, max) || "";
}

function stringList(value: unknown, label: string) {
  if (!Array.isArray(value)) throw new WorkspaceInputError(`${label}格式不正确。`);
  return value.map((item, index) => readString(item, `${label}第 ${index + 1} 项`, 500)).slice(0, 50);
}

function booleanValue(value: unknown) {
  return value === true;
}

function slugValue(value: unknown, label: string) {
  const slug = readString(value, label, 191).toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new WorkspaceInputError(`${label}只能包含小写字母、数字和中划线。`);
  }
  return slug;
}

function projectInput(input: Record<string, unknown>): AdminProject {
  return {
    id: optional(input.id, "项目 ID", 30),
    title: readString(input.title, "项目名称", 200),
    slug: slugValue(input.slug, "项目 slug"),
    type: readEnum(input.type, "项目类型", ["CONTENT", "SERVICE", "TOOL", "CONSULTING"] as const),
    description: readString(input.description, "项目简介", 5000),
    detail: optional(input.detail, "项目详情", 20000),
    coverImage: optional(input.coverImage, "封面图片", 500),
    targetAudience: optional(input.targetAudience, "适合人群", 500),
    costLevel: optional(input.costLevel, "成本等级", 100),
    difficulty: optional(input.difficulty, "操作难度", 100),
    monetization: optional(input.monetization, "变现方式", 500),
    tags: stringList(input.tags || [], "项目标签"),
    status: readEnum(input.status, "发布状态", ["DRAFT", "PUBLISHED", "ARCHIVED"] as const),
    sortOrder: readNumber(input.sortOrder ?? 0, "排序", 0, 100000),
    isFeatured: booleanValue(input.isFeatured)
  };
}

function articleInput(input: Record<string, unknown>): AdminArticle {
  return {
    id: optional(input.id, "文章 ID", 30),
    title: readString(input.title, "文章标题", 200),
    slug: slugValue(input.slug, "文章 slug"),
    excerpt: optional(input.excerpt, "文章摘要", 500),
    content: readString(input.content, "文章内容", 1000000),
    coverImage: optional(input.coverImage, "文章封面", 500),
    categoryId: optional(input.categoryId, "文章分类", 30),
    status: readEnum(input.status, "发布状态", ["DRAFT", "PUBLISHED", "ARCHIVED"] as const),
    isFeatured: booleanValue(input.isFeatured)
  };
}

function aiToolInput(input: Record<string, unknown>): AdminAiTool {
  return {
    id: optional(input.id, "工具 ID", 30),
    name: readString(input.name, "工具名称", 200),
    slug: slugValue(input.slug, "工具 slug"),
    description: readString(input.description, "工具用途", 5000),
    detail: optional(input.detail, "详细介绍", 50000),
    category: optional(input.category, "工具分类", 100) || "productivity",
    toolUrl: optional(input.toolUrl, "工具网址", 1000),
    embedUrl: optional(input.embedUrl, "嵌入网址", 1000),
    iconImage: optional(input.iconImage, "图标图片", 500),
    screenshot: optional(input.screenshot, "展示图片", 500),
    tags: stringList(input.tags || [], "工具标签"),
    status: readEnum(input.status, "发布状态", ["DRAFT", "PUBLISHED", "ARCHIVED"] as const),
    sortOrder: readNumber(input.sortOrder ?? 0, "排序", 0, 100000),
    isFeatured: booleanValue(input.isFeatured)
  };
}

function talentInput(input: Record<string, unknown>): AdminTalentService {
  const price = optional(input.price, "服务价格", 30);
  if (price && !/^\d+(?:\.\d{1,2})?$/.test(price)) throw new WorkspaceInputError("服务价格格式不正确。");
  return {
    id: optional(input.id, "服务 ID", 30),
    title: readString(input.title, "服务名称", 200),
    slug: slugValue(input.slug, "服务 slug"),
    subtitle: optional(input.subtitle, "服务副标题", 300),
    description: readString(input.description, "服务简介", 5000),
    content: optional(input.content, "服务详情", 50000),
    price,
    durationMinutes: readOptionalNumber(input.durationMinutes, "服务时长", 1, 100000) ?? null,
    suitableFor: optional(input.suitableFor, "适合人群", 10000),
    deliverables: stringList(input.deliverables || [], "交付内容"),
    process: stringList(input.process || [], "服务流程"),
    status: readEnum(input.status, "服务状态", ["ACTIVE", "INACTIVE"] as const),
    sortOrder: readNumber(input.sortOrder ?? 0, "排序", 0, 100000),
    isFeatured: booleanValue(input.isFeatured)
  };
}

function caseInput(input: Record<string, unknown>): AdminCase {
  return {
    id: optional(input.id, "案例 ID", 30),
    title: readString(input.title, "案例标题", 200),
    slug: slugValue(input.slug, "案例 slug"),
    clientName: optional(input.clientName, "客户名称", 100),
    serviceType: optional(input.serviceType, "服务类型", 100),
    summary: readString(input.summary, "案例摘要", 10000),
    content: optional(input.content, "案例详情", 50000),
    result: optional(input.result, "案例结果", 10000),
    quote: optional(input.quote, "客户反馈", 10000),
    rating: readOptionalNumber(input.rating, "案例评分", 1, 5) ?? null,
    coverImage: optional(input.coverImage, "案例封面", 500),
    status: readEnum(input.status, "发布状态", ["DRAFT", "PUBLISHED", "ARCHIVED"] as const),
    sortOrder: readNumber(input.sortOrder ?? 0, "排序", 0, 100000),
    isFeatured: booleanValue(input.isFeatured)
  };
}

function errorResponse(error: unknown) {
  if (error instanceof WorkspaceInputError) return NextResponse.json({ error: error.message }, { status: 400 });
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return NextResponse.json({ error: "slug 已存在，请换一个唯一地址。" }, { status: 409 });
    if (error.code === "P2025") return NextResponse.json({ error: "内容不存在或已经删除。" }, { status: 404 });
    if (error.code === "P2003") return NextResponse.json({ error: "该内容仍有关联数据，暂时不能删除。" }, { status: 409 });
  }
  console.error("Content admin request failed", error);
  return NextResponse.json({ error: "网站内容暂时无法保存，请稍后重试。" }, { status: 500 });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  try {
    return NextResponse.json({ data: await readContentAdminData(user.id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "请求来源无效。" }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  try {
    const body = await request.json() as Record<string, unknown>;
    const action = readString(body.action, "操作类型", 50);
    const input = body.input && typeof body.input === "object" && !Array.isArray(body.input)
      ? body.input as Record<string, unknown>
      : {};

    if (action === "savePage") {
      const slug = readEnum(input.slug, "页面", managedPageSlugs) as ManagedPageSlug;
      await saveManagedPage(user.id, slug, input.content);
    } else if (action === "savePageBlock") {
      const slug = readEnum(input.slug, "页面", managedPageSlugs) as ManagedPageSlug;
      const block = readEnum(input.block, "页面板块", ["seo", "hero", "section", "cta"] as const) as ManagedPageBlock;
      const sectionKey = block === "section" ? readString(input.sectionKey, "板块标识", 100) : "";
      await saveManagedPageBlock(user.id, slug, block, sectionKey, input.content);
    } else if (action === "saveProject") {
      await saveAdminProject(projectInput(input));
    } else if (action === "deleteProject") {
      await deleteAdminProject(readString(input.id, "项目 ID", 30));
    } else if (action === "saveArticle") {
      await saveAdminArticle(user.id, articleInput(input));
    } else if (action === "deleteArticle") {
      await deleteAdminArticle(readString(input.id, "文章 ID", 30));
    } else if (action === "saveAiTool") {
      await saveAdminAiTool(aiToolInput(input));
    } else if (action === "deleteAiTool") {
      await deleteAdminAiTool(readString(input.id, "工具 ID", 30));
    } else if (action === "saveTalentService") {
      await saveAdminTalentService(talentInput(input));
    } else if (action === "deleteTalentService") {
      await deleteAdminTalentService(readString(input.id, "服务 ID", 30));
    } else if (action === "saveCase") {
      await saveAdminCase(user.id, caseInput(input));
    } else if (action === "deleteCase") {
      await deleteAdminCase(readString(input.id, "案例 ID", 30));
    } else {
      throw new WorkspaceInputError("不支持的内容管理操作。");
    }

    return NextResponse.json({ data: await readContentAdminData(user.id) });
  } catch (error) {
    return errorResponse(error);
  }
}
