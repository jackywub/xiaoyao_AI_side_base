import { ArrowDownRight, BookOpen, Compass, Fingerprint, Gauge, Map, Route, Sparkles, Sprout } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";

import { CtaPanel } from "@/components/cta-panel";
import { SectionHeading } from "@/components/section-heading";
import { TalentAccordion } from "@/components/talent-accordion";
import { TalentNumberGenerator } from "@/components/talent-number-generator";
import { createPageMetadata } from "@/lib/metadata";
import { managedSection } from "@/lib/site-content";
import { readManagedPage } from "@/lib/site-content-storage";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const page = await readManagedPage("talent-number");
  return createPageMetadata({ title: page.seoTitle, description: page.seoDescription, path: page.path });
}

const numberNodes = [
  "left-1/2 top-[4%] -translate-x-1/2",
  "right-[22%] top-[12%]",
  "right-[6%] top-[32%]",
  "bottom-[32%] right-[6%]",
  "bottom-[12%] right-[22%]",
  "bottom-[4%] left-1/2 -translate-x-1/2",
  "bottom-[12%] left-[22%]",
  "bottom-[32%] left-[6%]",
  "left-[6%] top-[32%]"
];

const dimensionIcons = [Fingerprint, Gauge, Sprout, Route];
const originIcons = [BookOpen, Sparkles, Map];

export default async function TalentNumberPage() {
  const page = await readManagedPage("talent-number");
  const origin = managedSection(page, "origin");
  const lifeMap = managedSection(page, "life-map");
  const dimensions = managedSection(page, "dimensions");
  const navigation = managedSection(page, "navigation");
  const faq = managedSection(page, "faq");
  const consultation = managedSection(page, "consultation");
  return (
    <>
      <section className="relative overflow-hidden border-b border-border/70 py-16 sm:py-20 lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_42%,hsl(var(--gold)/0.14),transparent_28%),radial-gradient(circle_at_15%_15%,hsl(var(--primary)/0.1),transparent_25%)]" />
        <div className="container-shell relative grid items-center gap-12 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="max-w-3xl animate-fadeUp">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-primary">{page.hero.eyebrow}</p>
            <h1 className="font-display text-[clamp(2.6rem,5vw,4.8rem)] font-semibold leading-[1.16]">{page.hero.title}<span className="brush-title mt-2 block">{page.hero.accent}</span></h1>
            <p className="mt-7 max-w-2xl text-lg leading-9 text-muted-foreground">{page.hero.description}</p>
            <div className="mt-7 inline-flex items-center gap-3 rounded-full border border-gold/35 bg-surface/75 px-4 py-2 text-sm text-muted-foreground shadow-line backdrop-blur-sm"><Compass className="text-gold" size={18} /><span>用于自我观察，不用于预测命运</span></div>
          </div>
          <div aria-label="由数字一至九构成的生命地图" className="relative mx-auto aspect-square w-full max-w-[30rem] animate-fadeUp [animation-delay:140ms]">
            <div className="absolute inset-[8%] rounded-full border border-gold/35 bg-surface/35 shadow-[inset_0_0_80px_hsl(var(--gold)/0.08)] backdrop-blur-[2px]" />
            <div className="absolute inset-[20%] rounded-full border border-dashed border-primary/30" />
            <div className="absolute inset-[32%] grid place-items-center rounded-full border border-border bg-surface shadow-soft"><span className="font-display text-5xl text-primary">你</span><span className="mt-[-1.5rem] text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">The Navigator</span></div>
            {numberNodes.map((position, index) => <span aria-hidden="true" className={`absolute grid size-12 place-items-center rounded-full border border-border/80 bg-surface/90 font-display text-xl text-foreground shadow-line ${position}`} key={position}>{index + 1}</span>)}
          </div>
        </div>
      </section>

      <section className="section-padding"><div className="container-shell grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start"><div className="lg:sticky lg:top-28"><SectionHeading description={origin.description} eyebrow={origin.eyebrow} title={origin.title} /><blockquote className="mt-8 border-l-2 border-gold pl-5 font-display text-xl leading-9 text-foreground/80">“通往幸福人生之路，在于发展自我、追求真善美，并充分运用直觉。”<footer className="mt-3 font-sans text-xs uppercase tracking-[0.18em] text-muted-foreground">— 毕达哥拉斯</footer></blockquote></div><div className="relative grid gap-4 before:absolute before:bottom-8 before:left-6 before:top-8 before:w-px before:bg-border">{origin.items.map((item, index) => { const Icon = originIcons[index % originIcons.length]; return <article className="soft-card relative ml-5 p-6 sm:ml-8 sm:p-7" key={item.id}><span className="absolute -left-[2.8rem] top-7 grid size-10 place-items-center rounded-full border border-gold/40 bg-background text-gold shadow-line sm:-left-[3.3rem]"><Icon size={18} /></span><p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">0{index + 1}</p><h2 className="mt-2 font-display text-2xl font-semibold">{item.title}</h2><p className="mt-3 leading-8 text-muted-foreground">{item.text}</p></article>; })}</div></div></section>

      <section className="section-padding bg-surface/45"><div className="container-shell"><div className="grid overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-soft lg:grid-cols-[1.05fr_0.95fr]"><div className="relative min-h-[28rem]"><Image alt="咨询师与来访者一起梳理个人生命地图" className="object-cover" fill sizes="(max-width: 1024px) 100vw, 52vw" src="/assets/cards/service-talent.jpg" /><span className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" /><span className="absolute bottom-7 left-7 text-white"><span className="block text-xs font-bold uppercase tracking-[0.2em] text-white/65">{lifeMap.eyebrow}</span><span className="mt-2 block font-display text-3xl font-semibold">地图呈现地形，<br />你决定目的地。</span></span></div><div className="p-7 sm:p-10"><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{lifeMap.eyebrow}</p><h2 className="mt-3 font-display text-3xl font-semibold leading-snug sm:text-4xl">{lifeMap.title}</h2><p className="mt-4 leading-8 text-muted-foreground">{lifeMap.description}</p><div className="mt-8 grid gap-6">{lifeMap.items.map((item, index) => <div className="grid grid-cols-[2.5rem_1fr] gap-4" key={item.id}><span className="font-display text-2xl text-gold">0{index + 1}</span><div><h3 className="font-display text-xl font-semibold">{item.title}</h3><p className="mt-2 leading-7 text-muted-foreground">{item.text}</p></div></div>)}</div></div></div></div></section>

      <section className="section-padding"><div className="container-shell"><div className="grid overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-soft lg:grid-cols-[0.98fr_1.02fr]"><div className="p-7 sm:p-10"><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{dimensions.eyebrow}</p><h2 className="mt-3 font-display text-3xl font-semibold leading-snug sm:text-4xl">{dimensions.title}</h2><p className="mt-4 leading-8 text-muted-foreground">{dimensions.description}</p><div className="mt-7 grid gap-0">{dimensions.items.map((item, index) => { const Icon = dimensionIcons[index % dimensionIcons.length]; return <article className="group grid grid-cols-[2.75rem_1fr] gap-4 border-b border-border py-5 first:pt-0 last:border-0 last:pb-0" key={item.id}><span className="grid size-10 place-items-center rounded-full border border-primary/25 bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground"><Icon size={18} /></span><div><div className="flex items-center justify-between gap-3"><h3 className="font-display text-xl font-semibold">{item.title}</h3><span className="font-display text-xl text-gold/70">0{index + 1}</span></div><p className="mt-2 text-sm leading-7 text-muted-foreground">{item.text}</p></div></article>; })}</div></div><div className="relative min-h-[32rem]"><Image alt="在人生路径中寻找适合自己的方向" className="object-cover" fill sizes="(max-width: 1024px) 100vw, 51vw" src="/assets/cards/pain-focus.jpg" /><span className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/10 to-transparent" /><span className="absolute inset-x-7 bottom-7 text-white"><span className="text-xs font-bold uppercase tracking-[0.2em] text-white/65">Four Dimensions</span><span className="mt-2 block font-display text-3xl font-semibold leading-snug">看见线索，理解节奏，<br />再选择自己的方向。</span></span></div></div></div></section>

      <section className="section-padding">
        <div className="container-shell">
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-[linear-gradient(135deg,hsl(var(--surface)/0.96),hsl(var(--surface-strong)/0.82))] p-6 shadow-soft sm:p-8 lg:p-10">
            <div className="absolute -right-20 -top-32 size-96 rounded-full border border-primary/10" />
            <div className="absolute -right-4 -top-16 size-72 rounded-full border border-gold/15" />
            <div className="absolute bottom-0 left-0 h-1 w-1/3 bg-gradient-to-r from-primary via-gold to-transparent" />
            <div className="relative max-w-4xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{navigation.eyebrow}</p>
              <h2 className="mt-4 font-display text-3xl font-semibold leading-snug sm:text-4xl">{navigation.title}</h2>
              <p className="mt-4 max-w-3xl leading-8 text-muted-foreground">{navigation.description}</p>
            </div>
            <div className="relative mt-8 grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
              <div className="relative min-h-[24rem] overflow-hidden rounded-xl border border-border/70">
                <Image
                  alt="在人生与工作之间选择自己前进的方向"
                  className="object-cover"
                  fill
                  sizes="(max-width: 1024px) 100vw, 38vw"
                  src="/assets/cards/pain-second-curve.jpg"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-900/35 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                  <Compass className="text-amber-300" size={22} />
                  <p className="mt-3 font-display text-2xl font-semibold leading-snug">方向、速度和目的地，<br />始终由你决定。</p>
                  <p className="mt-3 text-sm text-white/70">工具服务于生命，而不是生命服从于工具</p>
                </div>
              </div>
              <div className="grid content-start gap-3">
                {navigation.items.map((item, index) => <article className="group flex gap-4 rounded-xl border border-border/80 bg-surface/75 p-5 shadow-line transition hover:-translate-y-0.5 hover:border-primary/35" key={item.id}><span className="font-display text-2xl text-gold">{index + 1}</span><div><h3 className="font-display text-xl font-semibold">{item.title}</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">{item.text}</p></div><ArrowDownRight className="ml-auto shrink-0 text-primary/35 transition group-hover:text-primary" size={19} /></article>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-surface/30"><div className="container-shell grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start"><div><SectionHeading description={faq.description} eyebrow={faq.eyebrow} title={faq.title} /><TalentAccordion faqs={faq.items.map((item) => ({ question: item.title || "常见问题", answer: item.text }))} /></div><TalentNumberGenerator description={consultation.description || "输入出生日期，生成属于你的天赋数字地图。"} eyebrow={consultation.eyebrow} title={consultation.title} /></div></section>
      {page.cta ? <CtaPanel {...page.cta} /> : null}
    </>
  );
}
