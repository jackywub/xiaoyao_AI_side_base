"use client";

import {
  Bot,
  BookOpenCheck,
  ChartNoAxesCombined,
  CheckSquare2,
  Database,
  FolderKanban,
  Home,
  LoaderCircle,
  LogOut,
  Settings,
  Sparkles,
  Target,
  WalletCards,
  MoreHorizontal,
  PanelsTopLeft,
  type LucideIcon
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { WorkspaceDashboard } from "@/components/workspace/workspace-dashboard";
import { WorkspaceAssistant } from "@/components/workspace/workspace-assistant";
import { WorkspaceGoals } from "@/components/workspace/workspace-goals";
import { WorkspaceGrowth } from "@/components/workspace/workspace-growth";
import { WorkspaceLedger } from "@/components/workspace/workspace-ledger";
import { WorkspaceProjects } from "@/components/workspace/workspace-projects";
import { WorkspaceSettings } from "@/components/workspace/workspace-settings";
import { WorkspaceSiteContent } from "@/components/workspace/workspace-site-content";
import { WorkspaceTasks } from "@/components/workspace/workspace-tasks";
import { useWorkspaceData } from "@/hooks/use-workspace-data";
import {
  workspaceSectionLabels,
  type WorkspaceSection
} from "@/lib/workspace-data";
import { currentDateKey } from "@/lib/workspace-dates";
import { cn } from "@/lib/utils";

const navigation: Array<{
  id: WorkspaceSection;
  icon: LucideIcon;
  description: string;
}> = [
  { id: "dashboard", icon: ChartNoAxesCombined, description: "任务与收益趋势" },
  { id: "tasks", icon: CheckSquare2, description: "日期、四象限与子任务" },
  { id: "projects", icon: FolderKanban, description: "阶段、进度与风险" },
  { id: "goals", icon: Target, description: "期限、拆解与完成率" },
  { id: "ledger", icon: WalletCards, description: "项目收入与支出" },
  { id: "growth", icon: BookOpenCheck, description: "输入、行动与复盘" },
  { id: "content", icon: PanelsTopLeft, description: "页面、文章与案例" },
  { id: "assistant", icon: Bot, description: "计划、拆解与复盘助手" },
  { id: "settings", icon: Settings, description: "资料、安全与连接" }
];

const mobileMainSections: WorkspaceSection[] = ["dashboard", "tasks", "projects", "growth"];

export function WorkspaceApp({
  avatarUrl,
  displayName
}: {
  avatarUrl: string | null;
  displayName: string;
}) {
  const [activeSection, setActiveSection] = useState<WorkspaceSection>("dashboard");
  const [selectedDate, setSelectedDate] = useState(currentDateKey());
  const currentDateRef = useRef(currentDateKey());
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [profile, setProfile] = useState({
    displayName,
    avatarUrl: avatarUrl || "/xiaoyao-avatar-optimized.jpg"
  });
  const today = new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long"
  }).format(new Date());
  const {
    data,
    isReady,
    isSaving,
    error,
    migrationAvailable,
    dismissMigration,
    importLocalData,
    toggleTask,
    addTask,
    updateTask,
    removeTask,
    addGoalDailyAction,
    updateGoalDailyAction,
    toggleGoalDailyAction,
    removeGoalDailyAction,
    addSubtask,
    updateSubtask,
    toggleSubtask,
    removeSubtask,
    addProject,
    updateProject,
    removeProject,
    updateProjectStage,
    addProjectProgressLog,
    removeProjectProgressLog,
    addLedgerEntry,
    updateLedgerEntry,
    removeLedgerEntry,
    addGrowthEntry,
    updateGrowthEntry,
    removeGrowthEntry,
    refreshWorkspace,
    logout
  } = useWorkspaceData();

  const activeNavigation = navigation.find((item) => item.id === activeSection) || navigation[0];

  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextDate = currentDateKey();
      const previousDate = currentDateRef.current;
      if (nextDate === previousDate) return;
      currentDateRef.current = nextDate;
      setSelectedDate((current) => current === previousDate ? nextDate : current);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="w-full px-4 py-6 pb-28 sm:px-6 sm:py-8 lg:px-8 lg:pb-12 2xl:px-10">
      <div className="grid gap-6 lg:grid-cols-[15.5rem_minmax(0,1fr)]">
        <aside className="sticky top-[5.5rem] hidden h-[calc(100svh-7rem)] flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-soft lg:flex">
          <div className="border-b border-border p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Sparkles size={19} />
              </span>
              <div>
                <p className="font-semibold">成长工作台</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{profile.displayName}的行动系统</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="成长工作台导航">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = item.id === activeSection;
              return (
                <button
                  className={cn(
                    "focus-ring flex min-h-14 w-full items-center gap-3 rounded-lg px-3 text-left transition",
                    active
                      ? "bg-primary text-primary-foreground shadow-line"
                      : "text-muted-foreground hover:bg-surface-strong hover:text-primary"
                  )}
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                >
                  <Icon size={19} />
                  <span>
                    <span className="block text-sm font-semibold">{workspaceSectionLabels[item.id]}</span>
                    <span className={cn("mt-0.5 block text-[11px]", active ? "text-primary-foreground/70" : "text-muted-foreground")}>
                      {item.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="border-t border-border p-3">
            <Link className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-muted-foreground transition hover:bg-surface-strong hover:text-primary" href="/">
              <Home size={18} /> 返回品牌首页
            </Link>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="mb-6 flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-line sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Image
                alt={profile.displayName}
                className="size-12 rounded-full border-2 border-primary/20 object-cover"
                height={96}
                src={profile.avatarUrl}
                unoptimized
                width={96}
              />
              <div>
                <p className="text-sm text-muted-foreground">{today}</p>
                <h1 className="mt-1 text-xl font-bold sm:text-2xl">{workspaceSectionLabels[activeSection]}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-muted-foreground md:inline">
                {isSaving ? "正在同步到 MySQL" : activeNavigation.description}
              </span>
              <button className="icon-button" disabled={isSaving} title="退出登录" type="button" onClick={logout}>
                {isSaving ? <LoaderCircle className="animate-spin" size={17} /> : <LogOut size={17} />}
              </button>
            </div>
          </header>

          {migrationAvailable ? (
            <section className="mb-6 flex flex-col gap-4 rounded-lg border border-primary/30 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Database size={19} />
                </span>
                <div>
                  <p className="font-semibold">检测到当前浏览器中的旧工作台数据</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    确认后会一次性导入 MySQL，成功后在浏览器保留备份，不会直接覆盖数据库已有内容。
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button className="secondary-button" disabled={isSaving} type="button" onClick={dismissMigration}>暂不处理</button>
                <button className="primary-button" disabled={isSaving} type="button" onClick={importLocalData}>
                  {isSaving ? <LoaderCircle className="animate-spin" size={17} /> : <Database size={17} />}
                  导入数据库
                </button>
              </div>
            </section>
          ) : null}

          {error ? (
            <p className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300" role="alert">
              {error}
            </p>
          ) : null}

          {!isReady ? (
            <div className="soft-card grid min-h-80 place-items-center text-sm text-muted-foreground">正在整理你的成长记录...</div>
          ) : null}

          {isReady && activeSection === "dashboard" ? (
            <WorkspaceDashboard data={data} selectedDate={selectedDate} onDateChange={setSelectedDate} onNavigate={setActiveSection} />
          ) : null}
          {isReady && activeSection === "tasks" ? (
            <WorkspaceTasks disabled={isSaving} projects={data.projects} selectedDate={selectedDate} tasks={data.tasks} onAdd={addTask} onAddSubtask={addSubtask} onDateChange={setSelectedDate} onRemove={removeTask} onRemoveSubtask={removeSubtask} onToggle={toggleTask} onToggleSubtask={toggleSubtask} onUpdate={updateTask} onUpdateSubtask={updateSubtask} />
          ) : null}
          {isReady && activeSection === "projects" ? (
            <WorkspaceProjects disabled={isSaving} projects={data.projects} onAdd={addProject} onAddLog={addProjectProgressLog} onRemove={removeProject} onRemoveLog={removeProjectProgressLog} onUpdate={updateProject} onUpdateStage={updateProjectStage} />
          ) : null}
          {isReady && activeSection === "goals" ? (
            <WorkspaceGoals disabled={isSaving} goals={data.tasks.filter((task) => task.isGoal)} onAdd={addTask} onAddAction={addGoalDailyAction} onRemove={removeTask} onRemoveAction={removeGoalDailyAction} onToggleAction={toggleGoalDailyAction} onUpdate={updateTask} onUpdateAction={updateGoalDailyAction} />
          ) : null}
          {isReady && activeSection === "ledger" ? (
            <WorkspaceLedger disabled={isSaving} entries={data.ledger} projects={data.projects} onAdd={addLedgerEntry} onRemove={removeLedgerEntry} onUpdate={updateLedgerEntry} />
          ) : null}
          {isReady && activeSection === "growth" ? (
            <WorkspaceGrowth disabled={isSaving} entries={data.growth} saveError={error} tasks={data.tasks} onAdd={addGrowthEntry} onReadingSync={refreshWorkspace} onRemove={removeGrowthEntry} onUpdate={updateGrowthEntry} />
          ) : null}
          {isReady && activeSection === "content" ? <WorkspaceSiteContent /> : null}
          {isReady && activeSection === "assistant" ? <WorkspaceAssistant /> : null}
          {isReady && activeSection === "settings" ? (
            <WorkspaceSettings onProfileChange={setProfile} />
          ) : null}
        </div>
      </div>

      {isMoreOpen ? (
        <div className="fixed inset-x-3 bottom-[5.2rem] z-50 grid grid-cols-2 gap-2 rounded-lg border border-border bg-surface p-3 shadow-soft lg:hidden">
          {navigation.filter((item) => !mobileMainSections.includes(item.id)).map((item) => {
            const Icon = item.icon;
            return <button className={cn("flex min-h-12 items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold", activeSection === item.id ? "bg-primary/10 text-primary" : "bg-background text-muted-foreground")} key={item.id} type="button" onClick={() => { setActiveSection(item.id); setIsMoreOpen(false); }}><Icon size={18} />{workspaceSectionLabels[item.id]}</button>;
          })}
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-surface/95 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 shadow-soft backdrop-blur-xl lg:hidden" aria-label="移动端成长工作台导航">
        {navigation.filter((item) => mobileMainSections.includes(item.id)).map((item) => {
          const Icon = item.icon;
          const active = item.id === activeSection;
          return (
            <button
              aria-label={workspaceSectionLabels[item.id]}
              className={cn(
                "focus-ring flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-semibold transition",
                active ? "bg-primary/10 text-primary" : "text-muted-foreground"
              )}
              key={item.id}
              type="button"
              onClick={() => { setActiveSection(item.id); setIsMoreOpen(false); }}
            >
              <Icon size={19} />
              <span>{workspaceSectionLabels[item.id]}</span>
            </button>
          );
        })}
        <button className={cn("focus-ring flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-semibold", isMoreOpen || !mobileMainSections.includes(activeSection) ? "bg-primary/10 text-primary" : "text-muted-foreground")} type="button" onClick={() => setIsMoreOpen((current) => !current)}><MoreHorizontal size={19} /><span>更多</span></button>
      </nav>
    </div>
  );
}
