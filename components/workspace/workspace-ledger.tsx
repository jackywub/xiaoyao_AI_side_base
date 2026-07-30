"use client";

import { ArrowDownRight, ArrowUpRight, CalendarDays, CalendarRange, CircleDollarSign, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { WorkspaceLedgerAnalysis } from "@/components/workspace/workspace-ledger-analysis";
import {
  formatCurrency,
  type LedgerEntry,
  type LedgerProject
} from "@/lib/workspace-data";
import { currentDateKey, formatWorkspaceDate } from "@/lib/workspace-dates";
import { cn } from "@/lib/utils";

type LedgerInput = {
  projectId: string;
  type: "income" | "expense";
  amount: number;
  note: string;
  date: string;
};

type LedgerProps = {
  disabled: boolean;
  entries: LedgerEntry[];
  projects: LedgerProject[];
  onAdd: (input: LedgerInput) => Promise<boolean>;
  onUpdate: (entry: LedgerEntry) => Promise<boolean>;
  onRemove: (id: string) => Promise<boolean>;
};

function ledgerEntryKey(entry: LedgerEntry) {
  return [entry.id, entry.projectId, entry.type, entry.amount, entry.note, entry.date].join(":");
}

function LedgerEntryEditor({
  entry,
  projects,
  disabled,
  onUpdate,
  onRemove
}: {
  entry: LedgerEntry;
  projects: LedgerProject[];
  disabled: boolean;
  onUpdate: LedgerProps["onUpdate"];
  onRemove: LedgerProps["onRemove"];
}) {
  const [draft, setDraft] = useState(entry);
  const project = projects.find((item) => item.id === entry.projectId);
  const isIncome = entry.type === "income";

  async function remove() {
    if (!window.confirm("确定删除这条收支记录吗？")) return;
    await onRemove(entry.id);
  }

  return (
    <details className="group border-b border-border last:border-b-0">
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-5 py-3.5 transition hover:bg-primary/5 sm:px-6">
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", isIncome ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500")}>
          {isIncome ? <ArrowUpRight size={17} /> : <ArrowDownRight size={17} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{entry.note}</p>
          <p className="mt-1 text-xs text-muted-foreground">{project?.name || "未知项目"} · {entry.date}</p>
        </div>
        <strong className={cn("text-sm", isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>
          {isIncome ? "+" : "-"}{formatCurrency(entry.amount)}
        </strong>
        <Pencil className="text-muted-foreground transition group-open:text-primary" size={15} />
      </summary>
      <div className="border-t border-border bg-background/45 px-5 py-5 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label><span className="workspace-label">项目</span><select className="workspace-control" disabled={disabled} value={draft.projectId} onChange={(event) => setDraft({ ...draft, projectId: event.target.value })}>{projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label><span className="workspace-label">类型</span><select className="workspace-control" disabled={disabled} value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as LedgerEntry["type"] })}><option value="income">收入</option><option value="expense">支出</option></select></label>
          <label><span className="workspace-label">金额</span><input className="workspace-control" disabled={disabled} min="0.01" step="0.01" type="number" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: Number(event.target.value) })} /></label>
          <label><span className="workspace-label">日期</span><input className="workspace-control" disabled={disabled} type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label>
          <label><span className="workspace-label">备注</span><input className="workspace-control" disabled={disabled} value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} /></label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="icon-button text-red-500" disabled={disabled} title="删除记录" type="button" onClick={remove}><Trash2 size={17} /></button>
          <button className="primary-button" disabled={disabled || !draft.projectId || !draft.note.trim() || draft.amount <= 0} type="button" onClick={() => onUpdate(draft)}><Save size={17} /> 保存记录</button>
        </div>
      </div>
    </details>
  );
}

export function WorkspaceLedger({ disabled, entries, projects, onAdd, onUpdate, onRemove }: LedgerProps) {
  const today = currentDateKey();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? "all");
  const [type, setType] = useState<"income" | "expense">("income");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [entryDate, setEntryDate] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7));
  const addProjectId = projectId || projects[0]?.id || "";

  const monthEntries = useMemo(
    () => entries.filter((entry) => entry.date.startsWith(`${selectedMonth}-`)),
    [entries, selectedMonth]
  );
  const projectTotals = useMemo(
    () => projects.map((project) => {
      const projectEntries = monthEntries.filter((entry) => entry.projectId === project.id);
      const income = projectEntries.filter((entry) => entry.type === "income").reduce((sum, entry) => sum + entry.amount, 0);
      const expense = projectEntries.filter((entry) => entry.type === "expense").reduce((sum, entry) => sum + entry.amount, 0);
      return { ...project, income, expense, net: income - expense, recordCount: projectEntries.length };
    }),
    [monthEntries, projects]
  );
  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const selectedProjectName = selectedProjectId === "all" ? "全部项目" : selectedProject?.name || "所选项目";
  const entryDateLabel = entryDate ? formatWorkspaceDate(entryDate, false) : "未选择日期";
  const visibleEntries = useMemo(() => {
    if (!entryDate) return [];
    const dateEntries = entries.filter((entry) => entry.date === entryDate);
    return selectedProjectId === "all"
      ? dateEntries
      : dateEntries.filter((entry) => entry.projectId === selectedProjectId);
  }, [entries, entryDate, selectedProjectId]);
  const totalIncome = monthEntries.filter((entry) => entry.type === "income").reduce((sum, entry) => sum + entry.amount, 0);
  const totalExpense = monthEntries.filter((entry) => entry.type === "expense").reduce((sum, entry) => sum + entry.amount, 0);
  const selectedMonthLabel = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long" }).format(new Date(`${selectedMonth}-01T00:00:00`));

  function changeMonth(nextMonth: string) {
    if (!nextMonth) return;
    setSelectedMonth(nextMonth);
  }

  function selectProject(nextProjectId: string) {
    setSelectedProjectId(nextProjectId);
    if (nextProjectId !== "all") setProjectId(nextProjectId);
  }

  function changeAddProject(nextProjectId: string) {
    setProjectId(nextProjectId);
    if (nextProjectId) setSelectedProjectId(nextProjectId);
  }

  function changeEntryDate(nextDate: string) {
    setEntryDate(nextDate);
    if (nextDate) setSelectedMonth(nextDate.slice(0, 7));
  }

  async function submitEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!addProjectId || !parsedAmount || !note.trim() || !entryDate || disabled) return;
    if (await onAdd({ projectId: addProjectId, type, amount: parsedAmount, note: note.trim(), date: entryDate })) {
      setAmount("");
      setNote("");
      setSelectedProjectId(addProjectId);
      setSelectedMonth(entryDate.slice(0, 7));
    }
  }

  return (
    <div className="grid gap-6">
      <section className="soft-card flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><CalendarRange size={19} /></span>
          <div><h2 className="font-semibold">收益时间范围</h2><p className="mt-1 text-sm text-muted-foreground">选择月份查看整体分析和项目曲线；历史编辑跟随左侧发生日期</p></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-[11rem_auto]">
          <label><span className="workspace-label">分析月份</span><input aria-label="选择收益分析月份" className="workspace-control" type="month" value={selectedMonth} onChange={(event) => changeMonth(event.target.value)} /></label>
          <div className="flex items-end"><button className="secondary-button w-full" type="button" onClick={() => changeMonth(today.slice(0, 7))}><CalendarDays size={17} /> 本月</button></div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="soft-card p-5"><p className="text-sm text-muted-foreground">{selectedMonthLabel}累计收入</p><p className="mt-3 text-3xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalIncome)}</p><p className="mt-2 text-xs text-muted-foreground">{monthEntries.filter((entry) => entry.type === "income").length} 笔收入</p></article>
        <article className="soft-card p-5"><p className="text-sm text-muted-foreground">{selectedMonthLabel}累计支出</p><p className="mt-3 text-3xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalExpense)}</p><p className="mt-2 text-xs text-muted-foreground">{monthEntries.filter((entry) => entry.type === "expense").length} 笔支出</p></article>
        <article className="soft-card border-t-[3px] border-t-primary p-5"><p className="text-sm text-muted-foreground">{selectedMonthLabel}净收益</p><p className="mt-3 text-3xl font-bold text-primary">{formatCurrency(totalIncome - totalExpense)}</p><p className="mt-2 text-xs text-muted-foreground">共 {monthEntries.length} 条收支记录</p></article>
      </div>

      <WorkspaceLedgerAnalysis entries={monthEntries} projects={projects} selectedMonth={selectedMonth} selectedProjectId={selectedProjectId} selectedProjectName={selectedProjectName} />

      <section className="soft-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2"><CircleDollarSign className="text-primary" size={20} /><div><h2 className="font-semibold">按项目查看</h2><p className="mt-1 text-sm text-muted-foreground">比较各副业在 {selectedMonthLabel} 的净收益，并同步切换上方净收益曲线与所选日期明细</p></div></div>
          <div className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs text-muted-foreground">当前曲线：<strong className="text-primary">{selectedProjectName}</strong></div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <button className={cn("focus-ring min-h-28 rounded-lg border p-4 text-left transition", selectedProjectId === "all" ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/40")} type="button" onClick={() => selectProject("all")}><span className="text-sm font-semibold">全部项目</span><strong className="mt-3 block text-lg text-primary">{formatCurrency(totalIncome - totalExpense)}</strong><span className="mt-1 block text-xs text-muted-foreground">本月 {monthEntries.length} 条记录</span></button>
          {projectTotals.map((project) => (
            <button className={cn("focus-ring min-h-28 rounded-lg border p-4 text-left transition", selectedProjectId === project.id ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/40")} key={project.id} type="button" onClick={() => selectProject(project.id)}>
              <span className="line-clamp-1 text-sm font-semibold">{project.name}</span>
              <strong className={cn("mt-3 block text-lg", project.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>{formatCurrency(project.net)}</strong>
              <span className="mt-1 block text-xs text-muted-foreground">本月收入 {formatCurrency(project.income)} · {project.recordCount} 笔</span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <section className="soft-card p-5 sm:p-6">
          <h2 className="font-semibold">新增收支记录</h2>
          <p className="mt-1 text-sm text-muted-foreground">选择项目和发生日期后，右侧会同步显示该项目当天记录</p>
          <form className="mt-5 grid gap-3" onSubmit={submitEntry}>
            <label><span className="workspace-label">项目</span><select className="workspace-control" disabled={disabled || !projects.length} value={addProjectId} onChange={(event) => changeAddProject(event.target.value)}>{!projects.length ? <option value="">请先创建项目</option> : null}{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
            <div className="grid grid-cols-2 gap-3">
              <label><span className="workspace-label">类型</span><select className="workspace-control" disabled={disabled} value={type} onChange={(event) => setType(event.target.value as "income" | "expense")}><option value="income">收入</option><option value="expense">支出</option></select></label>
              <label><span className="workspace-label">金额</span><input className="workspace-control" disabled={disabled} inputMode="decimal" min="0.01" placeholder="0" step="0.01" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
            </div>
            <label><span className="workspace-label">发生日期</span><input className="workspace-control" disabled={disabled} type="date" value={entryDate} onChange={(event) => changeEntryDate(event.target.value)} /></label>
            <label><span className="workspace-label">备注</span><input className="workspace-control" disabled={disabled} placeholder="本次收支用途" value={note} onChange={(event) => setNote(event.target.value)} /></label>
            <button className="primary-button" disabled={disabled || !projects.length || !note.trim() || !amount} type="submit"><Plus size={17} /> 添加记录</button>
          </form>
        </section>

        <section className="soft-card overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6"><div><h2 className="font-semibold">历史收支编辑</h2><p className="mt-1 text-sm text-muted-foreground">{selectedProjectName} · {entryDateLabel} 收支记录，展开后可修改项目、类型、金额、日期和备注</p></div><div className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">{visibleEntries.length} 条记录</div></div>
          {visibleEntries.map((entry) => <LedgerEntryEditor disabled={disabled} entry={entry} key={ledgerEntryKey(entry)} projects={projects} onRemove={onRemove} onUpdate={onUpdate} />)}
          {!visibleEntries.length ? <p className="px-5 py-14 text-center text-sm text-muted-foreground">{selectedProjectName} 在 {entryDateLabel} 还没有收支记录。</p> : null}
        </section>
      </div>
    </div>
  );
}
