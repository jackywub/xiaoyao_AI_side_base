import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import {
  createSession,
  SESSION_COOKIE_NAME,
  sessionCookieOptions
} from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { getClientIp, isSameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

const DUMMY_PASSWORD_HASH = "$2b$12$ucInv3A60QfPFCeiE6WNiOg7A1bV5bux/YjL1/dTqIZCfB6eq6YOe";
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

type LoginAttempt = { count: number; resetAt: number };
const globalForLogin = globalThis as unknown as { loginAttempts?: Map<string, LoginAttempt> };
const loginAttempts = globalForLogin.loginAttempts || new Map<string, LoginAttempt>();
globalForLogin.loginAttempts = loginAttempts;

function canAttemptLogin(ip: string) {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);
  if (!attempt || attempt.resetAt <= now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  attempt.count += 1;
  return attempt.count <= MAX_ATTEMPTS;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "请求来源无效。" }, { status: 403 });
  }

  const ip = getClientIp(request);
  if (!canAttemptLogin(ip)) {
    return NextResponse.json({ error: "登录尝试过于频繁，请稍后再试。" }, { status: 429 });
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || username.length > 191 || password.length < 8 || password.length > 200) {
      return NextResponse.json({ error: "用户名或密码不正确。" }, { status: 401 });
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { username } });
    const passwordMatches = await bcrypt.compare(
      password,
      user?.passwordHash || DUMMY_PASSWORD_HASH
    );

    if (!user || !user.isActive || !passwordMatches) {
      return NextResponse.json({ error: "用户名或密码不正确。" }, { status: 401 });
    }

    loginAttempts.delete(ip);
    await prisma.userSession.deleteMany({
      where: { userId: user.id, expiresAt: { lte: new Date() } }
    });
    const session = await createSession(user.id);
    const response = NextResponse.json({
      user: {
        username: user.username,
        displayName: user.displayName
      }
    });
    response.cookies.set(
      SESSION_COOKIE_NAME,
      session.token,
      sessionCookieOptions(session.expiresAt)
    );
    return response;
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ error: "登录服务暂时不可用。" }, { status: 500 });
  }
}
