import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getPrisma } from "@/lib/prisma";

export const SESSION_COOKIE_NAME = "xiaoyao_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type SessionUser = {
  id: string;
  sessionId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: "ADMIN" | "EDITOR";
};

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires
  };
}

export async function createSession(userId: string) {
  const prisma = getPrisma();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await prisma.userSession.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId,
      expiresAt
    }
  });

  return { token, expiresAt };
}

export async function deleteSession(token: string | undefined) {
  if (!token) return;

  await getPrisma().userSession.deleteMany({
    where: { tokenHash: hashSessionToken(token) }
  });
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const prisma = getPrisma();
  const session = await prisma.userSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: true }
  });

  if (!session || session.expiresAt <= new Date() || !session.user.isActive) {
    if (session) {
      await prisma.userSession.delete({ where: { id: session.id } });
    }
    return null;
  }

  if (session.lastSeenAt.getTime() < Date.now() - 24 * 60 * 60 * 1000) {
    await prisma.userSession.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() }
    });
  }

  return {
    id: session.user.id,
    sessionId: session.id,
    username: session.user.username,
    displayName: session.user.displayName,
    avatarUrl: session.user.avatarUrl,
    role: session.user.role
  };
}

export async function requireUser(returnTo = "/workspace") {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }
  return user;
}
