"use client";

import { MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export function WechatHoverButton({ wechat = "yao899030", qrUrl = "/wechat-qr.jpg" }: { wechat?: string; qrUrl?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span
      className="group relative inline-flex"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
      }}
      onFocus={() => setIsOpen(true)}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <Link aria-describedby="hero-wechat-popover" className="primary-button" href="/contact">
        <MessageCircle size={17} /> 联系我
      </Link>
      <span
        aria-hidden={!isOpen}
        className={`pointer-events-none absolute bottom-[calc(100%+0.75rem)] left-1/2 z-30 w-52 -translate-x-1/2 rounded-lg border border-border bg-surface p-3 text-center shadow-soft transition duration-200 ${
          isOpen ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
        id="hero-wechat-popover"
        role="tooltip"
      >
        <Image alt="萧小遥微信二维码" className="mx-auto aspect-square w-full rounded-md object-cover" height={184} src={qrUrl} unoptimized={qrUrl.startsWith("/api/media/")} width={184} />
        <strong className="mt-2 block text-sm">微信：{wechat}</strong>
        <span className="mt-1 block text-xs text-muted-foreground">扫码添加，备注来意</span>
      </span>
    </span>
  );
}
