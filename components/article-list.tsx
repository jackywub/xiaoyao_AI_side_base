"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type ArticleItem = { id: string; title: string; slug: string; excerpt: string; category: string; date: string; tags: string[] };

export function ArticleList({ articles }: { articles: ArticleItem[] }) {
  const categories = useMemo(() => [...new Set(articles.map((article) => article.category))], [articles]);
  const [active, setActive] = useState("全部");
  const visible = active === "全部" ? articles : articles.filter((article) => article.category === active);
  return <><div className="mb-6 flex flex-wrap gap-2"><button className="filter-chip" data-active={active === "全部"} type="button" onClick={() => setActive("全部")}>全部</button>{categories.map((category) => <button className="filter-chip" data-active={active === category} key={category} type="button" onClick={() => setActive(category)}>{category}</button>)}</div><div className="grid gap-5 md:grid-cols-2">{visible.map((article) => <Link className="soft-card group flex min-h-64 flex-col p-6" href={`/growth/${article.slug}`} key={article.id}><div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span className="rounded-md bg-primary/10 px-2.5 py-1 font-semibold text-primary">{article.category}</span><span>{article.date}</span></div><h2 className="mt-5 font-display text-2xl font-semibold leading-snug transition group-hover:text-primary">{article.title}</h2><p className="mt-4 flex-1 leading-7 text-muted-foreground">{article.excerpt || "打开文章，继续阅读萧小遥的实战记录与成长复盘。"}</p><div className="mt-5 flex items-center gap-2 text-sm font-semibold text-primary">阅读全文 <ArrowRight size={16} /></div></Link>)}</div></>;
}
