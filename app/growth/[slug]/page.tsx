import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { readPublishedArticle } from "@/lib/content-storage";
import { createPageMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await readPublishedArticle(slug);
  if (!article) return {};
  return createPageMetadata({ title: article.title, description: article.excerpt || article.content.slice(0, 120), path: `/growth/${slug}` });
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await readPublishedArticle(slug);
  if (!article) notFound();
  return <article className="container-shell py-14 sm:py-20"><header className="mx-auto max-w-3xl border-b border-border pb-8"><div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><span className="rounded-md bg-primary/10 px-2.5 py-1 font-semibold text-primary">{article.category?.name || "成长笔记"}</span><time>{(article.publishedAt || article.createdAt).toLocaleDateString("zh-CN")}</time></div><h1 className="mt-6 font-display text-[clamp(2.2rem,5vw,4.2rem)] font-semibold leading-tight">{article.title}</h1>{article.excerpt ? <p className="mt-5 text-lg leading-8 text-muted-foreground">{article.excerpt}</p> : null}</header><div className="prose-content mx-auto mt-10 max-w-3xl whitespace-pre-line text-base leading-9 text-foreground">{article.content}</div></article>;
}
