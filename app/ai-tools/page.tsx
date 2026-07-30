import type { Metadata } from "next";

import { AiToolsGrid } from "@/components/ai-tools-grid";
import { CtaPanel } from "@/components/cta-panel";
import { ManagedPageHero } from "@/components/managed-page-hero";
import { SectionHeading } from "@/components/section-heading";
import { readPublishedAiTools } from "@/lib/content-storage";
import { createPageMetadata } from "@/lib/metadata";
import { managedSection } from "@/lib/site-content";
import { readManagedPage } from "@/lib/site-content-storage";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const page = await readManagedPage("ai-tools");
  return createPageMetadata({ title: page.seoTitle, description: page.seoDescription, path: page.path });
}

export default async function AiToolsPage() {
  const [tools, page] = await Promise.all([readPublishedAiTools(), readManagedPage("ai-tools")]);
  const toolsSection = managedSection(page, "tools");
  const publishedTools = tools.map((tool) => ({ ...tool, tags: Array.isArray(tool.tags) ? tool.tags.filter((item): item is string => typeof item === "string") : [] }));
  const fallbackTools = toolsSection.items.map((item, index) => ({
    id: item.id,
    name: item.title || item.label || `AI 工具 ${index + 1}`,
    slug: item.id,
    description: item.text,
    detail: item.text,
    category: item.label || "productivity",
    iconImage: item.image || "/assets/icons/icon-ai-robot.png",
    screenshot: item.image || "/assets/cards/tool-chatgpt.jpg",
    toolUrl: item.href?.startsWith("https://") ? item.href : null,
    tags: item.label ? [item.label] : [],
    isFeatured: false
  }));
  return (
    <>
      <ManagedPageHero hero={page.hero} />
      <section className="section-padding pt-8">
        <div className="container-shell">
          <SectionHeading eyebrow={toolsSection.eyebrow || "Toolbox"} title={toolsSection.title} description={toolsSection.description} />
          <AiToolsGrid tools={publishedTools.length ? publishedTools : fallbackTools} />
        </div>
      </section>
      {page.cta ? <CtaPanel {...page.cta} /> : null}
    </>
  );
}
