"use client";

import {
  Activity,
  BookOpen,
  Brain,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  Dumbbell,
  FilePenLine,
  Flame,
  Lightbulb,
  Pencil,
  Plus,
  Route,
  Save,
  Sunrise,
  Trash2,
  type LucideIcon
} from "lucide-react";
import { useMemo, useState } from "react";

import { WorkspaceCalendar, type CalendarMarker } from "@/components/workspace/workspace-calendar";
import { WorkspaceReadingLibrary } from "@/components/workspace/workspace-reading-library";
import {
  exerciseTypeLabels,
  growthCategoryLabels,
  type ExerciseType,
  type GrowthCategory,
  type GrowthEntry,
  type WorkspaceTask,
  getTaskStateForDate
} from "@/lib/workspace-data";
import { currentDateKey, formatWorkspaceDate } from "@/lib/workspace-dates";
import { cn } from "@/lib/utils";

type GrowthInput = {
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

type GrowthProps = {
  disabled: boolean;
  entries: GrowthEntry[];
  saveError: string;
  tasks: WorkspaceTask[];
  onAdd: (input: GrowthInput) => Promise<boolean>;
  onUpdate: (entry: GrowthEntry) => Promise<boolean>;
  onRemove: (id: string, category: GrowthCategory) => Promise<boolean>;
  onReadingSync: () => Promise<boolean>;
};

const categories: Array<{
  id: GrowthCategory;
  icon: LucideIcon;
  prompt: string;
}> = [
  { id: "reading", icon: BookOpen, prompt: "书名或阅读主题" },
  { id: "exercise", icon: Dumbbell, prompt: "运动项目" },
  { id: "learning", icon: Brain, prompt: "学习主题" },
  { id: "inspiration", icon: Lightbulb, prompt: "灵感标题" },
  { id: "review", icon: FilePenLine, prompt: "复盘标题" }
];

const exerciseTypes = Object.entries(exerciseTypeLabels) as Array<[ExerciseType, string]>;

function exerciseMetric(durationMinutes: number, calories: number, distanceKm?: number) {
  return [
    `${durationMinutes} 分钟`,
    `${calories} 千卡`,
    distanceKm ? `${distanceKm} 公里` : ""
  ].filter(Boolean).join(" · ");
}

function growthEditorKey(entry: GrowthEntry) {
  return [
    entry.id,
    entry.title,
    entry.detail,
    entry.metric,
    entry.date,
    entry.exerciseType,
    entry.durationMinutes,
    entry.calories,
    entry.distanceKm
  ].join(":");
}

function taskSummaryForDate(tasks: WorkspaceTask[], date: string) {
  const dailyTasks = tasks.filter((task) =>
    task.group === "daily"
    && (!task.startDate || task.startDate <= date)
    && (!task.targetDate || task.targetDate === date)
  );
  const states = dailyTasks.map((task) => ({
    title: task.title,
    completed: getTaskStateForDate(task, date).completed
  }));
  const completed = states.filter((task) => task.completed);
  const pending = states.filter((task) => !task.completed);
  const rate = states.length ? Math.round((completed.length / states.length) * 100) : 0;
  return {
    total: states.length,
    completed: completed.length,
    pending: pending.length,
    rate,
    text: states.length
      ? [
          `当日共 ${states.length} 项任务，完成 ${completed.length} 项，未完成 ${pending.length} 项，完成率 ${rate}%。`,
          completed.length ? `已完成：${completed.map((task) => task.title).join("、")}。` : "已完成：暂无。",
          pending.length ? `未完成：${pending.map((task) => task.title).join("、")}。` : "未完成：全部完成。"
        ].join("\n")
      : "当日没有安排任务。"
  };
}

function normalizedTaskTitle(value: string) {
  return value.toLowerCase().replace(/[\s　，,。.!！：:、·_-]+/g, "");
}

function isReadingTask(task: WorkspaceTask) {
  return task.growthSyncCategory === "reading" || normalizedTaskTitle(task.title).includes("阅读");
}

function formatReviewSavedAt(value: string | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function ExerciseOverview({ entries, selectedDate }: { entries: GrowthEntry[]; selectedDate: string }) {
  const monthKey = selectedDate.slice(0, 7);
  const stats = useMemo(() => {
    const monthEntries = entries.filter(
      (entry) => entry.category === "exercise" && entry.date.startsWith(monthKey)
    );
    const byType = monthEntries.reduce<Partial<Record<ExerciseType, number>>>((result, entry) => {
      const type = entry.exerciseType || "other";
      result[type] = (result[type] || 0) + 1;
      return result;
    }, {});
    return {
      sessions: monthEntries.length,
      duration: monthEntries.reduce((total, entry) => total + (entry.durationMinutes || 0), 0),
      calories: monthEntries.reduce((total, entry) => total + (entry.calories || 0), 0),
      distance: monthEntries.reduce((total, entry) => total + (entry.distanceKm || 0), 0),
      byType,
      maxTypeCount: Math.max(1, ...Object.values(byType))
    };
  }, [entries, monthKey]);
  const [year, month] = monthKey.split("-");
  const summaryItems = [
    { label: "运动次数", value: `${stats.sessions} 次`, icon: Activity },
    { label: "运动时长", value: `${stats.duration} 分钟`, icon: Clock3 },
    { label: "能量消耗", value: `${stats.calories} 千卡`, icon: Flame },
    { label: "跑步距离", value: `${Number(stats.distance.toFixed(2))} 公里`, icon: Route }
  ];

  return (
    <section className="soft-card overflow-hidden">
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <h2 className="font-semibold">{year}年{Number(month)}月运动概览</h2>
        <p className="mt-1 text-sm text-muted-foreground">跟随上方日历月份，汇总运动投入与消耗</p>
      </div>
      <div className="grid grid-cols-2 border-b border-border lg:grid-cols-4">
        {summaryItems.map((item) => {
          const Icon = item.icon;
          return (
            <div className="border-b border-r border-border p-4 last:border-r-0 lg:border-b-0 sm:p-5" key={item.label}>
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Icon size={16} /> {item.label}</div>
              <p className="mt-2 text-xl font-semibold text-foreground">{item.value}</p>
            </div>
          );
        })}
      </div>
      <div className="px-5 py-5 sm:px-6">
        <h3 className="text-sm font-semibold">运动项目分布</h3>
        {stats.sessions ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {exerciseTypes.filter(([type]) => stats.byType[type]).map(([type, label]) => {
              const count = stats.byType[type] || 0;
              return (
                <div key={type}>
                  <div className="mb-1.5 flex justify-between text-sm"><span>{label}</span><span className="text-muted-foreground">{count} 次</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-strong"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(12, (count / stats.maxTypeCount) * 100)}%` }} /></div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">这个月还没有运动记录。</p>
        )}
      </div>
    </section>
  );
}

function GrowthEntryEditor({
  entry,
  disabled,
  onUpdate,
  onRemove
}: {
  entry: GrowthEntry;
  disabled: boolean;
  onUpdate: GrowthProps["onUpdate"];
  onRemove: GrowthProps["onRemove"];
}) {
  const [draft, setDraft] = useState(entry);
  const isExercise = entry.category === "exercise";
  const exerciseType = draft.exerciseType || "other";

  async function remove() {
    if (!window.confirm(`确定删除“${entry.title}”这条成长记录吗？`)) return;
    await onRemove(entry.id, entry.category);
  }

  async function save() {
    if (isExercise) {
      const duration = draft.durationMinutes || 0;
      const calories = draft.calories || 0;
      const distance = exerciseType === "running" ? draft.distanceKm : undefined;
      const detail = draft.detail.trim() || `${exerciseTypeLabels[exerciseType]}运动记录`;
      await onUpdate({
        ...draft,
        title: exerciseTypeLabels[exerciseType],
        detail,
        exerciseType,
        durationMinutes: duration,
        calories,
        distanceKm: distance,
        metric: exerciseMetric(duration, calories, distance)
      });
      return;
    }
    await onUpdate({ ...draft, title: draft.title.trim(), detail: draft.detail.trim() });
  }

  const canSave = isExercise
    ? Boolean(draft.date && (draft.durationMinutes || 0) > 0 && (draft.calories || 0) > 0 && (exerciseType !== "running" || (draft.distanceKm || 0) > 0))
    : Boolean(draft.title.trim() && draft.detail.trim() && draft.date);

  return (
    <details className="group border-b border-border last:border-b-0">
      <summary className="flex min-h-20 cursor-pointer list-none items-start gap-3 px-5 py-4 transition hover:bg-primary/5 sm:px-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{entry.title}</h3>{entry.metric ? <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{entry.metric}</span> : null}</div>
          <p className="mt-2 line-clamp-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{entry.detail}</p>
        </div>
        <Pencil className="mt-1 shrink-0 text-muted-foreground transition group-open:text-primary" size={16} />
      </summary>
      <div className="border-t border-border bg-background/45 p-5 sm:p-6">
        {isExercise ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <label><span className="workspace-label">运动项目</span><select className="workspace-control" disabled={disabled} value={exerciseType} onChange={(event) => setDraft({ ...draft, exerciseType: event.target.value as ExerciseType, distanceKm: event.target.value === "running" ? draft.distanceKm : undefined })}>{exerciseTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label><span className="workspace-label">运动时长（分钟）</span><input className="workspace-control" disabled={disabled} min="1" type="number" value={draft.durationMinutes ?? ""} onChange={(event) => setDraft({ ...draft, durationMinutes: event.target.value ? Number(event.target.value) : undefined })} /></label>
            <label><span className="workspace-label">能量消耗（千卡）</span><input className="workspace-control" disabled={disabled} min="1" type="number" value={draft.calories ?? ""} onChange={(event) => setDraft({ ...draft, calories: event.target.value ? Number(event.target.value) : undefined })} /></label>
            {exerciseType === "running" ? <label><span className="workspace-label">跑步距离（公里）</span><input className="workspace-control" disabled={disabled} min="0.01" step="0.01" type="number" value={draft.distanceKm ?? ""} onChange={(event) => setDraft({ ...draft, distanceKm: event.target.value ? Number(event.target.value) : undefined })} /></label> : null}
            <label><span className="workspace-label">记录日期</span><input className="workspace-control" disabled={disabled} type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-[1fr_12rem_11rem]">
            <label><span className="workspace-label">标题</span><input className="workspace-control" disabled={disabled} maxLength={300} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
            <label><span className="workspace-label">时长 / 进度</span><input className="workspace-control" disabled={disabled} maxLength={100} value={draft.metric || ""} onChange={(event) => setDraft({ ...draft, metric: event.target.value || undefined })} /></label>
            <label><span className="workspace-label">记录日期</span><input className="workspace-control" disabled={disabled} type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label>
          </div>
        )}
        <label className="mt-4 block"><span className="workspace-label">{isExercise ? "运动感受 / 备注（选填）" : "记录内容"}</span><textarea className="workspace-control min-h-28 resize-y" disabled={disabled} maxLength={10000} value={draft.detail} onChange={(event) => setDraft({ ...draft, detail: event.target.value })} /></label>
        <div className="mt-5 flex items-center justify-between gap-3"><button aria-label={`删除成长记录 ${entry.title}`} className="icon-button text-red-500" disabled={disabled} title="删除记录" type="button" onClick={remove}><Trash2 size={17} /></button><button className="primary-button" disabled={disabled || !canSave} type="button" onClick={save}><Save size={17} /> 保存修改</button></div>
      </div>
    </details>
  );
}

export function WorkspaceGrowth({ disabled, entries, saveError, tasks, onAdd, onUpdate, onRemove, onReadingSync }: GrowthProps) {
  const [activeCategory, setActiveCategory] = useState<GrowthCategory>("reading");
  const [selectedDate, setSelectedDate] = useState(currentDateKey());
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [metric, setMetric] = useState("");
  const [exerciseType, setExerciseType] = useState<ExerciseType>("running");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [calories, setCalories] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, { reflection: string; tomorrowPlan: string }>>({});
  const [reviewAttemptDate, setReviewAttemptDate] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<{ date: string; message: string } | null>(null);

  const visibleEntries = entries.filter((entry) => entry.category === activeCategory && entry.date === selectedDate);
  const selectedReview = entries.find((entry) => entry.category === "review" && entry.date === selectedDate);
  const reviewDraft = reviewDrafts[selectedDate];
  const reviewReflection = reviewDraft?.reflection ?? selectedReview?.reviewReflection ?? selectedReview?.detail ?? "";
  const reviewTomorrowPlan = reviewDraft?.tomorrowPlan ?? selectedReview?.reviewTomorrowPlan ?? "";
  const category = categories.find((item) => item.id === activeCategory) || categories[0];
  const reviewSummary = useMemo(() => taskSummaryForDate(tasks, selectedDate), [tasks, selectedDate]);
  const markers = useMemo(() => {
    if (activeCategory === "reading") {
      const readingTaskMarkers = tasks
        .filter((task) => task.group === "daily" && !task.isGoal && isReadingTask(task))
        .reduce<Record<string, CalendarMarker>>((result, task) => {
          task.records.forEach((record) => {
            const existing = result[record.date] || { completionRate: 0, hasIncome: false };
            result[record.date] = {
              ...existing,
              completionRate: record.completed
                ? 100
                : Math.max(existing.completionRate, record.progress)
            };
          });
          return result;
        }, {});

      entries
        .filter((entry) => entry.category === "reading")
        .forEach((entry) => {
          const existing = readingTaskMarkers[entry.date] || { completionRate: 0, hasIncome: false };
          readingTaskMarkers[entry.date] = {
            ...existing,
            completionRate: Math.max(existing.completionRate, 100)
          };
        });

      return readingTaskMarkers;
    }

    const counts = entries
      .filter((entry) => entry.category === activeCategory)
      .reduce<Record<string, number>>((result, entry) => {
        result[entry.date] = (result[entry.date] || 0) + 1;
        return result;
      }, {});
    return Object.fromEntries(Object.entries(counts).map(([date, count]) => [
      date,
      { completionRate: Math.min(100, count * 25), hasIncome: false }
    ])) as Record<string, CalendarMarker>;
  }, [activeCategory, entries, tasks]);

  const exerciseIsValid = Number(durationMinutes) > 0
    && Number(calories) > 0
    && (exerciseType !== "running" || Number(distanceKm) > 0);
  const reviewIsValid = Boolean(reviewReflection.trim() && reviewTomorrowPlan.trim());

  function updateReviewDraft(field: "reflection" | "tomorrowPlan", value: string) {
    if (reviewSuccess?.date === selectedDate) setReviewSuccess(null);
    setReviewDrafts((current) => ({
      ...current,
      [selectedDate]: {
        reflection: current[selectedDate]?.reflection ?? reviewReflection,
        tomorrowPlan: current[selectedDate]?.tomorrowPlan ?? reviewTomorrowPlan,
        [field]: value
      }
    }));
  }

  function clearReviewDraft() {
    setReviewDrafts((current) => {
      const next = { ...current };
      delete next[selectedDate];
      return next;
    });
  }

  async function submitEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDate || disabled) return;

    if (activeCategory === "review") {
      if (!reviewIsValid) return;
      setReviewAttemptDate(selectedDate);
      setReviewSuccess(null);
      const reviewInput = {
        category: "review" as const,
        title: `${selectedDate} 每日复盘`,
        detail: reviewReflection.trim(),
        date: selectedDate,
        reviewReflection: reviewReflection.trim(),
        reviewTomorrowPlan: reviewTomorrowPlan.trim()
      };
      let saved = false;
      if (selectedReview) {
        saved = await onUpdate({ ...selectedReview, ...reviewInput });
      } else {
        saved = await onAdd(reviewInput);
      }
      if (saved) {
        clearReviewDraft();
        setReviewAttemptDate(null);
        setReviewSuccess({
          date: selectedDate,
          message: "保存成功：复盘已写入 MySQL，并已同步到 Obsidian 知识库。"
        });
      }
      return;
    }

    if (activeCategory === "exercise") {
      if (!exerciseIsValid) return;
      const duration = Number(durationMinutes);
      const energy = Number(calories);
      const distance = exerciseType === "running" ? Number(distanceKm) : undefined;
      const label = exerciseTypeLabels[exerciseType];
      const saved = await onAdd({
        category: "exercise",
        title: label,
        detail: detail.trim() || `${label} ${duration} 分钟，消耗 ${energy} 千卡。`,
        metric: exerciseMetric(duration, energy, distance),
        date: selectedDate,
        exerciseType,
        durationMinutes: duration,
        calories: energy,
        distanceKm: distance
      });
      if (!saved) return;
      setDetail("");
      setDurationMinutes("");
      setCalories("");
      setDistanceKm("");
      return;
    }

    if (!title.trim() || !detail.trim()) return;
    const saved = await onAdd({
      category: activeCategory,
      title: title.trim(),
      detail: detail.trim(),
      metric: metric.trim() || undefined,
      date: selectedDate
    });
    if (!saved) return;
    setTitle("");
    setDetail("");
    setMetric("");
  }

  return (
    <div className="grid gap-6">
      <section className="soft-card overflow-hidden">
        <div className="grid grid-cols-5 border-b border-border" role="tablist" aria-label="成长记录类型">
          {categories.map((item) => {
            const Icon = item.icon;
            return (
              <button aria-selected={activeCategory === item.id} className={cn("focus-ring flex min-h-16 flex-col items-center justify-center gap-1 border-b-2 px-2 text-xs font-semibold transition sm:flex-row sm:text-sm", activeCategory === item.id ? "border-primary bg-primary/5 text-primary" : "border-transparent text-muted-foreground hover:bg-surface-strong hover:text-primary")} key={item.id} role="tab" type="button" onClick={() => setActiveCategory(item.id)}><Icon size={17} /> {growthCategoryLabels[item.id]}</button>
            );
          })}
        </div>

        <div className="grid gap-6 p-4 sm:p-5 xl:grid-cols-[20rem_minmax(0,1fr)]">
          <WorkspaceCalendar markers={markers} selectedDate={selectedDate} onSelect={setSelectedDate} />
          <form className="grid content-start gap-4" onSubmit={submitEntry}>
            <div><h2 className="font-semibold">新增{growthCategoryLabels[activeCategory]}记录</h2><p className="mt-1 text-sm text-muted-foreground">当前记录日期：{formatWorkspaceDate(selectedDate)}</p></div>
            {activeCategory === "review" ? (
              <>
                <label className="max-w-xs"><span className="workspace-label">记录日期</span><input className="workspace-control" disabled={disabled} type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></label>

                <section className="overflow-hidden rounded-lg border border-primary/25 bg-primary/5">
                  <div className="flex items-center justify-between gap-3 border-b border-primary/15 px-4 py-3 sm:px-5">
                    <span className="flex items-center gap-2 text-sm font-semibold text-primary"><ClipboardCheck size={17} /> 第一部分 · 当日任务完成情况</span>
                    <span className="rounded-md bg-background px-2 py-1 text-xs font-semibold text-muted-foreground">系统生成</span>
                  </div>
                  <div className="grid grid-cols-4 border-b border-primary/10 bg-background/35 text-center">
                    <div className="px-2 py-3"><strong className="block text-lg">{reviewSummary.total}</strong><span className="text-xs text-muted-foreground">任务</span></div>
                    <div className="px-2 py-3"><strong className="block text-lg text-emerald-600">{reviewSummary.completed}</strong><span className="text-xs text-muted-foreground">完成</span></div>
                    <div className="px-2 py-3"><strong className="block text-lg text-amber-600">{reviewSummary.pending}</strong><span className="text-xs text-muted-foreground">未完成</span></div>
                    <div className="px-2 py-3"><strong className="block text-lg text-primary">{reviewSummary.rate}%</strong><span className="text-xs text-muted-foreground">完成率</span></div>
                  </div>
                  <p className="whitespace-pre-line px-4 py-4 text-sm leading-7 text-foreground/80 sm:px-5">{reviewSummary.text}</p>
                </section>

                <label><span className="workspace-label">第二部分 · 今日收获与不足</span><textarea className="workspace-control min-h-36 resize-y" disabled={disabled} maxLength={10000} placeholder="今天做对了什么？有哪些收获？哪些地方仍有不足？" value={reviewReflection} onChange={(event) => updateReviewDraft("reflection", event.target.value)} /></label>
                <label><span className="workspace-label flex items-center gap-2"><Sunrise size={16} /> 第三部分 · 明天的计划与打算</span><textarea className="workspace-control min-h-36 resize-y" disabled={disabled} maxLength={10000} placeholder="明天最重要的事情是什么？准备采取哪些具体行动？" value={reviewTomorrowPlan} onChange={(event) => updateReviewDraft("tomorrowPlan", event.target.value)} /></label>
                {reviewAttemptDate === selectedDate && !disabled && !reviewSuccess ? (
                  <p className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700 dark:border-red-900 dark:bg-red-950/35 dark:text-red-300" role="alert"><CircleAlert className="mt-0.5 shrink-0" size={18} /><span><strong className="block">保存失败</strong>{saveError || "MySQL 或 Obsidian 未能完成写入，请检查 Obsidian 目录配置后重试。"}</span></p>
                ) : reviewSuccess?.date === selectedDate ? (
                  <p className="flex items-start gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/35 dark:text-emerald-300" role="status"><CheckCircle2 className="mt-0.5 shrink-0" size={18} /><span><strong className="block">复盘保存成功</strong>{reviewSuccess.message}</span></p>
                ) : selectedReview ? (
                  <p className={cn("flex items-start gap-2 rounded-lg border px-4 py-3 text-sm leading-6", selectedReview.reviewSyncedToObsidian ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/35 dark:text-emerald-300" : "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/35 dark:text-amber-200")} role="status"><CheckCircle2 className="mt-0.5 shrink-0" size={18} /><span><strong className="block">该日期的复盘已保存到 MySQL</strong>{selectedReview.reviewSyncedToObsidian ? "Obsidian 已同步" : "Obsidian 尚未同步"}{formatReviewSavedAt(selectedReview.reviewSavedAt) ? ` · 最后保存于 ${formatReviewSavedAt(selectedReview.reviewSavedAt)}` : ""}</span></p>
                ) : <p className="text-sm text-muted-foreground">保存后将同步写入 MySQL 与已配置的 Obsidian 复盘目录。</p>}
              </>
            ) : activeCategory === "exercise" ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <label><span className="workspace-label">运动项目</span><select className="workspace-control" disabled={disabled} value={exerciseType} onChange={(event) => { const nextType = event.target.value as ExerciseType; setExerciseType(nextType); if (nextType !== "running") setDistanceKm(""); }}>{exerciseTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label><span className="workspace-label">运动时长（分钟）</span><input className="workspace-control" disabled={disabled} min="1" placeholder="如：45" type="number" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} /></label>
                  <label><span className="workspace-label">能量消耗（千卡）</span><input className="workspace-control" disabled={disabled} min="1" placeholder="如：320" type="number" value={calories} onChange={(event) => setCalories(event.target.value)} /></label>
                  {exerciseType === "running" ? <label><span className="workspace-label">跑步距离（公里）</span><input className="workspace-control" disabled={disabled} min="0.01" placeholder="如：5.2" step="0.01" type="number" value={distanceKm} onChange={(event) => setDistanceKm(event.target.value)} /></label> : null}
                  <label><span className="workspace-label">记录日期</span><input className="workspace-control" disabled={disabled} type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></label>
                </div>
                <label><span className="workspace-label">运动感受 / 备注（选填）</span><textarea className="workspace-control min-h-28 resize-y" disabled={disabled} maxLength={10000} placeholder="记录身体状态、强度或今天的感受" value={detail} onChange={(event) => setDetail(event.target.value)} /></label>
              </>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-[1fr_12rem]">
                  <label><span className="workspace-label">{category.prompt}</span><input className="workspace-control" disabled={disabled} maxLength={300} placeholder={category.prompt} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
                  <label><span className="workspace-label">时长 / 进度</span><input className="workspace-control" disabled={disabled} maxLength={100} placeholder="如：30 分钟" value={metric} onChange={(event) => setMetric(event.target.value)} /></label>
                </div>
                <label><span className="workspace-label">记录日期</span><input className="workspace-control" disabled={disabled} type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></label>
                <label><span className="workspace-label">记录内容</span><textarea className="workspace-control min-h-28 resize-y" disabled={disabled} maxLength={10000} placeholder="写下今天的重要输入、感受或发现" value={detail} onChange={(event) => setDetail(event.target.value)} /></label>
              </>
            )}
            <div className="flex items-center justify-between gap-3">
              {activeCategory === "review" && selectedReview ? <button aria-label="删除当前复盘记录" className="icon-button text-red-500" disabled={disabled} title="删除复盘" type="button" onClick={() => { if (window.confirm(`确定删除 ${selectedDate} 的复盘记录吗？`)) void onRemove(selectedReview.id, "review"); }}><Trash2 size={17} /></button> : <span />}
              <button className="primary-button w-full sm:w-auto" disabled={disabled || !selectedDate || (activeCategory === "review" ? !reviewIsValid : activeCategory === "exercise" ? !exerciseIsValid : !title.trim() || !detail.trim())} type="submit">{activeCategory === "review" ? <Save size={17} /> : <Plus size={17} />} {disabled && activeCategory === "review" ? "正在保存..." : `保存${growthCategoryLabels[activeCategory]}记录`}</button>
            </div>
          </form>
        </div>
      </section>

      {activeCategory === "reading" ? <WorkspaceReadingLibrary selectedDate={selectedDate} onSynced={onReadingSync} /> : null}
      {activeCategory === "exercise" ? <ExerciseOverview entries={entries} selectedDate={selectedDate} /> : null}

      {activeCategory !== "review" ? <section className="soft-card overflow-hidden">
        <div className="border-b border-border px-5 py-4 sm:px-6"><h2 className="font-semibold">{formatWorkspaceDate(selectedDate)} · {growthCategoryLabels[activeCategory]}记录</h2><p className="mt-1 text-sm text-muted-foreground">展开任意记录即可修改内容、日期或删除</p></div>
        <div>{visibleEntries.length ? visibleEntries.map((entry) => <GrowthEntryEditor disabled={disabled} entry={entry} key={growthEditorKey(entry)} onRemove={onRemove} onUpdate={onUpdate} />) : <div className="px-5 py-14 text-center text-sm text-muted-foreground">这一天还没有{growthCategoryLabels[activeCategory]}记录。</div>}</div>
      </section> : null}
    </div>
  );
}
