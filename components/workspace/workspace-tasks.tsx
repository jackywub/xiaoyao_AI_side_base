"use client";

import { Check, ChevronDown, Pencil, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

import {
  WorkspaceCalendar,
  type CalendarMarker
} from "@/components/workspace/workspace-calendar";
import {
  getSubtaskStateForDate,
  getTaskStateForDate,
  growthCategoryLabels,
  taskAppliesOnDate,
  taskGroupLabels,
  type LedgerProject,
  type TaskGroup,
  type TaskPriority,
  type TaskQuadrant,
  type WorkspaceSubtask,
  type WorkspaceTask
} from "@/lib/workspace-data";
import { formatWorkspaceDate } from "@/lib/workspace-dates";
import { cn } from "@/lib/utils";

type TaskInput = {
  title: string;
  group: TaskGroup;
  priority: TaskPriority;
  urgency: TaskPriority;
  quadrant: TaskQuadrant;
  projectId?: string;
  targetDate?: string;
  dueTime?: string;
  description?: string;
  isGoal?: boolean;
};

type TasksProps = {
  disabled: boolean;
  tasks: WorkspaceTask[];
  projects: LedgerProject[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  onAdd: (input: TaskInput) => Promise<boolean>;
  onUpdate: (task: WorkspaceTask) => Promise<boolean>;
  onRemove: (id: string) => Promise<boolean>;
  onToggle: (id: string, date?: string) => Promise<boolean>;
  onAddSubtask: (taskId: string, title: string, date?: string) => Promise<boolean>;
  onUpdateSubtask: (id: string, title: string) => Promise<boolean>;
  onToggleSubtask: (id: string, date?: string) => Promise<boolean>;
  onRemoveSubtask: (id: string, date?: string) => Promise<boolean>;
};

const groups: TaskGroup[] = ["daily", "phased", "long-term"];
const quadrants: Array<{ value: TaskQuadrant; label: string; hint: string; tone: string }> = [
  { value: "important-urgent", label: "重要且紧急", hint: "现在处理", tone: "border-t-red-400" },
  { value: "important-not-urgent", label: "重要不紧急", hint: "安排推进", tone: "border-t-primary" },
  { value: "urgent-not-important", label: "紧急不重要", hint: "集中处理", tone: "border-t-amber-400" },
  { value: "low", label: "不重要不紧急", hint: "有余力再做", tone: "border-t-emerald-400" }
];

function taskEditorKey(task: WorkspaceTask) {
  return [
    task.id,
    task.title,
    task.priority,
    task.urgency,
    task.quadrant,
    task.projectId,
    task.targetDate,
    task.dueTime,
    task.description
  ].join(":");
}

function SubtaskRow({
  subtask,
  completed,
  disabled,
  onToggle,
  onUpdate,
  onRemove
}: {
  subtask: WorkspaceSubtask;
  completed: boolean;
  disabled: boolean;
  onToggle: () => Promise<boolean>;
  onUpdate: (title: string) => Promise<boolean>;
  onRemove: () => Promise<boolean>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(subtask.title);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTitle = title.trim();
    if (!nextTitle || disabled) return;
    if (await onUpdate(nextTitle)) setIsEditing(false);
  }

  function cancel() {
    setTitle(subtask.title);
    setIsEditing(false);
  }

  async function remove() {
    if (!window.confirm(`确定删除子任务“${subtask.title}”吗？`)) return;
    await onRemove();
  }

  return (
    <div className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-2 text-sm transition hover:border-primary/40">
      <button aria-label={completed ? `将子任务“${subtask.title}”标记为未完成` : `将子任务“${subtask.title}”标记为完成`} className={cn("focus-ring grid size-7 shrink-0 place-items-center rounded-md border", completed ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background")} disabled={disabled || isEditing} type="button" onClick={onToggle}>{completed ? <Check size={13} /> : null}</button>
      {isEditing ? (
        <form className="flex min-w-0 flex-1 items-center gap-2" onSubmit={save}>
          <input aria-label="子任务标题" autoFocus className="workspace-control min-h-9 py-1.5" disabled={disabled} maxLength={300} value={title} onChange={(event) => setTitle(event.target.value)} />
          <button aria-label="保存子任务修改" className="icon-button size-9 min-h-9 min-w-9" disabled={disabled || !title.trim()} title="保存子任务" type="submit"><Save size={15} /></button>
          <button aria-label="取消修改子任务" className="icon-button size-9 min-h-9 min-w-9" disabled={disabled} title="取消修改" type="button" onClick={cancel}><X size={15} /></button>
        </form>
      ) : (
        <>
          <span className={cn("min-w-0 flex-1 break-words", completed && "text-muted-foreground line-through")}>{subtask.title}</span>
          <button aria-label={`编辑子任务 ${subtask.title}`} className="icon-button size-9 min-h-9 min-w-9" disabled={disabled} title="编辑子任务" type="button" onClick={() => setIsEditing(true)}><Pencil size={15} /></button>
          <button aria-label={`删除子任务 ${subtask.title}`} className="icon-button size-9 min-h-9 min-w-9 text-red-500" disabled={disabled} title="删除子任务" type="button" onClick={remove}><Trash2 size={15} /></button>
        </>
      )}
    </div>
  );
}

function TaskRow({
  task,
  projects,
  selectedDate,
  disabled,
  onUpdate,
  onRemove,
  onToggle,
  onAddSubtask,
  onUpdateSubtask,
  onToggleSubtask,
  onRemoveSubtask
}: Omit<TasksProps, "tasks" | "onAdd" | "onDateChange"> & { task: WorkspaceTask }) {
  const [draft, setDraft] = useState(task);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const project = projects.find((item) => item.id === task.projectId);
  const state = getTaskStateForDate(task, selectedDate);
  const completedSubtasks = (task.subtasks || []).filter((subtask) =>
    getSubtaskStateForDate(subtask, task.group, selectedDate)
  ).length;

  if (task.growthSyncCategory) {
    return (
      <article className="flex min-h-24 items-center gap-3 border-b border-border px-4 py-3.5 last:border-b-0">
        <span aria-hidden="true" className={cn("grid size-8 shrink-0 place-items-center rounded-lg border", state.completed ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background")}>
          {state.completed ? <Check size={16} /> : null}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={cn("font-semibold", state.completed && "text-muted-foreground line-through")}>{task.title}</h3>
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary"><RefreshCw size={11} /> 成长记录同步</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{growthCategoryLabels[task.growthSyncCategory]}记录 · {state.completed ? "当日已完成" : "等待当日记录"}</p>
        </div>
        <span className={cn("rounded-md px-2 py-1 text-xs font-semibold", state.completed ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-surface-strong text-muted-foreground")}>{state.completed ? "已完成" : "待完成"}</span>
      </article>
    );
  }

  async function save() {
    await onUpdate(draft);
  }

  async function addSubtask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!subtaskTitle.trim() || disabled) return;
    if (await onAddSubtask(task.id, subtaskTitle.trim(), task.group === "daily" ? selectedDate : undefined)) {
      setSubtaskTitle("");
    }
  }

  return (
    <article className="border-b border-border last:border-b-0">
      <div className="flex items-start gap-3 px-4 py-3.5">
        <button
          aria-label={state.completed ? "标记为未完成" : "标记为完成"}
          className={cn(
            "focus-ring mt-1 grid size-8 shrink-0 place-items-center rounded-lg border",
            state.completed ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-transparent hover:border-primary"
          )}
          disabled={disabled}
          type="button"
          onClick={() => onToggle(task.id, task.group === "daily" ? selectedDate : undefined)}
        >
          <Check size={16} />
        </button>

        <details className="group min-w-0 flex-1">
          <summary className="grid min-h-11 cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className={cn("font-semibold", state.completed && "text-muted-foreground line-through")}>{task.title}</h3>
                {task.subtasks?.length ? (
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    {completedSubtasks}/{task.subtasks.length} 子任务
                  </span>
                ) : (
                  <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold", state.completed ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-surface-strong text-muted-foreground")}>
                    {state.completed ? "已完成" : "待完成"}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {project?.name || "个人任务"}{task.dueTime ? ` · ${task.dueTime}` : ""}{task.group === "daily" && !task.targetDate ? " · 每天重复" : task.targetDate ? ` · ${task.targetDate}` : ""}
              </p>
            </div>
            <ChevronDown className="mt-1 text-muted-foreground transition group-open:rotate-180" size={18} />
          </summary>

          <div className="mt-4 border-t border-border pt-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label><span className="workspace-label">标题</span><input className="workspace-control" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
              <label><span className="workspace-label">所属项目</span><select className="workspace-control" value={draft.projectId || ""} onChange={(event) => setDraft({ ...draft, projectId: event.target.value || undefined })}><option value="">个人任务</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label><span className="workspace-label">任务象限</span><select className="workspace-control" value={draft.quadrant || "low"} onChange={(event) => setDraft({ ...draft, quadrant: event.target.value as TaskQuadrant })}>{quadrants.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label><span className="workspace-label">重要性</span><select className="workspace-control" value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as TaskPriority })}><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label>
              <label><span className="workspace-label">紧急度</span><select className="workspace-control" value={draft.urgency || "medium"} onChange={(event) => setDraft({ ...draft, urgency: event.target.value as TaskPriority })}><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label>
              <label><span className="workspace-label">计划时间</span><input className="workspace-control" placeholder="如：09:00 - 10:30" value={draft.dueTime || ""} onChange={(event) => setDraft({ ...draft, dueTime: event.target.value || undefined })} /></label>
              <label className="md:col-span-2 xl:col-span-3"><span className="workspace-label">执行日期</span><div className="grid gap-2 sm:grid-cols-[1fr_auto]"><input className="workspace-control" type="date" value={draft.targetDate || ""} onChange={(event) => setDraft({ ...draft, targetDate: event.target.value || undefined })} />{task.group === "daily" ? <button className="secondary-button justify-center" type="button" onClick={() => setDraft({ ...draft, targetDate: undefined })}>设为每天重复</button> : null}</div></label>
            </div>
            <label className="mt-4 block"><span className="workspace-label">任务说明</span><textarea className="workspace-control min-h-20 resize-y" value={draft.description || ""} onChange={(event) => setDraft({ ...draft, description: event.target.value || undefined })} /></label>

            <div className="mt-5 border-t border-border pt-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">子任务</p>
                {task.subtasks?.length ? <span className="text-xs text-muted-foreground">全部完成后主任务自动变为 100%</span> : null}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {(task.subtasks || []).map((subtask) => {
                  const completed = getSubtaskStateForDate(subtask, task.group, selectedDate);
                  return (
                    <SubtaskRow completed={completed} disabled={disabled} key={subtask.id} subtask={subtask} onRemove={() => onRemoveSubtask(subtask.id, task.group === "daily" ? selectedDate : undefined)} onToggle={() => onToggleSubtask(subtask.id, task.group === "daily" ? selectedDate : undefined)} onUpdate={(title) => onUpdateSubtask(subtask.id, title)} />
                  );
                })}
              </div>
              <form className="mt-3 flex gap-2" onSubmit={addSubtask}>
                <input className="workspace-control" placeholder="拆出一个可完成的小步骤" value={subtaskTitle} onChange={(event) => setSubtaskTitle(event.target.value)} />
                <button className="icon-button" disabled={disabled || !subtaskTitle.trim()} title="添加子任务" type="submit"><Plus size={17} /></button>
              </form>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button className="icon-button text-red-500" disabled={disabled} title="删除任务" type="button" onClick={() => onRemove(task.id)}><Trash2 size={17} /></button>
              <button className="primary-button" disabled={disabled || !draft.title.trim()} type="button" onClick={save}><Save size={17} /> 保存修改</button>
            </div>
          </div>
        </details>
      </div>
    </article>
  );
}

export function WorkspaceTasks(props: TasksProps) {
  const { disabled, tasks, projects, selectedDate, onDateChange, onAdd } = props;
  const [activeGroup, setActiveGroup] = useState<TaskGroup>("daily");
  const [dailyMode, setDailyMode] = useState<"repeat" | "date">("repeat");
  const [form, setForm] = useState<TaskInput>({
    title: "",
    group: "daily",
    priority: "medium",
    urgency: "medium",
    quadrant: "low"
  });
  const visibleTasks = useMemo(
    () => tasks.filter((task) => task.group === activeGroup && !task.isGoal && (activeGroup !== "daily" || taskAppliesOnDate(task, selectedDate))),
    [activeGroup, selectedDate, tasks]
  );
  const markers = useMemo(() => tasks.filter((task) => task.group === "daily" && !task.isGoal).reduce<Record<string, CalendarMarker>>((result, task) => {
    task.records.forEach((record) => {
      const existing = result[record.date] || { completionRate: 0, hasIncome: false };
      result[record.date] = { ...existing, completionRate: record.completed ? 100 : Math.max(existing.completionRate, record.progress) };
    });
    return result;
  }, {}), [tasks]);

  async function submitTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || disabled) return;
    const targetDate = activeGroup === "daily"
      ? dailyMode === "date" ? selectedDate : undefined
      : form.targetDate;
    if (await onAdd({ ...form, title: form.title.trim(), group: activeGroup, targetDate })) {
      setForm({ title: "", group: activeGroup, priority: "medium", urgency: "medium", quadrant: "low" });
    }
  }

  return (
    <div className="grid gap-6">
      <section className="soft-card p-4">
        <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="任务类型">
          {groups.map((group) => (
            <button aria-selected={activeGroup === group} className={cn("focus-ring min-h-11 rounded-lg px-3 text-sm font-semibold", activeGroup === group ? "bg-primary text-primary-foreground" : "bg-surface-strong text-muted-foreground hover:text-primary")} key={group} role="tab" type="button" onClick={() => { setActiveGroup(group); setForm((current) => ({ ...current, group })); }}>
              {taskGroupLabels[group]} <span className="ml-1 opacity-70">{tasks.filter((task) => task.group === group && !task.isGoal).length}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <WorkspaceCalendar markers={markers} selectedDate={selectedDate} onSelect={onDateChange} />
        <form className="soft-card grid content-start gap-4 p-5" onSubmit={submitTask}>
          <div>
            <h2 className="font-semibold">新增{taskGroupLabels[activeGroup]}</h2>
            <p className="mt-1 text-sm text-muted-foreground">当前查看：{formatWorkspaceDate(selectedDate)}</p>
          </div>
          {activeGroup === "daily" ? (
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-strong p-1" aria-label="每日任务日期范围">
              <button className={cn("focus-ring min-h-10 rounded-md text-sm font-semibold", dailyMode === "repeat" ? "bg-surface text-primary shadow-line" : "text-muted-foreground")} type="button" onClick={() => setDailyMode("repeat")}>每天重复</button>
              <button className={cn("focus-ring min-h-10 rounded-md text-sm font-semibold", dailyMode === "date" ? "bg-surface text-primary shadow-line" : "text-muted-foreground")} type="button" onClick={() => setDailyMode("date")}>仅所选日期</button>
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="md:col-span-2"><span className="workspace-label">任务标题</span><input className="workspace-control" placeholder="写下一个明确动作" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
            <label><span className="workspace-label">所属项目</span><select className="workspace-control" value={form.projectId || ""} onChange={(event) => setForm({ ...form, projectId: event.target.value || undefined })}><option value="">个人任务</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label><span className="workspace-label">任务象限</span><select className="workspace-control" value={form.quadrant} onChange={(event) => setForm({ ...form, quadrant: event.target.value as TaskQuadrant })}>{quadrants.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label><span className="workspace-label">重要性</span><select className="workspace-control" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as TaskPriority })}><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label>
            <label><span className="workspace-label">紧急度</span><select className="workspace-control" value={form.urgency} onChange={(event) => setForm({ ...form, urgency: event.target.value as TaskPriority })}><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label>
            {activeGroup !== "daily" ? <label><span className="workspace-label">目标日期</span><input className="workspace-control" type="date" value={form.targetDate || ""} onChange={(event) => setForm({ ...form, targetDate: event.target.value || undefined })} /></label> : null}
            <label><span className="workspace-label">计划时间</span><input className="workspace-control" placeholder="如：09:00" value={form.dueTime || ""} onChange={(event) => setForm({ ...form, dueTime: event.target.value || undefined })} /></label>
          </div>
          <button className="primary-button w-full" disabled={disabled || !form.title.trim()} type="submit"><Plus size={17} /> 添加任务</button>
        </form>
      </div>

      {activeGroup === "daily" ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {quadrants.map((quadrant) => {
            const quadrantTasks = visibleTasks.filter((task) => (task.quadrant || "low") === quadrant.value);
            return (
              <section className={cn("soft-card overflow-hidden border-t-[3px]", quadrant.tone)} key={quadrant.value}>
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                  <div><h2 className="font-semibold">{quadrant.label}</h2><p className="mt-0.5 text-xs text-muted-foreground">{quadrant.hint}</p></div>
                  <span className="rounded-md bg-surface-strong px-2 py-1 text-xs font-semibold text-muted-foreground">{quadrantTasks.length} 项</span>
                </div>
                {quadrantTasks.map((task) => <TaskRow {...props} key={taskEditorKey(task)} task={task} />)}
                {!quadrantTasks.length ? <p className="px-5 py-10 text-center text-sm text-muted-foreground">这个象限今天很清爽。</p> : null}
              </section>
            );
          })}
        </div>
      ) : (
        <section className="soft-card overflow-hidden">
          <div className="border-b border-border px-5 py-4"><p className="font-semibold">{taskGroupLabels[activeGroup]}</p><p className="mt-1 text-sm text-muted-foreground">展开任务可编辑资料和子任务，完成度由子任务自动计算</p></div>
          {visibleTasks.map((task) => <TaskRow {...props} key={taskEditorKey(task)} task={task} />)}
          {!visibleTasks.length ? <div className="px-5 py-14 text-center text-sm text-muted-foreground">这里还没有任务。</div> : null}
        </section>
      )}
    </div>
  );
}
