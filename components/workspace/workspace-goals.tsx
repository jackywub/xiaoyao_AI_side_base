"use client";

import {
  CalendarDays,
  CalendarRange,
  Check,
  Circle,
  ListChecks,
  Pencil,
  Plus,
  Save,
  Target,
  Trash2
} from "lucide-react";
import { useState } from "react";

import type {
  TaskPriority,
  TaskQuadrant,
  WorkspaceGoalDailyAction,
  WorkspaceTask
} from "@/lib/workspace-data";
import { currentDateKey, formatWorkspaceDate } from "@/lib/workspace-dates";
import { cn } from "@/lib/utils";

type GoalInput = {
  title: string;
  description?: string;
  group: "long-term";
  priority: TaskPriority;
  urgency: TaskPriority;
  quadrant: TaskQuadrant;
  startDate: string;
  targetDate: string;
  isGoal: true;
};

type GoalsProps = {
  goals: WorkspaceTask[];
  disabled: boolean;
  onAdd: (input: GoalInput) => Promise<boolean>;
  onUpdate: (task: WorkspaceTask) => Promise<boolean>;
  onRemove: (id: string) => Promise<boolean>;
  onAddAction: (goalId: string, title: string, date: string) => Promise<boolean>;
  onUpdateAction: (action: WorkspaceGoalDailyAction) => Promise<boolean>;
  onToggleAction: (id: string) => Promise<boolean>;
  onRemoveAction: (id: string) => Promise<boolean>;
};

function actionEditorKey(action: WorkspaceGoalDailyAction) {
  return `${action.id}:${action.title}:${action.date}:${action.completed}`;
}

function defaultActionDate(goal: WorkspaceTask) {
  const today = currentDateKey();
  if (goal.startDate && today < goal.startDate) return goal.startDate;
  if (goal.targetDate && today > goal.targetDate) return goal.targetDate;
  return today;
}

function GoalActionEditor({ action, disabled, minDate, maxDate, onUpdate, onToggle, onRemove }: {
  action: WorkspaceGoalDailyAction;
  disabled: boolean;
  minDate?: string;
  maxDate?: string;
  onUpdate: GoalsProps["onUpdateAction"];
  onToggle: GoalsProps["onToggleAction"];
  onRemove: GoalsProps["onRemoveAction"];
}) {
  const [draft, setDraft] = useState(action);
  const dateInvalid = Boolean((minDate && draft.date < minDate) || (maxDate && draft.date > maxDate));

  return (
    <div className="grid gap-3 border-b border-border px-5 py-4 last:border-b-0 sm:grid-cols-[auto_9.5rem_minmax(0,1fr)_auto] sm:items-center sm:px-6">
      <button
        aria-label={action.completed ? `将 ${action.title} 标记为未完成` : `完成 ${action.title}`}
        className={cn(
          "grid size-10 place-items-center rounded-lg border transition",
          action.completed
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-muted-foreground hover:border-primary hover:text-primary"
        )}
        disabled={disabled}
        type="button"
        onClick={() => onToggle(action.id)}
      >
        {action.completed ? <Check size={18} /> : <Circle size={16} />}
      </button>
      <input
        aria-label="行动日期"
        className="workspace-control"
        disabled={disabled}
        max={maxDate}
        min={minDate}
        type="date"
        value={draft.date}
        onChange={(event) => setDraft({ ...draft, date: event.target.value })}
      />
      <input
        aria-label="目标拆解内容"
        className={cn("workspace-control", action.completed && "text-muted-foreground line-through")}
        disabled={disabled}
        maxLength={300}
        value={draft.title}
        onChange={(event) => setDraft({ ...draft, title: event.target.value })}
      />
      <div className="flex justify-end gap-2">
        <button aria-label="保存目标拆解" className="icon-button" disabled={disabled || !draft.title.trim() || !draft.date || dateInvalid} title="保存拆解" type="button" onClick={() => onUpdate({ ...draft, title: draft.title.trim() })}><Save size={15} /></button>
        <button aria-label="删除目标拆解" className="icon-button text-red-500" disabled={disabled} title="删除拆解" type="button" onClick={() => { if (window.confirm(`确定删除“${action.title}”吗？`)) void onRemove(action.id); }}><Trash2 size={15} /></button>
      </div>
    </div>
  );
}

function GoalEditor({ goal, disabled, onUpdate, onRemove, onAddAction, onUpdateAction, onToggleAction, onRemoveAction }: {
  goal: WorkspaceTask;
  disabled: boolean;
  onUpdate: GoalsProps["onUpdate"];
  onRemove: GoalsProps["onRemove"];
  onAddAction: GoalsProps["onAddAction"];
  onUpdateAction: GoalsProps["onUpdateAction"];
  onToggleAction: GoalsProps["onToggleAction"];
  onRemoveAction: GoalsProps["onRemoveAction"];
}) {
  const [draft, setDraft] = useState(goal);
  const [actionTitle, setActionTitle] = useState("");
  const [actionDate, setActionDate] = useState(defaultActionDate(goal));
  const actions = (goal.goalStages || [])
    .flatMap((stage) => stage.dailyActions)
    .sort((left, right) => left.date.localeCompare(right.date));
  const completed = actions.filter((action) => action.completed).length;
  const hasGoalPeriod = Boolean(goal.startDate && goal.targetDate);
  const actionDateInvalid = Boolean(
    (goal.startDate && actionDate < goal.startDate)
    || (goal.targetDate && actionDate > goal.targetDate)
  );

  async function addAction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!actionTitle.trim() || !actionDate || disabled || !hasGoalPeriod || actionDateInvalid) return;
    if (await onAddAction(goal.id, actionTitle.trim(), actionDate)) setActionTitle("");
  }

  return (
    <details className="group soft-card overflow-hidden">
      <summary className="flex min-h-28 cursor-pointer list-none items-center gap-4 p-5 transition hover:bg-primary/5 sm:p-6">
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Target size={20} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate font-semibold">{goal.title}</h2>
            <span className="rounded-md bg-surface-strong px-2 py-0.5 text-xs font-semibold text-muted-foreground">{completed}/{actions.length} 项完成</span>
          </div>
          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{goal.description || "在明确时间段内完成一个具体目标。"}</p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarRange size={14} />
            <span>{goal.startDate ? formatWorkspaceDate(goal.startDate, false) : "未设开始日期"} 至 {goal.targetDate ? formatWorkspaceDate(goal.targetDate, false) : "未设结束日期"}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-strong"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${goal.progress}%` }} /></div>
        </div>
        <div className="shrink-0 text-right"><strong className="text-xl text-primary">{goal.progress}%</strong><p className="mt-1 text-xs text-muted-foreground">自动计算</p></div>
        <Pencil className="hidden text-muted-foreground transition group-open:text-primary sm:block" size={16} />
      </summary>

      <div className="grid gap-4 border-t border-border bg-background/45 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_9.5rem_9.5rem_auto] lg:items-end sm:px-6">
        <label><span className="workspace-label">目标名称</span><input className="workspace-control" disabled={disabled} maxLength={300} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
        <label><span className="workspace-label">完成标准</span><input className="workspace-control" disabled={disabled} maxLength={2000} placeholder="怎样才算完成这个目标" value={draft.description || ""} onChange={(event) => setDraft({ ...draft, description: event.target.value || undefined })} /></label>
        <label><span className="workspace-label">开始日期</span><input className="workspace-control" disabled={disabled} required type="date" value={draft.startDate || ""} onChange={(event) => setDraft({ ...draft, startDate: event.target.value || undefined })} /></label>
        <label><span className="workspace-label">结束日期</span><input className="workspace-control" disabled={disabled} min={draft.startDate} required type="date" value={draft.targetDate || ""} onChange={(event) => setDraft({ ...draft, targetDate: event.target.value || undefined })} /></label>
        <div className="flex justify-end gap-2">
          <button aria-label={`删除目标 ${goal.title}`} className="icon-button text-red-500" disabled={disabled} title="删除目标" type="button" onClick={() => { if (window.confirm(`确定删除目标“${goal.title}”吗？`)) void onRemove(goal.id); }}><Trash2 size={16} /></button>
          <button className="secondary-button" disabled={disabled || !draft.title.trim() || !draft.startDate || !draft.targetDate || draft.startDate > draft.targetDate} type="button" onClick={() => onUpdate({ ...draft, title: draft.title.trim() })}><Save size={16} /> 保存目标</button>
        </div>
      </div>

      <section className="border-t border-border">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-primary/5 px-5 py-4 sm:px-6">
          <div>
            <div className="flex items-center gap-2"><ListChecks className="text-primary" size={18} /><h3 className="font-semibold">目标拆解</h3></div>
            <p className="mt-1 text-xs text-muted-foreground">按自己的节奏，把目标拆成具体日期可以完成的行动。</p>
          </div>
          <span className="rounded-md bg-background px-2.5 py-1 text-xs font-semibold text-primary">{completed}/{actions.length} 项完成</span>
        </div>

        <form className="grid gap-3 border-t border-border px-5 py-4 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:px-6" onSubmit={addAction}>
          <label><span className="workspace-label">行动日期</span><input className="workspace-control" disabled={disabled || !hasGoalPeriod} max={goal.targetDate} min={goal.startDate} type="date" value={actionDate} onChange={(event) => setActionDate(event.target.value)} /></label>
          <label><span className="workspace-label">具体行动</span><input className="workspace-control" disabled={disabled || !hasGoalPeriod} maxLength={300} placeholder="例如：完成第 1 课并整理 3 条笔记" value={actionTitle} onChange={(event) => setActionTitle(event.target.value)} /></label>
          <div className="flex items-end"><button className="primary-button w-full" disabled={disabled || !hasGoalPeriod || !actionTitle.trim() || !actionDate || actionDateInvalid} type="submit"><Plus size={16} /> 添加拆解</button></div>
        </form>

        {!hasGoalPeriod ? <p className="border-t border-border px-5 py-5 text-center text-sm text-muted-foreground">请先设置并保存目标的开始与结束日期。</p> : null}
        <div className="border-t border-border">
          {actions.map((action) => <GoalActionEditor action={action} disabled={disabled} key={actionEditorKey(action)} maxDate={goal.targetDate} minDate={goal.startDate} onRemove={onRemoveAction} onToggle={onToggleAction} onUpdate={onUpdateAction} />)}
          {hasGoalPeriod && !actions.length ? <p className="px-5 py-8 text-center text-sm text-muted-foreground">还没有拆解行动，可以从某一天要完成的第一件事开始。</p> : null}
        </div>
      </section>
    </details>
  );
}

export function WorkspaceGoals({ goals, disabled, onAdd, onUpdate, onRemove, onAddAction, onUpdateAction, onToggleAction, onRemoveAction }: GoalsProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(currentDateKey());
  const [targetDate, setTargetDate] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !startDate || !targetDate || disabled || startDate > targetDate) return;
    const saved = await onAdd({ title: title.trim(), description: description.trim() || undefined, group: "long-term", priority: "high", urgency: "medium", quadrant: "important-not-urgent", startDate, targetDate, isGoal: true });
    if (saved) { setTitle(""); setDescription(""); setStartDate(currentDateKey()); setTargetDate(""); }
  }

  return (
    <div className="grid gap-6">
      <section className="soft-card overflow-hidden">
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2"><Target className="text-primary" size={19} /><h2 className="font-semibold">设定时间段目标</h2></div>
          <p className="mt-1 text-sm text-muted-foreground">明确目标与完成期限，再由你自由拆解每一天的具体行动。</p>
        </div>
        <form className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_10rem_10rem_auto] lg:items-end sm:p-6" onSubmit={submit}>
          <label><span className="workspace-label">目标名称</span><input className="workspace-control" disabled={disabled} maxLength={300} placeholder="例如：完成 7 天创富特训营" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label><span className="workspace-label">完成标准</span><input className="workspace-control" disabled={disabled} maxLength={2000} placeholder="定义完成时应该得到的结果" value={description} onChange={(event) => setDescription(event.target.value)} /></label>
          <label><span className="workspace-label">开始日期</span><input className="workspace-control" disabled={disabled} required type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
          <label><span className="workspace-label">结束日期</span><input className="workspace-control" disabled={disabled} min={startDate} required type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></label>
          <div className="flex items-end"><button className="primary-button w-full" disabled={disabled || !title.trim() || !startDate || !targetDate || startDate > targetDate} type="submit"><Plus size={17} /> 新增目标</button></div>
        </form>
      </section>

      <div className="flex items-center gap-2 px-1 text-sm text-muted-foreground"><CalendarDays size={16} /><span>每个目标对应一个明确时间段，拆解方式和行动数量由你决定。</span></div>
      <section className="grid gap-4">
        {goals.map((goal) => <GoalEditor disabled={disabled} goal={goal} key={goal.id} onAddAction={onAddAction} onRemove={onRemove} onRemoveAction={onRemoveAction} onToggleAction={onToggleAction} onUpdate={onUpdate} onUpdateAction={onUpdateAction} />)}
        {!goals.length ? <div className="soft-card px-5 py-14 text-center text-sm text-muted-foreground">还没有目标，可以先设定一个有明确期限的小目标。</div> : null}
      </section>
    </div>
  );
}
