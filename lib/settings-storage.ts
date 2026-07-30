import "server-only";

import { randomBytes } from "node:crypto";
import { homedir } from "node:os";
import path from "node:path";

import bcrypt from "bcryptjs";
import type { ExternalProvider } from "@prisma/client";

import { getPrisma } from "@/lib/prisma";
import {
  decryptConnectionConfig,
  encryptConnectionConfig,
  type ExternalConnectionConfig
} from "@/lib/settings-crypto";
import { WorkspaceInputError } from "@/lib/workspace-validation";

const settingKeys = [
  "site.owner",
  "contact.wechat",
  "contact.email",
  "contact.phone",
  "contact.wechatQr"
];

async function getOrCreateWorkspaceId(userId: string) {
  const prisma = getPrisma();
  const workspace = await prisma.workspace.upsert({
    where: { ownerId: userId },
    update: {},
    create: { ownerId: userId }
  });
  return workspace.id;
}

export async function readWorkspaceSettings(userId: string) {
  const prisma = getPrisma();
  const workspaceId = await getOrCreateWorkspaceId(userId);
  const [user, settings, connections] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.siteSetting.findMany({ where: { settingKey: { in: settingKeys } } }),
    prisma.externalConnection.findMany({
      where: { workspaceId },
      orderBy: { provider: "asc" }
    })
  ]);
  const values = new Map(settings.map((setting) => [setting.settingKey, setting.settingValue]));

  return {
    profile: {
      displayName: user.displayName,
      avatarUrl: user.avatarUrl || "/xiaoyao-avatar-optimized.jpg",
      wechat: values.get("contact.wechat") || "",
      email: user.email || values.get("contact.email") || "",
      phone: values.get("contact.phone") || "",
      wechatQrUrl: values.get("contact.wechatQr") || "/wechat-qr.jpg"
    },
    connections: connections.map((connection) => {
      let config: ExternalConnectionConfig = { endpoint: "" };
      let configurationError = false;
      if (connection.encryptedConfig) {
        try {
          config = decryptConnectionConfig(connection.encryptedConfig);
        } catch {
          configurationError = true;
        }
      }
      const apiKey = config.apiKey || "";
      return {
        provider: connection.provider,
        status: configurationError ? "ERROR" as const : connection.status,
        endpoint: config.endpoint || "",
        directory: config.directory || "",
        hasApiKey: Boolean(apiKey),
        apiKeyHint: apiKey ? `••••${apiKey.slice(-4)}` : "",
        updatedAt: connection.updatedAt.toISOString()
      };
    })
  };
}

export async function updateWorkspaceProfile(
  userId: string,
  input: { displayName: string; wechat: string; email: string; phone: string }
) {
  const prisma = getPrisma();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { displayName: input.displayName, email: input.email || null }
    }),
    prisma.siteSetting.upsert({
      where: { settingKey: "site.owner" },
      update: { settingValue: input.displayName, label: "个人 IP 名称", isPublic: true },
      create: { settingKey: "site.owner", settingValue: input.displayName, label: "个人 IP 名称", group: "site", isPublic: true }
    }),
    prisma.siteSetting.upsert({
      where: { settingKey: "contact.wechat" },
      update: { settingValue: input.wechat, label: "微信号", isPublic: true },
      create: { settingKey: "contact.wechat", settingValue: input.wechat, label: "微信号", group: "contact", isPublic: true }
    }),
    prisma.siteSetting.upsert({
      where: { settingKey: "contact.email" },
      update: { settingValue: input.email, label: "联系邮箱", isPublic: true },
      create: { settingKey: "contact.email", settingValue: input.email, label: "联系邮箱", group: "contact", isPublic: true }
    }),
    prisma.siteSetting.upsert({
      where: { settingKey: "contact.phone" },
      update: { settingValue: input.phone, label: "联系电话", isPublic: true },
      create: { settingKey: "contact.phone", settingValue: input.phone, label: "联系电话", group: "contact", isPublic: true }
    })
  ]);
}

export async function saveExternalConnection(
  userId: string,
  input: { provider: ExternalProvider; endpoint: string; apiKey?: string; directory?: string }
) {
  const prisma = getPrisma();
  const workspaceId = await getOrCreateWorkspaceId(userId);
  const existing = await prisma.externalConnection.findUnique({
    where: { workspaceId_provider: { workspaceId, provider: input.provider } }
  });

  let previousApiKey = "";
  let previousDirectory = "";
  if (existing?.encryptedConfig) {
    try {
      const previousConfig = decryptConnectionConfig(existing.encryptedConfig);
      previousApiKey = previousConfig.apiKey || "";
      previousDirectory = previousConfig.directory || "";
    } catch {
      previousApiKey = "";
    }
  }

  const encryptedConfig = encryptConnectionConfig({
    endpoint: input.endpoint,
    apiKey: input.apiKey || previousApiKey || undefined,
    directory: input.provider === "OBSIDIAN"
      ? normalizeObsidianDirectory(input.directory || previousDirectory)
      : undefined
  });
  await prisma.externalConnection.upsert({
    where: { workspaceId_provider: { workspaceId, provider: input.provider } },
    update: {
      encryptedConfig,
      status: "CONNECTED",
      lastError: null
    },
    create: {
      workspaceId,
      provider: input.provider,
      encryptedConfig,
      status: "CONNECTED"
    }
  });
}

function normalizeObsidianDirectory(value: string) {
  const trimmed = value.trim();
  if (!trimmed) throw new WorkspaceInputError("请设置 Obsidian 复盘保存目录。");
  const expanded = trimmed === "~"
    ? homedir()
    : trimmed.startsWith("~/") ? path.join(homedir(), trimmed.slice(2)) : trimmed;
  if (!path.isAbsolute(expanded)) {
    throw new WorkspaceInputError("Obsidian 保存目录必须是服务器上的绝对路径。");
  }
  return path.normalize(expanded);
}

export async function readObsidianReviewConnection(userId: string) {
  const workspaceId = await getOrCreateWorkspaceId(userId);
  const connection = await getPrisma().externalConnection.findUnique({
    where: { workspaceId_provider: { workspaceId, provider: "OBSIDIAN" } }
  });
  if (!connection?.encryptedConfig || connection.status !== "CONNECTED") {
    throw new WorkspaceInputError("请先在设置的外部连接中配置 Obsidian 复盘保存目录。");
  }
  try {
    const config = decryptConnectionConfig(connection.encryptedConfig);
    return {
      connectionId: connection.id,
      directory: normalizeObsidianDirectory(config.directory || "")
    };
  } catch (error) {
    if (error instanceof WorkspaceInputError) throw error;
    throw new WorkspaceInputError("Obsidian 连接配置无法读取，请重新保存设置。");
  }
}

export async function removeExternalConnection(userId: string, provider: ExternalProvider) {
  const workspaceId = await getOrCreateWorkspaceId(userId);
  await getPrisma().externalConnection.deleteMany({ where: { workspaceId, provider } });
}

async function verifyCurrentPassword(userId: string, currentPassword: string) {
  const user = await getPrisma().user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new WorkspaceInputError("当前密码不正确。");
  }
}

export async function changeWorkspacePassword(
  userId: string,
  currentSessionId: string,
  currentPassword: string,
  nextPassword: string
) {
  await verifyCurrentPassword(userId, currentPassword);
  const passwordHash = await bcrypt.hash(nextPassword, 12);
  const prisma = getPrisma();
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.userSession.deleteMany({
      where: { userId, id: { not: currentSessionId } }
    })
  ]);
}

export async function resetWorkspacePassword(userId: string, currentPassword: string) {
  await verifyCurrentPassword(userId, currentPassword);
  const temporaryPassword = `Xy!${randomBytes(15).toString("base64url")}`;
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  const prisma = getPrisma();
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.userSession.deleteMany({ where: { userId } })
  ]);
  return temporaryPassword;
}
