import { Compass, HeartHandshake, MessageCircle, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AppointmentForm } from "@/components/appointment-form";
import { CtaPanel } from "@/components/cta-panel";
import { ManagedPageHero } from "@/components/managed-page-hero";
import { SectionHeading } from "@/components/section-heading";
import { WechatCard } from "@/components/wechat-card";
import { createPageMetadata } from "@/lib/metadata";
import { managedSection } from "@/lib/site-content";
import { readManagedPage, readPublicSiteProfile } from "@/lib/site-content-storage";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const page = await readManagedPage("contact");
  return createPageMetadata({ title: page.seoTitle, description: page.seoDescription, path: page.path });
}

const contactIcons: LucideIcon[] = [MessageCircle, HeartHandshake, Compass];

export default async function ContactPage() {
  const [page, profile] = await Promise.all([readManagedPage("contact"), readPublicSiteProfile()]);
  const ways = managedSection(page, "ways");
  const preparation = managedSection(page, "preparation");
  const wechat = managedSection(page, "wechat");
  return (
    <>
      <ManagedPageHero hero={page.hero} />
      <section className="section-padding pt-8"><div className="container-shell"><SectionHeading description={ways.description} eyebrow={ways.eyebrow} title={ways.title} /><div className="grid gap-5 lg:grid-cols-3">{ways.items.map((option, index) => { const Icon = contactIcons[index] || Compass; const value = index === 0 ? profile.wechat : index === 1 ? profile.email : option.value; return <article className="soft-card p-6" key={option.id}><div className="mb-5 inline-flex size-12 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary"><Icon size={22} /></div><h3 className="font-display text-xl font-semibold">{option.title}</h3><p className="mt-2 font-semibold text-foreground">{value}</p><p className="mt-3 leading-7 text-muted-foreground">{option.text}</p></article>; })}</div></div></section>
      <section className="section-padding bg-surface/30"><div className="container-shell grid gap-10 lg:grid-cols-[0.8fr_1.2fr]"><SectionHeading description={preparation.description} eyebrow={preparation.eyebrow} title={preparation.title} /><div className="grid gap-5"><div className="soft-card p-6 sm:p-8"><ol className="space-y-5">{preparation.items.map((item, index) => <li className="flex gap-4" key={item.id}><span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">{index + 1}</span><p className="pt-1 leading-7 text-muted-foreground">{item.text}</p></li>)}</ol><div className="mt-8 flex flex-wrap gap-3"><Link className="primary-button" href={`mailto:${profile.email}`}>发送邮件</Link><Link className="secondary-button" href="/cases">先看案例</Link></div></div><AppointmentForm /></div></div></section>
      <section className="section-padding pt-0"><div className="container-shell"><SectionHeading align="center" description={wechat.description} eyebrow={wechat.eyebrow} title={wechat.title} /><WechatCard qrUrl={profile.wechatQrUrl} wechat={profile.wechat} /></div></section>
      {page.cta ? <CtaPanel {...page.cta} primaryHref={page.cta.primaryHref.startsWith("mailto:") ? `mailto:${profile.email}` : page.cta.primaryHref} /> : null}
    </>
  );
}
