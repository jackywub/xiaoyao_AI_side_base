"use client";

import { Copy, QrCode } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export function WechatCard({ wechat, qrUrl }: { wechat: string; qrUrl: string }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle"
  );

  async function copyWechat() {
    try {
      await navigator.clipboard.writeText(wechat);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }

    window.setTimeout(() => setCopyState("idle"), 2200);
  }

  return (
    <div className="soft-card mx-auto max-w-sm p-6 text-center">
      <div className="mx-auto mb-4 inline-flex size-12 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
        <QrCode size={22} />
      </div>
      <div className="mx-auto max-w-[17rem] overflow-hidden rounded-lg border-[10px] border-white bg-white shadow-line sm:max-w-[18rem]">
        <Image
          alt="萧小遥微信二维码"
          className="aspect-square h-auto w-full object-contain"
          height={460}
          loading="lazy"
          sizes="(max-width: 640px) 272px, 288px"
          src={qrUrl}
          unoptimized={qrUrl.startsWith("/api/media/")}
          width={460}
        />
      </div>
      <p className="mt-5 font-display text-2xl font-semibold">微信号</p>
      <p className="mt-1 text-lg font-bold text-primary">{wechat}</p>
      <p className="mt-3 leading-7 text-muted-foreground">
        扫码添加微信，备注：个人网站
      </p>
      <button
        className="focus-ring mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border/80 bg-surface/80 px-6 py-3 text-sm font-semibold text-foreground transition hover:-translate-y-0.5 hover:border-primary/60 hover:text-primary"
        type="button"
        onClick={copyWechat}
      >
        <Copy size={16} />
        {copyState === "copied"
          ? "已复制"
          : copyState === "failed"
            ? "请手动复制"
            : "复制微信号"}
      </button>
    </div>
  );
}
