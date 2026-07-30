import "dotenv/config";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not configured.");

const url = new URL(databaseUrl);
const prisma = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    allowPublicKeyRetrieval: true,
    connectionLimit: 2
  })
});

const aliases = new Map([
  ["每日阅读", "每日阅读"],
  ["阅读30分钟", "每日阅读"],
  ["每日运动", "每日运动"],
  ["运动3次/周", "每日运动"],
  ["每日学习", "每日学习"],
  ["学习新知识", "每日学习"],
  ["每日复盘", "每日复盘"],
  ["记录灵感", "记录灵感"]
]);

function normalizeTitle(value) {
  return value.trim().toLowerCase().replace(/[\s　]+/g, "").replace(/[，,。.!！]/g, "");
}

function canonicalTitle(value) {
  return aliases.get(normalizeTitle(value)) || null;
}

function dateKeyInShanghai() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function toDate(value) {
  return new Date(`${value}T00:00:00.000Z`);
}

async function mergeRecord(tx, taskId, sourceRecord, existingRecords) {
  const dateKey = sourceRecord.recordDate.toISOString().slice(0, 10);
  const existing = existingRecords.get(dateKey);
  const completed = Boolean(existing?.completed || sourceRecord.completed);
  const progress = completed ? 100 : Math.max(existing?.progress || 0, sourceRecord.progress || 0);

  await tx.workspaceTaskRecord.upsert({
    where: { taskId_recordDate: { taskId, recordDate: sourceRecord.recordDate } },
    update: { completed, progress, completedAt: completed ? existing?.completedAt || new Date() : null },
    create: { taskId, recordDate: sourceRecord.recordDate, completed, progress, completedAt: completed ? new Date() : null }
  });
  existingRecords.set(dateKey, { completed, progress, completedAt: completed ? new Date() : null });
}

async function consolidateWorkspace(tx, workspace) {
  const now = new Date();
  let archivedTasks = 0;
  let migratedRecords = 0;
  let deactivatedHabits = 0;
  const canonicalNames = new Set([
    ...workspace.tasks.map((task) => canonicalTitle(task.title)).filter(Boolean),
    ...workspace.habits.map((habit) => canonicalTitle(habit.name)).filter(Boolean)
  ]);

  for (const name of canonicalNames) {
    const taskCandidates = workspace.tasks.filter((task) => canonicalTitle(task.title) === name);
    const habitCandidates = workspace.habits.filter((habit) => canonicalTitle(habit.name) === name);
    let target = taskCandidates.find((task) => normalizeTitle(task.title) === normalizeTitle(name)) || taskCandidates[0];

    if (!target) {
      target = await tx.workspaceTask.create({
        data: {
          workspaceId: workspace.id,
          title: name,
          description: habitCandidates[0]?.description,
          type: "DAILY",
          priority: "MEDIUM",
          urgency: "MEDIUM",
          quadrant: "IMPORTANT_NOT_URGENT"
        },
        include: { dailyRecords: true, children: true }
      });
    }

    const existingRecords = new Map(target.dailyRecords.map((record) => [
      record.recordDate.toISOString().slice(0, 10),
      record
    ]));

    for (const task of taskCandidates) {
      if (task.id === target.id) continue;
      for (const record of task.dailyRecords) {
        await mergeRecord(tx, target.id, record, existingRecords);
        migratedRecords += 1;
      }
      await tx.workspaceTask.updateMany({
        where: { parentId: task.id, archivedAt: null },
        data: { parentId: target.id }
      });
      await tx.workspaceTask.update({
        where: { id: task.id },
        data: { status: "ARCHIVED", archivedAt: now }
      });
      archivedTasks += 1;
    }

    for (const habit of habitCandidates) {
      for (const record of habit.records) {
        await mergeRecord(tx, target.id, {
          recordDate: record.recordDate,
          completed: record.completed,
          progress: record.completed ? 100 : 0
        }, existingRecords);
        migratedRecords += 1;
      }
    }

    await tx.workspaceTask.update({
      where: { id: target.id },
      data: {
        title: name,
        type: "DAILY",
        dueDate: null,
        description: target.description || habitCandidates[0]?.description || null
      }
    });
  }

  if (workspace.habits.length) {
    const result = await tx.workspaceHabit.updateMany({
      where: { workspaceId: workspace.id, isActive: true },
      data: { isActive: false }
    });
    deactivatedHabits = result.count;
  }

  const recordDate = toDate(dateKeyInShanghai());
  const parents = await tx.workspaceTask.findMany({
    where: { workspaceId: workspace.id, type: "DAILY", parentId: null, archivedAt: null },
    include: {
      dailyRecords: { where: { recordDate } },
      children: {
        where: { archivedAt: null },
        include: { dailyRecords: { where: { recordDate } } }
      }
    }
  });

  for (const parent of parents) {
    if (!parent.children.length) continue;
    for (const child of parent.children) {
      if (child.dailyRecords.length) continue;
      const completed = child.status === "DONE";
      await tx.workspaceTaskRecord.create({
        data: {
          taskId: child.id,
          recordDate,
          completed,
          progress: completed ? 100 : 0,
          completedAt: completed ? child.completedAt || now : null
        }
      });
    }

    const children = await tx.workspaceTask.findMany({
      where: { parentId: parent.id, archivedAt: null },
      include: { dailyRecords: { where: { recordDate } } }
    });
    const completedCount = children.filter((child) => child.dailyRecords[0]?.completed).length;
    const progress = Math.round((completedCount / children.length) * 100);
    const completed = completedCount === children.length;
    await tx.workspaceTaskRecord.upsert({
      where: { taskId_recordDate: { taskId: parent.id, recordDate } },
      update: { completed, progress, completedAt: completed ? now : null },
      create: { taskId: parent.id, recordDate, completed, progress, completedAt: completed ? now : null }
    });
    await tx.workspaceTask.update({
      where: { id: parent.id },
      data: {
        progress,
        status: completed ? "DONE" : progress > 0 ? "IN_PROGRESS" : "TODO",
        completedAt: completed ? now : null
      }
    });
  }

  await tx.workspaceTaskRecord.updateMany({
    where: { task: { workspaceId: workspace.id }, progress: 100 },
    data: { completed: true }
  });

  return { archivedTasks, migratedRecords, deactivatedHabits };
}

try {
  const workspaces = await prisma.workspace.findMany({
    include: {
      tasks: {
        where: { parentId: null, archivedAt: null, type: "DAILY" },
        include: { dailyRecords: true, children: true },
        orderBy: { createdAt: "asc" }
      },
      habits: {
        where: { isActive: true },
        include: { records: true },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  const totals = { archivedTasks: 0, migratedRecords: 0, deactivatedHabits: 0 };
  for (const workspace of workspaces) {
    const result = await prisma.$transaction(
      (tx) => consolidateWorkspace(tx, workspace),
      { timeout: 30000 }
    );
    totals.archivedTasks += result.archivedTasks;
    totals.migratedRecords += result.migratedRecords;
    totals.deactivatedHabits += result.deactivatedHabits;
  }

  console.log(`Consolidated ${workspaces.length} workspace(s).`);
  console.log(`Archived duplicate tasks: ${totals.archivedTasks}`);
  console.log(`Migrated daily records: ${totals.migratedRecords}`);
  console.log(`Deactivated habits: ${totals.deactivatedHabits}`);
} finally {
  await prisma.$disconnect();
}
