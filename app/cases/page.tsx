import type { Metadata } from "next";

import { CtaPanel } from "@/components/cta-panel";
import { ManagedPageHero } from "@/components/managed-page-hero";
import { SectionHeading } from "@/components/section-heading";
import { createPageMetadata } from "@/lib/metadata";
import { managedSection } from "@/lib/site-content";
import { readManagedPage, readPublishedCases } from "@/lib/site-content-storage";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const page = await readManagedPage("cases");
  return createPageMetadata({ title: page.seoTitle, description: page.seoDescription, path: page.path });
}

export default async function CasesPage() {
  const [page, cases] = await Promise.all([readManagedPage("cases"), readPublishedCases()]);
  const feedback = managedSection(page, "feedback");
  const metrics = managedSection(page, "metrics");
  return (
    <>
      <ManagedPageHero hero={page.hero} />
      <section className="section-padding pt-8"><div className="container-shell"><SectionHeading description={feedback.description} eyebrow={feedback.eyebrow} title={feedback.title} /><div className="grid gap-5 lg:grid-cols-3">{cases.map((item) => <article className="soft-card p-6" key={item.id}><p className="text-sm font-semibold text-primary">{item.clientName || item.serviceType || item.title}</p><h3 className="mt-4 font-display text-xl font-semibold leading-snug">{item.result || item.summary}</h3>{item.quote ? <p className="mt-5 border-l-2 border-accent/60 pl-4 leading-7 text-muted-foreground">“{item.quote}”</p> : null}</article>)}{!cases.length ? <p className="col-span-full py-12 text-center text-sm text-muted-foreground">暂无已发布案例。</p> : null}</div></div></section>
      {metrics.items.length ? <section className="section-padding bg-surface/30"><div className="container-shell"><div className="grid gap-5 md:grid-cols-3">{metrics.items.map((metric) => <div className="paper-panel p-6 text-center" key={metric.id}><p className="text-sm text-muted-foreground">{metric.label}</p><p className="mt-2 font-display text-3xl font-semibold text-primary">{metric.value}</p></div>)}</div></div></section> : null}
      {page.cta ? <CtaPanel {...page.cta} /> : null}
    </>
  );
}
