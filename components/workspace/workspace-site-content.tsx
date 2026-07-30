"use client";

import { Bot, FilePenLine, Layers3, LoaderCircle, Newspaper, Quote, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { ContentCollectionEditor, categoryOptions } from "@/components/workspace/content/content-collection-editor";
import { PageContentEditor, type PageContentSaveBlock } from "@/components/workspace/content/page-content-editor";
import type { ContentAdminData } from "@/lib/content-admin-types";
import type { ManagedPageContent } from "@/lib/site-content";
import { cn } from "@/lib/utils";

type AdminTab = "pages" | "projects" | "articles" | "tools" | "talent" | "cases";
type EditableRecord = Record<string, unknown> & { id: string; status: string };

const tabs: Array<{ id: AdminTab; label: string; icon: typeof FilePenLine }> = [
  { id: "pages", label: "页面文案", icon: FilePenLine },
  { id: "projects", label: "副业项目", icon: Layers3 },
  { id: "articles", label: "成长文章", icon: Newspaper },
  { id: "tools", label: "AI 工具", icon: Bot },
  { id: "talent", label: "天赋服务", icon: Sparkles },
  { id: "cases", label: "案例反馈", icon: Quote }
];

const publishOptions = [
  { label: "草稿", value: "DRAFT" },
  { label: "发布", value: "PUBLISHED" },
  { label: "归档", value: "ARCHIVED" }
];

const aiToolCategoryOptions = [
  { label: "写作", value: "writing" },
  { label: "图像", value: "image" },
  { label: "效率", value: "productivity" },
  { label: "音视频", value: "media" },
  { label: "自动化", value: "automation" },
  { label: "其他", value: "other" }
];

export function WorkspaceSiteContent() {
  const [data, setData] = useState<ContentAdminData | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("pages");
  const [selectedPage, setSelectedPage] = useState(0);
  const [isBusy, setIsBusy] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/content-admin", { cache: "no-store", signal: controller.signal });
        if (response.status === 401) { window.location.assign("/login?next=/workspace"); return; }
        const result = await response.json() as { data?: ContentAdminData; error?: string };
        if (!response.ok || !result.data) throw new Error(result.error || "网站内容加载失败。");
        setData(result.data);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "网站内容加载失败。");
      } finally {
        if (!controller.signal.aborted) setIsBusy(false);
      }
    }
    load();
    return () => controller.abort();
  }, []);

  async function mutate(action: string, input: Record<string, unknown>, successMessage: string) {
    setIsBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/content-admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, input }) });
      if (response.status === 401) { window.location.assign("/login?next=/workspace"); return false; }
      const result = await response.json() as { data?: ContentAdminData; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error || "网站内容保存失败。");
      setData(result.data);
      setNotice(successMessage);
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "网站内容保存失败。");
      return false;
    } finally {
      setIsBusy(false);
    }
  }

  if (!data) return <div className="soft-card grid min-h-80 place-items-center p-8 text-sm text-muted-foreground">{isBusy ? <span className="flex items-center gap-2"><LoaderCircle className="animate-spin" size={17} /> 正在读取网站内容...</span> : error || "网站内容暂时不可用。"}</div>;

  const projectFields = [
    { key: "title", label: "项目名称", required: true }, { key: "slug", label: "唯一地址 slug", required: true },
    { key: "type", label: "项目类型", kind: "select" as const, options: [{ label: "内容项目", value: "CONTENT" }, { label: "服务项目", value: "SERVICE" }, { label: "工具实战", value: "TOOL" }, { label: "咨询陪跑", value: "CONSULTING" }] },
    { key: "status", label: "发布状态", kind: "select" as const, options: publishOptions },
    { key: "description", label: "项目简介", kind: "textarea" as const, required: true, wide: true },
    { key: "detail", label: "项目详情", kind: "textarea" as const, wide: true },
    { key: "targetAudience", label: "适合人群" }, { key: "costLevel", label: "成本等级" },
    { key: "difficulty", label: "操作难度" }, { key: "monetization", label: "变现方式" },
    { key: "tags", label: "标签", kind: "list" as const }, { key: "coverImage", label: "封面图片地址" },
    { key: "sortOrder", label: "排序", kind: "number" as const }, { key: "isFeatured", label: "首页推荐", kind: "checkbox" as const }
  ];
  const articleFields = [
    { key: "title", label: "文章标题", required: true }, { key: "slug", label: "唯一地址 slug", required: true },
    { key: "categoryId", label: "文章分类", kind: "select" as const, options: categoryOptions(data.categories) }, { key: "status", label: "发布状态", kind: "select" as const, options: publishOptions },
    { key: "excerpt", label: "文章摘要", kind: "textarea" as const, wide: true }, { key: "content", label: "文章正文", kind: "textarea" as const, required: true, wide: true },
    { key: "coverImage", label: "封面图片地址" }, { key: "isFeatured", label: "推荐文章", kind: "checkbox" as const }
  ];
  const aiToolFields = [
    { key: "name", label: "工具名称", required: true }, { key: "slug", label: "唯一地址 slug", required: true },
    { key: "category", label: "工具分类", kind: "select" as const, options: aiToolCategoryOptions }, { key: "status", label: "发布状态", kind: "select" as const, options: publishOptions },
    { key: "description", label: "用途", kind: "textarea" as const, required: true, wide: true, placeholder: "一句话说明这个工具适合用来解决什么问题。" },
    { key: "detail", label: "详细介绍", kind: "textarea" as const, wide: true, placeholder: "写给用户看的完整说明：适合人群、使用场景、注意事项、你的实测经验等。" },
    { key: "tags", label: "标签", kind: "list" as const }, { key: "toolUrl", label: "工具官网地址" },
    { key: "iconImage", label: "图标图片地址" }, { key: "screenshot", label: "展示图片地址" },
    { key: "embedUrl", label: "嵌入地址（可选）" }, { key: "sortOrder", label: "排序", kind: "number" as const },
    { key: "isFeatured", label: "重点推荐", kind: "checkbox" as const }
  ];
  const talentFields = [
    { key: "title", label: "服务名称", required: true }, { key: "slug", label: "唯一地址 slug", required: true },
    { key: "subtitle", label: "服务副标题" }, { key: "status", label: "服务状态", kind: "select" as const, options: [{ label: "启用", value: "ACTIVE" }, { label: "停用", value: "INACTIVE" }] },
    { key: "description", label: "服务简介", kind: "textarea" as const, required: true, wide: true }, { key: "content", label: "服务详情", kind: "textarea" as const, wide: true },
    { key: "price", label: "价格" }, { key: "durationMinutes", label: "时长（分钟）", kind: "number" as const },
    { key: "suitableFor", label: "适合人群", kind: "textarea" as const, wide: true }, { key: "deliverables", label: "交付内容", kind: "list" as const },
    { key: "process", label: "服务流程", kind: "list" as const }, { key: "sortOrder", label: "排序", kind: "number" as const },
    { key: "isFeatured", label: "重点推荐", kind: "checkbox" as const }
  ];
  const caseFields = [
    { key: "title", label: "案例标题", required: true }, { key: "slug", label: "唯一地址 slug", required: true },
    { key: "clientName", label: "客户名称" }, { key: "serviceType", label: "服务类型" },
    { key: "status", label: "发布状态", kind: "select" as const, options: publishOptions }, { key: "rating", label: "评分（1-5）", kind: "number" as const },
    { key: "summary", label: "案例摘要", kind: "textarea" as const, required: true, wide: true }, { key: "result", label: "达成结果", kind: "textarea" as const, wide: true },
    { key: "quote", label: "客户反馈", kind: "textarea" as const, wide: true }, { key: "content", label: "案例详情", kind: "textarea" as const, wide: true },
    { key: "coverImage", label: "封面图片地址" }, { key: "sortOrder", label: "排序", kind: "number" as const }, { key: "isFeatured", label: "重点案例", kind: "checkbox" as const }
  ];

  return (
    <div className="grid gap-6">
      <div className="flex gap-2 overflow-x-auto rounded-lg border border-border bg-surface p-2">
        {tabs.map((tab) => { const Icon = tab.icon; return <button className={cn("flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition", activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-strong hover:text-primary")} data-testid={`content-tab-${tab.id}`} key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}><Icon size={16} />{tab.label}</button>; })}
      </div>
      {error ? <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p> : null}
      {notice ? <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">{notice}</p> : null}

      {activeTab === "pages" ? <>
        <div className="flex gap-2 overflow-x-auto pb-1">{data.pages.map((page, index) => <button className={cn("shrink-0 rounded-lg border px-4 py-2 text-sm font-semibold transition", selectedPage === index ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-muted-foreground")} key={page.slug} type="button" onClick={() => setSelectedPage(index)}>{page.label}</button>)}</div>
        <PageContentEditor
          disabled={isBusy}
          key={data.pages[selectedPage].slug}
          page={data.pages[selectedPage]}
          onSave={(block: PageContentSaveBlock, page: ManagedPageContent) => mutate(
            "savePageBlock",
            { slug: page.slug, block: block.type, sectionKey: block.type === "section" ? block.sectionKey : "", content: page },
            `${page.label} · ${block.label}已更新，前台刷新后生效。`
          )}
        />
      </> : null}
      {activeTab === "projects" ? <ContentCollectionEditor description="管理副业项目页面的筛选卡片与详情弹窗。" disabled={isBusy} emptyItem={{ id: "", title: "", slug: "", type: "CONTENT", description: "", detail: "", coverImage: "", targetAudience: "", costLevel: "", difficulty: "", monetization: "", tags: [], status: "DRAFT", sortOrder: data.projects.length, isFeatured: false }} fields={projectFields} itemLabel="项目" items={data.projects as unknown as EditableRecord[]} title="AI 副业项目" onDelete={(id) => mutate("deleteProject", { id }, "项目已删除。") } onSave={(item) => mutate("saveProject", item, "项目已保存。") } /> : null}
      {activeTab === "articles" ? <ContentCollectionEditor description="文章发布后会立即出现在个人成长页面。" disabled={isBusy} emptyItem={{ id: "", title: "", slug: "", excerpt: "", content: "", coverImage: "", categoryId: "", status: "DRAFT", isFeatured: false }} fields={articleFields} itemLabel="文章" items={data.articles as unknown as EditableRecord[]} title="个人成长文章" onDelete={(id) => mutate("deleteArticle", { id }, "文章已删除。") } onSave={(item) => mutate("saveArticle", item, "文章已保存。") } /> : null}
      {activeTab === "tools" ? <ContentCollectionEditor description="维护 AI 工具板块的卡片和弹窗详情，发布后会同步展示到前台。" disabled={isBusy} emptyItem={{ id: "", name: "", slug: "", description: "", detail: "", category: "productivity", toolUrl: "", embedUrl: "", iconImage: "", screenshot: "", tags: [], status: "DRAFT", sortOrder: data.aiTools.length, isFeatured: false }} fields={aiToolFields} itemLabel="工具" items={data.aiTools as unknown as EditableRecord[]} labelKey="name" title="AI 工具栏" onDelete={(id) => mutate("deleteAiTool", { id }, "AI 工具已删除。") } onSave={(item) => mutate("saveAiTool", item, "AI 工具已保存。") } /> : null}
      {activeTab === "talent" ? <ContentCollectionEditor description="管理天赋数字咨询服务、价格、流程和交付内容。" disabled={isBusy} emptyItem={{ id: "", title: "", slug: "", subtitle: "", description: "", content: "", price: "", durationMinutes: null, suitableFor: "", deliverables: [], process: [], status: "ACTIVE", sortOrder: data.talentServices.length, isFeatured: false }} fields={talentFields} itemLabel="服务" items={data.talentServices as unknown as EditableRecord[]} title="天赋数字服务" onDelete={(id) => mutate("deleteTalentService", { id }, "服务已删除。") } onSave={(item) => mutate("saveTalentService", item, "服务已保存。") } /> : null}
      {activeTab === "cases" ? <ContentCollectionEditor description="发布真实授权案例与用户反馈。" disabled={isBusy} emptyItem={{ id: "", title: "", slug: "", clientName: "", serviceType: "", summary: "", content: "", result: "", quote: "", rating: null, coverImage: "", status: "DRAFT", sortOrder: data.cases.length, isFeatured: false }} fields={caseFields} itemLabel="案例" items={data.cases as unknown as EditableRecord[]} title="案例反馈" onDelete={(id) => mutate("deleteCase", { id }, "案例已删除。") } onSave={(item) => mutate("saveCase", item, "案例已保存。") } /> : null}
    </div>
  );
}
