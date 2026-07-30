"use client";

import { ImageUp, LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";

import type { ManagedContentItem, ManagedPageContent } from "@/lib/site-content";

type Props = {
  page: ManagedPageContent;
  disabled: boolean;
  onSave: (block: PageContentSaveBlock, page: ManagedPageContent) => Promise<boolean>;
};

export type PageContentSaveBlock =
  | { type: "seo" | "hero" | "cta"; label: string }
  | { type: "section"; sectionKey: string; label: string };

function newItem(sectionKey: string): ManagedContentItem {
  return { id: `${sectionKey}-${Date.now()}`, title: "", text: "" };
}

export function PageContentEditor({ page, disabled, onSave }: Props) {
  const [draft, setDraft] = useState(page);
  const [uploadingItemId, setUploadingItemId] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");

  function updateSection(sectionIndex: number, patch: Partial<ManagedPageContent["sections"][number]>) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section, index) => index === sectionIndex ? { ...section, ...patch } : section)
    }));
  }

  function updateItem(sectionIndex: number, itemIndex: number, patch: Partial<ManagedContentItem>) {
    const section = draft.sections[sectionIndex];
    updateSection(sectionIndex, {
      items: section.items.map((item, index) => index === itemIndex ? { ...item, ...patch } : item)
    });
  }

  async function uploadItemImage(file: File, sectionIndex: number, itemIndex: number) {
    const item = draft.sections[sectionIndex].items[itemIndex];
    setUploadingItemId(item.id);
    setUploadMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("alt", item.alt || item.title || item.label || "AI 工具卡片图片");
      const response = await fetch("/api/content-admin/upload", { method: "POST", body: formData });
      if (response.status === 401) {
        window.location.assign("/login?next=/workspace");
        return;
      }
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "图片上传失败。");
      updateItem(sectionIndex, itemIndex, {
        image: result.url,
        alt: item.alt || item.title || item.label || "AI 工具卡片图片"
      });
      setUploadMessage("图片已上传，请保存当前板块后发布到前台。");
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "图片上传失败。");
    } finally {
      setUploadingItemId("");
    }
  }

  return (
    <div className="grid gap-5">
      <section className="soft-card overflow-hidden">
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <h2 className="font-semibold">{draft.label} · SEO 信息</h2>
          <p className="mt-1 text-sm text-muted-foreground">用于搜索结果和页面分享摘要。</p>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2 sm:p-6">
          <label className="md:col-span-2"><span className="workspace-label">SEO 标题</span><input className="workspace-control" disabled={disabled} maxLength={200} value={draft.seoTitle} onChange={(event) => setDraft({ ...draft, seoTitle: event.target.value })} /></label>
          <label className="md:col-span-2"><span className="workspace-label">SEO 描述</span><textarea className="workspace-control min-h-20 resize-y" disabled={disabled} maxLength={500} value={draft.seoDescription} onChange={(event) => setDraft({ ...draft, seoDescription: event.target.value })} /></label>
        </div>
        <div className="flex justify-end border-t border-border px-5 py-4 sm:px-6">
          <button className="primary-button" disabled={disabled || !draft.seoTitle.trim() || !draft.seoDescription.trim()} type="button" onClick={() => onSave({ type: "seo", label: "SEO 信息" }, draft)}><Save size={17} /> 保存并更新 SEO</button>
        </div>
      </section>

      <section className="soft-card overflow-hidden">
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <h2 className="font-semibold">{draft.label} · 首屏内容</h2>
          <p className="mt-1 text-sm text-muted-foreground">管理页面进入后最先看到的标题与介绍。</p>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2 sm:p-6">
          <label className="md:col-span-2"><span className="workspace-label">首屏小标题</span><input className="workspace-control" disabled={disabled} maxLength={200} value={draft.hero.eyebrow} onChange={(event) => setDraft({ ...draft, hero: { ...draft.hero, eyebrow: event.target.value } })} /></label>
          <label><span className="workspace-label">首屏主标题</span><input className="workspace-control" disabled={disabled} maxLength={300} value={draft.hero.title} onChange={(event) => setDraft({ ...draft, hero: { ...draft.hero, title: event.target.value } })} /></label>
          <label><span className="workspace-label">书法强调文字</span><input className="workspace-control" disabled={disabled} maxLength={300} value={draft.hero.accent || ""} onChange={(event) => setDraft({ ...draft, hero: { ...draft.hero, accent: event.target.value || undefined } })} /></label>
          <label className="md:col-span-2"><span className="workspace-label">首屏重点文案（可选）</span><input className="workspace-control" disabled={disabled} maxLength={500} value={draft.hero.tagline || ""} onChange={(event) => setDraft({ ...draft, hero: { ...draft.hero, tagline: event.target.value || undefined } })} /></label>
          <label className="md:col-span-2"><span className="workspace-label">首屏说明</span><textarea className="workspace-control min-h-24 resize-y" disabled={disabled} maxLength={2000} value={draft.hero.description} onChange={(event) => setDraft({ ...draft, hero: { ...draft.hero, description: event.target.value } })} /></label>
        </div>
        <div className="flex justify-end border-t border-border px-5 py-4 sm:px-6">
          <button className="primary-button" disabled={disabled || !draft.hero.title.trim()} type="button" onClick={() => onSave({ type: "hero", label: "首屏内容" }, draft)}><Save size={17} /> 保存并更新首屏</button>
        </div>
      </section>

      {draft.sections.map((section, sectionIndex) => (
        <section className="soft-card overflow-hidden" key={section.key}>
          <div className="border-b border-border bg-primary/5 px-5 py-4 sm:px-6">
            <h2 className="font-semibold">{section.label}</h2>
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-2 sm:p-6">
            <label><span className="workspace-label">栏目小标题</span><input className="workspace-control" disabled={disabled} maxLength={200} value={section.eyebrow || ""} onChange={(event) => updateSection(sectionIndex, { eyebrow: event.target.value })} /></label>
            <label><span className="workspace-label">栏目标题</span><input className="workspace-control" disabled={disabled} maxLength={300} value={section.title} onChange={(event) => updateSection(sectionIndex, { title: event.target.value })} /></label>
            <label className="md:col-span-2"><span className="workspace-label">栏目说明</span><textarea className="workspace-control min-h-20 resize-y" disabled={disabled} maxLength={2000} value={section.description || ""} onChange={(event) => updateSection(sectionIndex, { description: event.target.value })} /></label>
          </div>

          {section.items.length ? <div className="border-t border-border px-5 py-2 sm:px-6"><p className="py-3 text-xs font-semibold text-muted-foreground">栏目内容项</p></div> : null}
          {section.key === "tools" && uploadMessage ? <p className="mx-5 mb-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary sm:mx-6" role="status">{uploadMessage}</p> : null}
          <div className="divide-y divide-border border-t border-border">
            {section.items.map((item, itemIndex) => (
              <div className="grid gap-3 px-5 py-5 md:grid-cols-2 sm:px-6" key={item.id}>
                <label><span className="workspace-label">标题（可选）</span><input className="workspace-control" disabled={disabled} maxLength={300} value={item.title || ""} onChange={(event) => updateItem(sectionIndex, itemIndex, { title: event.target.value })} /></label>
                <label><span className="workspace-label">标签或名称（可选）</span><input className="workspace-control" disabled={disabled} maxLength={200} value={item.label || ""} onChange={(event) => updateItem(sectionIndex, itemIndex, { label: event.target.value })} /></label>
                <label className="md:col-span-2"><span className="workspace-label">正文</span><textarea className="workspace-control min-h-20 resize-y" disabled={disabled} maxLength={5000} value={item.text} onChange={(event) => updateItem(sectionIndex, itemIndex, { text: event.target.value })} /></label>
                <label><span className="workspace-label">补充值（可选）</span><input className="workspace-control" disabled={disabled} maxLength={500} value={item.value || ""} onChange={(event) => updateItem(sectionIndex, itemIndex, { value: event.target.value })} /></label>
                <label><span className="workspace-label">引用反馈（可选）</span><input className="workspace-control" disabled={disabled} maxLength={2000} value={item.quote || ""} onChange={(event) => updateItem(sectionIndex, itemIndex, { quote: event.target.value })} /></label>
                <label><span className="workspace-label">链接（可选）</span><input className="workspace-control" disabled={disabled} maxLength={1000} value={item.href || ""} onChange={(event) => updateItem(sectionIndex, itemIndex, { href: event.target.value })} /></label>
                <div>
                  <label><span className="workspace-label">图片地址（可选）</span><input className="workspace-control" disabled={disabled} maxLength={1000} value={item.image || ""} onChange={(event) => updateItem(sectionIndex, itemIndex, { image: event.target.value })} /></label>
                  {section.key === "tools" ? <label className={`secondary-button mt-2 w-fit cursor-pointer ${disabled || uploadingItemId ? "pointer-events-none opacity-60" : ""}`}>
                    {uploadingItemId === item.id ? <LoaderCircle className="animate-spin" size={16} /> : <ImageUp size={16} />}
                    {uploadingItemId === item.id ? "正在上传" : "上传卡片图片"}
                    <input accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={disabled || Boolean(uploadingItemId)} type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadItemImage(file, sectionIndex, itemIndex); event.target.value = ""; }} />
                  </label> : null}
                </div>
                <div className="flex items-end justify-between gap-3 md:col-span-2">
                  <label className="min-w-0 flex-1"><span className="workspace-label">图片说明（可选）</span><input className="workspace-control" disabled={disabled} maxLength={300} value={item.alt || ""} onChange={(event) => updateItem(sectionIndex, itemIndex, { alt: event.target.value })} /></label>
                  <button aria-label="删除内容项" className="icon-button shrink-0 text-red-500" disabled={disabled} title="删除内容项" type="button" onClick={() => updateSection(sectionIndex, { items: section.items.filter((_, index) => index !== itemIndex) })}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 sm:px-6">
            <button className="secondary-button" disabled={disabled} type="button" onClick={() => updateSection(sectionIndex, { items: [...section.items, newItem(section.key)] })}><Plus size={16} /> 添加内容项</button>
            <button className="primary-button" disabled={disabled} type="button" onClick={() => onSave({ type: "section", sectionKey: section.key, label: section.label }, draft)}><Save size={17} /> 保存并更新该板块</button>
          </div>
        </section>
      ))}

      {draft.cta ? (
        <section className="soft-card p-5 sm:p-6">
          <h2 className="font-semibold">页面底部行动区</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label><span className="workspace-label">标题</span><input className="workspace-control" disabled={disabled} value={draft.cta.title} onChange={(event) => setDraft({ ...draft, cta: { ...draft.cta!, title: event.target.value } })} /></label>
            <label><span className="workspace-label">主要按钮文字</span><input className="workspace-control" disabled={disabled} value={draft.cta.primaryLabel} onChange={(event) => setDraft({ ...draft, cta: { ...draft.cta!, primaryLabel: event.target.value } })} /></label>
            <label className="md:col-span-2"><span className="workspace-label">说明</span><textarea className="workspace-control min-h-20" disabled={disabled} value={draft.cta.description} onChange={(event) => setDraft({ ...draft, cta: { ...draft.cta!, description: event.target.value } })} /></label>
            <label><span className="workspace-label">主要按钮链接</span><input className="workspace-control" disabled={disabled} value={draft.cta.primaryHref} onChange={(event) => setDraft({ ...draft, cta: { ...draft.cta!, primaryHref: event.target.value } })} /></label>
            <label><span className="workspace-label">次要按钮文字</span><input className="workspace-control" disabled={disabled} value={draft.cta.secondaryLabel || ""} onChange={(event) => setDraft({ ...draft, cta: { ...draft.cta!, secondaryLabel: event.target.value } })} /></label>
            <label><span className="workspace-label">次要按钮链接</span><input className="workspace-control" disabled={disabled} value={draft.cta.secondaryHref || ""} onChange={(event) => setDraft({ ...draft, cta: { ...draft.cta!, secondaryHref: event.target.value } })} /></label>
          </div>
          <div className="mt-5 flex justify-end border-t border-border pt-4">
            <button className="primary-button" disabled={disabled || !draft.cta.title.trim() || !draft.cta.primaryLabel.trim()} type="button" onClick={() => onSave({ type: "cta", label: "页面底部行动区" }, draft)}><Save size={17} /> 保存并更新行动区</button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
