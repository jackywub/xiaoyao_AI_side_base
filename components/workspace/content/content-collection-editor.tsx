"use client";

import { Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import type { AdminCategory } from "@/lib/content-admin-types";

type EditableRecord = Record<string, unknown> & { id: string; status: string };
type Field = {
  key: string;
  label: string;
  kind?: "text" | "textarea" | "number" | "select" | "checkbox" | "list";
  required?: boolean;
  wide?: boolean;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
};

type Props = {
  title: string;
  description: string;
  itemLabel: string;
  items: EditableRecord[];
  fields: Field[];
  emptyItem: EditableRecord;
  disabled: boolean;
  labelKey?: string;
  onSave: (item: EditableRecord) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
};

export function categoryOptions(categories: AdminCategory[]) {
  return [{ label: "未分类", value: "" }, ...categories.map((category) => ({ label: category.name, value: category.id }))];
}

function recordLabel(record: EditableRecord, labelKey = "title") {
  return String(record[labelKey] || record.title || record.name || "未命名");
}

function RecordForm({ initial, fields, itemLabel, disabled, isNew, labelKey, onSave, onDelete }: {
  initial: EditableRecord;
  fields: Field[];
  itemLabel: string;
  disabled: boolean;
  isNew?: boolean;
  labelKey?: string;
  onSave: Props["onSave"];
  onDelete: Props["onDelete"];
}) {
  const [draft, setDraft] = useState(initial);
  const missingRequired = fields.some((field) => field.required && !String(draft[field.key] ?? "").trim());

  function update(key: string, value: unknown) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="grid gap-4 p-5 sm:p-6">
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <label className={field.wide ? "md:col-span-2" : ""} key={field.key}>
            <span className="workspace-label">{field.label}</span>
            {field.kind === "textarea" ? (
              <textarea className="workspace-control min-h-24 resize-y" disabled={disabled} placeholder={field.placeholder} value={String(draft[field.key] ?? "")} onChange={(event) => update(field.key, event.target.value)} />
            ) : field.kind === "select" ? (
              <select className="workspace-control" disabled={disabled} value={String(draft[field.key] ?? "")} onChange={(event) => update(field.key, event.target.value)}>{field.options?.map((option) => <option key={option.value || "empty"} value={option.value}>{option.label}</option>)}</select>
            ) : field.kind === "checkbox" ? (
              <span className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-background px-4"><input checked={Boolean(draft[field.key])} disabled={disabled} type="checkbox" onChange={(event) => update(field.key, event.target.checked)} /><span className="text-sm">启用</span></span>
            ) : field.kind === "list" ? (
              <textarea className="workspace-control min-h-24 resize-y" disabled={disabled} placeholder="每行一项" value={Array.isArray(draft[field.key]) ? (draft[field.key] as string[]).join("\n") : ""} onChange={(event) => update(field.key, event.target.value.split("\n").map((item) => item.trim()).filter(Boolean))} />
            ) : (
              <input className="workspace-control" disabled={disabled} min={field.kind === "number" ? 0 : undefined} placeholder={field.placeholder} type={field.kind === "number" ? "number" : "text"} value={draft[field.key] === null ? "" : String(draft[field.key] ?? "")} onChange={(event) => update(field.key, field.kind === "number" ? (event.target.value ? Number(event.target.value) : null) : event.target.value)} />
            )}
          </label>
        ))}
      </div>
      <div className="flex justify-between gap-3">
        {!isNew ? <button className="secondary-button text-red-500" disabled={disabled} type="button" onClick={() => { if (window.confirm(`确定删除${itemLabel}“${recordLabel(draft, labelKey)}”吗？`)) void onDelete(draft.id); }}><Trash2 size={16} /> 删除</button> : <span />}
        <button className="primary-button" disabled={disabled || missingRequired} type="button" onClick={() => onSave(draft)}><Save size={16} /> {isNew ? `新增${itemLabel}` : "保存修改"}</button>
      </div>
    </div>
  );
}

export function ContentCollectionEditor({ title, description, itemLabel, items, fields, emptyItem, disabled, labelKey, onSave, onDelete }: Props) {
  const [showNew, setShowNew] = useState(false);
  return (
    <section className="soft-card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>
        <button className="primary-button shrink-0" disabled={disabled} type="button" onClick={() => setShowNew((value) => !value)}><Plus size={16} /> 新增{itemLabel}</button>
      </div>
      {showNew ? <div className="border-b border-primary/30 bg-primary/5"><RecordForm disabled={disabled} fields={fields} initial={{ ...emptyItem, id: "" }} isNew itemLabel={itemLabel} labelKey={labelKey} onDelete={onDelete} onSave={async (item) => { const saved = await onSave(item); if (saved) setShowNew(false); return saved; }} /></div> : null}
      <div className="divide-y divide-border">
        {items.map((item) => (
          <details className="group" key={item.id}>
            <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition hover:bg-primary/5 sm:px-6">
              <div className="min-w-0"><h3 className="truncate font-semibold">{recordLabel(item, labelKey)}</h3><p className="mt-1 text-xs text-muted-foreground">{item.status === "PUBLISHED" || item.status === "ACTIVE" ? "前台可见" : item.status === "DRAFT" ? "草稿" : "已停用"}</p></div>
              <span className={cn("rounded-md bg-surface-strong px-2.5 py-1 text-xs text-muted-foreground group-open:text-primary")}>编辑</span>
            </summary>
            <div className="border-t border-border bg-background/35"><RecordForm disabled={disabled} fields={fields} initial={item} itemLabel={itemLabel} labelKey={labelKey} onDelete={onDelete} onSave={onSave} /></div>
          </details>
        ))}
        {!items.length ? <p className="px-5 py-12 text-center text-sm text-muted-foreground">还没有{itemLabel}。</p> : null}
      </div>
    </section>
  );
}
