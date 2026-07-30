import "server-only";

import { randomUUID } from "node:crypto";
import { access, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

import { readObsidianReviewConnection } from "@/lib/settings-storage";
import { WorkspaceInputError } from "@/lib/workspace-validation";

export type PreparedObsidianReview = {
  connectionId: string;
  finalPath: string;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
};

export type ObsidianReviewInput = {
  date: string;
  taskSummary: string;
  reflection: string;
  tomorrowPlan: string;
};

const OBSIDIAN_FILE_TIMEOUT_MS = 5_000;

async function withFileTimeout<T>(operation: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new WorkspaceInputError(`${label}超时，请检查 Obsidian 复盘目录是否可访问。`));
        }, OBSIDIAN_FILE_TIMEOUT_MS);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function reviewMarkdown(input: ObsidianReviewInput) {
  return [
    "---",
    `date: ${input.date}`,
    "type: daily-review",
    "source: xiaoyao-ai-side-business-base",
    "tags:",
    "  - 每日复盘",
    "  - 成长记录",
    "---",
    "",
    `# ${input.date} 每日复盘`,
    "",
    "## 当日任务完成情况",
    "",
    input.taskSummary.trim(),
    "",
    "## 今日收获与不足",
    "",
    input.reflection.trim(),
    "",
    "## 明天的计划与打算",
    "",
    input.tomorrowPlan.trim(),
    ""
  ].join("\n");
}

function reviewMonthDirectory(baseDirectory: string, date: string) {
  const [year, month] = date.split("-").map(Number);
  if (!year || !month || month < 1 || month > 12) {
    throw new WorkspaceInputError("复盘日期无法生成 Obsidian 月份目录。");
  }
  return path.join(baseDirectory, `${year} 年 ${month} 月`);
}

export async function prepareObsidianReview(
  userId: string,
  input: ObsidianReviewInput
): Promise<PreparedObsidianReview> {
  const connection = await readObsidianReviewConnection(userId);
  const monthDirectory = reviewMonthDirectory(connection.directory, input.date);
  const finalPath = path.join(monthDirectory, `${input.date} 每日复盘.md`);
  const temporaryPath = path.join(monthDirectory, `.${input.date}-${randomUUID()}.tmp`);
  let previousContent: string | null = null;
  let committed = false;

  try {
    await withFileTimeout(mkdir(monthDirectory, { recursive: true }), "创建 Obsidian 月份目录");
    await withFileTimeout(access(monthDirectory, constants.W_OK), "检查 Obsidian 目录写入权限");
    try {
      previousContent = await withFileTimeout(readFile(finalPath, "utf8"), "读取已有复盘文件");
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
    await withFileTimeout(writeFile(temporaryPath, reviewMarkdown(input), { encoding: "utf8", mode: 0o600 }), "写入 Obsidian 临时复盘文件");
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    if (error instanceof WorkspaceInputError) throw error;
    throw new WorkspaceInputError("无法写入 Obsidian 复盘目录，请检查目录路径和服务器写入权限。");
  }

  return {
    connectionId: connection.connectionId,
    finalPath,
    async commit() {
      await withFileTimeout(rename(temporaryPath, finalPath), "保存 Obsidian 复盘文件");
      committed = true;
    },
    async rollback() {
      if (!committed) {
        await withFileTimeout(rm(temporaryPath, { force: true }), "清理 Obsidian 临时文件");
        return;
      }
      if (previousContent === null) {
        await withFileTimeout(rm(finalPath, { force: true }), "回滚 Obsidian 复盘文件");
      } else {
        await withFileTimeout(writeFile(finalPath, previousContent, { encoding: "utf8", mode: 0o600 }), "恢复 Obsidian 复盘文件");
      }
    }
  };
}
