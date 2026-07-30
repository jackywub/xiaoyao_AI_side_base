import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHero } from "@/components/page-hero";
import { readPublishedAiTool } from "@/lib/content-storage";
import { createPageMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tool = await readPublishedAiTool(slug);
  if (!tool) return {};
  return createPageMetadata({ title: tool.name, description: tool.description, path: `/ai-tools/${slug}` });
}

export default async function AiToolDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = await readPublishedAiTool(slug);
  if (!tool) notFound();
  const tags = Array.isArray(tool.tags) ? tool.tags.filter((item): item is string => typeof item === "string") : [];
  return <><PageHero eyebrow="AI Tool" title={tool.name} description={tool.description} /><section className="section-padding pt-8"><div className="container-shell grid gap-8 lg:grid-cols-[0.7fr_1.3fr]"><div><Image alt="" className="size-24 rounded-lg object-cover" height={96} src={tool.iconImage || "/assets/icons/icon-ai-robot.png"} width={96} /><div className="mt-5 flex flex-wrap gap-2">{tags.map((tag) => <span className="pill" key={tag}>{tag}</span>)}</div></div><div className="soft-card p-6 sm:p-8"><h2 className="font-display text-3xl font-semibold">适合怎样使用</h2><p className="mt-5 whitespace-pre-line leading-8 text-muted-foreground">{tool.detail || tool.description}</p>{tool.toolUrl ? <Link className="primary-button mt-7" href={tool.toolUrl} rel="noopener noreferrer" target="_blank">访问官方网站 <ArrowUpRight size={17} /></Link> : null}</div></div></section></>;
}
