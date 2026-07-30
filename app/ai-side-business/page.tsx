import type { Metadata } from "next";

import { CtaPanel } from "@/components/cta-panel";
import { ManagedPageHero } from "@/components/managed-page-hero";
import { ProjectShowcase } from "@/components/project-showcase";
import { SectionHeading } from "@/components/section-heading";
import { readPublishedProjects } from "@/lib/content-storage";
import { createPageMetadata } from "@/lib/metadata";
import { managedSection } from "@/lib/site-content";
import { readManagedPage } from "@/lib/site-content-storage";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const page = await readManagedPage("ai-side-business");
  return createPageMetadata({ title: page.seoTitle, description: page.seoDescription, path: page.path });
}

export default async function AiSideBusinessPage() {
  const [page, projects] = await Promise.all([readManagedPage("ai-side-business"), readPublishedProjects()]);
  const projectSection = managedSection(page, "projects");
  const roadmap = managedSection(page, "roadmap");
  return (
    <>
      <ManagedPageHero hero={page.hero} />
      <section className="section-padding pt-8"><div className="container-shell"><SectionHeading description={projectSection.description} eyebrow={projectSection.eyebrow} title={projectSection.title} /><ProjectShowcase projects={projects.map((project) => { const meta = project.meta && typeof project.meta === "object" && !Array.isArray(project.meta) ? project.meta as { tags?: unknown } : {}; return { id: project.id, title: project.title, category: project.type.toLowerCase() as "content" | "service" | "tool" | "consulting", description: project.description, detail: project.detail || project.description, coverImage: project.coverImage || undefined, meta: Array.isArray(meta.tags) ? meta.tags.filter((tag): tag is string => typeof tag === "string") : [] }; })} /></div></section>
      <section className="section-padding bg-surface/30"><div className="container-shell grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start"><SectionHeading description={roadmap.description} eyebrow={roadmap.eyebrow} title={roadmap.title} /><div className="soft-card p-6 sm:p-8"><ol className="space-y-5">{roadmap.items.map((item, index) => <li className="flex gap-4" key={item.id}><span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{index + 1}</span><p className="pt-1 leading-7 text-muted-foreground">{item.text}</p></li>)}</ol></div></div></section>
      {page.cta ? <CtaPanel {...page.cta} /> : null}
    </>
  );
}
