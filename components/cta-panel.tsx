import Image from "next/image";

import { readPublicSiteProfile } from "@/lib/site-content-storage";

type CtaPanelProps = {
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
};

export async function CtaPanel({ title }: CtaPanelProps) {
  const profile = await readPublicSiteProfile();
  const qrUrl = profile.wechatQrUrl || "/wechat-qr.jpg";

  return (
    <section aria-label={title} className="container-shell pb-16 pt-4 sm:pb-20 sm:pt-6">
      <div className="overflow-hidden rounded-lg bg-[#082f57] text-white shadow-[0_24px_70px_hsl(var(--foreground)/0.16)]">
        <div className="relative grid gap-10 px-6 py-10 sm:px-10 sm:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.38fr)] lg:items-center lg:px-16 lg:py-20">
          <span className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(90deg,#fff_1px,transparent_1px),linear-gradient(#fff_1px,transparent_1px)] [background-size:36px_36px]" />
          <span className="pointer-events-none absolute -left-24 bottom-0 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl" />
          <span className="pointer-events-none absolute -right-20 top-0 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />

          <div className="relative max-w-4xl">
            <h2 className="font-display max-w-5xl text-[clamp(2rem,3.2vw,4rem)] font-semibold leading-[1.15] tracking-[0.02em] text-white" aria-label={title}>
              想找到更适合自己的 AI 副业和成长路径吗？
            </h2>
            <p className="mt-8 max-w-5xl text-[clamp(1.05rem,1.55vw,1.85rem)] font-medium leading-relaxed text-white/72">
              你可以先从一个真实问题开始：工具不会用、方向不清楚，或者只是想做一次阶段复盘。
            </p>
          </div>

          <div className="relative rounded-xl border border-white/24 bg-white/[0.08] p-6 shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] backdrop-blur-sm sm:p-8">
            <p className="text-base font-bold text-white/76 sm:text-lg">微信扫码咨询</p>
            <div className="mx-auto mt-6 grid w-full max-w-[14rem] place-items-center rounded-lg bg-white p-3 shadow-soft">
              <Image
                alt="微信扫码咨询二维码"
                className="h-auto w-full rounded-md"
                height={320}
                src={qrUrl}
                unoptimized={qrUrl.startsWith("/api/media/")}
                width={320}
              />
            </div>
            <p className="mt-6 text-sm font-semibold text-white/72 sm:text-base">
              添加时备注：副业基地
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
