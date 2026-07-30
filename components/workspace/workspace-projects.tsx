"use client";

import {
  AlertTriangle,
  BookOpenCheck,
  BriefcaseBusiness,
  CheckCircle2,
  History,
  Pencil,
  Plus,
  Save,
  Trash2,
  type LucideIcon
} from "lucide-react";
import { useState } from "react";

import {
  goalPhaseLabels,
  type GoalPhaseType,
  type LedgerProject,
  type WorkspaceProjectStage
} from "@/lib/workspace-data";
import { currentDateKey, formatWorkspaceDate } from "@/lib/workspace-dates";
import { cn } from "@/lib/utils";

type NewProject = {
  name: string;
  description: string;
  startDate?: string;
  endDate?: string;
};

type LogInput = {
  stageId: string;
  content: string;
  progress: number;
  nextAction?: string;
  date: string;
};

type ProjectsProps = {
  projects: LedgerProject[];
  disabled: boolean;
  onAdd: (input: NewProject) => Promise<boolean>;
  onUpdate: (project: LedgerProject) => Promise<boolean>;
  onRemove: (id: string) => Promise<boolean>;
  onUpdateStage: (stage: WorkspaceProjectStage) => Promise<boolean>;
  onAddLog: (input: LogInput) => Promise<boolean>;
  onRemoveLog: (id: string) => Promise<boolean>;
};

const phaseMeta: Record<GoalPhaseType, { icon: LucideIcon; description: string; tone: string }> = {
  learning: { icon: BookOpenCheck, description: "学习方法、工具和项目逻辑，建立能够开始实操的基础。", tone: "text-blue-600 bg-blue-500/10 dark:text-blue-300" },
  practice: { icon: BriefcaseBusiness, description: "持续实操、积累反馈、验证路径并调整下一步。", tone: "text-amber-600 bg-amber-500/10 dark:text-amber-300" },
  completion: { icon: CheckCircle2, description: "完成交付与收尾，沉淀资产并判断下一轮投入。", tone: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-300" }
};

function projectStageKey(stage: WorkspaceProjectStage) {
  return `${stage.id}:${stage.progress}:${stage.analysis}:${stage.nextAction}:${stage.logs.map((log) => `${log.id}:${log.progress}`).join("|")}`;
}

function ProjectStagePanel({ stage, disabled, onUpdate, onAddLog, onRemoveLog }: {
  stage: WorkspaceProjectStage;
  disabled: boolean;
  onUpdate: ProjectsProps["onUpdateStage"];
  onAddLog: ProjectsProps["onAddLog"];
  onRemoveLog: ProjectsProps["onRemoveLog"];
}) {
  const [draft, setDraft] = useState(stage);
  const [logDate, setLogDate] = useState(currentDateKey());
  const [logContent, setLogContent] = useState("");
  const [logProgress, setLogProgress] = useState(String(stage.progress));
  const [logNextAction, setLogNextAction] = useState(stage.nextAction || "");
  const meta = phaseMeta[stage.phase];
  const Icon = meta.icon;

  async function addLog(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const progress = Number(logProgress);
    if (!logContent.trim() || !logDate || progress < 0 || progress > 100 || disabled) return;
    if (await onAddLog({ stageId: stage.id, content: logContent.trim(), progress, nextAction: logNextAction.trim() || undefined, date: logDate })) setLogContent("");
  }

  return (
    <section className="border-t border-border px-5 py-6 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-lg", meta.tone)}><Icon size={20} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{goalPhaseLabels[stage.phase]}</h3>
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{stage.progress}%</span>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{meta.description}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-strong">
            <div className="h-full rounded-full bg-primary" style={{ width: `${stage.progress}%` }} />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)]">
        <label><span className="workspace-label">阶段进度</span><div className="relative"><input className="workspace-control pr-9" disabled={disabled} max="100" min="0" type="number" value={draft.progress} onChange={(event) => setDraft({ ...draft, progress: Number(event.target.value) })} /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span></div></label>
        <label><span className="workspace-label">阶段分析</span><textarea className="workspace-control min-h-24 resize-y" disabled={disabled} maxLength={5000} placeholder="当前状态、已验证的判断和遇到的问题" value={draft.analysis || ""} onChange={(event) => setDraft({ ...draft, analysis: event.target.value || undefined })} /></label>
        <label><span className="workspace-label">下一步行动</span><textarea className="workspace-control min-h-24 resize-y" disabled={disabled} maxLength={2000} placeholder="接下来最值得推进的动作" value={draft.nextAction || ""} onChange={(event) => setDraft({ ...draft, nextAction: event.target.value || undefined })} /></label>
      </div>
      <div className="mt-3 flex justify-end"><button className="secondary-button" disabled={disabled || draft.progress < 0 || draft.progress > 100} type="button" onClick={() => onUpdate(draft)}><Save size={16} /> 保存阶段判断</button></div>

      <div className="mt-6 border-t border-border pt-5">
        <div className="flex items-center gap-2"><History className="text-primary" size={17} /><h4 className="text-sm font-semibold">推进记录</h4><span className="text-xs text-muted-foreground">{stage.logs.length} 条</span></div>
        <form className="mt-4 grid gap-3 lg:grid-cols-[9.5rem_8rem_minmax(0,1fr)_minmax(0,1fr)_auto]" onSubmit={addLog}>
          <label><span className="workspace-label">记录日期</span><input className="workspace-control" disabled={disabled} type="date" value={logDate} onChange={(event) => setLogDate(event.target.value)} /></label>
          <label><span className="workspace-label">推进至</span><input className="workspace-control" disabled={disabled} max="100" min="0" type="number" value={logProgress} onChange={(event) => setLogProgress(event.target.value)} /></label>
          <label><span className="workspace-label">本次推进情况</span><textarea className="workspace-control min-h-20 resize-y" disabled={disabled} maxLength={5000} value={logContent} onChange={(event) => setLogContent(event.target.value)} /></label>
          <label><span className="workspace-label">调整后的下一步</span><textarea className="workspace-control min-h-20 resize-y" disabled={disabled} maxLength={2000} value={logNextAction} onChange={(event) => setLogNextAction(event.target.value)} /></label>
          <div className="flex items-end"><button className="primary-button w-full justify-center lg:size-11 lg:min-h-11 lg:min-w-11 lg:px-0" disabled={disabled || !logContent.trim() || !logDate || Number(logProgress) < 0 || Number(logProgress) > 100} title="添加推进记录" type="submit"><Plus size={17} /><span className="lg:hidden">添加记录</span></button></div>
        </form>
        <div className="mt-5 divide-y divide-border border-y border-border">{stage.logs.map((log) => <article className="grid gap-3 py-4 sm:grid-cols-[7rem_minmax(0,1fr)_auto]" key={log.id}><div><p className="text-xs font-semibold text-muted-foreground">{formatWorkspaceDate(log.date, false)}</p><span className="mt-1 inline-block rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">推进至 {log.progress}%</span></div><div><p className="whitespace-pre-line text-sm leading-6">{log.content}</p>{log.nextAction ? <p className="mt-2 text-sm text-muted-foreground"><strong className="font-semibold text-foreground">下一步：</strong>{log.nextAction}</p> : null}</div><button aria-label="删除项目推进记录" className="icon-button size-9 text-red-500" disabled={disabled} title="删除推进记录" type="button" onClick={() => { if (window.confirm("确定删除这条项目推进记录吗？")) void onRemoveLog(log.id); }}><Trash2 size={15} /></button></article>)}{!stage.logs.length ? <p className="py-7 text-center text-sm text-muted-foreground">还没有推进记录。</p> : null}</div>
      </div>
    </section>
  );
}

function ProjectEditor({ project, disabled, onUpdate, onRemove, onUpdateStage, onAddLog, onRemoveLog }: {
  project: LedgerProject;
  disabled: boolean;
  onUpdate: ProjectsProps["onUpdate"];
  onRemove: ProjectsProps["onRemove"];
  onUpdateStage: ProjectsProps["onUpdateStage"];
  onAddLog: ProjectsProps["onAddLog"];
  onRemoveLog: ProjectsProps["onRemoveLog"];
}) {
  const [draft, setDraft] = useState(project);
  const riskClass = draft.riskLevel === "high" ? "text-red-600" : draft.riskLevel === "medium" ? "text-amber-600" : "text-emerald-600";
  const stages = project.stages || [];

  return (
    <details className="group soft-card overflow-hidden">
      <summary className="cursor-pointer list-none p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">{project.name}</h3>
              <span className={cn("flex items-center gap-1 text-xs font-semibold", riskClass)}>
                <AlertTriangle size={13} />
                {project.riskLevel === "high" ? "高风险" : project.riskLevel === "medium" ? "中风险" : "低风险"}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{project.stage || "学习阶段"}</p>
          </div>
          <div className="flex items-center gap-3">
            <strong className="text-xl text-primary">{project.progress || 0}%</strong>
            <Pencil className="text-muted-foreground transition group-open:text-primary" size={16} />
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${project.progress || 0}%` }} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">下一步：{project.nextAction || "展开后在当前阶段填写下一步行动"}</p>
      </summary>
      <div className="border-t border-border bg-background/45 p-5 sm:p-6"><div className="grid gap-4 md:grid-cols-2"><label><span className="workspace-label">项目名称</span><input className="workspace-control" disabled={disabled} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><label><span className="workspace-label">风险等级</span><select className="workspace-control" disabled={disabled} value={draft.riskLevel || "low"} onChange={(event) => setDraft({ ...draft, riskLevel: event.target.value as LedgerProject["riskLevel"] })}><option value="low">低</option><option value="medium">中</option><option value="high">高</option></select></label><label className="md:col-span-2"><span className="workspace-label">项目说明</span><textarea className="workspace-control min-h-20" disabled={disabled} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label><label><span className="workspace-label">开始日期</span><input className="workspace-control" disabled={disabled} type="date" value={draft.startDate || ""} onChange={(event) => setDraft({ ...draft, startDate: event.target.value || undefined })} /></label><label><span className="workspace-label">结束日期（选填）</span><input className="workspace-control" disabled={disabled} type="date" value={draft.endDate || ""} onChange={(event) => setDraft({ ...draft, endDate: event.target.value || undefined })} /></label><label className="md:col-span-2"><span className="workspace-label">风险说明</span><input className="workspace-control" disabled={disabled} value={draft.riskReason || ""} onChange={(event) => setDraft({ ...draft, riskReason: event.target.value || undefined })} /></label></div><div className="mt-5 flex items-center justify-between gap-3"><button aria-label={`删除项目 ${project.name}`} className="icon-button text-red-500" disabled={disabled} title="删除项目" type="button" onClick={() => { if (window.confirm(`确定删除项目“${project.name}”吗？有关联收支记录时系统会阻止删除。`)) void onRemove(project.id); }}><Trash2 size={17} /></button><button className="primary-button" disabled={disabled || !draft.name.trim() || !draft.description.trim()} type="button" onClick={() => onUpdate(draft)}><Save size={17} /> 保存项目资料</button></div></div>
      {stages.map((stage) => <ProjectStagePanel disabled={disabled} key={projectStageKey(stage)} stage={stage} onAddLog={onAddLog} onRemoveLog={onRemoveLog} onUpdate={onUpdateStage} />)}
    </details>
  );
}

export function WorkspaceProjects({ projects, disabled, onAdd, onUpdate, onRemove, onUpdateStage, onAddLog, onRemoveLog }: ProjectsProps) {
  const [form, setForm] = useState<NewProject>({ name: "", description: "" });
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); if (!form.name.trim() || !form.description.trim() || disabled) return; if (await onAdd(form)) setForm({ name: "", description: "" }); }

  return <div className="grid gap-6"><section className="soft-card overflow-hidden"><div className="border-b border-border px-5 py-4 sm:px-6"><h2 className="font-semibold">长期项目推进</h2><p className="mt-1 text-sm text-muted-foreground">每个项目固定经过学习、实操、完成收尾三个阶段，不设时间限制。</p></div><form className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-[1fr_1.3fr_10rem_10rem_auto] sm:p-6" onSubmit={submit}><label><span className="workspace-label">新项目名称</span><input className="workspace-control" disabled={disabled} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label><span className="workspace-label">项目说明</span><input className="workspace-control" disabled={disabled} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><label><span className="workspace-label">开始日期</span><input className="workspace-control" disabled={disabled} type="date" value={form.startDate || ""} onChange={(event) => setForm({ ...form, startDate: event.target.value || undefined })} /></label><label><span className="workspace-label">结束日期</span><input className="workspace-control" disabled={disabled} type="date" value={form.endDate || ""} onChange={(event) => setForm({ ...form, endDate: event.target.value || undefined })} /></label><div className="flex items-end"><button className="primary-button w-full" disabled={disabled || !form.name.trim() || !form.description.trim()} type="submit"><Plus size={17} /> 新增项目</button></div></form></section><section className="grid gap-4">{projects.map((project) => <ProjectEditor disabled={disabled} key={project.id} project={project} onAddLog={onAddLog} onRemove={onRemove} onRemoveLog={onRemoveLog} onUpdate={onUpdate} onUpdateStage={onUpdateStage} />)}{!projects.length ? <div className="soft-card px-5 py-14 text-center text-sm text-muted-foreground">还没有项目。</div> : null}</section></div>;
}
