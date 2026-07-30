import type {
  ExerciseType,
  GrowthCategory,
  LedgerEntry,
  LedgerProject,
  ReadingDailyStat,
  TaskGroup,
  TaskPriority,
  WorkspaceData,
  WorkspaceHabit,
  WorkspaceTask
} from "@/lib/workspace-data";

export class WorkspaceInputError extends Error {}

function asRecord(value: unknown, label: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new WorkspaceInputError(`${label}格式不正确。`);
  }
  return value as Record<string, unknown>;
}

function asArray(value: unknown, label: string, max: number) {
  if (!Array.isArray(value) || value.length > max) {
    throw new WorkspaceInputError(`${label}数量或格式不正确。`);
  }
  return value;
}

export function readString(value: unknown, label: string, max: number) {
  if (typeof value !== "string") {
    throw new WorkspaceInputError(`${label}不能为空。`);
  }
  const result = value.trim();
  if (!result || result.length > max) {
    throw new WorkspaceInputError(`${label}长度不正确。`);
  }
  return result;
}

export function readOptionalString(value: unknown, label: string, max: number) {
  if (value === undefined || value === null || value === "") return undefined;
  return readString(value, label, max);
}

export function readNumber(value: unknown, label: string, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new WorkspaceInputError(`${label}数值不正确。`);
  }
  return value;
}

export function readOptionalNumber(value: unknown, label: string, min: number, max: number) {
  if (value === undefined || value === null || value === "") return undefined;
  return readNumber(value, label, min, max);
}

function readBoolean(value: unknown, label: string) {
  if (typeof value !== "boolean") {
    throw new WorkspaceInputError(`${label}格式不正确。`);
  }
  return value;
}

export function readDate(value: unknown, label: string) {
  const result = readString(value, label, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(Date.parse(`${result}T00:00:00Z`))) {
    throw new WorkspaceInputError(`${label}日期不正确。`);
  }
  return result;
}

export function readEnum<T extends string>(
  value: unknown,
  label: string,
  values: readonly T[]
) {
  if (typeof value !== "string" || !values.includes(value as T)) {
    throw new WorkspaceInputError(`${label}选项不正确。`);
  }
  return value as T;
}

function parseTask(value: unknown): WorkspaceTask {
  const item = asRecord(value, "任务");
  return {
    id: readString(item.id, "任务 ID", 100),
    title: readString(item.title, "任务标题", 300),
    group: readEnum<TaskGroup>(item.group, "任务类型", ["daily", "phased", "long-term"]),
    priority: readEnum<TaskPriority>(item.priority, "任务优先级", ["high", "medium", "low"]),
    completed: readBoolean(item.completed, "任务完成状态"),
    progress: Math.round(readNumber(item.progress, "任务进度", 0, 100)),
    records: [],
    targetDate: item.targetDate ? readDate(item.targetDate, "任务目标") : undefined
  };
}

function parseHabit(value: unknown): WorkspaceHabit {
  const item = asRecord(value, "习惯");
  const history = asArray(item.history, "习惯历史", 31).map((entry) =>
    readBoolean(entry, "习惯历史状态")
  );
  return {
    id: readString(item.id, "习惯 ID", 100),
    label: readString(item.label, "习惯名称", 100),
    description: readString(item.description, "习惯说明", 500),
    streak: Math.round(readNumber(item.streak, "连续天数", 0, 10000)),
    completed: readBoolean(item.completed, "习惯完成状态"),
    history,
    tone: readEnum(item.tone, "习惯颜色", ["blue", "green", "amber", "violet"] as const)
  };
}

function parseProject(value: unknown): LedgerProject {
  const item = asRecord(value, "副业项目");
  return {
    id: readString(item.id, "项目 ID", 100),
    name: readString(item.name, "项目名称", 200),
    description: readString(item.description, "项目说明", 1000)
  };
}

function parseLedgerEntry(value: unknown): LedgerEntry {
  const item = asRecord(value, "收支记录");
  return {
    id: readString(item.id, "收支 ID", 100),
    projectId: readString(item.projectId, "项目 ID", 100),
    type: readEnum(item.type, "收支类型", ["income", "expense"] as const),
    amount: readNumber(item.amount, "金额", 0.01, 999999999.99),
    note: readString(item.note, "收支备注", 500),
    date: readDate(item.date, "收支")
  };
}

function parseGrowthEntry(value: unknown) {
  const item = asRecord(value, "成长记录");
  return {
    id: readString(item.id, "成长记录 ID", 100),
    category: readEnum<GrowthCategory>(item.category, "成长记录类型", [
      "reading",
      "exercise",
      "learning",
      "inspiration",
      "review"
    ]),
    title: readString(item.title, "成长记录标题", 300),
    detail: readString(item.detail, "成长记录内容", 10000),
    metric: readOptionalString(item.metric, "时长或进度", 100),
    date: readDate(item.date, "成长记录"),
    exerciseType: item.exerciseType
      ? readEnum<ExerciseType>(item.exerciseType, "运动项目", [
          "walking",
          "running",
          "cycling",
          "swimming",
          "strength",
          "bodyweight",
          "yoga",
          "other"
        ])
      : undefined,
    durationMinutes: readOptionalNumber(item.durationMinutes, "运动时长", 0, 1440),
    calories: readOptionalNumber(item.calories, "能量消耗", 0, 100000),
    distanceKm: readOptionalNumber(item.distanceKm, "跑步距离", 0, 1000),
    reviewSummary: readOptionalString(item.reviewSummary, "任务完成摘要", 20000),
    reviewReflection: readOptionalString(item.reviewReflection, "今日收获与不足", 10000),
    reviewTomorrowPlan: readOptionalString(item.reviewTomorrowPlan, "明天的计划与打算", 10000),
    reviewSyncedToObsidian: item.reviewSyncedToObsidian === undefined
      ? undefined
      : readBoolean(item.reviewSyncedToObsidian, "Obsidian 同步状态"),
    reviewSavedAt: readOptionalString(item.reviewSavedAt, "复盘保存时间", 50)
  };
}

function parseReadingDailyStat(value: unknown): ReadingDailyStat {
  const item = asRecord(value, "每日阅读统计");
  return {
    date: readDate(item.date, "每日阅读统计日期"),
    durationSeconds: Math.round(readNumber(item.durationSeconds, "每日阅读时长", 0, 86_400))
  };
}

export function parseWorkspaceData(value: unknown): WorkspaceData {
  const input = asRecord(value, "工作台数据");
  const data = {
    tasks: asArray(input.tasks, "任务", 2000).map(parseTask),
    habits: asArray(input.habits, "习惯", 200).map(parseHabit),
    projects: asArray(input.projects, "副业项目", 500).map(parseProject),
    ledger: asArray(input.ledger, "收支记录", 20000).map(parseLedgerEntry),
    growth: asArray(input.growth, "成长记录", 20000).map(parseGrowthEntry),
    readingDailyStats: asArray(input.readingDailyStats ?? [], "每日阅读统计", 5000).map(parseReadingDailyStat)
  };

  const projectIds = new Set(data.projects.map((project) => project.id));
  if (data.ledger.some((entry) => !projectIds.has(entry.projectId))) {
    throw new WorkspaceInputError("收支记录包含不存在的项目。 ");
  }

  return data;
}
