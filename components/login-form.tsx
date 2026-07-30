"use client";

import { ArrowRight, LoaderCircle, LockKeyhole, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setError(result.error || "登录失败，请稍后重试。");
        return;
      }
      router.replace(nextPath);
      router.refresh();
    } catch {
      setError("无法连接登录服务，请检查网络后重试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <label>
        <span className="workspace-label">用户名</span>
        <span className="relative block">
          <UserRound className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            autoComplete="username"
            className="workspace-control pl-11"
            maxLength={191}
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </span>
      </label>
      <label>
        <span className="workspace-label">密码</span>
        <span className="relative block">
          <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            autoComplete="current-password"
            className="workspace-control pl-11"
            maxLength={200}
            minLength={8}
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </span>
      </label>

      {error ? (
        <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      <button className="primary-button w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? <LoaderCircle className="animate-spin" size={18} /> : <ArrowRight size={18} />}
        {isSubmitting ? "正在登录" : "进入成长工作台"}
      </button>
    </form>
  );
}
