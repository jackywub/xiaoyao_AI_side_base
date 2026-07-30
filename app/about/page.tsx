import type { Metadata } from "next";

import { AvatarMark } from "@/components/avatar-mark";
import { CtaPanel } from "@/components/cta-panel";
import { ImageStoryCard } from "@/components/image-story-card";
import { ManagedPageHero } from "@/components/managed-page-hero";
import { SectionHeading } from "@/components/section-heading";
import { createPageMetadata } from "@/lib/metadata";
import { managedSection } from "@/lib/site-content";
import { readManagedPage, readPublicSiteProfile } from "@/lib/site-content-storage";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const page = await readManagedPage("about");
  return createPageMetadata({ title: page.seoTitle, description: page.seoDescription, path: page.path });
}

const offeringImageFallbacks = [
  "/assets/cards/tool-wechat-agent.jpg",
  "/assets/cards/tool-ai-recharge.jpg",
  "/assets/cards/service-side-business.jpg",
  "/assets/cards/service-talent.jpg"
];

export default async function AboutPage() {
  const [page, profile] = await Promise.all([readManagedPage("about"), readPublicSiteProfile()]);
  const story = managedSection(page, "story");
  const offerings = managedSection(page, "offerings");
  const principles = managedSection(page, "principles");
  return (
    <>
      <ManagedPageHero hero={page.hero} visual={<AvatarMark compact image={profile.avatarUrl} label="AI 副业 · 天赋数字" />} />
      <section className="section-padding pt-8"><div className="container-shell grid gap-8 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-start"><div><SectionHeading eyebrow={story.eyebrow} title={story.title} /><div className="rounded-lg border border-border/80 bg-surface/75 p-6 shadow-line backdrop-blur-md sm:p-8"><div className="space-y-5 text-lg leading-9 text-muted-foreground">{story.description ? <p>{story.description}</p> : null}{story.items.map((item) => <p key={item.id}>{item.text}</p>)}</div></div></div><div className="rounded-lg border border-border/70 bg-surface/60 p-4 shadow-line backdrop-blur-md sm:p-5"><div className="grid gap-4 sm:grid-cols-2">{offerings.items.map((item, index) => <ImageStoryCard alt={item.alt || item.title || item.label || "服务方向图片"} description={item.text} eyebrow={offerings.eyebrow || "What I Do"} href={item.href} image={item.image || offeringImageFallbacks[index % offeringImageFallbacks.length]} key={item.id} mini sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 34vw" title={item.title || item.label || `服务方向 ${index + 1}`} />)}</div></div></div></section>
      <section className="section-padding bg-surface/30"><div className="container-shell"><SectionHeading align="center" description={principles.description} eyebrow={principles.eyebrow} title={principles.title} /><div className="grid gap-5 md:grid-cols-3">{principles.items.map((item) => <article className="paper-panel p-6" key={item.id}><h3 className="font-display text-xl font-semibold">{item.title}</h3><p className="mt-3 leading-7 text-muted-foreground">{item.text}</p></article>)}</div></div></section>
      {page.cta ? <CtaPanel {...page.cta} /> : null}
    </>
  );
}
