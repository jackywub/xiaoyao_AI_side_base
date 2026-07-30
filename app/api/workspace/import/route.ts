import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { isSameOrigin } from "@/lib/request-security";
import { importWorkspaceData, readWorkspaceData } from "@/lib/workspace-storage";
import { parseWorkspaceData, WorkspaceInputError } from "@/lib/workspace-validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "请求来源无效。" }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    const data = parseWorkspaceData(body.data);
    await importWorkspaceData(user.id, data);
    return NextResponse.json(await readWorkspaceData(user.id));
  } catch (error) {
    if (error instanceof WorkspaceInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Workspace import failed", error);
    return NextResponse.json({ error: "本地数据导入失败，数据库没有被覆盖。" }, { status: 500 });
  }
}
