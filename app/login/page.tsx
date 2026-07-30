import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "登录成长工作台",
    description: "登录萧小遥的个人成长工作台。",
    path: "/login"
  }),
  robots: { index: false, follow: false }
};

function safeNextPath(value: string | string[] | undefined) {
  const path = Array.isArray(value) ? value[0] : value;
  return path?.startsWith("/") && !path.startsWith("//") ? path : "/workspace";
}

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  if (await getCurrentUser()) redirect("/workspace");
  const nextPath = safeNextPath((await searchParams).next);

  return (
    <section className="container-shell grid min-h-[calc(100svh-4.5rem)] place-items-center py-10 sm:py-16">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-soft sm:p-8">
        <div className="mb-7 text-center">
          <Image
            alt="萧小遥"
            className="mx-auto size-20 rounded-full border-4 border-primary/15 object-cover"
            height={160}
            priority
            src="/xiaoyao-avatar-optimized.jpg"
            width={160}
          />
          <h1 className="mt-5 text-2xl font-bold">登录成长工作台</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            你的任务、习惯和成长记录将安全保存在 MySQL 中。
          </p>
        </div>
        <LoginForm nextPath={nextPath} />
      </div>
    </section>
  );
}
