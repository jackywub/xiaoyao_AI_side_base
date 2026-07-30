"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  createEmptyWorkspaceData,
  STORAGE_BACKUP_KEY,
  STORAGE_KEY,
  type GrowthCategory,
  type ExerciseType,
  type WorkspaceGoalDailyAction,
  type WorkspaceGoalStage,
  type WorkspaceProjectStage,
  type GrowthEntry,
  type LedgerProject,
  type TaskPriority,
  type TaskQuadrant,
  type TaskGroup,
  type WorkspaceData,
  type WorkspaceTask
} from "@/lib/workspace-data";
import { parseWorkspaceData } from "@/lib/workspace-validation";

type WorkspaceResponse = {
  data?: WorkspaceData;
  hasData?: boolean;
  error?: string;
};

export function useWorkspaceData() {
  const [data, setData] = useState<WorkspaceData>(createEmptyWorkspaceData);
  const [isReady, setIsReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [migrationAvailable, setMigrationAvailable] = useState(false);
  const [migrationDismissed, setMigrationDismissed] = useState(false);
  const localDataRef = useRef<WorkspaceData | null>(null);
  const pendingRequestRef = useRef(false);

  const handleUnauthorized = useCallback(() => {
    window.location.assign("/login?next=/workspace");
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadWorkspace() {
      try {
        const response = await fetch("/api/workspace", {
          cache: "no-store",
          signal: controller.signal
        });
        if (response.status === 401) {
          handleUnauthorized();
          return;
        }
        const result = await response.json() as WorkspaceResponse;
        if (!response.ok || !result.data) {
          throw new Error(result.error || "工作台数据加载失败。");
        }

        setData(result.data);
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw && !result.hasData) {
          try {
            localDataRef.current = parseWorkspaceData(JSON.parse(raw));
            setMigrationAvailable(true);
          } catch {
            localDataRef.current = null;
          }
        }
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "工作台数据加载失败。");
      } finally {
        if (!controller.signal.aborted) setIsReady(true);
      }
    }

    loadWorkspace();
    return () => controller.abort();
  }, [handleUnauthorized]);

  const refreshWorkspace = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/workspace", { cache: "no-store" });
      if (response.status === 401) {
        handleUnauthorized();
        return false;
      }
      const result = await response.json() as WorkspaceResponse;
      if (!response.ok || !result.data) {
        throw new Error(result.error || "工作台数据刷新失败。");
      }
      setData(result.data);
      return true;
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "工作台数据刷新失败。");
      return false;
    }
  }, [handleUnauthorized]);

  async function mutate(action: string, input: Record<string, unknown>) {
    if (pendingRequestRef.current) return false;
    pendingRequestRef.current = true;
    setIsSaving(true);
    setError("");

    try {
      const response = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, input })
      });
      if (response.status === 401) {
        handleUnauthorized();
        return false;
      }
      const result = await response.json() as WorkspaceResponse;
      if (!response.ok || !result.data) {
        throw new Error(result.error || "数据保存失败。");
      }
      setData(result.data);
      return true;
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "数据保存失败。");
      return false;
    } finally {
      pendingRequestRef.current = false;
      setIsSaving(false);
    }
  }

  async function importLocalData() {
    const localData = localDataRef.current;
    if (!localData || pendingRequestRef.current) return false;

    pendingRequestRef.current = true;
    setIsSaving(true);
    setError("");
    try {
      const response = await fetch("/api/workspace/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: localData })
      });
      if (response.status === 401) {
        handleUnauthorized();
        return false;
      }
      const result = await response.json() as WorkspaceResponse;
      if (!response.ok || !result.data) {
        throw new Error(result.error || "本地数据导入失败。");
      }

      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) window.localStorage.setItem(STORAGE_BACKUP_KEY, raw);
      window.localStorage.removeItem(STORAGE_KEY);
      localDataRef.current = null;
      setMigrationAvailable(false);
      setData(result.data);
      return true;
    } catch (migrationError) {
      setError(migrationError instanceof Error ? migrationError.message : "本地数据导入失败。");
      return false;
    } finally {
      pendingRequestRef.current = false;
      setIsSaving(false);
    }
  }

  async function logout() {
    if (pendingRequestRef.current) return;
    pendingRequestRef.current = true;
    setIsSaving(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.assign("/login");
    }
  }

  return {
    data,
    isReady,
    isSaving,
    error,
    migrationAvailable: migrationAvailable && !migrationDismissed,
    dismissMigration: () => setMigrationDismissed(true),
    importLocalData,
    toggleTask: (id: string, date?: string) => mutate("toggleTask", { id, date }),
    addTask: (input: {
      title: string;
      group: TaskGroup;
      priority: TaskPriority;
      urgency: TaskPriority;
      quadrant: TaskQuadrant;
      projectId?: string;
      startDate?: string;
      targetDate?: string;
      dueTime?: string;
      description?: string;
      isGoal?: boolean;
    }) => mutate("addTask", input),
    updateTask: (task: WorkspaceTask) => mutate("updateTask", {
      id: task.id,
      title: task.title,
      priority: task.priority,
      urgency: task.urgency || "medium",
      quadrant: task.quadrant || "low",
      projectId: task.projectId,
      startDate: task.startDate,
      targetDate: task.targetDate,
      dueTime: task.dueTime,
      description: task.description,
      progress: task.progress
    }),
    removeTask: (id: string) => mutate("removeTask", { id }),
    updateGoalStage: (stage: WorkspaceGoalStage) => mutate("updateGoalStage", {
      id: stage.id,
      name: stage.name,
      startDate: stage.startDate,
      endDate: stage.endDate
    }),
    addGoalStage: (goalId: string, input: { name: string; startDate?: string; endDate?: string }) =>
      mutate("addGoalStage", { goalId, ...input }),
    removeGoalStage: (id: string) => mutate("removeGoalStage", { id }),
    addGoalDailyAction: (goalId: string, title: string, date: string) =>
      mutate("addGoalDailyAction", { goalId, title, date }),
    updateGoalDailyAction: (action: WorkspaceGoalDailyAction) =>
      mutate("updateGoalDailyAction", action),
    toggleGoalDailyAction: (id: string) => mutate("toggleGoalDailyAction", { id }),
    removeGoalDailyAction: (id: string) => mutate("removeGoalDailyAction", { id }),
    addGoalProgressLog: (input: {
      stageId: string;
      content: string;
      progress: number;
      nextAction?: string;
      date: string;
    }) => mutate("addGoalProgressLog", input),
    removeGoalProgressLog: (id: string) => mutate("removeGoalProgressLog", { id }),
    updateProjectStage: (stage: WorkspaceProjectStage) => mutate("updateProjectStage", {
      id: stage.id,
      progress: stage.progress,
      analysis: stage.analysis,
      nextAction: stage.nextAction
    }),
    addProjectProgressLog: (input: {
      stageId: string;
      content: string;
      progress: number;
      nextAction?: string;
      date: string;
    }) => mutate("addProjectProgressLog", input),
    removeProjectProgressLog: (id: string) => mutate("removeProjectProgressLog", { id }),
    addSubtask: (taskId: string, title: string, date?: string) => mutate("addSubtask", { taskId, title, date }),
    updateSubtask: (id: string, title: string) => mutate("updateSubtask", { id, title }),
    toggleSubtask: (id: string, date?: string) => mutate("toggleSubtask", { id, date }),
    removeSubtask: (id: string, date?: string) => mutate("removeSubtask", { id, date }),
    toggleHabit: (id: string) => mutate("toggleHabit", { id }),
    addHabit: (label: string, description: string, tone: "blue" | "green" | "amber" | "violet") =>
      mutate("addHabit", { label, description, tone }),
    addProject: (input: {
      name: string;
      description: string;
      stage?: string;
      nextAction?: string;
      startDate?: string;
      endDate?: string;
    }) => mutate("addProject", input),
    updateProject: (project: LedgerProject) => mutate("updateProject", {
      id: project.id,
      name: project.name,
      description: project.description,
      stage: project.stage,
      nextAction: project.nextAction,
      riskLevel: project.riskLevel || "low",
      riskReason: project.riskReason,
      progress: project.progress || 0,
      startDate: project.startDate,
      endDate: project.endDate
    }),
    removeProject: (id: string) => mutate("removeProject", { id }),
    addLedgerEntry: (input: {
      projectId: string;
      type: "income" | "expense";
      amount: number;
      note: string;
      date: string;
    }) => mutate("addLedgerEntry", input),
    updateLedgerEntry: (entry: {
      id: string;
      projectId: string;
      type: "income" | "expense";
      amount: number;
      note: string;
      date: string;
    }) => mutate("updateLedgerEntry", entry),
    removeLedgerEntry: (id: string) => mutate("removeLedgerEntry", { id }),
    addGrowthEntry: (input: {
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
    }) => mutate("addGrowthEntry", input),
    updateGrowthEntry: (entry: GrowthEntry) => mutate("updateGrowthEntry", entry),
    removeGrowthEntry: (id: string, category: GrowthCategory) => mutate("removeGrowthEntry", { id, category }),
    refreshWorkspace,
    logout
  };
}
