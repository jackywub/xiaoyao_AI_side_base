export type WorkspaceSection =
  | "dashboard"
  | "tasks"
  | "projects"
  | "goals"
  | "ledger"
  | "growth"
  | "content"
  | "assistant"
  | "settings";

export type TaskGroup = "daily" | "phased" | "long-term";
export type TaskPriority = "high" | "medium" | "low";
export type TaskQuadrant =
  | "important-urgent"
  | "important-not-urgent"
  | "urgent-not-important"
  | "low";
export type GoalPhaseType = "learning" | "practice" | "completion";
export type GrowthCategory =
  | "reading"
  | "exercise"
  | "learning"
  | "inspiration"
  | "review";
export type ExerciseType =
  | "walking"
  | "running"
  | "cycling"
  | "swimming"
  | "strength"
  | "bodyweight"
  | "yoga"
  | "other";

export type WorkspaceTaskRecord = {
  date: string;
  completed: boolean;
  progress: number;
};

export type WorkspaceGoalProgressLog = {
  id: string;
  content: string;
  progress: number;
  nextAction?: string;
  date: string;
};

export type WorkspaceGoalDailyAction = {
  id: string;
  title: string;
  date: string;
  completed: boolean;
};

export type WorkspaceGoalStage = {
  id: string;
  phase?: GoalPhaseType;
  name: string;
  startDate?: string;
  endDate?: string;
  progress: number;
  analysis?: string;
  nextAction?: string;
  logs: WorkspaceGoalProgressLog[];
  dailyActions: WorkspaceGoalDailyAction[];
};

export type WorkspaceProjectStage = {
  id: string;
  phase: GoalPhaseType;
  progress: number;
  analysis?: string;
  nextAction?: string;
  logs: WorkspaceGoalProgressLog[];
};

export type WorkspaceSubtask = {
  id: string;
  title: string;
  completed: boolean;
  records: WorkspaceTaskRecord[];
};

export type WorkspaceTask = {
  id: string;
  title: string;
  group: TaskGroup;
  priority: TaskPriority;
  urgency?: TaskPriority;
  quadrant?: TaskQuadrant;
  completed: boolean;
  progress: number;
  startDate?: string;
  targetDate?: string;
  dueTime?: string;
  projectId?: string;
  description?: string;
  isGoal?: boolean;
  growthSyncCategory?: GrowthCategory;
  records: WorkspaceTaskRecord[];
  subtasks?: WorkspaceSubtask[];
  goalStages?: WorkspaceGoalStage[];
};

export type WorkspaceHabit = {
  id: string;
  label: string;
  description: string;
  streak: number;
  completed: boolean;
  history: boolean[];
  tone: "blue" | "green" | "amber" | "violet";
};

export type LedgerProject = {
  id: string;
  name: string;
  description: string;
  stage?: string;
  progress?: number;
  nextAction?: string;
  riskLevel?: "low" | "medium" | "high";
  riskReason?: string;
  startDate?: string;
  endDate?: string;
  stages?: WorkspaceProjectStage[];
};

export type LedgerEntry = {
  id: string;
  projectId: string;
  type: "income" | "expense";
  amount: number;
  note: string;
  date: string;
};

export type GrowthEntry = {
  id: string;
  category: GrowthCategory;
  title: string;
  detail: string;
  metric?: string;
  date: string;
  exerciseType?: ExerciseType;
  durationMinutes?: number;
  calories?: number;
  distanceKm?: number;
  reviewSummary?: string;
  reviewReflection?: string;
  reviewTomorrowPlan?: string;
  reviewSyncedToObsidian?: boolean;
  reviewSavedAt?: string;
};

export type ReadingDailyStat = {
  date: string;
  durationSeconds: number;
};

export type WorkspaceData = {
  tasks: WorkspaceTask[];
  habits: WorkspaceHabit[];
  projects: LedgerProject[];
  ledger: LedgerEntry[];
  growth: GrowthEntry[];
  readingDailyStats: ReadingDailyStat[];
};

export const workspaceSectionLabels: Record<WorkspaceSection, string> = {
  dashboard: "数据看板",
  tasks: "任务管理",
  projects: "项目推进",
  goals: "目标设定",
  ledger: "副业收益",
  growth: "成长记录",
  content: "网站内容",
  assistant: "AI 助手",
  settings: "设置"
};

export const taskGroupLabels: Record<TaskGroup, string> = {
  daily: "每日任务",
  phased: "阶段任务",
  "long-term": "长期任务"
};

export const goalPhaseLabels: Record<GoalPhaseType, string> = {
  learning: "学习阶段",
  practice: "实操阶段",
  completion: "完成及收尾阶段"
};

export const growthCategoryLabels: Record<GrowthCategory, string> = {
  reading: "阅读",
  exercise: "运动",
  learning: "学习",
  inspiration: "灵感",
  review: "复盘"
};

export const exerciseTypeLabels: Record<ExerciseType, string> = {
  walking: "步行",
  running: "跑步",
  cycling: "骑行",
  swimming: "游泳",
  strength: "健身",
  bodyweight: "徒手运动",
  yoga: "瑜伽",
  other: "其他运动"
};

export const STORAGE_KEY = "xiaoyao:growth-workspace:v1";
export const STORAGE_BACKUP_KEY = "xiaoyao:growth-workspace:v1:backup";

export function createEmptyWorkspaceData(): WorkspaceData {
  return {
    tasks: [],
    habits: [],
    projects: [],
    ledger: [],
    growth: [],
    readingDailyStats: []
  };
}

function dateOffset(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function createWorkspaceData(): WorkspaceData {
  return {
    tasks: [
      {
        id: "task-daily-content",
        title: "完成一篇 AI 工具实战笔记",
        group: "daily",
        priority: "high",
        completed: false,
        progress: 60,
        records: [],
        targetDate: dateOffset(0)
      },
      {
        id: "task-daily-review",
        title: "完成今日复盘",
        group: "daily",
        priority: "medium",
        completed: true,
        progress: 100,
        records: [],
        targetDate: dateOffset(0)
      },
      {
        id: "task-phase-product",
        title: "打磨天赋数字咨询交付流程",
        group: "phased",
        priority: "high",
        completed: false,
        progress: 45,
        records: [],
        targetDate: dateOffset(14)
      },
      {
        id: "task-phase-site",
        title: "完成个人品牌网站内容升级",
        group: "phased",
        priority: "medium",
        completed: false,
        progress: 70,
        records: [],
        targetDate: dateOffset(7)
      },
      {
        id: "task-long-brand",
        title: "持续建设萧小遥个人品牌内容资产",
        group: "long-term",
        priority: "high",
        completed: false,
        progress: 32,
        records: []
      }
    ],
    habits: [
      {
        id: "habit-reading",
        label: "每日阅读",
        description: "至少阅读 30 分钟",
        streak: 12,
        completed: true,
        history: [true, true, true, false, true, true, true],
        tone: "blue"
      },
      {
        id: "habit-review",
        label: "每日复盘",
        description: "记录有效、消耗与下一步",
        streak: 8,
        completed: true,
        history: [true, true, false, true, true, true, true],
        tone: "amber"
      },
      {
        id: "habit-exercise",
        label: "每日运动",
        description: "保持 30 分钟身体活动",
        streak: 5,
        completed: false,
        history: [false, true, true, false, true, true, false],
        tone: "green"
      },
      {
        id: "habit-learning",
        label: "每日学习",
        description: "完成一个小主题输入",
        streak: 20,
        completed: false,
        history: [true, true, true, true, true, false, false],
        tone: "violet"
      }
    ],
    projects: [
      {
        id: "project-consulting",
        name: "天赋数字咨询",
        description: "咨询服务与成长路径梳理"
      },
      {
        id: "project-content",
        name: "AI 内容服务",
        description: "AI 工具培训与内容工作流"
      },
      {
        id: "project-brand",
        name: "个人品牌共创",
        description: "网站、内容与产品结构搭建"
      }
    ],
    ledger: [
      {
        id: "ledger-1",
        projectId: "project-consulting",
        type: "income",
        amount: 1299,
        note: "天赋数字深度咨询",
        date: dateOffset(-2)
      },
      {
        id: "ledger-2",
        projectId: "project-content",
        type: "income",
        amount: 2200,
        note: "AI 内容工作流陪跑",
        date: dateOffset(-6)
      },
      {
        id: "ledger-3",
        projectId: "project-brand",
        type: "expense",
        amount: 399,
        note: "工具订阅与域名",
        date: dateOffset(-8)
      }
    ],
    growth: [
      {
        id: "growth-reading",
        category: "reading",
        title: "《纳瓦尔宝典》",
        detail: "重新整理关于长期主义和杠杆的笔记。",
        metric: "42 分钟",
        date: dateOffset(0)
      },
      {
        id: "growth-learning",
        category: "learning",
        title: "AI Agent 工作流",
        detail: "完成从任务拆分到工具调用的案例练习。",
        metric: "65 分钟",
        date: dateOffset(-1)
      },
      {
        id: "growth-exercise",
        category: "exercise",
        title: "户外快走",
        detail: "午后快走，整理本周内容选题。",
        metric: "5.2 公里",
        date: dateOffset(-1)
      },
      {
        id: "growth-inspiration",
        category: "inspiration",
        title: "把副业当作成长实验",
        detail: "不追求一次选对，而是建立低成本、短周期的验证机制。",
        date: dateOffset(-2)
      },
      {
        id: "growth-review",
        category: "review",
        title: "今日复盘",
        detail: "有效：完成网站结构梳理。消耗：任务切换太频繁。下一步：上午只推进一个核心任务。",
        date: dateOffset(0)
      }
    ],
    readingDailyStats: []
  };
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 2
  }).format(amount);
}

export function getTaskStateForDate(task: WorkspaceTask, date: string) {
  if (task.group !== "daily") {
    return { completed: task.completed, progress: task.progress };
  }

  const record = task.records.find((item) => item.date === date);
  return {
    completed: Boolean(record?.completed),
    progress: record?.progress ?? 0
  };
}

export function getSubtaskStateForDate(
  subtask: WorkspaceSubtask,
  taskGroup: TaskGroup,
  date: string
) {
  if (taskGroup !== "daily") return subtask.completed;
  return Boolean(subtask.records.find((item) => item.date === date)?.completed);
}

export function taskAppliesOnDate(task: WorkspaceTask, date: string) {
  if (task.group !== "daily") return task.targetDate === date;
  if (task.targetDate) return task.targetDate === date;
  return !task.startDate || date >= task.startDate;
}
