import { ArrowRight, LayoutDashboard } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AvatarMark } from "@/components/avatar-mark";
import { CtaPanel } from "@/components/cta-panel";
import { ImageStoryCard } from "@/components/image-story-card";
import { SectionHeading } from "@/components/section-heading";
import { WechatHoverButton } from "@/components/wechat-hover-button";
import { readPublishedArticles } from "@/lib/content-storage";
import { createPageMetadata } from "@/lib/metadata";
import { managedSection } from "@/lib/site-content";
import { readManagedPage, readPublicSiteProfile } from "@/lib/site-content-storage";
import { valueTags } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const page = await readManagedPage("home");
  return createPageMetadata({ title: page.seoTitle, description: page.seoDescription, path: page.path });
}

const workspaceCardFallbacks = [
  { image: "/assets/cards/tool-membership-cards.jpg", description: "按重要与紧急程度排清优先级，再把目标拆成可执行步骤。" },
  { image: "/assets/cards/service-growth.jpg", description: "把每日行动放进日历，今天该做什么一目了然。" },
  { image: "/assets/cards/pain-side-project.jpg", description: "看清阶段、进度和风险，让每个项目持续向前。" },
  { image: "/assets/cards/pain-second-curve.jpg", description: "记录收益、习惯与复盘，让长期成长留下轨迹。" }
];

const latestArticleFallbacks = [
  "/assets/cards/pain-focus.jpg",
  "/assets/cards/service-talent.jpg",
  "/assets/cards/service-side-business.jpg"
];

export default async function HomePage() {
  const [page, profile, articles] = await Promise.all([readManagedPage("home"), readPublicSiteProfile(), readPublishedArticles(3)]);
  const painPoints = managedSection(page, "pain-points");
  const services = managedSection(page, "services");
  const workspace = managedSection(page, "workspace");
  const latest = managedSection(page, "latest");
  return (
    <>
      <section className="relative min-h-[calc(100svh-5.5rem)] overflow-hidden border-b border-border">
        <div className="container-shell relative z-10 grid min-h-[calc(100svh-5.5rem)] items-center gap-8 py-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.72fr)]">
          <div className="max-w-3xl animate-fadeUp">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.18em] text-primary">{page.hero.eyebrow}</p>
            <h1 className="font-display text-[clamp(2.5rem,5.4vw,5.1rem)] font-semibold leading-tight">{page.hero.title}<span className="brush-title hero-calligraphy">{page.hero.accent}</span></h1>
            <div className="hero-brush-line" />
            <p className="max-w-2xl text-lg font-semibold leading-8 sm:text-xl">{page.hero.tagline || page.seoDescription}</p>
            <p className="mt-5 max-w-2xl leading-8 text-muted-foreground">{page.hero.description}</p>
            <div className="mt-7 flex flex-wrap gap-3"><WechatHoverButton qrUrl={profile.wechatQrUrl} wechat={profile.wechat} /><Link className="secondary-button" href="/contact">预约咨询 <ArrowRight size={17} /></Link></div>
            <div className="mt-7 flex flex-wrap gap-2">{valueTags.map((tag) => <span className="rounded-full border border-border bg-surface/80 px-3 py-1.5 text-xs text-muted-foreground" key={tag}>{tag}</span>)}</div>
          </div>
          <div className="animate-fadeUp [animation-delay:140ms]"><AvatarMark compact image={profile.avatarUrl} label={page.hero.eyebrow.split("、").slice(0, 2).join(" · ")} /></div>
        </div>
      </section>

      <section className="section-padding bg-surface/55"><div className="container-shell"><SectionHeading align="center" description={painPoints.description} eyebrow={painPoints.eyebrow} title={painPoints.title} /><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{painPoints.items.map((item) => <ImageStoryCard alt={item.alt || item.title || "首页内容图片"} description={item.text} image={item.image || "/assets/cards/pain-focus.jpg"} key={item.id} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" title={item.title || "成长问题"} />)}</div></div></section>
      <section className="section-padding"><div className="container-shell"><SectionHeading align="center" description={services.description} eyebrow={services.eyebrow} title={services.title} /><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{services.items.map((item) => <ImageStoryCard alt={item.alt || item.title || "服务方向图片"} description={item.text} eyebrow="探索路径" href={item.href} image={item.image || "/assets/cards/service-growth.jpg"} key={item.id} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" title={item.title || "服务方向"} />)}</div></div></section>
      <section className="section-padding"><div className="container-shell grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start"><div><SectionHeading description={workspace.description} eyebrow={workspace.eyebrow} title={workspace.title} /><Link className="primary-button mt-2" href="/workspace"><LayoutDashboard size={17} /> 打开成长工作台</Link></div><div className="grid gap-4 sm:grid-cols-2">{workspace.items.map((item, index) => { const fallback = workspaceCardFallbacks[index % workspaceCardFallbacks.length]; return <ImageStoryCard mini alt={item.alt || item.text || "成长工作台功能"} description={item.title ? item.text : fallback.description} eyebrow={item.label || "工作台能力"} href={item.href || "/workspace"} image={item.image || fallback.image} key={item.id} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 30vw" title={item.title || item.text} />; })}</div></div></section>
      <section className="section-padding bg-surface/55"><div className="container-shell"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><SectionHeading description={latest.description} eyebrow={latest.eyebrow} title={latest.title} /><Link className="secondary-button shrink-0" href="/growth">查看全部文章 <ArrowRight size={16} /></Link></div><div className="grid gap-5 md:grid-cols-3">{articles.map((article, index) => <ImageStoryCard compact alt={article.title} description={article.excerpt || article.content.slice(0, 90)} eyebrow={article.category?.name || "成长笔记"} href={`/growth/${article.slug}`} image={article.coverImage || latestArticleFallbacks[index % latestArticleFallbacks.length]} key={article.id} sizes="(max-width: 768px) 100vw, 33vw" title={article.title} />)}</div></div></section>
      {page.cta ? <CtaPanel {...page.cta} /> : null}
    </>
  );
}
