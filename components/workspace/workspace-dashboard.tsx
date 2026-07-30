"use client";

import {
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  Clock3,
  Dumbbell,
  FilePenLine,
  ListChecks,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import {
  WorkspaceCalendar,
  type CalendarMarker
} from "@/components/workspace/workspace-calendar";
import {
  formatCurrency,
  getSubtaskStateForDate,
  getTaskStateForDate,
  taskAppliesOnDate,
  type GrowthEntry,
  type WorkspaceData,
  type WorkspaceSection
} from "@/lib/workspace-data";
import { formatWorkspaceDate, getDateRange, shiftDateKey } from "@/lib/workspace-dates";
import { cn } from "@/lib/utils";

type DashboardProps = {
  data: WorkspaceData;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onNavigate: (section: WorkspaceSection) => void;
};

type RangeMode = "day" | "week" | "month" | "currentMonth";

const rangeOptions: Array<{ id: RangeMode; label: string; days?: number }> = [
  { id: "day", label: "当日", days: 1 },
  { id: "week", label: "近 7 日", days: 7 },
  { id: "month", label: "近 30 日", days: 30 },
  { id: "currentMonth", label: "本月" }
];

function shortCurrency(value: number) {
  if (Math.abs(value) >= 10_000) return `${(value / 10_000).toFixed(1)}万`;
  return String(Math.round(value));
}

function parseDurationMinutes(metric?: string) {
  if (!metric) return 0;
  const hourMatch = metric.match(/(\d+(?:\.\d+)?)\s*(小时|h|hour)/i);
  const minuteMatch = metric.match(/(\d+(?:\.\d+)?)\s*(分钟|min|m)/i);
  const hours = hourMatch ? Number(hourMatch[1]) * 60 : 0;
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;
  return Math.round(hours + minutes);
}

function growthDurationMinutes(entry: GrowthEntry) {
  return entry.durationMinutes ?? parseDurationMinutes(entry.metric);
}

function formatDurationMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours && minutes) return `${hours} 小时 ${minutes} 分钟`;
  if (hours) return `${hours} 小时`;
  return `${minutes} 分钟`;
}

function SummaryMetricCard({
  label,
  value,
  detail,
  tone,
  visual
}: {
  label: string;
  value: string;
  detail: string;
  tone: "emerald" | "slate";
  visual: "ring" | "list" | "line";
}) {
  const valueTone = tone === "emerald" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground";

  return (
    <article className="soft-card flex min-h-32 items-center justify-between gap-4 p-5">
      <div className="min-w-0">
        <p className="text-sm font-bold text-muted-foreground">{label}</p>
        <p className={cn("mt-3 truncate text-3xl font-black leading-none sm:text-4xl", valueTone)}>{value}</p>
        <p className="mt-3 text-sm font-semibold text-muted-foreground">{detail}</p>
      </div>
      {visual === "ring" ? (
        <span className="size-16 shrink-0 rounded-full border-[7px] border-muted" aria-hidden="true" />
      ) : null}
      {visual === "list" ? (
        <span className="grid size-12 shrink-0 place-items-center rounded-lg border border-border bg-background text-muted-foreground shadow-line" aria-hidden="true">
          <ListChecks size={22} />
        </span>
      ) : null}
      {visual === "line" ? (
        <span className="h-0.5 w-24 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
      ) : null}
    </article>
  );
}

function GrowthMonthCard({
  label,
  value,
  detail,
  tone,
  icon: Icon
}: {
  label: string;
  value: string;
  detail: string;
  tone: "emerald" | "amber" | "blue" | "violet" | "slate";
  icon: typeof BookOpen;
}) {
  const toneClasses = {
    emerald: "border-emerald-500/15 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    blue: "border-blue-500/15 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    violet: "border-primary/20 bg-primary/10 text-primary",
    slate: "border-border bg-background text-foreground"
  };

  return (
    <article className={cn("min-h-28 rounded-lg border p-4 shadow-line", toneClasses[tone])}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold">{label}</p>
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-background/70" aria-hidden="true">
          <Icon size={17} />
        </span>
      </div>
      <p className="mt-3 text-2xl font-black leading-none sm:text-3xl">{value}</p>
      <p className="mt-3 text-sm font-semibold opacity-90">{detail}</p>
    </article>
  );
}

export function WorkspaceDashboard({
  data,
  selectedDate,
  onDateChange,
  onNavigate
}: DashboardProps) {
  const [rangeMode, setRangeMode] = useState<RangeMode>("week");
  const selectedRange = rangeOptions.find((item) => item.id === rangeMode) || rangeOptions[1];
  const rangeDates = useMemo(
    () => getDateRange(selectedDate, selectedRange.id === "currentMonth" ? Number(selectedDate.slice(8, 10)) : selectedRange.days || 1),
    [selectedDate, selectedRange.days, selectedRange.id]
  );
  const rangeDateSet = useMemo(() => new Set(rangeDates), [rangeDates]);

  const dailyTasks = useMemo(
    () => data.tasks.filter((task) => task.group === "daily" && !task.isGoal),
    [data.tasks]
  );
  const dailyStats = useMemo(() => rangeDates.map((date) => {
    const applicable = dailyTasks.filter((task) => taskAppliesOnDate(task, date));
    const completed = applicable.filter((task) => getTaskStateForDate(task, date).completed).length;
    return {
      date,
      total: applicable.length,
      completed,
      rate: applicable.length ? Math.round((completed / applicable.length) * 100) : 0
    };
  }), [dailyTasks, rangeDates]);

  const rangeEntries = useMemo(
    () => data.ledger.filter((entry) => rangeDateSet.has(entry.date)),
    [data.ledger, rangeDateSet]
  );
  const previousRangeDates = useMemo(
    () => getDateRange(shiftDateKey(rangeDates[0], -1), rangeDates.length),
    [rangeDates]
  );
  const previousRangeDateSet = useMemo(() => new Set(previousRangeDates), [previousRangeDates]);
  const income = rangeEntries.filter((entry) => entry.type === "income").reduce((sum, entry) => sum + entry.amount, 0);
  const expense = rangeEntries.filter((entry) => entry.type === "expense").reduce((sum, entry) => sum + entry.amount, 0);
  const previousIncome = data.ledger
    .filter((entry) => previousRangeDateSet.has(entry.date) && entry.type === "income")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const incomeTrend = previousIncome
    ? `${((income - previousIncome) / previousIncome * 100).toFixed(0)}%`
    : income ? "+100%" : "持平";
  const dashboardTasks = useMemo(
    () => data.tasks.filter((task) => !task.isGoal),
    [data.tasks]
  );
  const rangeTaskStats = useMemo(() => rangeDates.reduce((result, date) => {
    const applicable = dashboardTasks.filter((task) => taskAppliesOnDate(task, date));
    const completed = applicable.filter((task) => getTaskStateForDate(task, date).completed);
    return {
      total: result.total + applicable.length,
      completed: result.completed + completed.length
    };
  }, { completed: 0, total: 0 }), [dashboardTasks, rangeDates]);
  const selectedCompletionRate = rangeTaskStats.total
    ? Math.round((rangeTaskStats.completed / rangeTaskStats.total) * 100)
    : 0;
  const pendingKeyTasks = dashboardTasks.filter((task) =>
    task.priority === "high" && rangeDates.some((date) =>
      taskAppliesOnDate(task, date) && !getTaskStateForDate(task, date).completed
    )
  ).length;
  const monthKey = selectedDate.slice(0, 7);
  const monthLabel = `${Number(monthKey.slice(5, 7))} 月`;
  const monthGrowthEntries = useMemo(
    () => data.growth.filter((entry) => entry.date.startsWith(monthKey)),
    [data.growth, monthKey]
  );
  const monthReadingEntries = monthGrowthEntries.filter((entry) => entry.category === "reading");
  const monthReadingDailyStats = data.readingDailyStats.filter((entry) =>
    entry.date.startsWith(monthKey) && entry.durationSeconds > 0
  );
  const monthReadingDays = new Set([
    ...monthReadingEntries.map((entry) => entry.date),
    ...monthReadingDailyStats.map((entry) => entry.date)
  ]).size;
  const manualReadingMinutes = monthReadingEntries.reduce((sum, entry) => sum + growthDurationMinutes(entry), 0);
  const syncedReadingMinutes = Math.round(monthReadingDailyStats.reduce((sum, entry) => sum + entry.durationSeconds, 0) / 60);
  const monthReadingMinutes = manualReadingMinutes + syncedReadingMinutes;
  const monthExerciseCount = monthGrowthEntries.filter((entry) => entry.category === "exercise").length;
  const monthReviewCount = monthGrowthEntries.filter((entry) => entry.category === "review").length;
  const monthLearningCount = monthGrowthEntries.filter((entry) => entry.category === "learning").length;
  const trendData = useMemo(() => dailyStats.map((item) => {
    const dayIncome = data.ledger
      .filter((entry) => entry.date === item.date && entry.type === "income")
      .reduce((sum, entry) => sum + entry.amount, 0);
    return {
      date: item.date,
      label: item.date.slice(5).replace("-", "/"),
      completionRate: item.rate,
      income: dayIncome
    };
  }), [dailyStats, data.ledger]);
  const selectedTasks = useMemo(
    () => dailyTasks.filter((task) => taskAppliesOnDate(task, selectedDate)),
    [dailyTasks, selectedDate]
  );

  const markers = useMemo(() => {
    const dates = new Set<string>();
    dailyTasks.forEach((task) => task.records.forEach((record) => dates.add(record.date)));
    data.ledger.forEach((entry) => dates.add(entry.date));
    dates.add(selectedDate);
    return Array.from(dates).reduce<Record<string, CalendarMarker>>((result, date) => {
      const applicable = dailyTasks.filter((task) => taskAppliesOnDate(task, date));
      const completed = applicable.filter((task) => getTaskStateForDate(task, date).completed).length;
      result[date] = {
        completionRate: applicable.length ? Math.round((completed / applicable.length) * 100) : 0,
        hasIncome: data.ledger.some((entry) => entry.date === date && entry.type === "income")
      };
      return result;
    }, {});
  }, [dailyTasks, data.ledger, selectedDate]);

  const projectIncome = data.projects.map((project) => {
    const entries = rangeEntries.filter((entry) => entry.projectId === project.id);
    const projectIncomeTotal = entries.filter((entry) => entry.type === "income").reduce((sum, entry) => sum + entry.amount, 0);
    const projectExpenseTotal = entries.filter((entry) => entry.type === "expense").reduce((sum, entry) => sum + entry.amount, 0);
    return { ...project, income: projectIncomeTotal, expense: projectExpenseTotal, net: projectIncomeTotal - projectExpenseTotal };
  }).filter((project) => project.income || project.expense).sort((a, b) => b.net - a.net);

  return (
    <div className="grid gap-6">
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-line sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">以 {formatWorkspaceDate(selectedDate)} 为统计终点</p>
          <p className="mt-1 text-sm text-muted-foreground">任务完成和副业收支使用同一条日期轴</p>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-strong p-1 sm:grid-cols-4" aria-label="统计范围">
          {rangeOptions.map((option) => (
            <button
              aria-pressed={rangeMode === option.id}
              className={cn("focus-ring min-h-10 rounded-md px-3 text-sm font-semibold transition", rangeMode === option.id ? "bg-surface text-primary shadow-line" : "text-muted-foreground hover:text-primary")}
              key={option.id}
              type="button"
              onClick={() => setRangeMode(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <WorkspaceCalendar markers={markers} selectedDate={selectedDate} onSelect={onDateChange} />
        <div className="grid content-start gap-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <SummaryMetricCard detail={`已完成 ${rangeTaskStats.completed} / ${rangeTaskStats.total}`} label="完成率" tone="emerald" value={`${selectedCompletionRate}%`} visual="ring" />
            <SummaryMetricCard detail="待完成" label="重点任务" tone="emerald" value={`${pendingKeyTasks} 个`} visual="list" />
            <SummaryMetricCard detail={`较上一周期 ${incomeTrend}`} label="副业收入" tone="emerald" value={formatCurrency(income)} visual="line" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <GrowthMonthCard detail={`${monthLabel}有阅读记录的天数`} icon={BookOpen} label="本月阅读" tone="emerald" value={`${monthReadingDays} 天`} />
            <GrowthMonthCard detail="阅读记录累计时长" icon={Clock3} label="阅读时长" tone="amber" value={formatDurationMinutes(monthReadingMinutes)} />
            <GrowthMonthCard detail={`${monthLabel}运动记录次数`} icon={Dumbbell} label="运动记录" tone="blue" value={`${monthExerciseCount} 次`} />
            <GrowthMonthCard detail={`${monthLabel}每日复盘次数`} icon={FilePenLine} label="复盘记录" tone="violet" value={`${monthReviewCount} 次`} />
            <GrowthMonthCard detail={`${monthLabel}学习记录次数`} icon={Brain} label="学习记录" tone="slate" value={`${monthLearningCount} 次`} />
          </div>
        </div>
      </div>

      {rangeMode !== "day" ? (
        <section className="soft-card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">任务与收入趋势</h2>
              <p className="mt-1 text-sm text-muted-foreground">折线显示每日完成率和副业收入，支持近 7 日、近 30 日和本月趋势</p>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">{rangeDates[0]} 至 {selectedDate}</span>
          </div>
          <div className="h-72 px-3 py-6 sm:px-5">
            <ResponsiveContainer height="100%" width="100%">
              <LineChart data={trendData} margin={{ bottom: 4, left: 0, right: 8, top: 8 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 5" vertical={false} />
                <XAxis axisLine={false} dataKey="label" minTickGap={18} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} />
                <YAxis axisLine={false} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(value) => `${value}%`} tickLine={false} width={42} yAxisId="rate" />
                <YAxis axisLine={false} orientation="right" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={shortCurrency} tickLine={false} width={46} yAxisId="income" />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  formatter={(value, name) => [
                    name === "income" ? formatCurrency(Number(value)) : `${Math.round(Number(value))}%`,
                    name === "income" ? "副业收入" : "完成率"
                  ]}
                  labelFormatter={(label) => `${label}`}
                />
                <Line activeDot={{ r: 5 }} dataKey="completionRate" dot={rangeMode === "week"} name="completionRate" stroke="hsl(var(--primary))" strokeWidth={3} type="monotone" yAxisId="rate" />
                <Line activeDot={{ r: 5 }} dataKey="income" dot={rangeMode === "week"} name="income" stroke="#10b981" strokeWidth={3} type="monotone" yAxisId="income" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="soft-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="font-semibold">{formatWorkspaceDate(selectedDate, false)}任务</h2>
              <p className="mt-1 text-sm text-muted-foreground">实时同步自任务管理，展示当前选中日期的完成情况</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-surface-strong px-2 py-1 text-xs font-semibold text-muted-foreground">只读</span>
              <button className="icon-button" title="进入任务管理" type="button" onClick={() => onNavigate("tasks")}><ArrowRight size={17} /></button>
            </div>
          </div>
          <div className="divide-y divide-border">
            {selectedTasks.slice(0, 8).map((task) => {
              const state = getTaskStateForDate(task, selectedDate);
              const completedSubtasks = task.subtasks?.filter((subtask) =>
                getSubtaskStateForDate(subtask, task.group, selectedDate)
              ).length || 0;
              return (
                <div className="flex min-h-14 w-full items-center gap-3 px-5 py-3" key={task.id}>
                  <span aria-hidden="true" className={cn("grid size-6 shrink-0 place-items-center rounded-md border", state.completed ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background")}>
                    {state.completed ? <Check size={14} /> : null}
                  </span>
                  <span className={cn("min-w-0 flex-1 truncate text-sm font-medium", state.completed && "text-muted-foreground line-through")}>{task.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {task.subtasks?.length ? `${completedSubtasks}/${task.subtasks.length}` : state.completed ? "完成" : "待办"}
                  </span>
                </div>
              );
            })}
            {!selectedTasks.length ? <p className="px-5 py-12 text-center text-sm text-muted-foreground">当前日期还没有任务。</p> : null}
          </div>
        </section>

        <section className="soft-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">项目收益排行</h2>
              <p className="mt-1 text-sm text-muted-foreground">按当前统计范围计算净收益</p>
            </div>
            <button className="icon-button" title="管理副业收益" type="button" onClick={() => onNavigate("ledger")}><ArrowRight size={17} /></button>
          </div>
          <div className="mt-5 grid gap-3">
            {projectIncome.slice(0, 5).map((project) => (
              <article className="grid grid-cols-[1fr_auto] gap-3 border-b border-border pb-3 last:border-0 last:pb-0" key={project.id}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{project.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">收入 {formatCurrency(project.income)} · 支出 {formatCurrency(project.expense)}</p>
                </div>
                <strong className={cn("text-sm", project.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>{formatCurrency(project.net)}</strong>
              </article>
            ))}
            {!projectIncome.length ? <p className="py-10 text-center text-sm text-muted-foreground">当前范围内没有收支记录。</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
