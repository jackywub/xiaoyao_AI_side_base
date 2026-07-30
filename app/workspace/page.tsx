import type { Metadata } from "next";

import { WorkspaceApp } from "@/components/workspace/workspace-app";
import { requireUser } from "@/lib/auth";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "成长工作台",
    description: "萧小遥的个人成长工作台，统一管理任务、习惯、副业账本、阅读、运动、学习、灵感和每日复盘。",
    path: "/workspace"
  }),
  robots: { index: false, follow: false }
};

export default async function WorkspacePage() {
  const user = await requireUser("/workspace");
  return <WorkspaceApp avatarUrl={user.avatarUrl} displayName={user.displayName} />;
}
