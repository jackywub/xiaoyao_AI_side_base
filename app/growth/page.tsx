import type { Metadata } from "next";

import { ArticleList } from "@/components/article-list";
import { ManagedPageHero } from "@/components/managed-page-hero";
import { SectionHeading } from "@/components/section-heading";
import { readPublishedArticles } from "@/lib/content-storage";
import { createPageMetadata } from "@/lib/metadata";
import { managedSection } from "@/lib/site-content";
import { readManagedPage } from "@/lib/site-content-storage";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const page = await readManagedPage("growth");
  return createPageMetadata({ title: page.seoTitle, description: page.seoDescription, path: page.path });
}

export default async function GrowthPage() {
  const [page, articles] = await Promise.all([readManagedPage("growth"), readPublishedArticles()]);
  const articleSection = managedSection(page, "articles");
  return (
    <>
      <ManagedPageHero hero={page.hero} />
      <section className="section-padding pt-8"><div className="container-shell"><SectionHeading description={articleSection.description} eyebrow={articleSection.eyebrow} title={articleSection.title} /><ArticleList articles={articles.map((article) => ({ id: article.id, title: article.title, slug: article.slug, excerpt: article.excerpt || "", category: article.category?.name || "未分类", date: (article.publishedAt || article.createdAt).toLocaleDateString("zh-CN"), tags: article.tags.map((item) => item.tag.name) }))} /></div></section>
    </>
  );
}
