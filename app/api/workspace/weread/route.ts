import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { isSameOrigin } from "@/lib/request-security";
import { readWeReadLibrary, syncWeRead } from "@/lib/weread-sync";
import { WorkspaceInputError } from "@/lib/workspace-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "请先登录。" }, { status: 401 });
}

function errorResponse(error: unknown) {
  if (error instanceof WorkspaceInputError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  console.error("WeRead sync failed", error);
  return NextResponse.json({ error: "微信读书同步失败，请稍后重试。" }, { status: 500 });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  try {
    return NextResponse.json(await readWeReadLibrary(user.id), {
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
    return NextResponse.json(await syncWeRead(user.id));
  } catch (error) {
    return errorResponse(error);
  }
}
