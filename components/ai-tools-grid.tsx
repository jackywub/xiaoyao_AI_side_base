"use client";

import { ArrowUpRight, Sparkles, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type Tool = {
  id: string;
  name: string;
  slug: string;
  description: string;
  detail?: string | null;
  category: string;
  iconImage: string | null;
  screenshot?: string | null;
  toolUrl?: string | null;
  tags: string[];
  isFeatured: boolean;
};

const categoryLabels: Record<string, string> = {
  writing: "写作",
  image: "图像",
  productivity: "效率",
  media: "音视频",
  automation: "自动化",
  other: "其他"
};

const fallbackImage = "/assets/cards/tool-chatgpt.jpg";

function imageSrc(tool: Tool) {
  return tool.screenshot || tool.iconImage || fallbackImage;
}

function normalizedDetail(tool: Tool) {
  return (tool.detail || tool.description).trim();
}

type Props = {
  tools: Tool[];
  columns?: "three" | "four";
  compact?: boolean;
  limit?: number;
  showFilters?: boolean;
};

export function AiToolsGrid({ tools, columns = "three", compact = false, limit, showFilters = true }: Props) {
  const categories = useMemo(() => [...new Set(tools.map((tool) => tool.category))], [tools]);
  const [active, setActive] = useState("all");
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const filtered = active === "all" ? tools : tools.filter((tool) => tool.category === active);
  const visible = typeof limit === "number" ? filtered.slice(0, limit) : filtered;
  const gridClass = columns === "four" ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-4" : "grid gap-5 sm:grid-cols-2 lg:grid-cols-3";

  useEffect(() => {
    if (!selectedTool) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedTool(null);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedTool]);

  return (
    <>
      {showFilters ? <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="AI 工具分类">
        <button className="filter-chip" data-active={active === "all"} type="button" onClick={() => setActive("all")}>全部</button>
        {categories.map((category) => <button className="filter-chip" data-active={active === category} key={category} type="button" onClick={() => setActive(category)}>{categoryLabels[category] || category}</button>)}
      </div> : null}
      <div className={gridClass}>
        {visible.map((tool) => (
          <button
            className="focus-ring group overflow-hidden rounded-lg border border-border/80 bg-surface text-left shadow-soft transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_22px_50px_hsl(var(--foreground)/0.12)]"
            key={tool.id}
            type="button"
            onClick={() => setSelectedTool(tool)}
          >
            <span className={cn("relative block overflow-hidden bg-slate-900", compact ? "h-40" : "h-48")}>
              <Image
                alt={`${tool.name} 工具展示`}
                className="object-cover transition duration-500 group-hover:scale-[1.04]"
                fill
                sizes={columns === "four" ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
                src={imageSrc(tool)}
                unoptimized={imageSrc(tool).startsWith("/api/media/")}
              />
              <span className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/22 to-transparent" />
              <span className="absolute bottom-3 left-3 flex flex-wrap gap-2">
                {tool.isFeatured ? <span className="rounded-md bg-gold px-2 py-1 text-[11px] font-semibold text-white">精选</span> : null}
                <span className="rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground">{categoryLabels[tool.category] || tool.category}</span>
              </span>
            </span>
            <span className={cn("block", compact ? "p-4" : "p-5")}>
              <span className={cn("block font-display font-semibold leading-snug", compact ? "text-xl" : "text-2xl")}>{tool.name}</span>
              <span className="mt-3 line-clamp-3 block text-sm leading-7 text-muted-foreground">{tool.description}</span>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">查看详情 <ArrowUpRight size={15} /></span>
            </span>
          </button>
        ))}
        {!visible.length ? <div className="soft-card col-span-full p-8 text-center text-sm text-muted-foreground">还没有发布的 AI 工具。可以先在成长工作台里新增一个。</div> : null}
      </div>
      {selectedTool ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm" role="presentation" onMouseDown={() => setSelectedTool(null)}>
          <article
            aria-labelledby="ai-tool-dialog-title"
            aria-modal="true"
            className="max-h-[min(86vh,46rem)] w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_28px_90px_hsl(var(--foreground)/0.22)]"
            role="dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="relative h-56 overflow-hidden bg-slate-900 sm:h-64">
              <Image
                alt={`${selectedTool.name} 工具详情图`}
                className="object-cover"
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                src={imageSrc(selectedTool)}
                unoptimized={imageSrc(selectedTool).startsWith("/api/media/")}
              />
              <span className="absolute inset-0 bg-gradient-to-t from-slate-950/92 via-slate-900/28 to-transparent" />
              <button aria-label="关闭工具详情" className="icon-button absolute right-4 top-4 bg-surface/92" type="button" onClick={() => setSelectedTool(null)}><X size={18} /></button>
              <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white/72"><Sparkles size={14} /> {categoryLabels[selectedTool.category] || selectedTool.category}</p>
                <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl" id="ai-tool-dialog-title">{selectedTool.name}</h2>
              </div>
            </div>
            <div className="max-h-[calc(86vh-14rem)] overflow-y-auto p-5 sm:p-6">
              <div className="grid gap-5 sm:grid-cols-[0.85fr_1.15fr]">
                <section className="rounded-xl border border-border bg-background/45 p-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">用途</h3>
                  <p className="mt-3 leading-7">{selectedTool.description}</p>
                  {selectedTool.tags.length ? <div className="mt-4 flex flex-wrap gap-2">{selectedTool.tags.map((tag) => <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-muted-foreground" key={tag}>{tag}</span>)}</div> : null}
                </section>
                <section className="rounded-xl border border-border bg-background/45 p-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">详细介绍</h3>
                  <p className="mt-3 whitespace-pre-line leading-7 text-muted-foreground">{normalizedDetail(selectedTool)}</p>
                </section>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
                <button className="secondary-button" type="button" onClick={() => setSelectedTool(null)}>关闭</button>
                {selectedTool.toolUrl ? <a className="primary-button" href={selectedTool.toolUrl} rel="noopener noreferrer" target="_blank">访问工具 <ArrowUpRight size={16} /></a> : null}
              </div>
            </div>
          </article>
        </div>
      ) : null}
    </>
  );
}
