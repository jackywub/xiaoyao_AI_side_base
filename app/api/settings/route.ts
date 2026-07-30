import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { isSameOrigin } from "@/lib/request-security";
import {
  changeWorkspacePassword,
  readWorkspaceSettings,
  removeExternalConnection,
  resetWorkspacePassword,
  saveExternalConnection,
  updateWorkspaceProfile
} from "@/lib/settings-storage";
import {
  readEnum,
  readOptionalString,
  readString,
  WorkspaceInputError
} from "@/lib/workspace-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "请先登录。" }, { status: 401 });
}

function readOptionalValue(value: unknown, label: string, max: number) {
  return readOptionalString(value, label, max) || "";
}

function validateEmail(value: string) {
  if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new WorkspaceInputError("邮箱格式不正确。");
  }
}

function validatePassword(value: string) {
  if (value.length < 12 || value.length > 200 || !/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    throw new WorkspaceInputError("新密码至少 12 位，并同时包含字母和数字。");
  }
}

function validateEndpoint(provider: "WEREAD" | "OBSIDIAN" | "IMA", value: string) {
  let endpoint: URL;
  try {
    endpoint = new URL(value);
  } catch {
    throw new WorkspaceInputError("连接地址格式不正确。");
  }
  const allowedProtocols = provider === "OBSIDIAN" ? ["https:", "obsidian:"] : ["https:"];
  if (process.env.NODE_ENV !== "production") allowedProtocols.push("http:");
  if (!allowedProtocols.includes(endpoint.protocol)) {
    throw new WorkspaceInputError("连接地址必须使用受支持的安全协议。");
  }
}

function errorResponse(error: unknown) {
  if (error instanceof WorkspaceInputError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return NextResponse.json({ error: "该邮箱已被其他账号使用。" }, { status: 409 });
  }
  console.error("Settings request failed", error);
  return NextResponse.json({ error: "设置暂时无法保存，请稍后重试。" }, { status: 500 });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  try {
    return NextResponse.json(await readWorkspaceSettings(user.id), {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "请求来源无效。" }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  try {
    const body = await request.json() as Record<string, unknown>;
    const action = readString(body.action, "操作类型", 50);
    const input = body.input && typeof body.input === "object"
      ? body.input as Record<string, unknown>
      : {};

    if (action === "updateProfile") {
      const email = readOptionalValue(input.email, "邮箱", 191);
      validateEmail(email);
      await updateWorkspaceProfile(user.id, {
        displayName: readString(input.displayName, "名称", 100),
        wechat: readOptionalValue(input.wechat, "微信号", 100),
        email,
        phone: readOptionalValue(input.phone, "电话号码", 50)
      });
    } else if (action === "changePassword") {
      const currentPassword = readString(input.currentPassword, "当前密码", 200);
      const nextPassword = readString(input.nextPassword, "新密码", 200);
      validatePassword(nextPassword);
      await changeWorkspacePassword(user.id, user.sessionId, currentPassword, nextPassword);
    } else if (action === "resetPassword") {
      const currentPassword = readString(input.currentPassword, "当前密码", 200);
      const temporaryPassword = await resetWorkspacePassword(user.id, currentPassword);
      return NextResponse.json({ temporaryPassword, requiresLogin: true });
    } else if (action === "saveConnection") {
      const provider = readEnum(input.provider, "外部服务", ["WEREAD", "OBSIDIAN", "IMA"] as const);
      const endpoint = provider === "OBSIDIAN"
        ? readOptionalValue(input.endpoint, "连接地址", 1000)
        : readString(input.endpoint, "连接地址", 1000);
      if (endpoint) validateEndpoint(provider, endpoint);
      await saveExternalConnection(user.id, {
        provider,
        endpoint,
        apiKey: readOptionalString(input.apiKey, "API Key", 2000),
        directory: provider === "OBSIDIAN"
          ? readString(input.directory, "Obsidian 保存目录", 2000)
          : undefined
      });
    } else if (action === "removeConnection") {
      await removeExternalConnection(
        user.id,
        readEnum(input.provider, "外部服务", ["WEREAD", "OBSIDIAN", "IMA"] as const)
      );
    } else {
      throw new WorkspaceInputError("不支持的设置操作。");
    }

    return NextResponse.json(await readWorkspaceSettings(user.id));
  } catch (error) {
    return errorResponse(error);
  }
}
