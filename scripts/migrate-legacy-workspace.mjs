import "dotenv/config";

import { createCipheriv, createHash, randomBytes } from "node:crypto";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync
} from "node:fs";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import { ClassicLevel } from "classic-level";

const DEFAULT_CHROME_LEVELDB = join(
  process.env.HOME || "",
  "Library/Application Support/Google/Chrome/Default/Local Storage/leveldb"
);
const MANAGER_STORAGE_KEY = "xiaoyao-management-system-v1";
const GROWTH_STORAGE_KEY = "xiaoyao:growth-workspace:v1";
const TIME_ZONE = "Asia/Shanghai";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const valueAfter = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const exportPath = valueAfter("--export");
const chromeLevelDbPath = valueAfter("--chrome-leveldb") || DEFAULT_CHROME_LEVELDB;
const username = valueAfter("--username") || process.env.ADMIN_USERNAME || "admin";

function cleanText(value) {
  return String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

function normalizedKey(value) {
  return cleanText(value)
    .toLocaleLowerCase("zh-CN")
    .replace(/[\s:：,，。.!！?？、;；'"“”‘’()（）\[\]【】{}<>《》_\-—·・]/g, "");
}

function hash(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function recordId(entityType, key) {
  return `m_${hash(`${entityType}|${key}`).slice(0, 28)}`;
}

function dateOnly(value) {
  if (!value) return "";
  const direct = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  if (direct && String(value).length <= 10) return direct[1];

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return direct?.[1] || "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function dbDate(value) {
  const date = dateOnly(value);
  return date ? new Date(`${date}T00:00:00.000Z`) : null;
}

function dbDateTime(value, fallback = new Date()) {
  const date = value ? new Date(value) : fallback;
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function minDate(...values) {
  return values.filter(Boolean).map(String).sort()[0] || "";
}

function maxDate(...values) {
  return values.filter(Boolean).map(String).sort().at(-1) || "";
}

function mergeRef(target, ref) {
  target.sourceRefs ||= [];
  const key = `${ref.source}|${ref.id || ""}`;
  if (!target.sourceRefs.some((item) => `${item.source}|${item.id || ""}` === key)) {
    target.sourceRefs.push(ref);
  }
}

function mergeUniqueText(...values) {
  const result = [];
  const seen = new Set();
  for (const raw of values.flat()) {
    const value = cleanText(raw);
    const key = normalizedKey(value);
    if (value && !seen.has(key)) {
      result.push(value);
      seen.add(key);
    }
  }
  return result;
}

function parseStoredValue(value) {
  if (!value?.length) return null;
  const encoding = value[0] === 0 ? "utf16le" : "utf8";
  return JSON.parse(value.subarray(1).toString(encoding));
}

async function extractChromeStorage(levelDbPath) {
  const snapshotPath = mkdtempSync(join(tmpdir(), "xiaoyao-localstorage-"));
  cpSync(levelDbPath, snapshotPath, { recursive: true });
  const output = {};
  const db = new ClassicLevel(snapshotPath, {
    keyEncoding: "buffer",
    valueEncoding: "buffer",
    readOnly: true
  });

  try {
    await db.open();
    for await (const [keyBuffer, valueBuffer] of db.iterator()) {
      const rawKey = keyBuffer.toString("utf8");
      const separatorIndex = rawKey.indexOf("\u0000\u0001");
      if (separatorIndex < 0) continue;

      const origin = rawKey.slice(1, separatorIndex);
      const key = rawKey.slice(separatorIndex + 2);
      if (!(key.startsWith("da:") || key === MANAGER_STORAGE_KEY || key === GROWTH_STORAGE_KEY)) {
        continue;
      }

      try {
        output[origin] ||= {};
        output[origin][key] = parseStoredValue(valueBuffer);
      } catch (error) {
        console.warn(`Skipped unreadable LocalStorage value: ${origin} / ${key} (${error.message})`);
      }
    }
  } finally {
    await db.close().catch(() => undefined);
    rmSync(snapshotPath, { recursive: true, force: true });
  }

  return output;
}

async function loadExport() {
  if (exportPath) return JSON.parse(readFileSync(exportPath, "utf8"));
  return extractChromeStorage(chromeLevelDbPath);
}

function sourcePriority(origin) {
  if (origin.includes("127.0.0.1:4173")) return 10;
  if (origin.includes("localhost:3456")) return 20;
  if (origin.includes("localhost:3001")) return 30;
  if (origin.includes("localhost:3000")) return 40;
  return 5;
}

function canonicalProjectName(value) {
  const key = normalizedKey(value).replaceAll("咸鱼", "闲鱼");
  if (key.includes("销售智能体") || key.includes("公众号智能体")) return "公众号智能体";
  if (key.includes("公众号流量主")) return "公众号流量主";
  if (key.includes("闲鱼虚拟资料")) return "闲鱼虚拟资料";
  if (key.includes("知识星球") && (key.includes("分销") || key.includes("推广") || key.includes("大冲"))) {
    return "知识星球推广";
  }
  return cleanText(value).replace(/^副业[：:]/, "").replaceAll("咸鱼", "闲鱼");
}

function taskTypeFromManager(task) {
  if (task.taskKind === "daily" || task.repeatRule === "daily") return "DAILY";
  if (task.taskKind === "stage") return "PHASED";
  return "LONG_TERM";
}

function taskTypeFromWorkBuddy(value) {
  if (value === "DAILY" || value === "HABIT_LEARNING") return "DAILY";
  if (value === "PHASED") return "PHASED";
  return "LONG_TERM";
}

function canonicalTaskTitle(value, type) {
  const text = cleanText(value).replaceAll("咸鱼", "闲鱼");
  const key = normalizedKey(text);
  if (type === "DAILY" && key.includes("小说") && (key.includes("发布") || key.startsWith("发"))) {
    return "发布小说并签约";
  }
  if (type === "DAILY" && key.includes("公众号") && (key.includes("发布") || key.startsWith("发"))) {
    return "公众号发布";
  }
  if (type === "DAILY" && key.includes("闲鱼") && key.includes("商品上架")) return "闲鱼商品上架";
  if (type === "PHASED" && key.includes("贴图")) return "公众号贴图训练营";
  if (type === "LONG_TERM" && key.includes("公众号") && key.includes("文章") && key.includes("发布")) {
    return "公众号文章发布";
  }
  return text;
}

function habitDefinition(typeOrName) {
  const key = normalizedKey(typeOrName);
  if (key.includes("reading") || key.includes("阅读")) {
    return { key: "READING", name: "阅读 30 分钟", type: "READING", frequency: "DAILY", targetCount: 1 };
  }
  if (key.includes("review") || key.includes("复盘")) {
    return { key: "REVIEW", name: "每日复盘", type: "REVIEW", frequency: "DAILY", targetCount: 1 };
  }
  if (key.includes("exercise") || key.includes("运动")) {
    return { key: "EXERCISE", name: "运动 3 次/周", type: "EXERCISE", frequency: "WEEKLY", targetCount: 3 };
  }
  if (key.includes("learning") || key.includes("学习")) {
    return { key: "LEARNING", name: "学习新知识", type: "LEARNING", frequency: "DAILY", targetCount: 1 };
  }
  return { key: `CUSTOM:${key}`, name: cleanText(typeOrName) || "自定义习惯", type: "CUSTOM", frequency: "DAILY", targetCount: 1 };
}

function mapExerciseType(type, content = "") {
  const key = normalizedKey(`${type} ${content}`);
  if (key.includes("跑") || key.includes("running")) return "RUNNING";
  if (key.includes("游泳") || key.includes("swimming")) return "SWIMMING";
  if (key.includes("骑") || key.includes("cycling")) return "CYCLING";
  if (key.includes("力量") || key.includes("strength")) return "STRENGTH";
  if (key.includes("瑜伽") || key.includes("yoga")) return "YOGA";
  if (key.includes("走") || key.includes("walking")) return "WALKING";
  return "OTHER";
}

function externalBookId(book) {
  if (book.wereadBookId) return String(book.wereadBookId);
  const match = String(book.id || "").match(/(?:b-weread-|weread-)(\d+)/);
  return match?.[1] || "";
}

function buildCanonicalData(storage) {
  const tasks = new Map();
  const taskRecords = new Map();
  const habits = new Map();
  const habitRecords = new Map();
  const projects = new Map();
  const transactions = new Map();
  const books = new Map();
  const bookByExternalId = new Map();
  const bookByTitle = new Map();
  const readingSessions = new Map();
  const exercises = new Map();
  const topics = new Map();
  const learningSessions = new Map();
  const inspirations = new Map();
  const reviews = new Map();
  const projectSourceIds = new Map();
  const taskSourceIds = new Map();
  const topicSourceIds = new Map();
  const profiles = [];
  const connections = new Map();
  const archive = { schedules: [], drafts: [], assistants: [], unsupportedIntegrations: [] };

  function addProject(input, source, priority) {
    const name = canonicalProjectName(input.name);
    if (!name) return "";
    const key = normalizedKey(name);
    const current = projects.get(key) || {
      key,
      name,
      descriptions: [],
      startDate: "",
      endDate: "",
      createdAt: "",
      updatedAt: "",
      sourceRefs: []
    };
    current.name = name;
    current.descriptions = mergeUniqueText(current.descriptions, input.description, input.details);
    current.startDate = minDate(current.startDate, dateOnly(input.startDate));
    current.endDate = maxDate(current.endDate, dateOnly(input.endDate));
    current.createdAt = minDate(current.createdAt, input.createdAt);
    current.updatedAt = maxDate(current.updatedAt, input.updatedAt, input.createdAt);
    current.priority = Math.max(current.priority || 0, priority);
    mergeRef(current, source);
    projects.set(key, current);
    if (source.id) projectSourceIds.set(`${source.source}|${source.id}`, key);
    return key;
  }

  function addTask(input, source, priority) {
    const type = input.type;
    const title = canonicalTaskTitle(input.title, type);
    if (!title) return "";
    const key = `${type}|${normalizedKey(title)}`;
    const current = tasks.get(key) || {
      key,
      title,
      type,
      priority: "MEDIUM",
      status: "TODO",
      progress: 0,
      descriptions: [],
      startDate: "",
      dueDate: "",
      completedAt: "",
      createdAt: "",
      updatedAt: "",
      sourceRefs: []
    };
    current.title = title;
    if (input.priority === "HIGH" || current.priority !== "HIGH" && input.priority === "MEDIUM") {
      current.priority = input.priority || current.priority;
    }
    current.progress = Math.max(current.progress || 0, Number(input.progress) || 0);
    current.status = input.completed || current.status === "DONE"
      ? "DONE"
      : current.progress > 0 ? "IN_PROGRESS" : "TODO";
    current.descriptions = mergeUniqueText(current.descriptions, input.description, input.subtaskSummary);
    current.startDate = minDate(current.startDate, dateOnly(input.startDate));
    current.dueDate = maxDate(current.dueDate, dateOnly(input.dueDate));
    current.completedAt = maxDate(current.completedAt, input.completedAt);
    current.createdAt = minDate(current.createdAt, input.createdAt);
    current.updatedAt = maxDate(current.updatedAt, input.updatedAt, input.createdAt);
    current.sourcePriority = Math.max(current.sourcePriority || 0, priority);
    mergeRef(current, source);
    tasks.set(key, current);
    if (source.id) taskSourceIds.set(`${source.source}|${source.id}`, key);
    return key;
  }

  function addTaskRecord(taskKey, input, source) {
    const recordDate = dateOnly(input.date);
    if (!taskKey || !recordDate) return;
    const key = `${taskKey}|${recordDate}`;
    const current = taskRecords.get(key) || {
      key,
      taskKey,
      recordDate,
      completed: false,
      progress: 0,
      notes: [],
      completedAt: "",
      sourceRefs: []
    };
    current.completed ||= Boolean(input.completed);
    current.progress = Math.max(current.progress, Number(input.progress) || (input.completed ? 100 : 0));
    current.notes = mergeUniqueText(current.notes, input.notes);
    current.completedAt = maxDate(current.completedAt, input.completedAt);
    mergeRef(current, source);
    taskRecords.set(key, current);
  }

  function addHabit(input, source) {
    const definition = habitDefinition(input.type || input.name);
    const current = habits.get(definition.key) || {
      ...definition,
      descriptions: [],
      color: input.color || "",
      createdAt: input.createdAt || "",
      sourceRefs: []
    };
    current.descriptions = mergeUniqueText(current.descriptions, input.description, input.note);
    current.color ||= input.color || "";
    current.createdAt = minDate(current.createdAt, input.createdAt);
    mergeRef(current, source);
    habits.set(definition.key, current);
    return definition.key;
  }

  function addHabitRecord(habitKey, input, source) {
    const recordDate = dateOnly(input.date);
    if (!habitKey || !recordDate) return;
    const key = `${habitKey}|${recordDate}`;
    const current = habitRecords.get(key) || {
      key,
      habitKey,
      recordDate,
      completed: false,
      notes: [],
      sourceRefs: []
    };
    current.completed ||= Boolean(input.completed);
    current.notes = mergeUniqueText(current.notes, input.notes);
    mergeRef(current, source);
    habitRecords.set(key, current);
  }

  function addTransaction(input, source, priority) {
    const projectKey = input.projectKey;
    const date = dateOnly(input.date);
    if (!projectKey || !date || !Number.isFinite(Number(input.amount))) return;
    const type = input.type === "EXPENSE" ? "EXPENSE" : "INCOME";
    const key = `${projectKey}|${date}|${type}`;
    const current = transactions.get(key) || {
      key,
      projectKey,
      date,
      type,
      amount: Number(input.amount),
      category: "",
      note: "",
      priority: -1,
      createdAt: "",
      updatedAt: "",
      sourceRefs: []
    };
    if (priority >= current.priority) {
      current.amount = Number(input.amount);
      current.category = cleanText(input.category) || current.category;
      current.note = cleanText(input.note) || current.note;
      current.priority = priority;
      current.createdAt = input.createdAt || current.createdAt;
      current.updatedAt = input.updatedAt || input.createdAt || current.updatedAt;
    }
    mergeRef(current, source);
    transactions.set(key, current);
  }

  function addBook(input, source, priority) {
    const title = cleanText(input.title);
    if (!title) return null;
    const author = cleanText(input.author);
    const externalId = externalBookId(input);
    const titleKey = `${normalizedKey(title)}|${normalizedKey(author)}`;
    let current = externalId ? bookByExternalId.get(externalId) : null;
    current ||= bookByTitle.get(titleKey);
    if (!current) {
      const key = externalId ? `weread:${externalId}` : `manual:${titleKey}`;
      current = {
        key,
        title,
        author,
        externalId,
        source: externalId || String(input.source || "").toLowerCase().includes("微信") ? "WEREAD" : "MANUAL",
        coverUrl: "",
        totalPages: null,
        currentPage: 0,
        createdAt: "",
        updatedAt: "",
        sourceRefs: [],
        priority: -1
      };
      books.set(key, current);
    }
    if (priority >= current.priority) {
      current.title = title;
      current.author = author || current.author;
      current.coverUrl = cleanText(input.cover || input.coverUrl) || current.coverUrl;
      current.totalPages = Number(input.totalPages) > 0 ? Number(input.totalPages) : current.totalPages;
      current.currentPage = Math.max(current.currentPage, Number(input.currentPage) || 0);
      current.externalId ||= externalId;
      current.source = current.externalId || String(input.source || "").toLowerCase().includes("微信") ? "WEREAD" : current.source;
      current.priority = priority;
    }
    current.createdAt = minDate(current.createdAt, input.createdAt || input.addedAt);
    current.updatedAt = maxDate(current.updatedAt, input.updatedAt, input.lastReadDate, input.createdAt, input.addedAt);
    mergeRef(current, source);
    if (externalId) bookByExternalId.set(externalId, current);
    bookByTitle.set(titleKey, current);
    return current;
  }

  function addReadingSession(book, input, source) {
    const readOn = dateOnly(input.date || input.createdAt);
    if (!book || !readOn) return;
    const note = cleanText(input.note || input.content || input.insight);
    const page = Number(input.page) || null;
    const key = `${book.key}|${readOn}|${page || 0}|${normalizedKey(note)}`;
    const current = readingSessions.get(key) || {
      key,
      bookKey: book.key,
      readOn,
      durationMinutes: Number(input.durationMinutes || input.duration) || 0,
      startPage: page,
      endPage: page,
      note,
      metric: cleanText(input.metric),
      createdAt: input.createdAt || "",
      sourceRefs: []
    };
    current.durationMinutes = Math.max(current.durationMinutes, Number(input.durationMinutes || input.duration) || 0);
    current.note ||= note;
    mergeRef(current, source);
    readingSessions.set(key, current);
  }

  function addExercise(input, source, priority) {
    const date = dateOnly(input.date);
    const exerciseType = mapExerciseType(input.type, input.content || input.title);
    if (!date) return;
    const key = `${date}|${exerciseType}`;
    const distanceMatch = String(input.content || input.metric || "").match(/(\d+(?:\.\d+)?)\s*公里/);
    const current = exercises.get(key) || {
      key,
      date,
      exerciseType,
      title: "",
      durationMinutes: 0,
      distanceKm: null,
      calories: null,
      notes: [],
      metric: "",
      priority: -1,
      createdAt: "",
      sourceRefs: []
    };
    current.title ||= cleanText(input.content || input.title);
    current.durationMinutes = Math.max(current.durationMinutes, Number(input.duration || input.durationMinutes) || 0);
    current.distanceKm ||= distanceMatch ? Number(distanceMatch[1]) : Number(input.distanceKm) || null;
    current.calories ||= Number(input.calories) || null;
    current.notes = mergeUniqueText(current.notes, input.note, input.notes, input.intensity ? `强度：${input.intensity}` : "");
    current.metric ||= cleanText(input.metric) || (current.distanceKm ? `${current.distanceKm} 公里` : "");
    current.priority = Math.max(current.priority, priority);
    current.createdAt = minDate(current.createdAt, input.createdAt);
    mergeRef(current, source);
    exercises.set(key, current);
  }

  function addTopic(input, source) {
    const title = cleanText(input.title || input.subject);
    if (!title) return "";
    const key = normalizedKey(title);
    const current = topics.get(key) || {
      key,
      title,
      description: cleanText(input.description),
      createdAt: input.createdAt || "",
      sourceRefs: []
    };
    current.description ||= cleanText(input.description);
    current.createdAt = minDate(current.createdAt, input.createdAt);
    mergeRef(current, source);
    topics.set(key, current);
    if (source.id) topicSourceIds.set(`${source.source}|${source.id}`, key);
    return key;
  }

  function addLearningSession(topicKey, input, source, priority) {
    const date = dateOnly(input.date);
    if (!topicKey || !date) return;
    const key = `${topicKey}|${date}`;
    const current = learningSessions.get(key) || {
      key,
      topicKey,
      date,
      durationMinutes: 0,
      notes: "",
      metric: "",
      priority: -1,
      createdAt: "",
      sourceRefs: []
    };
    if (priority >= current.priority) {
      current.durationMinutes = Number(input.duration || input.durationMinutes) || current.durationMinutes;
      current.notes = cleanText(input.notes || input.content) || current.notes;
      current.metric = cleanText(input.metric) || current.metric;
      current.priority = priority;
    }
    current.createdAt = minDate(current.createdAt, input.createdAt);
    mergeRef(current, source);
    learningSessions.set(key, current);
  }

  function addInspiration(input, source) {
    const date = dateOnly(input.date || input.createdAt);
    const content = cleanText(input.content);
    if (!date || !content) return;
    const key = `${date}|${normalizedKey(content)}`;
    const current = inspirations.get(key) || {
      key,
      date,
      title: cleanText(input.title),
      content,
      tags: [],
      createdAt: input.createdAt || `${date}T12:00:00.000Z`,
      sourceRefs: []
    };
    current.title ||= cleanText(input.title);
    current.tags = mergeUniqueText(
      current.tags,
      Array.isArray(input.tags) ? input.tags : String(input.tags || "").split(/[，,、]/)
    );
    mergeRef(current, source);
    inspirations.set(key, current);
  }

  function addReview(input, source, priority) {
    const date = dateOnly(input.date);
    if (!date) return;
    const key = date;
    const current = reviews.get(key) || {
      key,
      date,
      title: "每日复盘",
      content: "",
      wins: "",
      challenges: "",
      nextActions: "",
      syncedToObsidian: false,
      syncedToIma: false,
      priority: -1,
      createdAt: "",
      updatedAt: "",
      sourceRefs: []
    };
    if (priority >= current.priority) {
      current.content = String(input.content || "").trim() || current.content;
      current.wins = String(input.win || input.wins || "").trim() || current.wins;
      current.challenges = String(input.lesson || input.challenges || "").trim() || current.challenges;
      current.nextActions = String(input.next || input.nextActions || "").trim() || current.nextActions;
      current.priority = priority;
    }
    current.syncedToObsidian ||= Boolean(input.syncedToObsidian);
    current.syncedToIma ||= Boolean(input.syncedToIma);
    current.createdAt = minDate(current.createdAt, input.createdAt);
    current.updatedAt = maxDate(current.updatedAt, input.updatedAt, input.createdAt);
    mergeRef(current, source);
    reviews.set(key, current);
  }

  function addConnection(provider, input, source, priority) {
    const current = connections.get(provider) || {
      provider,
      endpoint: "",
      apiKey: "",
      status: "DISCONNECTED",
      lastSyncedAt: "",
      priority: -1,
      sourceRefs: []
    };
    if (priority >= current.priority) {
      current.endpoint = cleanText(input.endpoint) || current.endpoint;
      current.apiKey = cleanText(input.apiKey) || current.apiKey;
      current.status = input.enabled || current.apiKey || current.endpoint ? "CONNECTED" : current.status;
      current.priority = priority;
    }
    current.lastSyncedAt = maxDate(current.lastSyncedAt, input.lastSyncedAt);
    mergeRef(current, source);
    connections.set(provider, current);
  }

  const orderedOrigins = Object.entries(storage).sort(([a], [b]) => sourcePriority(a) - sourcePriority(b));
  for (const [origin, values] of orderedOrigins) {
    const priority = sourcePriority(origin);
    const manager = values[MANAGER_STORAGE_KEY];
    if (manager) {
      const sourceName = `${origin}#${MANAGER_STORAGE_KEY}`;
      profiles.push({
        priority,
        displayName: manager.profile?.username,
        email: manager.profile?.email,
        phone: manager.profile?.phone,
        wechat: manager.profile?.wechat,
        source: sourceName
      });

      for (const project of manager.projects || []) {
        const details = mergeUniqueText(
          project.stage ? `当前阶段：${project.stage}` : "",
          project.next ? `下一步：${project.next}` : "",
          project.risk ? `风险：${project.risk}${project.riskReason ? `（${project.riskReason}）` : ""}` : ""
        ).join("\n");
        addProject({ ...project, details }, { source: sourceName, id: project.id }, priority);
      }

      for (const entry of manager.revenueEntries || []) {
        const projectKey = addProject(
          { name: entry.project },
          { source: sourceName, id: `revenue-project:${entry.project}` },
          priority
        );
        addTransaction(
          {
            projectKey,
            date: entry.date,
            type: "INCOME",
            amount: Number(entry.amount),
            category: entry.channel,
            note: entry.note
          },
          { source: sourceName, id: entry.id },
          priority
        );
      }

      for (const task of manager.tasks || []) {
        const type = taskTypeFromManager(task);
        const subtasks = (task.subtasks || []).map((item) => `${item.completed || item.done ? "[x]" : "[ ]"} ${item.title}`).join("\n");
        const taskKey = addTask(
          {
            type,
            title: task.title,
            priority: task.importance === "高" ? "HIGH" : task.importance === "低" ? "LOW" : "MEDIUM",
            progress: task.progress,
            completed: task.done,
            description: mergeUniqueText(
              task.project ? `所属项目：${task.project}` : "",
              task.due ? `计划时间：${task.due}` : ""
            ).join("\n"),
            subtaskSummary: subtasks ? `子任务：\n${subtasks}` : "",
            startDate: task.startDate,
            dueDate: task.endDate,
            completedAt: task.completedAt,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt || task.completedAt
          },
          { source: sourceName, id: task.id },
          priority
        );
        if (type === "DAILY" && task.done && task.completedAt) {
          addTaskRecord(taskKey, { date: task.completedAt, completed: true, progress: 100, completedAt: task.completedAt }, { source: sourceName, id: task.id });
        }
      }

      for (const goal of manager.goals || []) {
        addTask(
          {
            type: "LONG_TERM",
            title: goal.name,
            priority: "MEDIUM",
            progress: goal.progress,
            completed: Number(goal.progress) >= 100
          },
          { source: sourceName, id: goal.id },
          priority
        );
      }

      for (const habit of manager.habits || []) {
        addHabit(
          { name: habit.name, description: habit.note },
          { source: sourceName, id: habit.id }
        );
      }

      for (const log of manager.completionLog || []) {
        const source = { source: sourceName, id: log.id };
        if (String(log.taskId || "").startsWith("habit-task-")) {
          const habitKey = addHabit({ name: log.title }, source);
          addHabitRecord(habitKey, { date: log.completedAt, completed: true }, source);
          continue;
        }
        let taskKey = taskSourceIds.get(`${sourceName}|${log.taskId}`);
        taskKey ||= addTask(
          { type: "DAILY", title: log.title, priority: "MEDIUM", description: log.project ? `所属项目：${log.project}` : "" },
          { source: sourceName, id: log.taskId },
          priority
        );
        addTaskRecord(taskKey, { date: log.completedAt, completed: true, progress: 100, completedAt: log.completedAt }, source);
      }

      for (const book of manager.books || []) {
        addBook(book, { source: sourceName, id: book.id }, priority);
      }
      for (const note of manager.readingNotes || []) {
        const book = addBook({ title: note.book, source: "微信读书" }, { source: sourceName, id: `note-book:${note.book}` }, priority);
        addReadingSession(book, { ...note, note: note.insight }, { source: sourceName, id: note.id });
      }
      for (const entry of manager.exerciseRecords || []) {
        addExercise(entry, { source: sourceName, id: entry.id }, priority);
      }
      for (const entry of manager.learningRecords || []) {
        const topicKey = addTopic({ title: entry.subject || entry.title }, { source: sourceName, id: entry.topicId || entry.id });
        addLearningSession(topicKey, entry, { source: sourceName, id: entry.id }, priority);
      }
      for (const entry of manager.inspirationRecords || []) {
        addInspiration(entry, { source: sourceName, id: entry.id });
      }
      for (const review of manager.reviews || []) {
        addReview(review, { source: sourceName, id: review.id || review.date }, priority);
      }

      for (const integration of manager.integrations || []) {
        const provider = String(integration.id || "").toLowerCase();
        if (["weread", "obsidian", "ima"].includes(provider)) {
          addConnection(provider.toUpperCase(), integration, { source: sourceName, id: integration.id }, priority);
        } else if (integration.enabled || integration.endpoint || integration.token) {
          archive.unsupportedIntegrations.push(integration);
        }
      }
      if (manager.weread?.lastSync) {
        addConnection("WEREAD", { endpoint: "https://weread.qq.com/", enabled: true, lastSyncedAt: manager.weread.lastSync }, { source: sourceName, id: "weread" }, priority);
      }

      if ((manager.schedule || []).length) archive.schedules.push({ source: sourceName, items: manager.schedule });
      if (manager.reviewDraft && Object.values(manager.reviewDraft).some(Boolean)) archive.drafts.push({ source: sourceName, type: "review", value: manager.reviewDraft });
      if ((manager.readingDrafts || []).length) archive.drafts.push({ source: sourceName, type: "reading", value: manager.readingDrafts });
      if (manager.readingAssistant && Object.values(manager.readingAssistant).some(Boolean)) archive.assistants.push({ source: sourceName, type: "reading", value: manager.readingAssistant });
      if (manager.hermes?.messages?.length) archive.assistants.push({ source: sourceName, type: "hermes", value: manager.hermes });
    }

    const daSourceName = `${origin}#daily-admin`;
    const profile = values["da:user:profile"] || values["da:auth:user"];
    if (profile) {
      profiles.push({
        priority,
        displayName: profile.displayName,
        email: profile.email,
        phone: profile.phone,
        wechat: profile.wechatId,
        source: daSourceName
      });
    }

    for (const project of values["da:projects"] || []) {
      addProject(project, { source: daSourceName, id: project.id }, priority);
    }

    for (const task of values["da:tasks"] || []) {
      const type = taskTypeFromWorkBuddy(task.taskType);
      const subtasks = (task.subtasks || []).map((item) => `${item.completed ? "[x]" : "[ ]"} ${item.title}`).join("\n");
      const taskKey = addTask(
        {
          type,
          title: task.title,
          priority: task.priority || "MEDIUM",
          progress: task.completed ? 100 : 0,
          completed: task.completed,
          subtaskSummary: subtasks ? `子任务：\n${subtasks}` : "",
          dueDate: task.targetDate,
          completedAt: task.completed ? task.updatedAt : "",
          createdAt: task.createdAt,
          updatedAt: task.updatedAt
        },
        { source: daSourceName, id: task.id },
        priority
      );
      for (const record of task.dailyRecords || []) {
        addTaskRecord(taskKey, record, { source: daSourceName, id: `${task.id}:${record.date}` });
        if (task.habitLinked && record.completed) {
          const habitKey = addHabit({ type: task.habitLinked }, { source: daSourceName, id: `habit:${task.habitLinked}` });
          addHabitRecord(habitKey, { date: record.date, completed: true, notes: record.notes }, { source: daSourceName, id: `${task.id}:${record.date}` });
        }
      }
      if (type === "DAILY" && task.completed && task.date) {
        addTaskRecord(taskKey, { date: task.date, completed: true, progress: 100, completedAt: task.updatedAt }, { source: daSourceName, id: task.id });
      }
    }

    for (const entry of values["da:habits"] || []) {
      const source = { source: daSourceName, id: entry.id };
      const habitKey = addHabit({ type: entry.type }, source);
      addHabitRecord(habitKey, entry, source);
    }

    for (const entry of values["da:transactions"] || []) {
      const projectKey = projectSourceIds.get(`${daSourceName}|${entry.projectId}`);
      addTransaction(
        {
          projectKey,
          date: entry.date,
          type: entry.type,
          amount: Number(entry.amount) / 100,
          note: entry.note,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt
        },
        { source: daSourceName, id: entry.id },
        priority
      );
    }

    for (const book of values["da:books"] || []) {
      addBook(book, { source: daSourceName, id: book.id }, priority);
    }
    for (const note of values["da:reading_notes"] || []) {
      const book = [...books.values()].find((item) => item.sourceRefs.some((ref) => ref.source === daSourceName && ref.id === note.bookId));
      addReadingSession(book, note, { source: daSourceName, id: note.id });
    }
    for (const entry of values["da:exercises"] || []) {
      addExercise(entry, { source: daSourceName, id: entry.id }, priority);
    }
    for (const topic of values["da:learning_topics"] || []) {
      addTopic(topic, { source: daSourceName, id: topic.id });
    }
    for (const entry of values["da:learning_entries"] || []) {
      const topicKey = topicSourceIds.get(`${daSourceName}|${entry.topicId}`);
      addLearningSession(topicKey, entry, { source: daSourceName, id: entry.id }, priority);
    }
    for (const entry of values["da:inspirations"] || []) {
      addInspiration(entry, { source: daSourceName, id: entry.id });
    }
    for (const review of values["da:reviews"] || []) {
      addReview(review, { source: daSourceName, id: review.id }, priority);
    }

    const wereadSync = values["da:weread_sync"];
    const wereadApiKey = values["da:weread_api_key"];
    if (wereadSync || wereadApiKey) {
      addConnection(
        "WEREAD",
        {
          endpoint: "https://weread.qq.com/",
          apiKey: wereadApiKey,
          enabled: Boolean(wereadApiKey),
          lastSyncedAt: wereadSync?.lastSyncAt
        },
        { source: daSourceName, id: "weread" },
        priority
      );
    }
    const obsidian = values["da:obsidian_config"];
    if (obsidian?.enabled || obsidian?.vaultPath) {
      addConnection(
        "OBSIDIAN",
        {
          endpoint: obsidian.vaultPath ? `obsidian://open?vault=${encodeURIComponent(basename(obsidian.vaultPath))}` : "",
          enabled: obsidian.enabled
        },
        { source: daSourceName, id: "obsidian" },
        priority
      );
      archive.unsupportedIntegrations.push({ source: daSourceName, provider: "OBSIDIAN", settings: obsidian });
    }
    const ima = values["da:ima_config"];
    if (ima?.enabled || ima?.knowledgeBaseId) {
      addConnection("IMA", { enabled: ima.enabled }, { source: daSourceName, id: "ima" }, priority);
      archive.unsupportedIntegrations.push({ source: daSourceName, provider: "IMA", settings: ima });
    }

    const growth = values[GROWTH_STORAGE_KEY];
    if (growth) {
      const sourceName = `${origin}#${GROWTH_STORAGE_KEY}`;
      for (const project of growth.projects || []) {
        addProject(project, { source: sourceName, id: project.id }, priority + 5);
      }
      for (const task of growth.tasks || []) {
        const type = task.group === "daily" ? "DAILY" : task.group === "phased" ? "PHASED" : "LONG_TERM";
        const taskKey = addTask({ ...task, type, completed: task.completed }, { source: sourceName, id: task.id }, priority + 5);
        if (type === "DAILY") addTaskRecord(taskKey, { date: new Date(), completed: task.completed, progress: task.progress }, { source: sourceName, id: task.id });
      }
      for (const habit of growth.habits || []) addHabit({ name: habit.label, description: habit.description, color: habit.tone }, { source: sourceName, id: habit.id });
      for (const entry of growth.growth || []) {
        if (entry.category === "exercise") addExercise({ ...entry, date: entry.date, title: entry.title, notes: entry.detail, metric: entry.metric }, { source: sourceName, id: entry.id }, priority + 5);
        if (entry.category === "inspiration") addInspiration({ ...entry, content: entry.detail }, { source: sourceName, id: entry.id });
        if (entry.category === "review") addReview({ ...entry, content: entry.detail }, { source: sourceName, id: entry.id }, priority + 5);
        if (entry.category === "learning") {
          const topicKey = addTopic({ title: entry.title }, { source: sourceName, id: entry.title });
          addLearningSession(topicKey, { date: entry.date, notes: entry.detail, metric: entry.metric }, { source: sourceName, id: entry.id }, priority + 5);
        }
        if (entry.category === "reading") {
          const book = addBook({ title: entry.title }, { source: sourceName, id: entry.title }, priority + 5);
          addReadingSession(book, { date: entry.date, note: entry.detail, metric: entry.metric }, { source: sourceName, id: entry.id });
        }
      }
    }
  }

  return {
    origins: Object.keys(storage),
    tasks: [...tasks.values()],
    taskRecords: [...taskRecords.values()],
    habits: [...habits.values()],
    habitRecords: [...habitRecords.values()],
    projects: [...projects.values()],
    transactions: [...transactions.values()],
    books: [...new Set(books.values())],
    readingSessions: [...readingSessions.values()],
    exercises: [...exercises.values()],
    topics: [...topics.values()],
    learningSessions: [...learningSessions.values()],
    inspirations: [...inspirations.values()],
    reviews: [...reviews.values()],
    profiles: profiles.sort((a, b) => b.priority - a.priority),
    connections: [...connections.values()],
    archive
  };
}

function summary(data) {
  return {
    sources: data.origins,
    tasks: data.tasks.length,
    taskRecords: data.taskRecords.length,
    habits: data.habits.length,
    habitRecords: data.habitRecords.length,
    projects: data.projects.length,
    transactions: data.transactions.length,
    books: data.books.length,
    readingSessions: data.readingSessions.length,
    exercises: data.exercises.length,
    learningTopics: data.topics.length,
    learningSessions: data.learningSessions.length,
    inspirations: data.inspirations.length,
    reviews: data.reviews.length,
    connections: data.connections.filter((item) => item.status === "CONNECTED").length
  };
}

function createPrisma() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured.");
  const url = new URL(databaseUrl);
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

function encryptConfig(config) {
  const value = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!value || !/^[a-f0-9]{64}$/i.test(value)) {
    throw new Error("SETTINGS_ENCRYPTION_KEY must be a 32-byte hexadecimal value.");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(value, "hex"), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(config), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

async function importCanonicalData(data) {
  const prisma = createPrisma();
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) throw new Error(`User not found: ${username}`);
    const workspace = await prisma.workspace.upsert({
      where: { ownerId: user.id },
      update: {},
      create: { ownerId: user.id }
    });

    const result = await prisma.$transaction(async (tx) => {
      const imported = {};
      const tracked = async (entityType, key, canonicalId, refs, operation) => {
        const fingerprint = hash(`${entityType}|${key}`);
        const existing = await tx.workspaceImportItem.findUnique({
          where: { workspaceId_entityType_fingerprint: { workspaceId: workspace.id, entityType, fingerprint } }
        });
        if (existing) return false;
        await operation();
        await tx.workspaceImportItem.create({
          data: {
            workspaceId: workspace.id,
            entityType,
            fingerprint,
            recordId: canonicalId,
            sourceRefs: refs
          }
        });
        imported[entityType] = (imported[entityType] || 0) + 1;
        return true;
      };

      for (const project of data.projects) {
        const id = recordId("project", project.key);
        await tracked("project", project.key, id, project.sourceRefs, () => tx.workspaceProject.upsert({
          where: { id },
          update: {},
          create: {
            id,
            workspaceId: workspace.id,
            name: project.name,
            description: project.descriptions.join("\n"),
            startedOn: dbDate(project.startDate),
            endedOn: dbDate(project.endDate),
            createdAt: dbDateTime(project.createdAt),
            updatedAt: dbDateTime(project.updatedAt || project.createdAt)
          }
        }));
      }

      for (const task of data.tasks) {
        const id = recordId("task", task.key);
        await tracked("task", task.key, id, task.sourceRefs, () => tx.workspaceTask.upsert({
          where: { id },
          update: {},
          create: {
            id,
            workspaceId: workspace.id,
            title: task.title,
            description: task.descriptions.join("\n"),
            type: task.type,
            priority: task.priority,
            status: task.type === "DAILY" ? "TODO" : task.status,
            progress: task.progress,
            startDate: dbDate(task.startDate),
            dueDate: dbDate(task.dueDate),
            completedAt: task.type !== "DAILY" && task.status === "DONE" ? dbDateTime(task.completedAt) : null,
            createdAt: dbDateTime(task.createdAt),
            updatedAt: dbDateTime(task.updatedAt || task.createdAt)
          }
        }));
      }

      for (const habit of data.habits) {
        const id = recordId("habit", habit.key);
        await tracked("habit", habit.key, id, habit.sourceRefs, () => tx.workspaceHabit.upsert({
          where: { id },
          update: {},
          create: {
            id,
            workspaceId: workspace.id,
            name: habit.name,
            type: habit.type,
            description: habit.descriptions.join("\n"),
            frequency: habit.frequency,
            targetCount: habit.targetCount,
            color: habit.color || null,
            createdAt: dbDateTime(habit.createdAt)
          }
        }));
      }

      for (const book of data.books) {
        const id = recordId("book", book.key);
        await tracked("book", book.key, id, book.sourceRefs, () => tx.readingBook.upsert({
          where: { id },
          update: {},
          create: {
            id,
            workspaceId: workspace.id,
            title: book.title,
            author: book.author || null,
            coverUrl: book.coverUrl || null,
            totalPages: book.totalPages,
            currentPage: book.currentPage,
            source: book.source,
            externalId: book.externalId || null,
            finishedOn: book.totalPages && book.currentPage >= book.totalPages ? dbDate(book.updatedAt) : null,
            createdAt: dbDateTime(book.createdAt),
            updatedAt: dbDateTime(book.updatedAt || book.createdAt)
          }
        }));
      }

      for (const topic of data.topics) {
        const id = recordId("learningTopic", topic.key);
        await tracked("learningTopic", topic.key, id, topic.sourceRefs, () => tx.learningTopic.upsert({
          where: { id },
          update: {},
          create: {
            id,
            workspaceId: workspace.id,
            title: topic.title,
            description: topic.description || null,
            createdAt: dbDateTime(topic.createdAt)
          }
        }));
      }

      for (const entry of data.taskRecords) {
        const id = recordId("taskRecord", entry.key);
        await tracked("taskRecord", entry.key, id, entry.sourceRefs, () => tx.workspaceTaskRecord.upsert({
          where: { id },
          update: {},
          create: {
            id,
            taskId: recordId("task", entry.taskKey),
            recordDate: dbDate(entry.recordDate),
            completed: entry.completed,
            progress: entry.progress,
            notes: entry.notes.join("\n") || null,
            completedAt: entry.completed ? dbDateTime(entry.completedAt || `${entry.recordDate}T12:00:00+08:00`) : null
          }
        }));
      }

      for (const entry of data.habitRecords) {
        const id = recordId("habitRecord", entry.key);
        await tracked("habitRecord", entry.key, id, entry.sourceRefs, () => tx.workspaceHabitRecord.upsert({
          where: { id },
          update: {},
          create: {
            id,
            habitId: recordId("habit", entry.habitKey),
            recordDate: dbDate(entry.recordDate),
            completed: entry.completed,
            notes: entry.notes.join("\n") || null
          }
        }));
      }

      for (const entry of data.transactions) {
        const id = recordId("transaction", entry.key);
        await tracked("transaction", entry.key, id, entry.sourceRefs, () => tx.workspaceTransaction.upsert({
          where: { id },
          update: {},
          create: {
            id,
            projectId: recordId("project", entry.projectKey),
            type: entry.type,
            amount: entry.amount,
            category: entry.category || null,
            note: entry.note || null,
            transactedOn: dbDate(entry.date),
            createdAt: dbDateTime(entry.createdAt),
            updatedAt: dbDateTime(entry.updatedAt || entry.createdAt)
          }
        }));
      }

      for (const entry of data.readingSessions) {
        const id = recordId("readingSession", entry.key);
        await tracked("readingSession", entry.key, id, entry.sourceRefs, () => tx.readingSession.upsert({
          where: { id },
          update: {},
          create: {
            id,
            bookId: recordId("book", entry.bookKey),
            readOn: dbDate(entry.readOn),
            durationMinutes: entry.durationMinutes,
            startPage: entry.startPage,
            endPage: entry.endPage,
            metric: entry.metric || null,
            note: entry.note || null,
            createdAt: dbDateTime(entry.createdAt)
          }
        }));
      }

      for (const entry of data.exercises) {
        const id = recordId("exercise", entry.key);
        await tracked("exercise", entry.key, id, entry.sourceRefs, () => tx.exerciseRecord.upsert({
          where: { id },
          update: {},
          create: {
            id,
            workspaceId: workspace.id,
            title: entry.title || "运动记录",
            exerciseType: entry.exerciseType,
            exercisedOn: dbDate(entry.date),
            durationMinutes: entry.durationMinutes,
            distanceKm: entry.distanceKm,
            calories: entry.calories,
            metric: entry.metric || null,
            notes: entry.notes.join("\n") || null,
            createdAt: dbDateTime(entry.createdAt)
          }
        }));
      }

      for (const entry of data.learningSessions) {
        const id = recordId("learningSession", entry.key);
        await tracked("learningSession", entry.key, id, entry.sourceRefs, () => tx.learningSession.upsert({
          where: { id },
          update: {},
          create: {
            id,
            topicId: recordId("learningTopic", entry.topicKey),
            learnedOn: dbDate(entry.date),
            durationMinutes: entry.durationMinutes,
            metric: entry.metric || null,
            notes: entry.notes || null,
            createdAt: dbDateTime(entry.createdAt)
          }
        }));
      }

      for (const entry of data.inspirations) {
        const id = recordId("inspiration", entry.key);
        const created = await tracked("inspiration", entry.key, id, entry.sourceRefs, () => tx.inspiration.upsert({
          where: { id },
          update: {},
          create: {
            id,
            workspaceId: workspace.id,
            title: entry.title || null,
            content: entry.content,
            capturedAt: dbDateTime(entry.createdAt || `${entry.date}T12:00:00+08:00`),
            createdAt: dbDateTime(entry.createdAt)
          }
        }));
        if (created) {
          for (const tagName of entry.tags) {
            const tagId = recordId("workspaceTag", normalizedKey(tagName));
            await tx.workspaceTag.upsert({
              where: { workspaceId_name: { workspaceId: workspace.id, name: tagName } },
              update: {},
              create: { id: tagId, workspaceId: workspace.id, name: tagName }
            });
            await tx.inspirationTag.createMany({
              data: [{ inspirationId: id, tagId }],
              skipDuplicates: true
            });
          }
        }
      }

      for (const entry of data.reviews) {
        const id = recordId("review", entry.key);
        await tracked("review", entry.key, id, entry.sourceRefs, () => tx.dailyReview.upsert({
          where: { id },
          update: {},
          create: {
            id,
            workspaceId: workspace.id,
            reviewDate: dbDate(entry.date),
            title: entry.title,
            content: entry.content || null,
            wins: entry.wins || null,
            challenges: entry.challenges || null,
            nextActions: entry.nextActions || null,
            syncedToObsidian: entry.syncedToObsidian,
            syncedToIma: entry.syncedToIma,
            createdAt: dbDateTime(entry.createdAt),
            updatedAt: dbDateTime(entry.updatedAt || entry.createdAt)
          }
        }));
      }

      for (const connection of data.connections) {
        if (connection.status !== "CONNECTED") continue;
        const existing = await tx.externalConnection.findUnique({
          where: { workspaceId_provider: { workspaceId: workspace.id, provider: connection.provider } }
        });
        if (existing?.encryptedConfig) continue;
        await tx.externalConnection.upsert({
          where: { workspaceId_provider: { workspaceId: workspace.id, provider: connection.provider } },
          update: {
            status: "CONNECTED",
            encryptedConfig: encryptConfig({ endpoint: connection.endpoint, apiKey: connection.apiKey || undefined }),
            lastSyncedAt: connection.lastSyncedAt ? dbDateTime(connection.lastSyncedAt) : null,
            lastError: null
          },
          create: {
            workspaceId: workspace.id,
            provider: connection.provider,
            status: "CONNECTED",
            encryptedConfig: encryptConfig({ endpoint: connection.endpoint, apiKey: connection.apiKey || undefined }),
            lastSyncedAt: connection.lastSyncedAt ? dbDateTime(connection.lastSyncedAt) : null
          }
        });
        imported.connection = (imported.connection || 0) + 1;
      }

      const currentSettings = workspace.settings && typeof workspace.settings === "object" && !Array.isArray(workspace.settings)
        ? workspace.settings
        : {};
      await tx.workspace.update({
        where: { id: workspace.id },
        data: {
          settings: {
            ...currentSettings,
            legacyMigration: {
              version: 1,
              importedAt: new Date().toISOString(),
              sources: data.origins,
              mergeRule: "business-date-and-normalized-content-v1"
            },
            legacyArchive: data.archive
          }
        }
      });

      const bestProfile = data.profiles[0];
      if (bestProfile) {
        await tx.user.update({
          where: { id: user.id },
          data: {
            email: user.email || cleanText(bestProfile.email) || null
          }
        });
        const profileSettings = [
          ["contact.email", bestProfile.email, "联系邮箱"],
          ["contact.phone", bestProfile.phone, "联系电话"],
          ["contact.wechat", bestProfile.wechat, "微信号"]
        ];
        for (const [settingKey, settingValue, label] of profileSettings) {
          if (!cleanText(settingValue)) continue;
          const existing = await tx.siteSetting.findUnique({ where: { settingKey } });
          if (existing?.settingValue) continue;
          await tx.siteSetting.upsert({
            where: { settingKey },
            update: { settingValue: cleanText(settingValue) },
            create: {
              settingKey,
              settingValue: cleanText(settingValue),
              group: "contact",
              label,
              isPublic: true
            }
          });
        }
      }

      return imported;
    }, { timeout: 120000, maxWait: 10000 });

    return { workspaceId: workspace.id, imported: result };
  } finally {
    await prisma.$disconnect();
  }
}

const storage = await loadExport();
const data = buildCanonicalData(storage);
console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", canonical: summary(data) }, null, 2));

if (!apply) {
  console.log("Dry run only. Re-run with --apply after reviewing the canonical counts.");
} else {
  const result = await importCanonicalData(data);
  console.log(JSON.stringify(result, null, 2));
}
