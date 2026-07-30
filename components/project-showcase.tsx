"use client";

import { ArrowRight, Compass, FileText, Workflow, X, type LucideIcon } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";

export type ProjectShowcaseItem = {
  id: string;
  title: string;
  category: "content" | "service" | "tool" | "consulting";
  description: string;
  detail: string;
  coverImage?: string;
  meta: string[];
};

const categoryMeta: Record<ProjectShowcaseItem["category"], { label: string; icon: LucideIcon }> = {
  content: { label: "内容副业", icon: FileText },
  service: { label: "服务项目", icon: Compass },
  tool: { label: "工具实战", icon: Workflow },
  consulting: { label: "方向陪跑", icon: Compass }
};

const projectImageFallbacks = [
  "/assets/cards/project-ai-tool-monetization.png",
  "/assets/cards/project-xianyu-digital-assets.png",
  "/assets/cards/project-wechat-traffic-owner.png",
  "/assets/cards/project-ai-side-business-coaching.png"
];

function projectImage(project: ProjectShowcaseItem, index: number) {
  return project.coverImage || projectImageFallbacks[index % projectImageFallbacks.length];
}

export function ProjectShowcase({ projects }: { projects: ProjectShowcaseItem[] }) {
  const filters = useMemo(() => [
    { label: "全部", value: "all" },
    ...Array.from(new Set(projects.map((project) => project.category))).map((category) => ({ label: categoryMeta[category].label, value: category }))
  ], [projects]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedProject, setSelectedProject] = useState<ProjectShowcaseItem | null>(null);
  const visibleProjects = activeFilter === "all" ? projects : projects.filter((project) => project.category === activeFilter);

  return (
    <>
      <div className="mb-5 flex flex-wrap gap-3">
        {filters.map((filter) => <button className="filter-chip" data-active={activeFilter === filter.value} key={filter.value} type="button" onClick={() => setActiveFilter(filter.value)}>{filter.label}</button>)}
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {visibleProjects.map((project, index) => {
          const meta = categoryMeta[project.category];
          const image = projectImage(project, index);
          return (
            <article className="group relative isolate min-h-[28rem] overflow-hidden rounded-lg border border-border/70 bg-slate-900 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_22px_50px_hsl(var(--foreground)/0.16)]" key={project.id}>
              <Image alt={project.title} className="object-cover transition duration-500 group-hover:scale-[1.04]" fill sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw" src={image} unoptimized={image.startsWith("/api/media/")} />
              <span className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-900/52 to-slate-900/10" />
              <span className="absolute inset-x-0 bottom-0 z-10 p-5 text-white">
                <span className="mb-3 inline-flex rounded-md bg-primary px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-primary-foreground">{meta.label}</span>
                <span className="block font-display text-2xl font-semibold leading-snug">{project.title}</span>
                <span className="mt-3 line-clamp-4 block text-sm leading-6 text-white/78">{project.description}</span>
                {project.meta.length ? <span className="mt-4 flex flex-wrap gap-2">{project.meta.slice(0, 3).map((item) => <span className="rounded-full border border-white/22 bg-white/12 px-2.5 py-1 text-xs text-white/78" key={item}>{item}</span>)}</span> : null}
                <button className="focus-ring mt-5 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-white transition hover:translate-x-1" type="button" onClick={() => setSelectedProject(project)}>查看详情 <ArrowRight size={16} /></button>
              </span>
            </article>
          );
        })}
        {!visibleProjects.length ? <p className="col-span-full py-12 text-center text-sm text-muted-foreground">暂无已发布项目。</p> : null}
      </div>
      {selectedProject ? (
        <div aria-modal="true" className="fixed inset-0 z-[80] grid place-items-center bg-foreground/60 p-5 backdrop-blur-sm" role="dialog" onClick={() => setSelectedProject(null)}>
          <div className="relative w-full max-w-xl rounded-lg border border-border/60 bg-background p-7 shadow-soft" onClick={(event) => event.stopPropagation()}>
            <button aria-label="关闭弹窗" className="focus-ring absolute right-4 top-4 inline-flex size-11 items-center justify-center rounded-full border border-border/70 bg-surface/85 text-foreground transition hover:border-primary/50 hover:text-primary" type="button" onClick={() => setSelectedProject(null)}><X size={18} /></button>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-accent">{categoryMeta[selectedProject.category].label}</p>
            <h3 className="mt-3 pr-10 font-display text-3xl font-semibold">{selectedProject.title}</h3>
            <p className="mt-5 whitespace-pre-line leading-8 text-muted-foreground">{selectedProject.detail || selectedProject.description}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
