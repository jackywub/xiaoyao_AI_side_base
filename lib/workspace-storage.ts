import "server-only";

import type { Prisma } from "@prisma/client";

import { prepareObsidianReview } from "@/lib/obsidian-sync";
import { getPrisma } from "@/lib/prisma";
import type {
  ExerciseType,
  GrowthCategory,
  TaskQuadrant,
  TaskGroup,
  TaskPriority,
  WorkspaceData
} from "@/lib/workspace-data";
import { WorkspaceInputError } from "@/lib/workspace-validation";

const TIME_ZONE = "Asia/Shanghai";

const taskTypeToDb = {
  daily: "DAILY",
  phased: "PHASED",
  "long-term": "LONG_TERM"
} as const;

const taskTypeFromDb = {
  DAILY: "daily",
  PHASED: "phased",
  LONG_TERM: "long-term"
} as const;

const priorityToDb = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH"
} as const;

const priorityFromDb = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high"
} as const;

const quadrantToDb = {
  "important-urgent": "IMPORTANT_URGENT",
  "important-not-urgent": "IMPORTANT_NOT_URGENT",
  "urgent-not-important": "URGENT_NOT_IMPORTANT",
  low: "LOW"
} as const;

const quadrantFromDb = {
  IMPORTANT_URGENT: "important-urgent",
  IMPORTANT_NOT_URGENT: "important-not-urgent",
  URGENT_NOT_IMPORTANT: "urgent-not-important",
  LOW: "low"
} as const;

const habitToneValues = ["blue", "green", "amber", "violet"] as const;

const exerciseTypeToDb = {
  walking: "WALKING",
  running: "RUNNING",
  cycling: "CYCLING",
  swimming: "SWIMMING",
  strength: "STRENGTH",
  bodyweight: "BODYWEIGHT",
  yoga: "YOGA",
  other: "OTHER"
} as const;

const exerciseTypeFromDb = {
  WALKING: "walking",
  RUNNING: "running",
  CYCLING: "cycling",
  SWIMMING: "swimming",
  STRENGTH: "strength",
  BODYWEIGHT: "bodyweight",
  YOGA: "yoga",
  OTHER: "other"
} as const;

const goalStageDefinitions = [
  { phase: "LEARNING", sortOrder: 0 },
  { phase: "PRACTICE", sortOrder: 1 },
  { phase: "COMPLETION", sortOrder: 2 }
] as const;

const goalPhaseFromDb = {
  LEARNING: "learning",
  PRACTICE: "practice",
  COMPLETION: "completion"
} as const;

const goalPhaseLabelFromDb = {
  LEARNING: "学习阶段",
  PRACTICE: "实操阶段",
  COMPLETION: "完成及收尾阶段"
} as const;

function dateStringInTimeZone(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function toDateValue(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDateValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

function shiftDate(value: string, offset: number) {
  const date = toDateValue(value);
  date.setUTCDate(date.getUTCDate() + offset);
  return formatDateValue(date);
}

function currentWeekDates(today: string) {
  const date = toDateValue(today);
  const mondayOffset = -((date.getUTCDay() + 6) % 7);
  return Array.from({ length: 7 }, (_, index) => shiftDate(today, mondayOffset + index));
}

function calculateStreak(completedDates: Set<string>, today: string) {
  let cursor = completedDates.has(today) ? today : shiftDate(today, -1);
  let streak = 0;

  while (completedDates.has(cursor) && streak < 10000) {
    streak += 1;
    cursor = shiftDate(cursor, -1);
  }

  return streak;
}

function parseMetricNumber(metric: string | undefined, unit: string) {
  if (!metric?.includes(unit)) return 0;
  const match = metric.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

async function getOrCreateWorkspaceId(userId: string) {
  const prisma = getPrisma();
  const existing = await prisma.workspace.findUnique({ where: { ownerId: userId } });
  if (existing) return existing.id;

  const workspace = await prisma.workspace.create({
    data: { ownerId: userId }
  });
  return workspace.id;
}

async function ensureProjectStages(workspaceId: string) {
  const prisma = getPrisma();
  const projects = await prisma.workspaceProject.findMany({
    where: { workspaceId, status: { not: "ARCHIVED" } },
    select: { id: true, stages: { select: { phase: true } } }
  });
  const missingStages = projects.flatMap((project) => {
    const existing = new Set(project.stages.map((stage) => stage.phase));
    return goalStageDefinitions
      .filter((stage) => !existing.has(stage.phase))
      .map((stage) => ({ projectId: project.id, ...stage }));
  });
  if (missingStages.length) {
    await prisma.workspaceProjectStage.createMany({ data: missingStages, skipDuplicates: true });
  }
}

function readWorkspaceSettings(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Prisma.JsonObject;
}

function reviewSummaryFromSnapshot(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return typeof value.summary === "string" ? value.summary : undefined;
}

async function ensureDailyTaskReset(workspaceId: string, today: string) {
  const prisma = getPrisma();
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { settings: true }
  });
  const settings = readWorkspaceSettings(workspace?.settings ?? null);
  if (settings.dailyTaskResetDate === today) return;

  const recordDate = toDateValue(today);
  await prisma.$transaction(async (tx) => {
    const currentWorkspace = await tx.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      select: { settings: true }
    });
    const currentSettings = readWorkspaceSettings(currentWorkspace.settings);
    if (currentSettings.dailyTaskResetDate === today) return;

    const dailyTasks = await tx.workspaceTask.findMany({
      where: {
        workspaceId,
        type: "DAILY",
        parentId: null,
        archivedAt: null,
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: recordDate } }] },
          { OR: [{ dueDate: null }, { dueDate: recordDate }] }
        ]
      },
      select: {
        id: true,
        children: {
          where: { archivedAt: null },
          select: { id: true }
        }
      }
    });
    const taskIds = dailyTasks.flatMap((task) => [
      task.id,
      ...task.children.map((child) => child.id)
    ]);

    await Promise.all(taskIds.map((taskId) =>
      tx.workspaceTaskRecord.upsert({
        where: { taskId_recordDate: { taskId, recordDate } },
        update: { completed: false, progress: 0, completedAt: null },
        create: { taskId, recordDate, completed: false, progress: 0 }
      })
    ));
    if (taskIds.length) {
      await tx.workspaceTask.updateMany({
        where: { id: { in: taskIds } },
        data: { status: "TODO", progress: 0, completedAt: null }
      });
    }
    await tx.workspace.update({
      where: { id: workspaceId },
      data: {
        settings: {
          ...currentSettings,
          dailyTaskResetDate: today
        }
      }
    });
  });
}

export async function prepareWorkspaceDay(userId: string) {
  const workspaceId = await getOrCreateWorkspaceId(userId);
  await ensureDailyTaskReset(workspaceId, dateStringInTimeZone());
}

export async function readWorkspaceData(userId: string) {
  const prisma = getPrisma();
  const workspaceId = await getOrCreateWorkspaceId(userId);
  const today = dateStringInTimeZone();
  const weekDates = currentWeekDates(today);
  await ensureDailyTaskReset(workspaceId, today);
  await ensureProjectStages(workspaceId);
  await reconcileGrowthTasksForDate(workspaceId, today);

  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    include: {
      tasks: {
        where: { archivedAt: null, parentId: null },
        include: {
          dailyRecords: { orderBy: { recordDate: "asc" } },
          children: {
            where: { archivedAt: null },
            include: { dailyRecords: { orderBy: { recordDate: "asc" } } },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
          },
          goalStages: {
            include: {
              logs: { orderBy: [{ recordedOn: "desc" }, { createdAt: "desc" }] },
              dailyActions: { orderBy: [{ actionDate: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }] }
            },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
          }
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      },
      habits: {
        where: { isActive: true },
        include: { records: { orderBy: { recordDate: "asc" } } },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      },
      projects: {
        where: { status: { not: "ARCHIVED" } },
        include: {
          transactions: { orderBy: [{ transactedOn: "desc" }, { createdAt: "desc" }] },
          stages: {
            include: { logs: { orderBy: [{ recordedOn: "desc" }, { createdAt: "desc" }] } },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
          }
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      },
      books: {
        where: { isArchived: false },
        include: { sessions: true }
      },
      readingDailyStats: {
        orderBy: { readOn: "desc" }
      },
      exercises: true,
      learningTopics: {
        where: { isArchived: false },
        include: { sessions: true }
      },
      inspirations: true,
      reviews: true
    }
  });

  const tasks = workspace.tasks.map((task) => {
    const todayRecord = task.dailyRecords.find(
      (record) => formatDateValue(record.recordDate) === today
    );
    const isDaily = task.type === "DAILY";
    const records = task.dailyRecords.map((record) => ({
      date: formatDateValue(record.recordDate),
      completed: record.completed,
      progress: record.progress
    }));
    const inferredStartDate = task.startDate
      ? formatDateValue(task.startDate)
      : records[0]?.date || formatDateValue(task.createdAt);
    const goalActions = task.goalStages.flatMap((stage) => stage.dailyActions);
    const goalProgress = task.isGoal
      ? goalActions.length
        ? Math.round((goalActions.filter((action) => action.completed).length / goalActions.length) * 100)
        : 0
      : task.progress;
    return {
      id: task.id,
      title: task.title,
      group: taskTypeFromDb[task.type],
      priority: priorityFromDb[task.priority],
      urgency: priorityFromDb[task.urgency],
      quadrant: quadrantFromDb[task.quadrant],
      completed: task.isGoal ? goalProgress >= 100 : isDaily ? Boolean(todayRecord?.completed) : task.status === "DONE",
      progress: task.isGoal ? goalProgress : isDaily ? todayRecord?.progress ?? 0 : task.progress,
      startDate: inferredStartDate,
      targetDate: task.dueDate ? formatDateValue(task.dueDate) : undefined,
      dueTime: task.dueTime || undefined,
      projectId: task.projectId || undefined,
      description: task.description || undefined,
      isGoal: task.isGoal,
      growthSyncCategory: task.isGoal ? undefined : growthCategoryForTaskTitle(task.title),
      records,
      subtasks: task.children.map((child) => {
        const childTodayRecord = child.dailyRecords.find(
          (record) => formatDateValue(record.recordDate) === today
        );
        return {
          id: child.id,
          title: child.title,
          completed: isDaily ? Boolean(childTodayRecord?.completed) : child.status === "DONE",
          records: child.dailyRecords.map((record) => ({
            date: formatDateValue(record.recordDate),
            completed: record.completed,
            progress: record.progress
          }))
        };
      }),
      goalStages: task.isGoal ? task.goalStages.map((stage) => ({
        id: stage.id,
        phase: stage.phase ? goalPhaseFromDb[stage.phase] : undefined,
        name: stage.name || (stage.phase ? goalPhaseFromDb[stage.phase] : "目标阶段"),
        startDate: stage.startDate ? formatDateValue(stage.startDate) : undefined,
        endDate: stage.endDate ? formatDateValue(stage.endDate) : undefined,
        progress: stage.progress,
        analysis: stage.analysis || undefined,
        nextAction: stage.nextAction || undefined,
        logs: stage.logs.map((log) => ({
          id: log.id,
          content: log.content,
          progress: log.progress,
          nextAction: log.nextAction || undefined,
          date: formatDateValue(log.recordedOn)
        })),
        dailyActions: stage.dailyActions.map((action) => ({
          id: action.id,
          title: action.title,
          date: formatDateValue(action.actionDate),
          completed: action.completed
        }))
      })) : undefined
    };
  });

  const habits = workspace.habits.map((habit, index) => {
    const completedDates = new Set(
      habit.records
        .filter((record) => record.completed)
        .map((record) => formatDateValue(record.recordDate))
    );
    const storedTone = habit.color as (typeof habitToneValues)[number] | null;
    return {
      id: habit.id,
      label: habit.name,
      description: habit.description || "保持一个小而稳定的行动。",
      streak: calculateStreak(completedDates, today),
      completed: completedDates.has(today),
      history: weekDates.map((date) => completedDates.has(date)),
      tone: storedTone && habitToneValues.includes(storedTone)
        ? storedTone
        : habitToneValues[index % habitToneValues.length]
    };
  });

  const projects = workspace.projects.map((project) => {
    const progress = project.stages.length
      ? Math.round(project.stages.reduce((sum, stage) => sum + stage.progress, 0) / project.stages.length)
      : 0;
    const currentStage = project.stages.find((stage) => stage.progress < 100) || project.stages.at(-1);

    return {
      id: project.id,
      name: project.name,
      description: project.description || "",
      stage: currentStage ? goalPhaseLabelFromDb[currentStage.phase] : undefined,
      progress,
      nextAction: currentStage?.nextAction || undefined,
      riskLevel: project.riskLevel.toLowerCase() as "low" | "medium" | "high",
      riskReason: project.riskReason || undefined,
      startDate: project.startedOn ? formatDateValue(project.startedOn) : undefined,
      endDate: project.endedOn ? formatDateValue(project.endedOn) : undefined,
      stages: project.stages.map((stage) => ({
        id: stage.id,
        phase: goalPhaseFromDb[stage.phase],
        progress: stage.progress,
        analysis: stage.analysis || undefined,
        nextAction: stage.nextAction || undefined,
        logs: stage.logs.map((log) => ({
          id: log.id,
          content: log.content,
          progress: log.progress,
          nextAction: log.nextAction || undefined,
          date: formatDateValue(log.recordedOn)
        }))
      }))
    };
  });

  const ledger = workspace.projects.flatMap((project) =>
    project.transactions.map((entry) => ({
      id: entry.id,
      projectId: project.id,
      type: entry.type === "INCOME" ? "income" as const : "expense" as const,
      amount: Number(entry.amount),
      note: entry.note || entry.category || "未填写备注",
      date: formatDateValue(entry.transactedOn)
    }))
  ).sort((a, b) => b.date.localeCompare(a.date));

  const growth = [
    ...workspace.books.flatMap((book) =>
      book.sessions.map((session) => ({
        id: session.id,
        category: "reading" as const,
        title: book.title,
        detail: session.note || "完成一次阅读记录。",
        metric: session.metric || (session.durationMinutes ? `${session.durationMinutes} 分钟` : undefined),
        date: formatDateValue(session.readOn),
        durationMinutes: session.durationMinutes
      }))
    ),
    ...workspace.exercises.map((entry) => ({
      id: entry.id,
      category: "exercise" as const,
      title: entry.title || "运动记录",
      detail: entry.notes || "完成一次运动。",
      metric: entry.metric || (entry.durationMinutes ? `${entry.durationMinutes} 分钟` : undefined),
      date: formatDateValue(entry.exercisedOn),
      exerciseType: exerciseTypeFromDb[entry.exerciseType],
      durationMinutes: entry.durationMinutes,
      calories: entry.calories ?? undefined,
      distanceKm: entry.distanceKm === null ? undefined : Number(entry.distanceKm)
    })),
    ...workspace.learningTopics.flatMap((topic) =>
      topic.sessions.map((session) => ({
        id: session.id,
        category: "learning" as const,
        title: topic.title,
        detail: session.notes || "完成一次学习记录。",
        metric: session.metric || (session.durationMinutes ? `${session.durationMinutes} 分钟` : undefined),
        date: formatDateValue(session.learnedOn),
        durationMinutes: session.durationMinutes
      }))
    ),
    ...workspace.inspirations.map((entry) => ({
      id: entry.id,
      category: "inspiration" as const,
      title: entry.title || "灵感记录",
      detail: entry.content,
      metric: entry.metric || undefined,
      date: dateStringInTimeZone(entry.capturedAt)
    })),
    ...workspace.reviews.map((entry) => {
      const reflection = entry.wins || entry.content || "";
      return {
        id: entry.id,
        category: "review" as const,
        title: entry.title || `${formatDateValue(entry.reviewDate)} 每日复盘`,
        detail: reflection,
        date: formatDateValue(entry.reviewDate),
        reviewSummary: reviewSummaryFromSnapshot(entry.taskSnapshot),
        reviewReflection: reflection,
        reviewTomorrowPlan: entry.nextActions || "",
        reviewSyncedToObsidian: entry.syncedToObsidian,
        reviewSavedAt: entry.updatedAt.toISOString()
      };
    })
  ].sort((a, b) => b.date.localeCompare(a.date));

  const readingDailyStats = workspace.readingDailyStats.map((stat) => ({
    date: formatDateValue(stat.readOn),
    durationSeconds: stat.durationSeconds
  }));

  const data: WorkspaceData = { tasks, habits, projects, ledger, growth, readingDailyStats };
  return {
    data,
    hasData: tasks.length + habits.length + projects.length + ledger.length + growth.length + readingDailyStats.length > 0
  };
}

export async function addWorkspaceTask(
  userId: string,
  input: {
    title: string;
    group: TaskGroup;
    priority?: TaskPriority;
    urgency?: TaskPriority;
    quadrant?: TaskQuadrant;
    projectId?: string;
    startDate?: string;
    targetDate?: string;
    dueTime?: string;
    description?: string;
    isGoal?: boolean;
  }
) {
  const workspaceId = await getOrCreateWorkspaceId(userId);
  if (input.isGoal) {
    if (!input.startDate || !input.targetDate) {
      throw new WorkspaceInputError("目标必须设置开始日期和结束日期。");
    }
    if (input.startDate > input.targetDate) {
      throw new WorkspaceInputError("目标结束日期不能早于开始日期。");
    }
  }
  if (input.projectId) {
    const project = await getPrisma().workspaceProject.findFirst({
      where: { id: input.projectId, workspaceId, status: { not: "ARCHIVED" } }
    });
    if (!project) throw new WorkspaceInputError("所属项目不存在或已归档。");
  }
  await getPrisma().workspaceTask.create({
    data: {
      workspaceId,
      title: input.title,
      type: taskTypeToDb[input.group],
      priority: priorityToDb[input.priority || "medium"],
      urgency: priorityToDb[input.urgency || "medium"],
      quadrant: quadrantToDb[input.quadrant || "low"],
      projectId: input.projectId || undefined,
      description: input.description,
      dueTime: input.dueTime,
      isGoal: Boolean(input.isGoal),
      startDate: input.isGoal
        ? input.startDate ? toDateValue(input.startDate) : undefined
        : input.group === "daily" ? toDateValue(input.targetDate || dateStringInTimeZone()) : undefined,
      dueDate: input.isGoal
        ? input.targetDate ? toDateValue(input.targetDate) : undefined
        : input.targetDate ? toDateValue(input.targetDate) : input.group === "daily" ? toDateValue(dateStringInTimeZone()) : undefined,
      goalStages: input.isGoal
        ? {
            create: {
              name: "目标拆解",
              startDate: input.startDate ? toDateValue(input.startDate) : undefined,
              endDate: input.targetDate ? toDateValue(input.targetDate) : undefined,
              sortOrder: 0
            }
          }
        : undefined
    }
  });
}

export async function updateWorkspaceTask(
  userId: string,
  taskId: string,
  input: {
    title: string;
    priority: TaskPriority;
    urgency: TaskPriority;
    quadrant: TaskQuadrant;
    projectId?: string;
    startDate?: string;
    targetDate?: string;
    dueTime?: string;
    description?: string;
    progress: number;
  }
) {
  const workspaceId = await getOrCreateWorkspaceId(userId);
  const task = await getPrisma().workspaceTask.findFirst({
    where: { id: taskId, workspaceId, parentId: null, archivedAt: null }
  });
  if (!task) throw new WorkspaceInputError("任务不存在或已删除。");
  if (task.isGoal) {
    if (!input.startDate || !input.targetDate) {
      throw new WorkspaceInputError("目标必须设置开始日期和结束日期。");
    }
    if (input.startDate > input.targetDate) {
      throw new WorkspaceInputError("目标结束日期不能早于开始日期。");
    }
    const startDate = toDateValue(input.startDate);
    const targetDate = toDateValue(input.targetDate);
    const outsideActions = await getPrisma().workspaceGoalDailyAction.count({
      where: {
        stage: { goalId: task.id },
        OR: [
          { actionDate: { lt: startDate } },
          { actionDate: { gt: targetDate } }
        ]
      }
    });
    if (outsideActions) {
      throw new WorkspaceInputError("新目标期限之外仍有拆解行动，请先调整这些行动的日期。");
    }
  }
  if (input.projectId) {
    const project = await getPrisma().workspaceProject.findFirst({ where: { id: input.projectId, workspaceId } });
    if (!project) throw new WorkspaceInputError("所属项目不存在。");
  }
  const prisma = getPrisma();
  await prisma.$transaction(async (tx) => {
    await tx.workspaceTask.update({
      where: { id: task.id },
      data: {
        title: input.title,
        priority: priorityToDb[input.priority],
        urgency: priorityToDb[input.urgency],
        quadrant: quadrantToDb[input.quadrant],
        projectId: input.projectId || null,
        dueDate: input.targetDate ? toDateValue(input.targetDate) : null,
        dueTime: input.dueTime || null,
        description: input.description || null,
        ...(task.isGoal
          ? { startDate: input.startDate ? toDateValue(input.startDate) : null, progress: task.progress }
          : {
              progress: input.progress,
              status: input.progress >= 100 ? "DONE" as const : "TODO" as const,
              completedAt: input.progress >= 100 ? task.completedAt || new Date() : null
            })
      }
    });
  });
}

async function syncGoalProjectProgress(tx: Prisma.TransactionClient, goalId: string) {
  const goal = await tx.workspaceTask.findUnique({
    where: { id: goalId },
    include: { goalStages: { include: { dailyActions: true } } }
  });
  if (!goal?.isGoal) return;
  const actions = goal.goalStages.flatMap((stage) => stage.dailyActions);
  for (const stage of goal.goalStages) {
    const stageProgress = stage.dailyActions.length
      ? Math.round((stage.dailyActions.filter((action) => action.completed).length / stage.dailyActions.length) * 100)
      : 0;
    if (stage.progress !== stageProgress) {
      await tx.workspaceGoalStage.update({ where: { id: stage.id }, data: { progress: stageProgress } });
    }
  }
  const progress = actions.length
    ? Math.round((actions.filter((action) => action.completed).length / actions.length) * 100)
    : 0;
  await tx.workspaceTask.update({
    where: { id: goal.id },
    data: {
      progress,
      status: progress >= 100 ? "DONE" : progress > 0 ? "IN_PROGRESS" : "TODO",
      completedAt: progress >= 100 ? goal.completedAt || new Date() : null
    }
  });
}

export async function addWorkspaceGoalStage(
  userId: string,
  goalId: string,
  input: { name: string; startDate?: string; endDate?: string }
) {
  const workspaceId = await getOrCreateWorkspaceId(userId);
  const prisma = getPrisma();
  const goal = await prisma.workspaceTask.findFirst({
    where: { id: goalId, workspaceId, isGoal: true, archivedAt: null },
    select: { id: true, goalStages: { select: { sortOrder: true }, orderBy: { sortOrder: "desc" }, take: 1 } }
  });
  if (!goal) throw new WorkspaceInputError("阶段目标不存在或已删除。");
  await prisma.workspaceGoalStage.create({
    data: {
      goalId: goal.id,
      name: input.name,
      startDate: input.startDate ? toDateValue(input.startDate) : undefined,
      endDate: input.endDate ? toDateValue(input.endDate) : undefined,
      sortOrder: (goal.goalStages[0]?.sortOrder ?? -1) + 1
    }
  });
}

export async function updateWorkspaceGoalStage(
  userId: string,
  stageId: string,
  input: { name: string; startDate?: string; endDate?: string }
) {
  const prisma = getPrisma();
  const workspaceId = await getOrCreateWorkspaceId(userId);
  const stage = await prisma.workspaceGoalStage.findFirst({
    where: { id: stageId, goal: { workspaceId, isGoal: true, archivedAt: null } },
    select: { id: true, goalId: true }
  });
  if (!stage) throw new WorkspaceInputError("目标阶段不存在或已删除。");
  await prisma.workspaceGoalStage.update({
    where: { id: stage.id },
    data: {
      name: input.name,
      startDate: input.startDate ? toDateValue(input.startDate) : null,
      endDate: input.endDate ? toDateValue(input.endDate) : null
    }
  });
}

export async function removeWorkspaceGoalStage(userId: string, stageId: string) {
  const workspaceId = await getOrCreateWorkspaceId(userId);
  const prisma = getPrisma();
  const stage = await prisma.workspaceGoalStage.findFirst({
    where: { id: stageId, goal: { workspaceId, isGoal: true, archivedAt: null } },
    select: { id: true, goalId: true }
  });
  if (!stage) throw new WorkspaceInputError("目标阶段不存在或已删除。");
  await prisma.$transaction(async (tx) => {
    await tx.workspaceGoalStage.delete({ where: { id: stage.id } });
    await syncGoalProjectProgress(tx, stage.goalId);
  });
}

export async function addWorkspaceGoalDailyAction(
  userId: string,
  goalId: string,
  input: { title: string; date: string }
) {
  const workspaceId = await getOrCreateWorkspaceId(userId);
  const prisma = getPrisma();
  const goal = await prisma.workspaceTask.findFirst({
    where: { id: goalId, workspaceId, isGoal: true, archivedAt: null },
    select: {
      id: true,
      startDate: true,
      dueDate: true,
      goalStages: {
        select: { id: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        take: 1
      }
    }
  });
  if (!goal) throw new WorkspaceInputError("目标不存在或已删除。");
  const actionDate = toDateValue(input.date);
  if (goal.startDate && actionDate < goal.startDate) throw new WorkspaceInputError("行动日期不能早于目标开始日期。");
  if (goal.dueDate && actionDate > goal.dueDate) throw new WorkspaceInputError("行动日期不能晚于目标结束日期。");
  await prisma.$transaction(async (tx) => {
    const stageId = goal.goalStages[0]?.id || (await tx.workspaceGoalStage.create({
      data: {
        goalId: goal.id,
        name: "目标拆解",
        startDate: goal.startDate,
        endDate: goal.dueDate,
        sortOrder: 0
      },
      select: { id: true }
    })).id;
    const latestAction = await tx.workspaceGoalDailyAction.findFirst({
      where: { stageId },
      select: { sortOrder: true },
      orderBy: { sortOrder: "desc" }
    });
    await tx.workspaceGoalDailyAction.create({
      data: {
        stageId,
        title: input.title,
        actionDate,
        sortOrder: (latestAction?.sortOrder ?? -1) + 1
      }
    });
    await syncGoalProjectProgress(tx, goal.id);
  });
}

export async function updateWorkspaceGoalDailyAction(
  userId: string,
  actionId: string,
  input: { title: string; date: string }
) {
  const workspaceId = await getOrCreateWorkspaceId(userId);
  const prisma = getPrisma();
  const action = await prisma.workspaceGoalDailyAction.findFirst({
    where: { id: actionId, stage: { goal: { workspaceId, isGoal: true, archivedAt: null } } },
    include: { stage: { select: { goal: { select: { startDate: true, dueDate: true } } } } }
  });
  if (!action) throw new WorkspaceInputError("每日行动不存在或已删除。");
  const actionDate = toDateValue(input.date);
  if (action.stage.goal.startDate && actionDate < action.stage.goal.startDate) throw new WorkspaceInputError("行动日期不能早于目标开始日期。");
  if (action.stage.goal.dueDate && actionDate > action.stage.goal.dueDate) throw new WorkspaceInputError("行动日期不能晚于目标结束日期。");
  await prisma.workspaceGoalDailyAction.update({ where: { id: action.id }, data: { title: input.title, actionDate } });
}

export async function toggleWorkspaceGoalDailyAction(userId: string, actionId: string) {
  const workspaceId = await getOrCreateWorkspaceId(userId);
  const prisma = getPrisma();
  const action = await prisma.workspaceGoalDailyAction.findFirst({
    where: { id: actionId, stage: { goal: { workspaceId, isGoal: true, archivedAt: null } } },
    select: { id: true, completed: true, stage: { select: { goalId: true } } }
  });
  if (!action) throw new WorkspaceInputError("每日行动不存在或已删除。");
  const completed = !action.completed;
  await prisma.$transaction(async (tx) => {
    await tx.workspaceGoalDailyAction.update({
      where: { id: action.id },
      data: { completed, completedAt: completed ? new Date() : null }
    });
    await syncGoalProjectProgress(tx, action.stage.goalId);
  });
}

export async function removeWorkspaceGoalDailyAction(userId: string, actionId: string) {
  const workspaceId = await getOrCreateWorkspaceId(userId);
  const prisma = getPrisma();
  const action = await prisma.workspaceGoalDailyAction.findFirst({
    where: { id: actionId, stage: { goal: { workspaceId, isGoal: true } } },
    select: { id: true, stage: { select: { goalId: true } } }
  });
  if (!action) throw new WorkspaceInputError("每日行动不存在或已删除。");
  await prisma.$transaction(async (tx) => {
    await tx.workspaceGoalDailyAction.delete({ where: { id: action.id } });
    await syncGoalProjectProgress(tx, action.stage.goalId);
  });
}

export async function addWorkspaceGoalProgressLog(
  userId: string,
  stageId: string,
  input: { content: string; progress: number; nextAction?: string; date: string }
) {
  const prisma = getPrisma();
  const workspaceId = await getOrCreateWorkspaceId(userId);
  const stage = await prisma.workspaceGoalStage.findFirst({
    where: { id: stageId, goal: { workspaceId, isGoal: true, archivedAt: null } },
    select: { id: true, goalId: true }
  });
  if (!stage) throw new WorkspaceInputError("项目阶段不存在或已删除。");

  await prisma.$transaction(async (tx) => {
    await tx.workspaceGoalProgressLog.create({
      data: {
        stageId: stage.id,
        content: input.content,
        progress: input.progress,
        nextAction: input.nextAction,
        recordedOn: toDateValue(input.date)
      }
    });
    await tx.workspaceGoalStage.update({
      where: { id: stage.id },
      data: { progress: input.progress, nextAction: input.nextAction || undefined }
    });
    await syncGoalProjectProgress(tx, stage.goalId);
  });
}

export async function removeWorkspaceGoalProgressLog(userId: string, logId: string) {
  const workspaceId = await getOrCreateWorkspaceId(userId);
  const result = await getPrisma().workspaceGoalProgressLog.deleteMany({
    where: { id: logId, stage: { goal: { workspaceId, isGoal: true } } }
  });
  if (!result.count) throw new WorkspaceInputError("推进记录不存在或已删除。");
}

async function syncWorkspaceProjectProgress(tx: Prisma.TransactionClient, projectId: string) {
  const project = await tx.workspaceProject.findUnique({
    where: { id: projectId },
    include: { stages: { orderBy: { sortOrder: "asc" } } }
  });
  if (!project) return;
  const progress = project.stages.length
    ? Math.round(project.stages.reduce((sum, stage) => sum + stage.progress, 0) / project.stages.length)
    : 0;
  const currentStage = project.stages.find((stage) => stage.progress < 100) || project.stages.at(-1);
  await tx.workspaceProject.update({
    where: { id: project.id },
    data: {
      progress,
      stage: currentStage ? goalPhaseLabelFromDb[currentStage.phase] : null,
      nextAction: currentStage?.nextAction || project.nextAction
    }
  });
}

export async function updateWorkspaceProjectStage(
  userId: string,
  stageId: string,
  input: { progress: number; analysis?: string; nextAction?: string }
) {
  const workspaceId = await getOrCreateWorkspaceId(userId);
  const prisma = getPrisma();
  const stage = await prisma.workspaceProjectStage.findFirst({
    where: { id: stageId, project: { workspaceId, status: { not: "ARCHIVED" } } },
    select: { id: true, projectId: true }
  });
  if (!stage) throw new WorkspaceInputError("项目阶段不存在或已删除。");
  await prisma.$transaction(async (tx) => {
    await tx.workspaceProjectStage.update({
      where: { id: stage.id },
      data: { progress: input.progress, analysis: input.analysis || null, nextAction: input.nextAction || null }
    });
    await syncWorkspaceProjectProgress(tx, stage.projectId);
  });
}

export async function addWorkspaceProjectProgressLog(
  userId: string,
  stageId: string,
  input: { content: string; progress: number; nextAction?: string; date: string }
) {
  const workspaceId = await getOrCreateWorkspaceId(userId);
  const prisma = getPrisma();
  const stage = await prisma.workspaceProjectStage.findFirst({
    where: { id: stageId, project: { workspaceId, status: { not: "ARCHIVED" } } },
    select: { id: true, projectId: true }
  });
  if (!stage) throw new WorkspaceInputError("项目阶段不存在或已删除。");
  await prisma.$transaction(async (tx) => {
    await tx.workspaceProjectProgressLog.create({
      data: {
        stageId: stage.id,
        content: input.content,
        progress: input.progress,
        nextAction: input.nextAction,
        recordedOn: toDateValue(input.date)
      }
    });
    await tx.workspaceProjectStage.update({
      where: { id: stage.id },
      data: { progress: input.progress, nextAction: input.nextAction || undefined }
    });
    await syncWorkspaceProjectProgress(tx, stage.projectId);
  });
}

export async function removeWorkspaceProjectProgressLog(userId: string, logId: string) {
  const workspaceId = await getOrCreateWorkspaceId(userId);
  const result = await getPrisma().workspaceProjectProgressLog.deleteMany({
    where: { id: logId, stage: { project: { workspaceId } } }
  });
  if (!result.count) throw new WorkspaceInputError("项目推进记录不存在或已删除。");
}

async function syncParentProgress(
  tx: Prisma.TransactionClient,
  parentId: string,
  type: "DAILY" | "PHASED" | "LONG_TERM",
  date?: string
) {
  const recordDate = toDateValue(date || dateStringInTimeZone());
  const children = await tx.workspaceTask.findMany({
    where: { parentId, archivedAt: null },
    include: { dailyRecords: { where: { recordDate } } }
  });
  const completedCount = children.filter((child) =>
    type === "DAILY" ? Boolean(child.dailyRecords[0]?.completed) : child.status === "DONE"
  ).length;
  const progress = children.length ? Math.round((completedCount / children.length) * 100) : 0;
  const completed = children.length > 0 && completedCount === children.length;
  const status = completed ? "DONE" : progress > 0 ? "IN_PROGRESS" : "TODO";

  if (type === "DAILY") {
    await tx.workspaceTaskRecord.upsert({
      where: { taskId_recordDate: { taskId: parentId, recordDate } },
      update: {
        completed,
        progress,
        completedAt: completed ? new Date() : null
      },
      create: {
        taskId: parentId,
        recordDate,
        completed,
        progress,
        completedAt: completed ? new Date() : null
      }
    });
    return;
  }

  await tx.workspaceTask.update({
    where: { id: parentId },
    data: { progress, status, completedAt: completed ? new Date() : null }
  });
}

export async function addWorkspaceSubtask(
  userId: string,
  taskId: string,
  title: string,
  date?: string
) {
  const prisma = getPrisma();
  const workspaceId = await getOrCreateWorkspaceId(userId);
  const task = await prisma.workspaceTask.findFirst({
    where: { id: taskId, workspaceId, parentId: null, archivedAt: null }
  });
  if (!task) throw new WorkspaceInputError("主任务不存在或已删除。");
  const sortOrder = await prisma.workspaceTask.count({ where: { parentId: task.id } });
  await prisma.$transaction(async (tx) => {
    await tx.workspaceTask.create({
      data: {
        workspaceId,
        parentId: task.id,
        projectId: task.projectId,
        title,
        type: task.type,
        priority: task.priority,
        urgency: task.urgency,
        quadrant: task.quadrant,
        sortOrder
      }
    });
    await syncParentProgress(tx, task.id, task.type, date);
  });
}

export async function updateWorkspaceSubtask(userId: string, subtaskId: string, title: string) {
  const workspaceId = await getOrCreateWorkspaceId(userId);
  const subtask = await getPrisma().workspaceTask.findFirst({
    where: { id: subtaskId, workspaceId, parentId: { not: null }, archivedAt: null },
    select: { id: true }
  });
  if (!subtask) throw new WorkspaceInputError("子任务不存在或已删除。");

  await getPrisma().workspaceTask.update({
    where: { id: subtask.id },
    data: { title }
  });
}

export async function removeWorkspaceSubtask(userId: string, subtaskId: string, date?: string) {
  const prisma = getPrisma();
  const workspaceId = await getOrCreateWorkspaceId(userId);
  const subtask = await prisma.workspaceTask.findFirst({
    where: { id: subtaskId, workspaceId, parentId: { not: null }, archivedAt: null },
    select: { id: true, parentId: true, type: true }
  });
  if (!subtask?.parentId) throw new WorkspaceInputError("子任务不存在或已删除。");

  await prisma.$transaction(async (tx) => {
    await tx.workspaceTask.delete({ where: { id: subtask.id } });
    await syncParentProgress(tx, subtask.parentId!, subtask.type, date);
  });
}

export async function toggleWorkspaceSubtask(userId: string, subtaskId: string, date?: string) {
  const prisma = getPrisma();
  const workspaceId = await getOrCreateWorkspaceId(userId);
  const subtask = await prisma.workspaceTask.findFirst({
    where: { id: subtaskId, workspaceId, parentId: { not: null }, archivedAt: null },
    include: {
      dailyRecords: date
        ? { where: { recordDate: toDateValue(date) } }
        : { where: { recordDate: toDateValue(dateStringInTimeZone()) } }
    }
  });
  if (!subtask?.parentId) throw new WorkspaceInputError("子任务不存在或已删除。");
  const parentId = subtask.parentId;

  await prisma.$transaction(async (tx) => {
    if (subtask.type === "DAILY") {
      const selectedDate = date || dateStringInTimeZone();
      const recordDate = toDateValue(selectedDate);
      const completed = !subtask.dailyRecords[0]?.completed;
      await tx.workspaceTaskRecord.upsert({
        where: { taskId_recordDate: { taskId: subtask.id, recordDate } },
        update: { completed, progress: completed ? 100 : 0, completedAt: completed ? new Date() : null },
        create: { taskId: subtask.id, recordDate, completed, progress: completed ? 100 : 0, completedAt: completed ? new Date() : null }
      });
      await syncParentProgress(tx, parentId, subtask.type, selectedDate);
      return;
    }

    const completed = subtask.status !== "DONE";
    await tx.workspaceTask.update({
      where: { id: subtask.id },
      data: { status: completed ? "DONE" : "TODO", progress: completed ? 100 : 0, completedAt: completed ? new Date() : null }
    });
    await syncParentProgress(tx, parentId, subtask.type);
  });
}

export async function toggleWorkspaceTask(userId: string, taskId: string, date?: string) {
  const prisma = getPrisma();
  const workspaceId = await getOrCreateWorkspaceId(userId);
  const selectedDate = date || dateStringInTimeZone();
  const recordDate = toDateValue(selectedDate);
  const task = await prisma.workspaceTask.findFirst({
    where: { id: taskId, workspaceId, parentId: null, archivedAt: null },
    include: {
      dailyRecords: { where: { recordDate } },
      children: {
        where: { archivedAt: null },
        include: { dailyRecords: { where: { recordDate } } }
      }
    }
  });
  if (!task) throw new WorkspaceInputError("任务不存在或已删除。");

  await prisma.$transaction(async (tx) => {
    if (task.type === "DAILY") {
      const completed = task.children.length
        ? !task.children.every((child) => child.dailyRecords[0]?.completed)
        : !task.dailyRecords[0]?.completed;

      if (task.children.length) {
        await Promise.all(task.children.map((child) =>
          tx.workspaceTaskRecord.upsert({
            where: { taskId_recordDate: { taskId: child.id, recordDate } },
            update: { completed, progress: completed ? 100 : 0, completedAt: completed ? new Date() : null },
            create: { taskId: child.id, recordDate, completed, progress: completed ? 100 : 0, completedAt: completed ? new Date() : null }
          })
        ));
      }

      await tx.workspaceTaskRecord.upsert({
        where: { taskId_recordDate: { taskId, recordDate } },
        update: { completed, progress: completed ? 100 : 0, completedAt: completed ? new Date() : null },
        create: { taskId, recordDate, completed, progress: completed ? 100 : 0, completedAt: completed ? new Date() : null }
      });
      return;
    }

    const completed = task.children.length
      ? !task.children.every((child) => child.status === "DONE")
      : task.status !== "DONE";
    if (task.children.length) {
      await tx.workspaceTask.updateMany({
        where: { id: { in: task.children.map((child) => child.id) } },
        data: { status: completed ? "DONE" : "TODO", progress: completed ? 100 : 0, completedAt: completed ? new Date() : null }
      });
    }
    await tx.workspaceTask.update({
      where: { id: task.id },
      data: { status: completed ? "DONE" : "TODO", progress: completed ? 100 : 0, completedAt: completed ? new Date() : null }
    });
  });
}

export async function removeWorkspaceTask(userId: string, taskId: string) {
  const workspaceId = await getOrCreateWorkspaceId(userId);
  const prisma = getPrisma();
  const task = await prisma.workspaceTask.findFirst({
    where: { id: taskId, workspaceId, parentId: null }
  });
  if (!task) throw new WorkspaceInputError("任务不存在或已删除。");

  await prisma.$transaction(async (tx) => {
    await tx.workspaceTask.deleteMany({ where: { workspaceId, parentId: task.id } });
    await tx.workspaceTask.delete({ where: { id: task.id } });
  });
}

export async function addWorkspaceHabit(
  userId: string,
  input: { label: string; description: string; tone: (typeof habitToneValues)[number] }
) {
  const workspaceId = await getOrCreateWorkspaceId(userId);
  await getPrisma().workspaceHabit.create({
    data: {
      workspaceId,
      name: input.label,
      description: input.description,
      type: "CUSTOM",
      color: input.tone
    }
  });
}

export async function toggleWorkspaceHabit(userId: string, habitId: string) {
  const prisma = getPrisma();
  const workspaceId = await getOrCreateWorkspaceId(userId);
  const habit = await prisma.workspaceHabit.findFirst({
    where: { id: habitId, workspaceId, isActive: true }
  });
  if (!habit) throw new WorkspaceInputError("习惯不存在或已停用。");

  const recordDate = toDateValue(dateStringInTimeZone());
  const existing = await prisma.workspaceHabitRecord.findUnique({
    where: { habitId_recordDate: { habitId, recordDate } }
  });
  await prisma.workspaceHabitRecord.upsert({
    where: { habitId_recordDate: { habitId, recordDate } },
    update: { completed: !existing?.completed },
    create: { habitId, recordDate, completed: true }
  });
}

export async function addWorkspaceProject(
  userId: string,
  input: {
    name: string;
    description: string;
    stage?: string;
    nextAction?: string;
    startDate?: string;
    endDate?: string;
  }
) {
  const workspaceId = await getOrCreateWorkspaceId(userId);
  await getPrisma().workspaceProject.create({
    data: {
      workspaceId,
      name: input.name,
      description: input.description,
      stage: input.stage,
      nextAction: input.nextAction,
      startedOn: input.startDate ? toDateValue(input.startDate) : undefined,
      endedOn: input.endDate ? toDateValue(input.endDate) : undefined,
      stages: { create: goalStageDefinitions.map((stage) => ({ ...stage })) }
    }
  });
}

export async function updateWorkspaceProject(
  userId: string,
  projectId: string,
  input: {
    name: string;
    description: string;
    stage?: string;
    nextAction?: string;
    riskLevel: "low" | "medium" | "high";
    riskReason?: string;
    progress: number;
    startDate?: string;
    endDate?: string;
  }
) {
  const workspaceId = await getOrCreateWorkspaceId(userId);
  const project = await getPrisma().workspaceProject.findFirst({ where: { id: projectId, workspaceId } });
  if (!project) throw new WorkspaceInputError("项目不存在或已归档。");
  await getPrisma().workspaceProject.update({
    where: { id: project.id },
    data: {
      name: input.name,
      description: input.description,
      riskLevel: input.riskLevel.toUpperCase() as "LOW" | "MEDIUM" | "HIGH",
      riskReason: input.riskReason || null,
      startedOn: input.startDate ? toDateValue(input.startDate) : null,
      endedOn: input.endDate ? toDateValue(input.endDate) : null
    }
  });
}

export async function removeWorkspaceProject(userId: string, projectId: string) {
  const workspaceId = await getOrCreateWorkspaceId(userId);
  const prisma = getPrisma();
  const project = await prisma.workspaceProject.findFirst({
    where: { id: projectId, workspaceId, status: { not: "ARCHIVED" } },
    select: { id: true, _count: { select: { transactions: true } } }
  });
  if (!project) throw new WorkspaceInputError("项目不存在或已删除。");
  if (project._count.transactions > 0) {
    throw new WorkspaceInputError("该项目已有收支记录，请先删除相关收支记录后再删除项目。");
  }

  await prisma.workspaceProject.delete({ where: { id: project.id } });
}

export async function addWorkspaceTransaction(
  userId: string,
  input: { projectId: string; type: "income" | "expense"; amount: number; note: string; date: string }
) {
  const workspaceId = await getOrCreateWorkspaceId(userId);
  const project = await getPrisma().workspaceProject.findFirst({
    where: { id: input.projectId, workspaceId, status: { not: "ARCHIVED" } }
  });
  if (!project) throw new WorkspaceInputError("副业项目不存在或已归档。");

  await getPrisma().workspaceTransaction.create({
    data: {
      projectId: project.id,
      type: input.type === "income" ? "INCOME" : "EXPENSE",
      amount: input.amount,
      note: input.note,
      transactedOn: toDateValue(input.date)
    }
  });
}

export async function updateWorkspaceTransaction(
  userId: string,
  entryId: string,
  input: { projectId: string; type: "income" | "expense"; amount: number; note: string; date: string }
) {
  const workspaceId = await getOrCreateWorkspaceId(userId);
  const [entry, project] = await Promise.all([
    getPrisma().workspaceTransaction.findFirst({
      where: { id: entryId, project: { workspaceId } }
    }),
    getPrisma().workspaceProject.findFirst({
      where: { id: input.projectId, workspaceId, status: { not: "ARCHIVED" } }
    })
  ]);
  if (!entry) throw new WorkspaceInputError("收支记录不存在或已删除。");
  if (!project) throw new WorkspaceInputError("副业项目不存在或已归档。");

  await getPrisma().workspaceTransaction.update({
    where: { id: entry.id },
    data: {
      projectId: project.id,
      type: input.type === "income" ? "INCOME" : "EXPENSE",
      amount: input.amount,
      note: input.note,
      transactedOn: toDateValue(input.date)
    }
  });
}

export async function removeWorkspaceTransaction(userId: string, entryId: string) {
  const workspaceId = await getOrCreateWorkspaceId(userId);
  const entry = await getPrisma().workspaceTransaction.findFirst({
    where: { id: entryId, project: { workspaceId } }
  });
  if (!entry) throw new WorkspaceInputError("收支记录不存在或已删除。");
  await getPrisma().workspaceTransaction.delete({ where: { id: entry.id } });
}

const growthTaskRules: Record<GrowthCategory, {
  canonicalTitle: string;
  aliases: string[];
  habitType?: "READING" | "EXERCISE" | "LEARNING" | "REVIEW";
}> = {
  reading: { canonicalTitle: "每日阅读", aliases: ["每日阅读", "阅读30分钟"], habitType: "READING" },
  exercise: { canonicalTitle: "每日运动", aliases: ["每日运动", "运动3次/周"], habitType: "EXERCISE" },
  learning: { canonicalTitle: "每日学习", aliases: ["每日学习", "学习新知识"], habitType: "LEARNING" },
  inspiration: { canonicalTitle: "记录灵感", aliases: ["记录灵感", "每日灵感"] },
  review: { canonicalTitle: "每日复盘", aliases: ["每日复盘", "完成今日复盘", "今日复盘"], habitType: "REVIEW" }
};

type WorkspaceGrowthInput = {
  category: GrowthCategory;
  title: string;
  detail: string;
  metric?: string;
  date: string;
  exerciseType?: ExerciseType;
  durationMinutes?: number;
  calories?: number;
  distanceKm?: number;
  reviewReflection?: string;
  reviewTomorrowPlan?: string;
};

type DailyReviewSections = {
  taskSummary: string;
  reflection: string;
  tomorrowPlan: string;
  taskSnapshot: Prisma.InputJsonValue;
};

function normalizedTaskTitle(value: string) {
  return value.toLowerCase().replace(/[\s　，,。.!！：:、·_-]+/g, "");
}

function growthCategoryForTaskTitle(title: string) {
  const normalized = normalizedTaskTitle(title);
  return (Object.entries(growthTaskRules) as Array<[GrowthCategory, (typeof growthTaskRules)[GrowthCategory]]>)
    .find(([, rule]) => rule.aliases.some((alias) => normalizedTaskTitle(alias) === normalized))?.[0];
}

async function reconcileGrowthTasksForDate(workspaceId: string, date: string) {
  const prisma = getPrisma();
  const recordDate = toDateValue(date);
  const nextDate = toDateValue(shiftDate(date, 1));
  const [
    readingSessionCount,
    readingDailyStatCount,
    exerciseCount,
    learningCount,
    inspirationCount,
    reviewCount
  ] = await Promise.all([
    prisma.readingSession.count({ where: { readOn: recordDate, book: { workspaceId } } }),
    prisma.readingDailyStat.count({
      where: { workspaceId, readOn: recordDate, durationSeconds: { gt: 0 } }
    }),
    prisma.exerciseRecord.count({ where: { workspaceId, exercisedOn: recordDate } }),
    prisma.learningSession.count({ where: { learnedOn: recordDate, topic: { workspaceId } } }),
    prisma.inspiration.count({ where: { workspaceId, capturedAt: { gte: recordDate, lt: nextDate } } }),
    prisma.dailyReview.count({ where: { workspaceId, reviewDate: recordDate } })
  ]);
  const completionByCategory: Record<GrowthCategory, boolean> = {
    reading: readingSessionCount > 0 || readingDailyStatCount > 0,
    exercise: exerciseCount > 0,
    learning: learningCount > 0,
    inspiration: inspirationCount > 0,
    review: reviewCount > 0
  };
  await prisma.$transaction(async (tx) => {
    for (const category of Object.keys(completionByCategory) as GrowthCategory[]) {
      await completeGrowthTaskForDate(tx, workspaceId, category, date, completionByCategory[category]);
    }
  });
}

async function completeGrowthTaskForDate(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  category: GrowthCategory,
  date: string,
  completed = true
) {
  const recordDate = toDateValue(date);
  const rule = growthTaskRules[category];
  const aliases = new Set(rule.aliases.map(normalizedTaskTitle));
  const candidates = await tx.workspaceTask.findMany({
    where: {
      workspaceId,
      type: "DAILY",
      parentId: null,
      archivedAt: null,
      AND: [
        { OR: [{ startDate: null }, { startDate: { lte: recordDate } }] },
        { OR: [{ dueDate: null }, { dueDate: recordDate }] }
      ]
    },
    include: {
      habit: { select: { type: true } },
      children: { where: { archivedAt: null }, select: { id: true } }
    }
  });
  let matches = candidates.filter((task) =>
    aliases.has(normalizedTaskTitle(task.title)) || Boolean(rule.habitType && task.habit?.type === rule.habitType)
  );

  if (!matches.length && completed) {
    const task = await tx.workspaceTask.create({
      data: {
        workspaceId,
        title: rule.canonicalTitle,
        type: "DAILY",
        priority: "MEDIUM",
        urgency: "MEDIUM",
        quadrant: "IMPORTANT_NOT_URGENT",
        startDate: recordDate
      },
      include: { habit: { select: { type: true } }, children: { select: { id: true } } }
    });
    matches = [task];
  }
  if (!matches.length) return;

  const taskIds = matches.flatMap((task) => [task.id, ...task.children.map((child) => child.id)]);
  await Promise.all(taskIds.map((taskId) => tx.workspaceTaskRecord.upsert({
    where: { taskId_recordDate: { taskId, recordDate } },
    update: { completed, progress: completed ? 100 : 0, completedAt: completed ? new Date() : null },
    create: { taskId, recordDate, completed, progress: completed ? 100 : 0, completedAt: completed ? new Date() : null }
  })));
}

async function buildDailyReviewSections(
  workspaceId: string,
  input: WorkspaceGrowthInput
): Promise<DailyReviewSections> {
  const prisma = getPrisma();
  const recordDate = toDateValue(input.date);
  const tasks = await prisma.workspaceTask.findMany({
    where: {
      workspaceId,
      type: "DAILY",
      parentId: null,
      archivedAt: null,
      AND: [
        { OR: [{ startDate: null }, { startDate: { lte: recordDate } }] },
        { OR: [{ dueDate: null }, { dueDate: recordDate }] }
      ]
    },
    include: {
      dailyRecords: { where: { recordDate }, take: 1 }
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
  });
  const reviewAliases = new Set(growthTaskRules.review.aliases.map(normalizedTaskTitle));
  const taskStates = tasks.map((task) => {
    const isReviewTask = reviewAliases.has(normalizedTaskTitle(task.title));
    const record = task.dailyRecords[0];
    return {
      id: task.id,
      title: task.title,
      completed: isReviewTask || Boolean(record?.completed),
      progress: isReviewTask ? 100 : record?.progress ?? 0
    };
  });
  const completedTasks = taskStates.filter((task) => task.completed);
  const pendingTasks = taskStates.filter((task) => !task.completed);
  const completionRate = taskStates.length
    ? Math.round((completedTasks.length / taskStates.length) * 100)
    : 0;
  const summary = taskStates.length
    ? [
        `当日共 ${taskStates.length} 项任务，完成 ${completedTasks.length} 项，未完成 ${pendingTasks.length} 项，完成率 ${completionRate}%。`,
        completedTasks.length ? `已完成：${completedTasks.map((task) => task.title).join("、")}。` : "已完成：暂无。",
        pendingTasks.length ? `未完成：${pendingTasks.map((task) => task.title).join("、")}。` : "未完成：全部完成。"
      ].join("\n")
    : "当日没有安排任务。";

  return {
    taskSummary: summary,
    reflection: input.reviewReflection?.trim() || input.detail.trim(),
    tomorrowPlan: input.reviewTomorrowPlan?.trim() || "",
    taskSnapshot: {
      date: input.date,
      total: taskStates.length,
      completed: completedTasks.length,
      pending: pendingTasks.length,
      completionRate,
      summary,
      tasks: taskStates
    }
  };
}

function dailyReviewContent(sections: DailyReviewSections) {
  return [
    "## 当日任务完成情况",
    sections.taskSummary,
    "",
    "## 今日收获与不足",
    sections.reflection,
    "",
    "## 明天的计划与打算",
    sections.tomorrowPlan
  ].join("\n");
}

async function createGrowthEntry(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  input: WorkspaceGrowthInput,
  reviewSections?: DailyReviewSections
) {
  const date = toDateValue(input.date);
  const durationMinutes = Math.round(parseMetricNumber(input.metric, "分钟"));

  if (input.category === "reading") {
    let book = await tx.readingBook.findFirst({
      where: { workspaceId, title: input.title, isArchived: false }
    });
    book ||= await tx.readingBook.create({ data: { workspaceId, title: input.title } });
    const session = await tx.readingSession.create({
      data: {
        bookId: book.id,
        readOn: date,
        durationMinutes,
        metric: input.metric,
        note: input.detail
      }
    });
    return session.id;
  }

  if (input.category === "exercise") {
    const exerciseType = input.exerciseType || "other";
    const exerciseDuration = input.durationMinutes ?? durationMinutes;
    const entry = await tx.exerciseRecord.create({
      data: {
        workspaceId,
        title: input.title,
        exerciseType: exerciseTypeToDb[exerciseType],
        exercisedOn: date,
        durationMinutes: exerciseDuration,
        distanceKm: exerciseType === "running"
          ? (input.distanceKm ?? parseMetricNumber(input.metric, "公里")) || undefined
          : undefined,
        calories: input.calories,
        metric: input.metric,
        notes: input.detail
      }
    });
    return entry.id;
  }

  if (input.category === "learning") {
    const topic = await tx.learningTopic.upsert({
      where: { workspaceId_title: { workspaceId, title: input.title } },
      update: { isArchived: false },
      create: { workspaceId, title: input.title }
    });
    const session = await tx.learningSession.create({
      data: {
        topicId: topic.id,
        learnedOn: date,
        durationMinutes,
        metric: input.metric,
        notes: input.detail
      }
    });
    return session.id;
  }

  if (input.category === "inspiration") {
    const entry = await tx.inspiration.create({
      data: {
        workspaceId,
        title: input.title,
        content: input.detail,
        metric: input.metric,
        capturedAt: new Date(`${input.date}T12:00:00.000Z`)
      }
    });
    return entry.id;
  }

  if (!reviewSections) throw new WorkspaceInputError("复盘内容生成失败，请重新保存。");
  const review = await tx.dailyReview.upsert({
    where: { workspaceId_reviewDate: { workspaceId, reviewDate: date } },
    update: {
      title: `${input.date} 每日复盘`,
      content: dailyReviewContent(reviewSections),
      metric: null,
      wins: reviewSections.reflection,
      challenges: null,
      nextActions: reviewSections.tomorrowPlan,
      taskSnapshot: reviewSections.taskSnapshot
    },
    create: {
      workspaceId,
      reviewDate: date,
      title: `${input.date} 每日复盘`,
      content: dailyReviewContent(reviewSections),
      wins: reviewSections.reflection,
      nextActions: reviewSections.tomorrowPlan,
      taskSnapshot: reviewSections.taskSnapshot
    }
  });
  return review.id;
}

export async function addWorkspaceGrowthEntry(
  userId: string,
  input: WorkspaceGrowthInput
) {
  const workspaceId = await getOrCreateWorkspaceId(userId);
  const reviewSections = input.category === "review"
    ? await buildDailyReviewSections(workspaceId, input)
    : undefined;
  const preparedReview = reviewSections
    ? await prepareObsidianReview(userId, { date: input.date, ...reviewSections })
    : null;
  try {
    await getPrisma().$transaction(async (tx) => {
      await completeGrowthTaskForDate(tx, workspaceId, input.category, input.date);
      const recordId = await createGrowthEntry(tx, workspaceId, input, reviewSections);
      if (preparedReview) {
        await preparedReview.commit();
        await tx.dailyReview.update({ where: { id: recordId }, data: { syncedToObsidian: true } });
        await tx.externalConnection.update({ where: { id: preparedReview.connectionId }, data: { lastSyncedAt: new Date(), lastError: null } });
        await tx.externalSyncLog.create({
          data: {
            connectionId: preparedReview.connectionId,
            resourceType: "daily_review",
            resourceId: recordId,
            status: "SUCCESS",
            message: `已保存到 ${preparedReview.finalPath}`,
            completedAt: new Date()
          }
        });
      }
    });
  } catch (error) {
    if (preparedReview) await preparedReview.rollback().catch(() => undefined);
    throw error;
  }
}

export async function updateWorkspaceGrowthEntry(
  userId: string,
  entryId: string,
  input: WorkspaceGrowthInput
) {
  const prisma = getPrisma();
  const workspaceId = await getOrCreateWorkspaceId(userId);
  const date = toDateValue(input.date);
  const durationMinutes = Math.round(parseMetricNumber(input.metric, "分钟"));

  if (input.category === "reading") {
    const session = await prisma.readingSession.findFirst({
      where: { id: entryId, book: { workspaceId } },
      include: { book: true }
    });
    if (!session) throw new WorkspaceInputError("阅读记录不存在或已删除。");
    await prisma.$transaction(async (tx) => {
      await completeGrowthTaskForDate(tx, workspaceId, input.category, input.date);
      await tx.readingBook.update({ where: { id: session.bookId }, data: { title: input.title } });
      await tx.readingSession.update({ where: { id: session.id }, data: { readOn: date, durationMinutes, metric: input.metric || null, note: input.detail } });
    });
    return;
  }

  if (input.category === "exercise") {
    const entry = await prisma.exerciseRecord.findFirst({ where: { id: entryId, workspaceId } });
    if (!entry) throw new WorkspaceInputError("运动记录不存在或已删除。");
    await prisma.$transaction(async (tx) => {
      await completeGrowthTaskForDate(tx, workspaceId, input.category, input.date);
      await tx.exerciseRecord.update({
        where: { id: entry.id },
        data: {
        title: input.title,
        exerciseType: exerciseTypeToDb[input.exerciseType || "other"],
        exercisedOn: date,
        durationMinutes: input.durationMinutes ?? durationMinutes,
        distanceKm: input.exerciseType === "running"
          ? (input.distanceKm ?? parseMetricNumber(input.metric, "公里")) || null
          : null,
        calories: input.calories ?? null,
        metric: input.metric || null,
          notes: input.detail
        }
      });
    });
    return;
  }

  if (input.category === "learning") {
    const session = await prisma.learningSession.findFirst({
      where: { id: entryId, topic: { workspaceId } },
      include: { topic: true }
    });
    if (!session) throw new WorkspaceInputError("学习记录不存在或已删除。");
    await prisma.$transaction(async (tx) => {
      await completeGrowthTaskForDate(tx, workspaceId, input.category, input.date);
      await tx.learningTopic.update({ where: { id: session.topicId }, data: { title: input.title } });
      await tx.learningSession.update({ where: { id: session.id }, data: { learnedOn: date, durationMinutes, metric: input.metric || null, notes: input.detail } });
    });
    return;
  }

  if (input.category === "inspiration") {
    const entry = await prisma.inspiration.findFirst({ where: { id: entryId, workspaceId } });
    if (!entry) throw new WorkspaceInputError("灵感记录不存在或已删除。");
    await prisma.$transaction(async (tx) => {
      await completeGrowthTaskForDate(tx, workspaceId, input.category, input.date);
      await tx.inspiration.update({
        where: { id: entry.id },
        data: { title: input.title, content: input.detail, metric: input.metric || null, capturedAt: new Date(`${input.date}T12:00:00.000Z`) }
      });
    });
    return;
  }

  const entry = await prisma.dailyReview.findFirst({ where: { id: entryId, workspaceId } });
  if (!entry) throw new WorkspaceInputError("复盘记录不存在或已删除。");
  const reviewSections = await buildDailyReviewSections(workspaceId, input);
  const preparedReview = await prepareObsidianReview(userId, { date: input.date, ...reviewSections });
  try {
    await prisma.$transaction(async (tx) => {
      await completeGrowthTaskForDate(tx, workspaceId, input.category, input.date);
      await tx.dailyReview.update({
        where: { id: entry.id },
        data: {
          reviewDate: date,
          title: `${input.date} 每日复盘`,
          content: dailyReviewContent(reviewSections),
          metric: null,
          wins: reviewSections.reflection,
          challenges: null,
          nextActions: reviewSections.tomorrowPlan,
          taskSnapshot: reviewSections.taskSnapshot,
          syncedToObsidian: true
        }
      });
      await preparedReview.commit();
      await tx.externalConnection.update({ where: { id: preparedReview.connectionId }, data: { lastSyncedAt: new Date(), lastError: null } });
      await tx.externalSyncLog.create({
        data: {
          connectionId: preparedReview.connectionId,
          resourceType: "daily_review",
          resourceId: entry.id,
          status: "SUCCESS",
          message: `已保存到 ${preparedReview.finalPath}`,
          completedAt: new Date()
        }
      });
    });
  } catch (error) {
    await preparedReview.rollback().catch(() => undefined);
    throw error;
  }
}

export async function removeWorkspaceGrowthEntry(userId: string, entryId: string, category: GrowthCategory) {
  const prisma = getPrisma();
  const workspaceId = await getOrCreateWorkspaceId(userId);

  if (category === "reading") {
    const result = await prisma.readingSession.deleteMany({ where: { id: entryId, book: { workspaceId } } });
    if (!result.count) throw new WorkspaceInputError("阅读记录不存在或已删除。");
    return;
  }
  if (category === "exercise") {
    const result = await prisma.exerciseRecord.deleteMany({ where: { id: entryId, workspaceId } });
    if (!result.count) throw new WorkspaceInputError("运动记录不存在或已删除。");
    return;
  }
  if (category === "learning") {
    const entry = await prisma.learningSession.findFirst({ where: { id: entryId, topic: { workspaceId } } });
    if (!entry) throw new WorkspaceInputError("学习记录不存在或已删除。");
    await prisma.learningSession.delete({ where: { id: entry.id } });
    return;
  }
  if (category === "inspiration") {
    const result = await prisma.inspiration.deleteMany({ where: { id: entryId, workspaceId } });
    if (!result.count) throw new WorkspaceInputError("灵感记录不存在或已删除。");
    return;
  }
  const result = await prisma.dailyReview.deleteMany({ where: { id: entryId, workspaceId } });
  if (!result.count) throw new WorkspaceInputError("复盘记录不存在或已删除。");
}

function inferHabitType(value: string) {
  if (value.includes("阅读")) return "READING" as const;
  if (value.includes("复盘")) return "REVIEW" as const;
  if (value.includes("运动")) return "EXERCISE" as const;
  if (value.includes("学习")) return "LEARNING" as const;
  return "CUSTOM" as const;
}

export async function importWorkspaceData(userId: string, data: WorkspaceData) {
  const prisma = getPrisma();
  const workspaceId = await getOrCreateWorkspaceId(userId);
  const today = dateStringInTimeZone();
  const weekDates = currentWeekDates(today);

  await prisma.$transaction(async (tx) => {
    const [tasks, habits, projects, books, exercises, topics, inspirations, reviews] = await Promise.all([
      tx.workspaceTask.count({ where: { workspaceId } }),
      tx.workspaceHabit.count({ where: { workspaceId } }),
      tx.workspaceProject.count({ where: { workspaceId } }),
      tx.readingBook.count({ where: { workspaceId } }),
      tx.exerciseRecord.count({ where: { workspaceId } }),
      tx.learningTopic.count({ where: { workspaceId } }),
      tx.inspiration.count({ where: { workspaceId } }),
      tx.dailyReview.count({ where: { workspaceId } })
    ]);

    if (tasks + habits + projects + books + exercises + topics + inspirations + reviews > 0) {
      throw new WorkspaceInputError("数据库工作台已有数据，未执行重复导入。");
    }

    for (const [index, task] of data.tasks.entries()) {
      const created = await tx.workspaceTask.create({
        data: {
          workspaceId,
          title: task.title,
          type: taskTypeToDb[task.group],
          priority: priorityToDb[task.priority],
          status: task.group === "daily" ? "TODO" : task.completed ? "DONE" : "IN_PROGRESS",
          progress: task.progress,
          dueDate: task.targetDate ? toDateValue(task.targetDate) : undefined,
          sortOrder: index,
          completedAt: task.group !== "daily" && task.completed ? new Date() : undefined
        }
      });
      if (task.group === "daily") {
        await tx.workspaceTaskRecord.create({
          data: {
            taskId: created.id,
            recordDate: toDateValue(today),
            completed: task.completed,
            progress: task.progress,
            completedAt: task.completed ? new Date() : undefined
          }
        });
      }
    }

    for (const [index, habit] of data.habits.entries()) {
      const created = await tx.workspaceHabit.create({
        data: {
          workspaceId,
          name: habit.label,
          description: habit.description,
          type: inferHabitType(`${habit.id} ${habit.label}`),
          color: habit.tone,
          sortOrder: index
        }
      });
      for (const [dayIndex, completed] of habit.history.slice(0, 7).entries()) {
        if (!completed) continue;
        await tx.workspaceHabitRecord.create({
          data: {
            habitId: created.id,
            recordDate: toDateValue(weekDates[dayIndex]),
            completed: true
          }
        });
      }
      await tx.workspaceHabitRecord.upsert({
        where: {
          habitId_recordDate: {
            habitId: created.id,
            recordDate: toDateValue(today)
          }
        },
        update: { completed: habit.completed },
        create: {
          habitId: created.id,
          recordDate: toDateValue(today),
          completed: habit.completed
        }
      });
    }

    const projectIds = new Map<string, string>();
    for (const [index, project] of data.projects.entries()) {
      const created = await tx.workspaceProject.create({
        data: {
          workspaceId,
          name: project.name,
          description: project.description,
          sortOrder: index
        }
      });
      projectIds.set(project.id, created.id);
    }

    for (const entry of data.ledger) {
      const projectId = projectIds.get(entry.projectId);
      if (!projectId) continue;
      await tx.workspaceTransaction.create({
        data: {
          projectId,
          type: entry.type === "income" ? "INCOME" : "EXPENSE",
          amount: entry.amount,
          note: entry.note,
          transactedOn: toDateValue(entry.date)
        }
      });
    }

    for (const entry of data.growth) {
      await createGrowthEntry(tx, workspaceId, entry);
    }

    await tx.workspace.update({
      where: { id: workspaceId },
      data: {
        settings: {
          localStorageVersion: 1,
          localStorageImportedAt: new Date().toISOString()
        }
      }
    });
  }, { timeout: 30000 });
}
