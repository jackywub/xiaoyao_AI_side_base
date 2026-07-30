import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { isSameOrigin } from "@/lib/request-security";
import {
  addWorkspaceGrowthEntry,
  addWorkspaceGoalDailyAction,
  addWorkspaceGoalProgressLog,
  addWorkspaceGoalStage,
  addWorkspaceHabit,
  addWorkspaceProject,
  addWorkspaceProjectProgressLog,
  addWorkspaceSubtask,
  addWorkspaceTask,
  addWorkspaceTransaction,
  prepareWorkspaceDay,
  readWorkspaceData,
  removeWorkspaceGrowthEntry,
  removeWorkspaceGoalDailyAction,
  removeWorkspaceGoalProgressLog,
  removeWorkspaceGoalStage,
  removeWorkspaceProject,
  removeWorkspaceProjectProgressLog,
  removeWorkspaceSubtask,
  removeWorkspaceTransaction,
  removeWorkspaceTask,
  toggleWorkspaceHabit,
  toggleWorkspaceGoalDailyAction,
  toggleWorkspaceSubtask,
  updateWorkspaceProject,
  updateWorkspaceProjectStage,
  updateWorkspaceGoalDailyAction,
  updateWorkspaceGrowthEntry,
  updateWorkspaceGoalStage,
  updateWorkspaceSubtask,
  updateWorkspaceTransaction,
  updateWorkspaceTask,
  toggleWorkspaceTask
} from "@/lib/workspace-storage";
import {
  readEnum,
  readDate,
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

function errorResponse(error: unknown) {
  if (error instanceof WorkspaceInputError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return NextResponse.json({ error: "名称已经存在，请换一个名称。" }, { status: 409 });
  }
  console.error("Workspace request failed", error);
  return NextResponse.json({ error: "工作台暂时无法保存，请稍后重试。" }, { status: 500 });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  try {
    const result = await readWorkspaceData(user.id);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "请求来源无效。" }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) return unauthorized();

  try {
    const body = await request.json() as Record<string, unknown>;
    const action = readString(body.action, "操作类型", 50);
    const input = body.input && typeof body.input === "object"
      ? body.input as Record<string, unknown>
      : {};
    await prepareWorkspaceDay(user.id);

    if (action === "addTask") {
      await addWorkspaceTask(user.id, {
        title: readString(input.title, "任务标题", 300),
        group: readEnum(input.group, "任务类型", ["daily", "phased", "long-term"] as const),
        priority: readEnum(input.priority || "medium", "重要性", ["high", "medium", "low"] as const),
        urgency: readEnum(input.urgency || "medium", "紧急度", ["high", "medium", "low"] as const),
        quadrant: readEnum(input.quadrant || "low", "任务象限", ["important-urgent", "important-not-urgent", "urgent-not-important", "low"] as const),
        projectId: readOptionalString(input.projectId, "所属项目", 30),
        startDate: input.startDate ? readDate(input.startDate, "阶段开始") : undefined,
        targetDate: input.targetDate ? readDate(input.targetDate, "目标日期") : undefined,
        dueTime: readOptionalString(input.dueTime, "计划时间", 50),
        description: readOptionalString(input.description, "任务说明", 2000),
        isGoal: Boolean(input.isGoal)
      });
    } else if (action === "updateTask") {
      await updateWorkspaceTask(user.id, readString(input.id, "任务 ID", 30), {
        title: readString(input.title, "任务标题", 300),
        priority: readEnum(input.priority, "重要性", ["high", "medium", "low"] as const),
        urgency: readEnum(input.urgency, "紧急度", ["high", "medium", "low"] as const),
        quadrant: readEnum(input.quadrant, "任务象限", ["important-urgent", "important-not-urgent", "urgent-not-important", "low"] as const),
        projectId: readOptionalString(input.projectId, "所属项目", 30),
        startDate: input.startDate ? readDate(input.startDate, "阶段开始") : undefined,
        targetDate: input.targetDate ? readDate(input.targetDate, "目标日期") : undefined,
        dueTime: readOptionalString(input.dueTime, "计划时间", 50),
        description: readOptionalString(input.description, "任务说明", 2000),
        progress: readNumber(input.progress, "任务进度", 0, 100)
      });
    } else if (action === "updateGoalStage") {
      const startDate = input.startDate ? readDate(input.startDate, "阶段开始日期") : undefined;
      const endDate = input.endDate ? readDate(input.endDate, "阶段结束日期") : undefined;
      if (startDate && endDate && startDate > endDate) throw new WorkspaceInputError("阶段结束日期不能早于开始日期。");
      await updateWorkspaceGoalStage(
        user.id,
        readString(input.id, "目标阶段 ID", 30),
        {
          name: readString(input.name, "阶段名称", 200),
          startDate,
          endDate
        }
      );
    } else if (action === "addGoalStage") {
      const startDate = input.startDate ? readDate(input.startDate, "阶段开始日期") : undefined;
      const endDate = input.endDate ? readDate(input.endDate, "阶段结束日期") : undefined;
      if (startDate && endDate && startDate > endDate) throw new WorkspaceInputError("阶段结束日期不能早于开始日期。");
      await addWorkspaceGoalStage(user.id, readString(input.goalId, "阶段目标 ID", 30), {
        name: readString(input.name, "阶段名称", 200),
        startDate,
        endDate
      });
    } else if (action === "removeGoalStage") {
      await removeWorkspaceGoalStage(user.id, readString(input.id, "目标阶段 ID", 30));
    } else if (action === "addGoalDailyAction") {
      await addWorkspaceGoalDailyAction(user.id, readString(input.goalId, "目标 ID", 30), {
        title: readString(input.title, "每日行动", 300),
        date: readDate(input.date, "行动日期")
      });
    } else if (action === "updateGoalDailyAction") {
      await updateWorkspaceGoalDailyAction(user.id, readString(input.id, "每日行动 ID", 30), {
        title: readString(input.title, "每日行动", 300),
        date: readDate(input.date, "行动日期")
      });
    } else if (action === "toggleGoalDailyAction") {
      await toggleWorkspaceGoalDailyAction(user.id, readString(input.id, "每日行动 ID", 30));
    } else if (action === "removeGoalDailyAction") {
      await removeWorkspaceGoalDailyAction(user.id, readString(input.id, "每日行动 ID", 30));
    } else if (action === "addGoalProgressLog") {
      await addWorkspaceGoalProgressLog(
        user.id,
        readString(input.stageId, "项目阶段 ID", 30),
        {
          content: readString(input.content, "推进记录", 5000),
          progress: readNumber(input.progress, "阶段进度", 0, 100),
          nextAction: readOptionalString(input.nextAction, "下一步行动", 2000),
          date: readDate(input.date, "推进记录")
        }
      );
    } else if (action === "removeGoalProgressLog") {
      await removeWorkspaceGoalProgressLog(user.id, readString(input.id, "推进记录 ID", 30));
    } else if (action === "updateProjectStage") {
      await updateWorkspaceProjectStage(user.id, readString(input.id, "项目阶段 ID", 30), {
        progress: readNumber(input.progress, "阶段进度", 0, 100),
        analysis: readOptionalString(input.analysis, "阶段分析", 5000),
        nextAction: readOptionalString(input.nextAction, "下一步行动", 2000)
      });
    } else if (action === "addProjectProgressLog") {
      await addWorkspaceProjectProgressLog(user.id, readString(input.stageId, "项目阶段 ID", 30), {
        content: readString(input.content, "推进记录", 5000),
        progress: readNumber(input.progress, "阶段进度", 0, 100),
        nextAction: readOptionalString(input.nextAction, "下一步行动", 2000),
        date: readDate(input.date, "推进记录")
      });
    } else if (action === "removeProjectProgressLog") {
      await removeWorkspaceProjectProgressLog(user.id, readString(input.id, "推进记录 ID", 30));
    } else if (action === "toggleTask") {
      await toggleWorkspaceTask(
        user.id,
        readString(input.id, "任务 ID", 30),
        input.date ? readDate(input.date, "任务记录") : undefined
      );
    } else if (action === "removeTask") {
      await removeWorkspaceTask(user.id, readString(input.id, "任务 ID", 30));
    } else if (action === "addSubtask") {
      await addWorkspaceSubtask(
        user.id,
        readString(input.taskId, "主任务 ID", 30),
        readString(input.title, "子任务标题", 300),
        input.date ? readDate(input.date, "子任务记录") : undefined
      );
    } else if (action === "toggleSubtask") {
      await toggleWorkspaceSubtask(
        user.id,
        readString(input.id, "子任务 ID", 30),
        input.date ? readDate(input.date, "子任务记录") : undefined
      );
    } else if (action === "updateSubtask") {
      await updateWorkspaceSubtask(
        user.id,
        readString(input.id, "子任务 ID", 30),
        readString(input.title, "子任务标题", 300)
      );
    } else if (action === "removeSubtask") {
      await removeWorkspaceSubtask(
        user.id,
        readString(input.id, "子任务 ID", 30),
        input.date ? readDate(input.date, "子任务记录") : undefined
      );
    } else if (action === "addHabit") {
      await addWorkspaceHabit(user.id, {
        label: readString(input.label, "习惯名称", 100),
        description: readString(input.description, "习惯说明", 500),
        tone: readEnum(input.tone, "习惯颜色", ["blue", "green", "amber", "violet"] as const)
      });
    } else if (action === "toggleHabit") {
      await toggleWorkspaceHabit(user.id, readString(input.id, "习惯 ID", 30));
    } else if (action === "addProject") {
      await addWorkspaceProject(user.id, {
        name: readString(input.name, "项目名称", 200),
        description: readString(input.description, "项目说明", 1000),
        stage: readOptionalString(input.stage, "项目阶段", 200),
        nextAction: readOptionalString(input.nextAction, "下一步行动", 500),
        startDate: readOptionalString(input.startDate, "开始日期", 10),
        endDate: readOptionalString(input.endDate, "结束日期", 10)
      });
    } else if (action === "updateProject") {
      await updateWorkspaceProject(user.id, readString(input.id, "项目 ID", 30), {
        name: readString(input.name, "项目名称", 200),
        description: readString(input.description, "项目说明", 1000),
        stage: readOptionalString(input.stage, "项目阶段", 200),
        nextAction: readOptionalString(input.nextAction, "下一步行动", 500),
        riskLevel: readEnum(input.riskLevel, "风险等级", ["low", "medium", "high"] as const),
        riskReason: readOptionalString(input.riskReason, "风险说明", 2000),
        progress: readNumber(input.progress, "项目进度", 0, 100),
        startDate: readOptionalString(input.startDate, "开始日期", 10),
        endDate: readOptionalString(input.endDate, "结束日期", 10)
      });
    } else if (action === "removeProject") {
      await removeWorkspaceProject(user.id, readString(input.id, "项目 ID", 30));
    } else if (action === "addLedgerEntry") {
      await addWorkspaceTransaction(user.id, {
        projectId: readString(input.projectId, "项目 ID", 30),
        type: readEnum(input.type, "收支类型", ["income", "expense"] as const),
        amount: readNumber(input.amount, "金额", 0.01, 999999999.99),
        note: readString(input.note, "收支备注", 500),
        date: readDate(input.date, "收支")
      });
    } else if (action === "updateLedgerEntry") {
      await updateWorkspaceTransaction(user.id, readString(input.id, "收支 ID", 30), {
        projectId: readString(input.projectId, "项目 ID", 30),
        type: readEnum(input.type, "收支类型", ["income", "expense"] as const),
        amount: readNumber(input.amount, "金额", 0.01, 999999999.99),
        note: readString(input.note, "收支备注", 500),
        date: readDate(input.date, "收支")
      });
    } else if (action === "removeLedgerEntry") {
      await removeWorkspaceTransaction(user.id, readString(input.id, "收支 ID", 30));
    } else if (action === "addGrowthEntry") {
      const category = readEnum(input.category, "成长类型", [
        "reading",
        "exercise",
        "learning",
        "inspiration",
        "review"
      ] as const);
      const date = readDate(input.date, "成长记录");
      const reviewReflection = category === "review"
        ? readString(input.reviewReflection, "今日收获与不足", 10000)
        : undefined;
      const reviewTomorrowPlan = category === "review"
        ? readString(input.reviewTomorrowPlan, "明天的计划与打算", 10000)
        : undefined;
      await addWorkspaceGrowthEntry(user.id, {
        category,
        title: category === "review" ? `${date} 每日复盘` : readString(input.title, "成长记录标题", 300),
        detail: category === "review" ? reviewReflection! : readString(input.detail, "成长记录内容", 10000),
        metric: category === "review" ? undefined : readOptionalString(input.metric, "时长或进度", 100),
        date,
        exerciseType: input.exerciseType ? readEnum(input.exerciseType, "运动项目", ["walking", "running", "cycling", "swimming", "strength", "bodyweight", "yoga", "other"] as const) : undefined,
        durationMinutes: readOptionalNumber(input.durationMinutes, "运动时长", 0, 1440),
        calories: readOptionalNumber(input.calories, "能量消耗", 0, 100000),
        distanceKm: readOptionalNumber(input.distanceKm, "跑步距离", 0, 1000),
        reviewReflection,
        reviewTomorrowPlan
      });
    } else if (action === "updateGrowthEntry") {
      const category = readEnum(input.category, "成长类型", ["reading", "exercise", "learning", "inspiration", "review"] as const);
      const date = readDate(input.date, "成长记录");
      const reviewReflection = category === "review"
        ? readString(input.reviewReflection, "今日收获与不足", 10000)
        : undefined;
      const reviewTomorrowPlan = category === "review"
        ? readString(input.reviewTomorrowPlan, "明天的计划与打算", 10000)
        : undefined;
      await updateWorkspaceGrowthEntry(user.id, readString(input.id, "成长记录 ID", 30), {
        category,
        title: category === "review" ? `${date} 每日复盘` : readString(input.title, "成长记录标题", 300),
        detail: category === "review" ? reviewReflection! : readString(input.detail, "成长记录内容", 10000),
        metric: category === "review" ? undefined : readOptionalString(input.metric, "时长或进度", 100),
        date,
        exerciseType: input.exerciseType ? readEnum(input.exerciseType, "运动项目", ["walking", "running", "cycling", "swimming", "strength", "bodyweight", "yoga", "other"] as const) : undefined,
        durationMinutes: readOptionalNumber(input.durationMinutes, "运动时长", 0, 1440),
        calories: readOptionalNumber(input.calories, "能量消耗", 0, 100000),
        distanceKm: readOptionalNumber(input.distanceKm, "跑步距离", 0, 1000),
        reviewReflection,
        reviewTomorrowPlan
      });
    } else if (action === "removeGrowthEntry") {
      await removeWorkspaceGrowthEntry(
        user.id,
        readString(input.id, "成长记录 ID", 30),
        readEnum(input.category, "成长类型", ["reading", "exercise", "learning", "inspiration", "review"] as const)
      );
    } else {
      throw new WorkspaceInputError("不支持的工作台操作。");
    }

    return NextResponse.json(await readWorkspaceData(user.id));
  } catch (error) {
    return errorResponse(error);
  }
}
