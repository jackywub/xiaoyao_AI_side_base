"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { navItems, siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname.startsWith(href);
}

export function Header() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/80 bg-surface/95 shadow-line backdrop-blur-xl">
      <div className="container-shell flex h-[4.5rem] items-center justify-between gap-4">
        <Link className="group flex items-center gap-3" href="/">
          <span className="relative size-11 shrink-0 overflow-hidden rounded-full border border-primary/20 bg-primary/10 p-0.5 shadow-line transition duration-200 group-hover:-translate-y-0.5">
            <Image alt="萧小遥个人头像" className="rounded-full object-cover" fill priority sizes="44px" src="/xiaoyao-avatar-optimized.jpg" />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-base font-semibold sm:text-lg">
              {siteConfig.name}
            </span>
            <span className="hidden text-xs text-muted-foreground sm:block">
              AI 副业 · 天赋数字 · 个人成长
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-4 xl:flex">
          {navItems.map((item) => (
            <Link
              className="ink-link text-sm"
              data-active={isActivePath(pathname, item.href)}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? "关闭导航菜单" : "打开导航菜单"}
            className="icon-button xl:hidden"
            title={isMenuOpen ? "关闭菜单" : "打开菜单"}
            type="button"
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            {isMenuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "border-t border-border/70 bg-surface/98 px-5 py-4 backdrop-blur-xl xl:hidden",
          isMenuOpen ? "block" : "hidden"
        )}
      >
        <nav className="mx-auto grid max-w-7xl gap-2 sm:grid-cols-2">
          {navItems.map((item) => (
            <Link
              className={cn(
                "flex min-h-12 items-center gap-2 rounded-lg border px-4 py-3 text-sm transition",
                isActivePath(pathname, item.href)
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-border/70 bg-surface/70 text-foreground hover:border-primary/50 hover:text-primary"
              )}
              href={item.href}
              key={item.href}
              onClick={() => setIsMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
