import "dotenv/config";

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";

const MANAGEMENT_STATE_PATH = process.env.MANAGEMENT_STATE_PATH
  || "/Users/jackywuu/Desktop/AI 项目/小遥的管理系统/.data/app-state.json";
const CONTENT_DATABASE_PATH = process.env.CONTENT_DATABASE_PATH
  || "/Users/jackywuu/WorkBuddy/my_website/payload.db";
const username = process.env.ADMIN_USERNAME || "admin";

function createPrisma() {
  const url = new URL(process.env.DATABASE_URL || "");
  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    allowPublicKeyRetrieval: true,
    connectionLimit: 5
  });
  return new PrismaClient({ adapter });
}

function cleanText(value) {
  return String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

function normalizedKey(value) {
  return cleanText(value)
    .toLocaleLowerCase("zh-CN")
    .replace(/[\s:：,，。.!！?？、;；'"“”‘’()（）\[\]【】{}<>《》_\-—·・]/g, "")
    .replaceAll("咸鱼", "闲鱼");
}

function hash(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function stableId(prefix, value) {
  return `${prefix}_${hash(value).slice(0, 29 - prefix.length)}`;
}

function dbDate(value) {
  if (!value) return null;
  const date = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00.000Z`) : null;
}

function dbDateTime(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function canonicalProjectName(value) {
  const key = normalizedKey(value);
  if (key.includes("销售智能体") || key.includes("公众号智能体")) return "公众号智能体";
  if (key.includes("公众号流量主")) return "公众号流量主";
  if (key.includes("闲鱼虚拟资料")) return "闲鱼虚拟资料";
  if (key.includes("知识星球") && (key.includes("分销") || key.includes("推广") || key.includes("大冲"))) {
    return "知识星球推广";
  }
  return cleanText(value).replace(/^副业[：:]/, "").replaceAll("咸鱼", "闲鱼");
}

function taskType(value) {
  if (value === "daily") return "DAILY";
  if (value === "stage") return "PHASED";
  return "LONG_TERM";
}

function canonicalTaskTitle(value, type) {
  const text = cleanText(value).replaceAll("咸鱼", "闲鱼");
  const key = normalizedKey(text);
  if (type === "DAILY" && key.includes("小说") && (key.includes("发布") || key.startsWith("发"))) return "发布小说并签约";
  if (type === "DAILY" && key.includes("公众号") && (key.includes("发布") || key.startsWith("发"))) return "公众号发布";
  if (type === "DAILY" && key.includes("闲鱼") && key.includes("商品上架")) return "闲鱼商品上架";
  if (type === "PHASED" && key.includes("贴图")) return "公众号贴图训练营";
  return text;
}

function priority(value) {
  if (value === "高" || value === "HIGH") return "HIGH";
  if (value === "低" || value === "LOW") return "LOW";
  return "MEDIUM";
}

function quadrant(value) {
  const mapping = {
    importantUrgent: "IMPORTANT_URGENT",
    importantNotUrgent: "IMPORTANT_NOT_URGENT",
    urgentNotImportant: "URGENT_NOT_IMPORTANT",
    low: "LOW"
  };
  return mapping[value] || "LOW";
}

function riskLevel(value) {
  if (value === "高") return "HIGH";
  if (value === "中") return "MEDIUM";
  return "LOW";
}

function sqliteJson(sql) {
  const output = execFileSync("sqlite3", ["-json", CONTENT_DATABASE_PATH, sql], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024
  }).trim();
  return output ? JSON.parse(output) : [];
}

function lexicalText(value) {
  let root = value;
  if (typeof value === "string") {
    try {
      root = JSON.parse(value);
    } catch {
      return value;
    }
  }

  function read(node) {
    if (!node) return "";
    if (typeof node === "string") return node;
    if (Array.isArray(node)) return node.map(read).filter(Boolean).join("\n\n");
    if (node.type === "text") return node.text || "";
    if (node.root) return read(node.root);
    if (node.children) {
      const separator = ["paragraph", "heading", "listitem", "quote"].includes(node.type) ? "" : " ";
      return node.children.map(read).filter(Boolean).join(separator);
    }
    return "";
  }

  return read(root).replace(/\n{3,}/g, "\n\n").trim();
}

function toolIcon(name) {
  const key = normalizedKey(name);
  if (key.includes("midjourney")) return "/assets/icons/icon-art-design.png";
  if (key.includes("runway")) return "/assets/icons/icon-video.png";
  if (key.includes("cursor")) return "/assets/icons/icon-gear.png";
  if (key.includes("notion")) return "/assets/icons/icon-writing.png";
  return "/assets/icons/icon-ai-robot.png";
}

async function mergeManagementSystem(prisma, workspaceId) {
  const envelope = JSON.parse(readFileSync(MANAGEMENT_STATE_PATH, "utf8"));
  const state = envelope.state || envelope;
  const currentProjects = await prisma.workspaceProject.findMany({ where: { workspaceId } });
  const projectMap = new Map(currentProjects.map((item) => [normalizedKey(item.name), item]));
  const imported = { projects: 0, tasks: 0, subtasks: 0, goals: 0, scheduleBlocks: 0, aiMessages: 0 };

  for (const sourceProject of state.projects || []) {
    const canonicalName = canonicalProjectName(sourceProject.name);
    let project = projectMap.get(normalizedKey(canonicalName));
    if (!project) {
      project = await prisma.workspaceProject.create({
        data: {
          id: stableId("mp", canonicalName),
          workspaceId,
          name: canonicalName,
          description: "从小遥管理舱合并",
          startedOn: dbDate(sourceProject.startDate),
          endedOn: dbDate(sourceProject.endDate)
        }
      });
      projectMap.set(normalizedKey(canonicalName), project);
    }
    project = await prisma.workspaceProject.update({
      where: { id: project.id },
      data: {
        stage: cleanText(sourceProject.stage) || null,
        progress: Math.max(0, Math.min(100, Number(sourceProject.progress) || 0)),
        nextAction: cleanText(sourceProject.next) || null,
        riskLevel: riskLevel(sourceProject.risk),
        riskReason: cleanText(sourceProject.riskReason) || null,
        startedOn: dbDate(sourceProject.startDate) || project.startedOn,
        endedOn: dbDate(sourceProject.endDate) || project.endedOn
      }
    });
    projectMap.set(normalizedKey(canonicalName), project);
    imported.projects += 1;
  }

  const currentTasks = await prisma.workspaceTask.findMany({ where: { workspaceId, parentId: null } });
  const taskMap = new Map(
    currentTasks.map((item) => [`${item.type}|${normalizedKey(item.title)}`, item])
  );

  for (const sourceTask of state.tasks || []) {
    const type = taskType(sourceTask.taskKind);
    const title = canonicalTaskTitle(sourceTask.title, type);
    const key = `${type}|${normalizedKey(title)}`;
    let task = taskMap.get(key);
    const project = projectMap.get(normalizedKey(canonicalProjectName(sourceTask.project)));
    const data = {
      workspaceId,
      title,
      type,
      priority: priority(sourceTask.importance),
      urgency: priority(sourceTask.urgency),
      quadrant: quadrant(sourceTask.quadrant),
      dueTime: cleanText(sourceTask.due) || null,
      projectId: project?.id || null,
      startDate: dbDate(sourceTask.startDate),
      dueDate: dbDate(sourceTask.endDate),
      progress: Math.max(Number(task?.progress) || 0, Number(sourceTask.progress) || 0),
      status: sourceTask.done ? "DONE" : Number(sourceTask.progress) > 0 ? "IN_PROGRESS" : "TODO"
    };
    task = task
      ? await prisma.workspaceTask.update({ where: { id: task.id }, data })
      : await prisma.workspaceTask.create({ data: { id: stableId("mt", key), ...data } });
    taskMap.set(key, task);
    imported.tasks += 1;

    for (const [index, subtask] of (sourceTask.subtasks || []).entries()) {
      const subtaskId = stableId("ms", `${sourceTask.id}|${subtask.id || subtask.title}`);
      await prisma.workspaceTask.upsert({
        where: { id: subtaskId },
        update: {
          title: cleanText(subtask.title),
          status: subtask.completed || subtask.done ? "DONE" : "TODO",
          progress: subtask.completed || subtask.done ? 100 : 0,
          sortOrder: index
        },
        create: {
          id: subtaskId,
          workspaceId,
          parentId: task.id,
          projectId: project?.id || null,
          title: cleanText(subtask.title),
          type,
          priority: task.priority,
          urgency: task.urgency,
          quadrant: task.quadrant,
          status: subtask.completed || subtask.done ? "DONE" : "TODO",
          progress: subtask.completed || subtask.done ? 100 : 0,
          sortOrder: index
        }
      });
      imported.subtasks += 1;
    }
  }

  for (const goal of state.goals || []) {
    const title = cleanText(goal.name);
    const key = `LONG_TERM|${normalizedKey(title)}`;
    const existing = taskMap.get(key);
    if (existing) {
      await prisma.workspaceTask.update({
        where: { id: existing.id },
        data: { isGoal: true, progress: Math.max(existing.progress, Number(goal.progress) || 0) }
      });
    } else {
      await prisma.workspaceTask.create({
        data: {
          id: stableId("mg", goal.id || title),
          workspaceId,
          title,
          type: "LONG_TERM",
          status: Number(goal.progress) >= 100 ? "DONE" : "IN_PROGRESS",
          progress: Math.max(0, Math.min(100, Number(goal.progress) || 0)),
          isGoal: true
        }
      });
    }
    imported.goals += 1;
  }

  for (const [index, block] of (state.schedule || []).entries()) {
    const project = projectMap.get(normalizedKey(canonicalProjectName(block.project)));
    await prisma.workspaceScheduleBlock.upsert({
      where: { id: stableId("mb", block.id || `${block.time}|${block.title}`) },
      update: {
        projectId: project?.id || null,
        timeText: cleanText(block.time),
        title: cleanText(block.title),
        tone: cleanText(block.tone) || "neutral",
        sortOrder: index
      },
      create: {
        id: stableId("mb", block.id || `${block.time}|${block.title}`),
        workspaceId,
        projectId: project?.id || null,
        timeText: cleanText(block.time),
        title: cleanText(block.title),
        tone: cleanText(block.tone) || "neutral",
        sortOrder: index
      }
    });
    imported.scheduleBlocks += 1;
  }

  if (state.hermes?.messages?.length) {
    const conversationId = stableId("ac", "management-hermes");
    await prisma.aiConversation.upsert({
      where: { id: conversationId },
      update: {
        model: cleanText(state.hermes.currentModel || state.hermes.model) || null,
        externalSessionId: cleanText(state.hermes.sessionId) || null
      },
      create: {
        id: conversationId,
        workspaceId,
        title: cleanText(state.hermes.sessionName) || "小遥管理舱助手",
        provider: cleanText(state.hermes.provider) || "Hermes",
        model: cleanText(state.hermes.currentModel || state.hermes.model) || null,
        externalSessionId: cleanText(state.hermes.sessionId) || null
      }
    });
    for (const [index, message] of state.hermes.messages.entries()) {
      const content = cleanText(message.content || message.text);
      if (!content) continue;
      await prisma.aiMessage.upsert({
        where: { id: stableId("am", `${conversationId}|${message.id || index}|${content}`) },
        update: {},
        create: {
          id: stableId("am", `${conversationId}|${message.id || index}|${content}`),
          conversationId,
          role: message.role === "assistant" ? "ASSISTANT" : message.role === "system" ? "SYSTEM" : "USER",
          content,
          model: cleanText(message.model) || null,
          createdAt: dbDateTime(message.createdAt)
        }
      });
      imported.aiMessages += 1;
    }
  }

  return imported;
}

async function mergeContentSystem(prisma, userId) {
  const posts = sqliteJson("SELECT * FROM posts ORDER BY id");
  const postTags = sqliteJson("SELECT _parent_id AS parentId, tag FROM posts_tags ORDER BY _order");
  const tools = sqliteJson("SELECT * FROM ai_tools ORDER BY sort_order,id");
  const toolTags = sqliteJson("SELECT _parent_id AS parentId, tag FROM ai_tools_tags ORDER BY _order");
  const projects = sqliteJson("SELECT * FROM projects ORDER BY sort_order,id");
  const projectTools = sqliteJson("SELECT _parent_id AS parentId, tool FROM projects_tools ORDER BY _order");
  const projectMetrics = sqliteJson("SELECT _parent_id AS parentId,label,value FROM projects_metrics ORDER BY _order");
  const inquiries = sqliteJson("SELECT * FROM inquiries ORDER BY id");
  const imported = { articles: 0, aiTools: 0, publicProjects: 0, appointments: 0 };
  const categoryMap = {
    "ai-side-hustle": ["AI 副业", "ai-side-business"],
    "talent-number": ["天赋数字", "talent-number"],
    "personal-growth": ["个人成长", "personal-growth"],
    "tool-recommendation": ["工具推荐", "tool-recommendation"]
  };

  for (const post of posts) {
    const [categoryName, categorySlug] = categoryMap[post.category] || [post.category, post.category];
    const category = await prisma.category.upsert({
      where: { slug: categorySlug },
      update: { name: categoryName, isVisible: true },
      create: { name: categoryName, slug: categorySlug, isVisible: true }
    });
    const tags = postTags.filter((item) => item.parentId === post.id).map((item) => cleanText(item.tag)).filter(Boolean);
    const article = await prisma.article.upsert({
      where: { slug: cleanText(post.slug) || `article-${post.id}` },
      update: {
        title: cleanText(post.title),
        excerpt: cleanText(post.excerpt) || null,
        content: lexicalText(post.content),
        status: post.status === "published" ? "PUBLISHED" : "DRAFT",
        isFeatured: Boolean(post.featured),
        categoryId: category.id,
        publishedAt: post.published_at ? dbDateTime(post.published_at) : null
      },
      create: {
        id: stableId("pa", post.id),
        title: cleanText(post.title),
        slug: cleanText(post.slug) || `article-${post.id}`,
        excerpt: cleanText(post.excerpt) || null,
        content: lexicalText(post.content),
        status: post.status === "published" ? "PUBLISHED" : "DRAFT",
        isFeatured: Boolean(post.featured),
        authorId: userId,
        categoryId: category.id,
        publishedAt: post.published_at ? dbDateTime(post.published_at) : null,
        createdAt: dbDateTime(post.created_at),
        updatedAt: dbDateTime(post.updated_at)
      }
    });
    for (const tagName of tags) {
      const slug = `payload-${hash(tagName).slice(0, 12)}`;
      const tag = await prisma.tag.upsert({
        where: { slug },
        update: { name: tagName },
        create: { name: tagName, slug }
      });
      await prisma.articleTag.upsert({
        where: { articleId_tagId: { articleId: article.id, tagId: tag.id } },
        update: {},
        create: { articleId: article.id, tagId: tag.id }
      });
    }
    imported.articles += 1;
  }

  for (const tool of tools) {
    const tags = toolTags.filter((item) => item.parentId === tool.id).map((item) => cleanText(item.tag)).filter(Boolean);
    await prisma.aiTool.upsert({
      where: { slug: cleanText(tool.slug) || `tool-${tool.id}` },
      update: {
        name: cleanText(tool.name),
        description: cleanText(tool.description),
        category: cleanText(tool.category),
        toolUrl: cleanText(tool.tool_url) || null,
        embedUrl: cleanText(tool.embed_url) || null,
        iconImage: toolIcon(tool.name),
        tags,
        status: tool.status === "published" ? "PUBLISHED" : "DRAFT",
        isFeatured: Boolean(tool.featured),
        sortOrder: Number(tool.sort_order) || 0
      },
      create: {
        id: stableId("pt", tool.id),
        name: cleanText(tool.name),
        slug: cleanText(tool.slug) || `tool-${tool.id}`,
        description: cleanText(tool.description),
        category: cleanText(tool.category),
        toolUrl: cleanText(tool.tool_url) || null,
        embedUrl: cleanText(tool.embed_url) || null,
        iconImage: toolIcon(tool.name),
        tags,
        status: tool.status === "published" ? "PUBLISHED" : "DRAFT",
        isFeatured: Boolean(tool.featured),
        sortOrder: Number(tool.sort_order) || 0,
        createdAt: dbDateTime(tool.created_at),
        updatedAt: dbDateTime(tool.updated_at)
      }
    });
    imported.aiTools += 1;
  }

  for (const project of projects) {
    const toolsForProject = projectTools.filter((item) => item.parentId === project.id).map((item) => item.tool);
    const metrics = projectMetrics.filter((item) => item.parentId === project.id).map((item) => ({ label: item.label, value: item.value }));
    const slug = normalizedKey(project.title).includes("公众号流量主")
      ? "wechat-traffic-monetization"
      : `payload-project-${project.id}`;
    await prisma.project.upsert({
      where: { slug },
      update: {
        title: cleanText(project.title),
        type: "CONTENT",
        description: lexicalText(project.description),
        coverImage: "/assets/icons/icon-writing.png",
        meta: { tools: toolsForProject, metrics, sourceCategory: project.category },
        status: project.status === "published" ? "PUBLISHED" : "DRAFT",
        publishedAt: project.status === "published" ? dbDateTime(project.created_at) : null
      },
      create: {
        id: stableId("pp", project.id),
        title: cleanText(project.title),
        slug,
        type: "CONTENT",
        description: lexicalText(project.description),
        coverImage: "/assets/icons/icon-writing.png",
        meta: { tools: toolsForProject, metrics, sourceCategory: project.category },
        status: project.status === "published" ? "PUBLISHED" : "DRAFT",
        sortOrder: Number(project.sort_order) || 0,
        publishedAt: project.status === "published" ? dbDateTime(project.created_at) : null,
        createdAt: dbDateTime(project.created_at),
        updatedAt: dbDateTime(project.updated_at)
      }
    });
    imported.publicProjects += 1;
  }

  for (const inquiry of inquiries) {
    const status = inquiry.status === "confirmed" ? "CONFIRMED"
      : inquiry.status === "closed" ? "COMPLETED"
        : "PENDING";
    await prisma.appointment.upsert({
      where: { id: stableId("pi", inquiry.id) },
      update: {},
      create: {
        id: stableId("pi", inquiry.id),
        name: cleanText(inquiry.name),
        phone: cleanText(inquiry.phone) || null,
        wechat: cleanText(inquiry.wechat) || null,
        email: cleanText(inquiry.email) || null,
        serviceType: cleanText(inquiry.consultation_type),
        message: cleanText(inquiry.current_problem),
        status,
        source: "payload-my-website",
        notes: cleanText(inquiry.admin_notes) || null,
        createdAt: dbDateTime(inquiry.created_at),
        updatedAt: dbDateTime(inquiry.updated_at)
      }
    });
    imported.appointments += 1;
  }

  await prisma.siteSetting.upsert({
    where: { settingKey: "contact.email" },
    update: { settingValue: "363811256@qq.com", isPublic: true },
    create: { settingKey: "contact.email", settingValue: "363811256@qq.com", group: "contact", label: "联系邮箱", isPublic: true }
  });
  return imported;
}

const prisma = createPrisma();
try {
  const user = await prisma.user.findUniqueOrThrow({ where: { username } });
  const workspace = await prisma.workspace.upsert({
    where: { ownerId: user.id },
    update: {},
    create: { ownerId: user.id }
  });
  const [management, content] = await Promise.all([
    mergeManagementSystem(prisma, workspace.id),
    mergeContentSystem(prisma, user.id)
  ]);
  console.log(JSON.stringify({ management, content }, null, 2));
} finally {
  await prisma.$disconnect();
}
