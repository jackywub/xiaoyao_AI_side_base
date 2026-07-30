"use client";

import { BookOpen, Brain, Check, Dumbbell, FilePenLine, Flame, Plus } from "lucide-react";
import { useState } from "react";

import type { WorkspaceHabit } from "@/lib/workspace-data";
import { cn } from "@/lib/utils";

type HabitsProps = {
  disabled: boolean;
  habits: WorkspaceHabit[];
  onAdd: (label: string, description: string, tone: WorkspaceHabit["tone"]) => Promise<boolean>;
  onToggle: (id: string) => Promise<boolean>;
};

const days = ["一", "二", "三", "四", "五", "六", "日"];
const icons = [BookOpen, FilePenLine, Dumbbell, Brain];

const toneClasses = {
  blue: "bg-primary/10 text-primary",
  green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400"
};

export function WorkspaceHabits({ disabled, habits, onAdd, onToggle }: HabitsProps) {
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [tone, setTone] = useState<WorkspaceHabit["tone"]>("blue");
  const completed = habits.filter((habit) => habit.completed).length;
  const completionRate = habits.length ? Math.round((completed / habits.length) * 100) : 0;

  async function submitHabit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!label.trim() || !description.trim() || disabled) return;
    if (await onAdd(label.trim(), description.trim(), tone)) {
      setLabel("");
      setDescription("");
    }
  }

  return (
    <div className="grid gap-6">
      <section className="soft-card grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
        <div>
          <p className="text-sm font-semibold">今天完成了 {completed}/{habits.length} 个习惯</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            不追求每天满分，先让阅读、复盘、运动和学习成为稳定出现的日常。
          </p>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-4xl font-bold text-primary">{completionRate}%</span>
          <span className="pb-1 text-sm text-muted-foreground">今日完成率</span>
        </div>
      </section>

      <form className="soft-card grid gap-4 p-5 sm:grid-cols-2 sm:p-6" onSubmit={submitHabit}>
        <label>
          <span className="workspace-label">习惯名称</span>
          <input className="workspace-control" disabled={disabled} maxLength={100} placeholder="如：每日写作" required value={label} onChange={(event) => setLabel(event.target.value)} />
        </label>
        <label>
          <span className="workspace-label">行动标准</span>
          <input className="workspace-control" disabled={disabled} maxLength={500} placeholder="如：每天输出 300 字" required value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <fieldset className="sm:col-span-2">
          <legend className="workspace-label">标记颜色</legend>
          <div className="flex gap-2">
            {(Object.keys(toneClasses) as WorkspaceHabit["tone"][]).map((item) => (
              <button
                aria-label={`选择${item}颜色`}
                aria-pressed={tone === item}
                className={cn("focus-ring grid size-11 place-items-center rounded-lg border", tone === item ? "border-primary" : "border-border")}
                disabled={disabled}
                key={item}
                title={`选择${item}颜色`}
                type="button"
                onClick={() => setTone(item)}
              >
                <span className={cn("size-5 rounded-full", toneClasses[item])} />
              </button>
            ))}
          </div>
        </fieldset>
        <button className="primary-button sm:col-span-2" disabled={disabled} type="submit"><Plus size={17} /> 新增习惯</button>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {habits.map((habit, index) => {
          const Icon = icons[index] || Flame;
          return (
            <article className="soft-card p-5" key={habit.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className={cn("grid size-11 place-items-center rounded-lg", toneClasses[habit.tone])}>
                    <Icon size={20} />
                  </span>
                  <div>
                    <h3 className="font-semibold">{habit.label}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{habit.description}</p>
                  </div>
                </div>
                <button
                  aria-label={habit.completed ? "取消今日打卡" : "完成今日打卡"}
                  className={cn(
                    "focus-ring grid size-11 place-items-center rounded-lg border transition",
                    habit.completed
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary hover:text-primary"
                  )}
                  disabled={disabled}
                  title={habit.completed ? "取消打卡" : "完成打卡"}
                  type="button"
                  onClick={() => onToggle(habit.id)}
                >
                  <Check size={19} />
                </button>
              </div>

              <div className="mt-6 flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Flame size={18} />
                <strong className="text-lg">连续 {habit.streak} 天</strong>
              </div>

              <div className="mt-5 grid grid-cols-7 gap-2">
                {habit.history.map((done, dayIndex) => (
                  <div className="grid gap-1.5 text-center" key={`${habit.id}-${days[dayIndex]}`}>
                    <span className="text-[11px] text-muted-foreground">{days[dayIndex]}</span>
                    <span
                      className={cn(
                        "mx-auto grid size-8 place-items-center rounded-md border",
                        done
                          ? "border-primary/20 bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground/40"
                      )}
                    >
                      {done ? <Check size={14} /> : "·"}
                    </span>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
        {!habits.length ? (
          <div className="soft-card px-5 py-14 text-center text-sm text-muted-foreground md:col-span-2">还没有习惯，从上方添加第一项。</div>
        ) : null}
      </div>
    </div>
  );
}
