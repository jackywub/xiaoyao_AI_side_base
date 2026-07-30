import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { parseHermesChat, parseHermesStatus, runHermes } from "@/lib/hermes";
import { getPrisma } from "@/lib/prisma";
import { isSameOrigin } from "@/lib/request-security";
import { readWorkspaceData } from "@/lib/workspace-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function conversationFor(workspaceId: string) {
  const prisma = getPrisma();
  const existing = await prisma.aiConversation.findFirst({
    where: { workspaceId },
    orderBy: { updatedAt: "desc" }
  });
  return existing || prisma.aiConversation.create({
    data: { workspaceId, title: "成长助手", provider: "Hermes" }
  });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  const prisma = getPrisma();
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { ownerId: user.id } });
  const conversation = await conversationFor(workspace.id);
  const [messages, status] = await Promise.all([
    prisma.aiMessage.findMany({ where: { conversationId: conversation.id }, orderBy: { createdAt: "asc" }, take: 80 }),
    runHermes(["status"], 30000)
  ]);
  const statusInfo = parseHermesStatus(status.stdout || status.stderr);
  return NextResponse.json({
    available: status.ok,
    currentModel: statusInfo.currentModel || conversation.model || "",
    provider: statusInfo.provider || conversation.provider || "Hermes",
    messages: messages.map((message) => ({ id: message.id, role: message.role.toLowerCase(), content: message.content, createdAt: message.createdAt.toISOString() }))
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "请求来源无效。" }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  const body = await request.json() as Record<string, unknown>;
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const model = typeof body.model === "string" ? body.model.trim() : "";
  if (!prompt || prompt.length > 8000) return NextResponse.json({ error: "请输入 1 至 8000 字的内容。" }, { status: 400 });
  if (model && !/^[A-Za-z0-9._/-]{1,120}$/.test(model)) return NextResponse.json({ error: "模型名称格式不正确。" }, { status: 400 });

  const prisma = getPrisma();
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { ownerId: user.id } });
  const conversation = await conversationFor(workspace.id);
  const workspaceData = await readWorkspaceData(user.id);
  const context = {
    tasks: workspaceData.data.tasks.filter((task) => !task.completed).slice(0, 12).map((task) => ({ title: task.title, progress: task.progress, targetDate: task.targetDate })),
    projects: workspaceData.data.projects.slice(0, 8).map((project) => ({ name: project.name, stage: project.stage, progress: project.progress, nextAction: project.nextAction })),
    habits: workspaceData.data.habits.map((habit) => ({ label: habit.label, streak: habit.streak, completed: habit.completed }))
  };
  await prisma.aiMessage.create({ data: { conversationId: conversation.id, role: "USER", content: prompt, model: model || null } });
  const args = [
    "chat", "--query",
    `你是萧小遥的成长工作台助手。请基于下面的当前工作台摘要，给出简洁、可执行的回答。\n\n工作台摘要：${JSON.stringify(context)}\n\n用户问题：${prompt}`,
    "--quiet", "--source", "xiaoyao-personal-website", "--max-turns", "20"
  ];
  if (conversation.externalSessionId) args.push("--resume", conversation.externalSessionId);
  if (model) args.push("--model", model);
  let result = await runHermes(args);
  if (!result.ok && conversation.externalSessionId && /No session found|not found matching/i.test(`${result.stdout}\n${result.stderr}`)) {
    const resumeIndex = args.indexOf("--resume");
    args.splice(resumeIndex, 2);
    result = await runHermes(args);
  }
  if (!result.ok) return NextResponse.json({ error: result.stderr || "Hermes 暂时不可用。" }, { status: 502 });
  const parsed = parseHermesChat(result.stdout || result.stderr);
  const message = await prisma.aiMessage.create({
    data: { conversationId: conversation.id, role: "ASSISTANT", content: parsed.content || "已完成处理。", model: model || conversation.model }
  });
  await prisma.aiConversation.update({
    where: { id: conversation.id },
    data: { externalSessionId: parsed.sessionId || conversation.externalSessionId, model: model || conversation.model, provider: "Hermes" }
  });
  return NextResponse.json({ message: { id: message.id, role: "assistant", content: message.content, createdAt: message.createdAt.toISOString() } });
}
