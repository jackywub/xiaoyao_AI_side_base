import Image from "next/image";
import Link from "next/link";

import { navItems, siteConfig } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-border/80 bg-surface/[0.84] backdrop-blur-md">
      <div className="container-shell grid gap-8 py-10 md:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <span className="relative size-11 shrink-0 overflow-hidden rounded-full border border-primary/20 bg-primary/10 p-0.5 shadow-line">
              <Image alt="萧小遥个人头像" className="rounded-full object-cover" fill sizes="44px" src="/xiaoyao-avatar-optimized.jpg" />
            </span>
            <p className="font-display text-xl font-semibold">{siteConfig.name}</p>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
            分享 AI 工具实战、AI 副业项目与天赋数字咨询，也用成长工作台把阅读、任务、习惯和复盘落实到日常。
          </p>
          <p className="mt-3 text-sm text-muted-foreground">微信：{siteConfig.wechat} · 邮箱：{siteConfig.email}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:justify-self-end md:min-w-80">
          {navItems.map((item) => (
            <Link
              className="text-sm text-muted-foreground transition hover:text-primary"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="border-t border-border/70 bg-surface-strong/45 py-4 text-center text-xs text-muted-foreground">
        © 2026 {siteConfig.owner}. AI 副业探索者 · 天赋数字咨询师 · 普通人成长陪跑者
      </div>
    </footer>
  );
}
