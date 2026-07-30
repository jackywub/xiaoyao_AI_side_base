import Image from "next/image";

export function AvatarMark({ compact = false, image = "/xiaoyao-avatar-optimized.jpg", label = "AI 副业 · 成长陪跑" }: { compact?: boolean; image?: string; label?: string }) {
  return (
    <div className={compact ? "relative mx-auto grid min-h-[18rem] w-full place-items-center lg:min-h-[28rem]" : "relative mx-auto grid min-h-[22rem] w-full place-items-center sm:min-h-[28rem]"}>
      <div className={compact ? "absolute size-[16rem] rounded-full border-[22px] border-primary/10 lg:size-[25rem] lg:border-[28px]" : "absolute size-[20rem] rounded-full border-[28px] border-primary/10 sm:size-[25rem]"} />
      <div
        className={compact ? "relative z-10 aspect-square w-full max-w-[17rem] animate-floatY rounded-full border border-accent/20 p-2 shadow-soft lg:max-w-[22rem]" : "relative z-10 aspect-square w-full max-w-[22rem] animate-floatY rounded-full border border-accent/20 p-2 shadow-soft"}
        style={{ background: "hsl(var(--primary) / 0.16)" }}
      >
        <div className="relative h-full overflow-hidden rounded-full border-[7px] border-background bg-background">
          <Image
            alt="萧小遥个人头像插画"
            className="h-full w-full object-cover"
            height={900}
            priority
            sizes="(max-width: 640px) 84vw, (max-width: 1024px) 352px, 360px"
            src={image}
            unoptimized={image.startsWith("/api/media/")}
            width={900}
          />
        </div>
      </div>
      <div className={compact ? "absolute bottom-2 right-2 z-20 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-primary shadow-line lg:bottom-8 lg:right-4" : "absolute bottom-8 right-4 z-20 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-primary shadow-line"}>
        {label}
      </div>
    </div>
  );
}
