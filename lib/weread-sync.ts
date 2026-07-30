import "server-only";

import { decryptConnectionConfig } from "@/lib/settings-crypto";
import { getPrisma } from "@/lib/prisma";
import { WorkspaceInputError } from "@/lib/workspace-validation";

const WEREAD_GATEWAY = "https://i.weread.qq.com/api/agent/gateway";
const WEREAD_SKILL_VERSION = "1.0.4";
const RECENT_PROGRESS_DAYS = 90;
const MAX_PROGRESS_BOOKS = 60;

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? value as UnknownRecord : {};
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

function asString(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function asNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateFromTimestamp(value: unknown) {
  const seconds = asNumber(value);
  return seconds > 0 ? new Date(seconds * 1000) : null;
}

function dateKeyFromTimestamp(value: unknown) {
  const date = dateFromTimestamp(value);
  if (!date) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function toDateValue(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

async function mapLimit<T, R>(items: T[], limit: number, mapper: (item: T, index: number) => Promise<R>) {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function callWeRead(apiKey: string, body: UnknownRecord) {
  const response = await fetch(WEREAD_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ ...body, skill_version: WEREAD_SKILL_VERSION }),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000)
  });
  const result = asRecord(await response.json());
  const upgrade = asRecord(result.upgrade_info);
  if (upgrade.message) throw new WorkspaceInputError(asString(upgrade.message));
  if (!response.ok || asNumber(result.errcode) !== 0) {
    throw new WorkspaceInputError(asString(result.errmsg || result.message) || "微信读书接口暂时无法访问。");
  }
  return result;
}

function monthBaseTimes(count: number) {
  const now = new Date();
  const year = Number(new Intl.DateTimeFormat("en", { timeZone: "Asia/Shanghai", year: "numeric" }).format(now));
  const month = Number(new Intl.DateTimeFormat("en", { timeZone: "Asia/Shanghai", month: "numeric" }).format(now)) - 1;
  return Array.from({ length: count }, (_, offset) => Math.floor(Date.UTC(year, month - offset, 15, 4) / 1000));
}

async function getConnection(userId: string) {
  const prisma = getPrisma();
  const workspace = await prisma.workspace.findUnique({ where: { ownerId: userId } });
  if (!workspace) throw new WorkspaceInputError("成长工作台尚未初始化。");
  const connection = await prisma.externalConnection.findUnique({
    where: { workspaceId_provider: { workspaceId: workspace.id, provider: "WEREAD" } }
  });
  if (!connection?.encryptedConfig) throw new WorkspaceInputError("请先在设置中填写微信读书 API Key。");
  const config = decryptConnectionConfig(connection.encryptedConfig);
  if (!config.apiKey?.startsWith("wrk-")) throw new WorkspaceInputError("微信读书 API Key 格式不正确，请在设置中重新填写。");
  return { workspace, connection, apiKey: config.apiKey };
}

export async function readWeReadLibrary(userId: string) {
  const prisma = getPrisma();
  const workspace = await prisma.workspace.findUnique({
    where: { ownerId: userId },
    include: {
      readingShelfState: true,
      readingDailyStats: { where: { source: "WEREAD" }, orderBy: { readOn: "desc" }, take: 400 },
      books: { where: { source: "WEREAD", isArchived: false }, orderBy: [{ lastReadAt: "desc" }, { title: "asc" }] },
      connections: { where: { provider: "WEREAD" }, take: 1 }
    }
  });
  if (!workspace) throw new WorkspaceInputError("成长工作台尚未初始化。");
  const state = workspace.readingShelfState;
  const connection = workspace.connections[0];
  const electronicCount = state?.electronicBookCount ?? workspace.books.filter((book) => !book.isAudio).length;
  const audioCount = state?.audioBookCount ?? workspace.books.filter((book) => book.isAudio).length;
  const hasArticleCollection = Boolean(state?.hasArticleCollection);

  return {
    connected: Boolean(connection?.encryptedConfig && connection.status !== "DISCONNECTED"),
    status: connection?.status || "DISCONNECTED",
    lastSyncedAt: state?.lastSyncedAt?.toISOString() || connection?.lastSyncedAt?.toISOString() || null,
    lastError: connection?.lastError || null,
    summary: {
      electronicCount,
      audioCount,
      hasArticleCollection,
      visibleShelfCount: electronicCount + audioCount + (hasArticleCollection ? 1 : 0),
      startedCount: workspace.books.filter((book) => book.progress > 0 && book.progress < 100).length,
      finishedCount: workspace.books.filter((book) => book.progress >= 100).length
    },
    books: workspace.books.map((book) => ({
      id: book.id,
      externalId: book.externalId || "",
      title: book.title,
      author: book.author || "",
      category: book.category || (book.isAudio ? "有声书" : "未分类"),
      progress: book.progress,
      totalReadSeconds: book.totalReadSeconds,
      lastReadAt: book.lastReadAt?.toISOString() || null,
      isAudio: book.isAudio
    })),
    dailyStats: workspace.readingDailyStats.map((stat) => ({
      date: stat.readOn.toISOString().slice(0, 10),
      durationSeconds: stat.durationSeconds
    }))
  };
}

export async function syncWeRead(userId: string) {
  const prisma = getPrisma();
  const { workspace, connection, apiKey } = await getConnection(userId);
  const log = await prisma.externalSyncLog.create({
    data: { connectionId: connection.id, resourceType: "weread-library", status: "PENDING" }
  });

  try {
    const [shelf, monthlyStats] = await Promise.all([
      callWeRead(apiKey, { api_name: "/shelf/sync" }),
      mapLimit(monthBaseTimes(12), 4, (baseTime) => callWeRead(apiKey, { api_name: "/readdata/detail", mode: "monthly", baseTime }))
    ]);
    const books = asArray(shelf.books);
    const albums = asArray(shelf.albums);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const recentBooks = books
      .filter((book) => asNumber(book.finishReading) !== 1 && nowSeconds - asNumber(book.readUpdateTime) <= RECENT_PROGRESS_DAYS * 86_400)
      .sort((left, right) => asNumber(right.readUpdateTime) - asNumber(left.readUpdateTime))
      .slice(0, MAX_PROGRESS_BOOKS);
    const progressResults = await mapLimit(recentBooks, 5, async (book) => {
      try {
        const result = await callWeRead(apiKey, { api_name: "/book/getprogress", bookId: asString(book.bookId) });
        return { bookId: asString(book.bookId), progress: asRecord(result.book) };
      } catch {
        return null;
      }
    });
    const progressByBook = new Map(progressResults.filter(Boolean).map((item) => [item!.bookId, item!.progress]));
    const externalIds = [...books.map((book) => asString(book.bookId)), ...albums.map((album) => `album:${asString(asRecord(album.albumInfo).albumId)}`)].filter(Boolean);

    await prisma.readingBook.updateMany({
      where: {
        workspaceId: workspace.id,
        source: "WEREAD",
        OR: [{ externalId: null }, { externalId: { notIn: externalIds } }]
      },
      data: { isArchived: true }
    });
    await mapLimit(books, 10, async (book) => {
      const externalId = asString(book.bookId);
      if (!externalId) return;
      const progress = progressByBook.get(externalId);
      const progressValue = asNumber(book.finishReading) === 1 ? 100 : Math.max(0, Math.min(100, asNumber(progress?.progress)));
      const lastReadAt = dateFromTimestamp(progress?.updateTime || book.readUpdateTime);
      await prisma.readingBook.upsert({
        where: { workspaceId_source_externalId: { workspaceId: workspace.id, source: "WEREAD", externalId } },
        update: {
          title: asString(book.title) || "未命名书籍",
          author: asString(book.author) || null,
          coverUrl: asString(book.cover) || null,
          category: asString(book.category) || null,
          progress: progressValue,
          totalReadSeconds: asNumber(progress?.recordReadingTime),
          lastReadAt,
          isAudio: false,
          finishedOn: progressValue >= 100 && lastReadAt ? lastReadAt : null,
          isArchived: false
        },
        create: {
          workspaceId: workspace.id,
          source: "WEREAD",
          externalId,
          title: asString(book.title) || "未命名书籍",
          author: asString(book.author) || null,
          coverUrl: asString(book.cover) || null,
          category: asString(book.category) || null,
          progress: progressValue,
          totalReadSeconds: asNumber(progress?.recordReadingTime),
          lastReadAt,
          isAudio: false,
          finishedOn: progressValue >= 100 && lastReadAt ? lastReadAt : null
        }
      });
    });
    await mapLimit(albums, 5, async (album) => {
      const info = asRecord(album.albumInfo);
      const extra = asRecord(album.albumInfoExtra);
      const albumId = asString(info.albumId);
      if (!albumId) return;
      const externalId = `album:${albumId}`;
      const finished = asNumber(info.finish) === 1;
      const lastReadAt = dateFromTimestamp(extra.lectureReadUpdateTime || info.updateTime);
      await prisma.readingBook.upsert({
        where: { workspaceId_source_externalId: { workspaceId: workspace.id, source: "WEREAD", externalId } },
        update: { title: asString(info.name) || "未命名有声书", author: asString(info.authorName) || null, coverUrl: asString(info.cover) || null, category: "有声书", progress: finished ? 100 : 0, lastReadAt, isAudio: true, isArchived: false },
        create: { workspaceId: workspace.id, source: "WEREAD", externalId, title: asString(info.name) || "未命名有声书", author: asString(info.authorName) || null, coverUrl: asString(info.cover) || null, category: "有声书", progress: finished ? 100 : 0, lastReadAt, isAudio: true }
      });
    });

    const dailyTotals = new Map<string, number>();
    monthlyStats.forEach((stats) => {
      Object.entries(asRecord(stats.readTimes)).forEach(([timestamp, seconds]) => {
        const date = dateKeyFromTimestamp(timestamp);
        if (date) dailyTotals.set(date, asNumber(seconds));
      });
    });
    await mapLimit([...dailyTotals.entries()], 10, ([date, durationSeconds]) =>
      prisma.readingDailyStat.upsert({
        where: { workspaceId_readOn_source: { workspaceId: workspace.id, readOn: toDateValue(date), source: "WEREAD" } },
        update: { durationSeconds },
        create: { workspaceId: workspace.id, readOn: toDateValue(date), durationSeconds, source: "WEREAD" }
      })
    );

    const syncedAt = new Date();
    await prisma.$transaction([
      prisma.readingShelfState.upsert({
        where: { workspaceId: workspace.id },
        update: { electronicBookCount: books.length, audioBookCount: albums.length, hasArticleCollection: Boolean(shelf.mp), lastSyncedAt: syncedAt },
        create: { workspaceId: workspace.id, electronicBookCount: books.length, audioBookCount: albums.length, hasArticleCollection: Boolean(shelf.mp), lastSyncedAt: syncedAt }
      }),
      prisma.externalConnection.update({ where: { id: connection.id }, data: { status: "CONNECTED", lastSyncedAt: syncedAt, lastError: null } }),
      prisma.externalSyncLog.update({ where: { id: log.id }, data: { status: "SUCCESS", completedAt: syncedAt, message: `同步 ${books.length} 本电子书、${albums.length} 本有声书和 ${dailyTotals.size} 天阅读统计。` } })
    ]);
    return readWeReadLibrary(userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "微信读书同步失败。";
    await prisma.$transaction([
      prisma.externalConnection.update({ where: { id: connection.id }, data: { status: "ERROR", lastError: message } }),
      prisma.externalSyncLog.update({ where: { id: log.id }, data: { status: "FAILED", completedAt: new Date(), message } })
    ]);
    throw error;
  }
}
