"use client";

import { BookCheck, BookOpenText, Clock3, Headphones, LibraryBig, LoaderCircle, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type ReadingBook = {
  id: string;
  externalId: string;
  title: string;
  author: string;
  category: string;
  progress: number;
  totalReadSeconds: number;
  lastReadAt: string | null;
  isAudio: boolean;
};

type ReadingStatus = "finished" | "reading" | "unread";

type WeReadLibraryData = {
  connected: boolean;
  status: "CONNECTED" | "DISCONNECTED" | "ERROR";
  lastSyncedAt: string | null;
  lastError: string | null;
  summary: {
    electronicCount: number;
    audioCount: number;
    hasArticleCollection: boolean;
    visibleShelfCount: number;
    startedCount: number;
    finishedCount: number;
  };
  books: ReadingBook[];
  dailyStats: Array<{ date: string; durationSeconds: number }>;
  error?: string;
};

function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} 小时 ${rest} 分钟` : `${hours} 小时`;
}

function categoryGroup(category: string) {
  return category.split("-")[0]?.trim() || "未分类";
}

function readingStatus(book: ReadingBook): ReadingStatus {
  if (book.progress >= 100) return "finished";
  if (book.progress > 0 || book.totalReadSeconds > 0 || book.lastReadAt) return "reading";
  return "unread";
}

const readingStatusOrder: ReadingStatus[] = ["finished", "reading", "unread"];
const initialVisibleByStatus: Record<ReadingStatus, number> = {
  finished: 12,
  reading: 12,
  unread: 12
};

const readingStatusMeta: Record<ReadingStatus, {
  label: string;
  description: string;
  icon: typeof BookOpenText;
  tone: string;
  progressClass: string;
}> = {
  finished: {
    label: "已读完",
    description: "阅读进度达到 100% 的书籍",
    icon: BookCheck,
    tone: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    progressClass: "bg-emerald-600"
  },
  reading: {
    label: "正在阅读",
    description: "已经开始阅读，但还没有读完",
    icon: BookOpenText,
    tone: "border-primary/25 bg-primary/10 text-primary",
    progressClass: "bg-primary"
  },
  unread: {
    label: "未阅读",
    description: "暂无阅读进度的书籍",
    icon: LibraryBig,
    tone: "border-border bg-surface-strong text-muted-foreground",
    progressClass: "bg-muted-foreground/45"
  }
};

function BookCard({ book }: { book: ReadingBook }) {
  const status = readingStatus(book);
  const meta = readingStatusMeta[status];
  return (
    <article className="rounded-lg border border-border bg-background p-4" key={book.id}>
      <div className="flex items-start gap-3">
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", book.isAudio ? "bg-amber-500/10 text-amber-600" : "bg-primary/10 text-primary")}>{book.isAudio ? <Headphones size={17} /> : <BookOpenText size={17} />}</span>
        <div className="min-w-0 flex-1"><h3 className="line-clamp-2 text-sm font-semibold">{book.title}</h3><p className="mt-1 truncate text-xs text-muted-foreground">{book.author || "作者未知"}</p></div>
        {!book.isAudio && book.externalId ? <a aria-label={`在微信读书打开 ${book.title}`} className="text-xs font-semibold text-primary hover:underline" href={`weread://reading?bId=${encodeURIComponent(book.externalId)}`}>打开</a> : null}
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 text-xs"><span className="truncate rounded-md bg-surface-strong px-2 py-1 text-muted-foreground">{book.category}</span><strong className="shrink-0 text-primary">{book.progress}%</strong></div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn("h-full transition-all", meta.progressClass)} style={{ width: `${book.progress}%` }} /></div>
      {book.totalReadSeconds > 0 ? <p className="mt-2 text-xs text-muted-foreground">累计阅读 {formatDuration(book.totalReadSeconds)}</p> : null}
    </article>
  );
}

export function WorkspaceReadingLibrary({
  selectedDate,
  onSynced
}: {
  selectedDate: string;
  onSynced: () => Promise<boolean>;
}) {
  const [data, setData] = useState<WeReadLibraryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeReadingStatus, setActiveReadingStatus] = useState<ReadingStatus>("reading");
  const [visibleByStatus, setVisibleByStatus] = useState<Record<ReadingStatus, number>>(initialVisibleByStatus);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/workspace/weread", { cache: "no-store", signal: controller.signal });
        const result = await response.json() as WeReadLibraryData;
        if (!response.ok) throw new Error(result.error || "微信读书数据加载失败。");
        setData(result);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "微信读书数据加载失败。");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, []);

  const categories = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.books.map((book) => categoryGroup(book.category)))].sort((left, right) => left.localeCompare(right, "zh-CN"));
  }, [data]);
  const filteredBooks = useMemo(() => {
    if (!data) return [];
    const keyword = query.trim().toLocaleLowerCase("zh-CN");
    return data.books.filter((book) => {
      const categoryMatches = selectedCategory === "all" || categoryGroup(book.category) === selectedCategory;
      const keywordMatches = !keyword || `${book.title} ${book.author} ${book.category}`.toLocaleLowerCase("zh-CN").includes(keyword);
      return categoryMatches && keywordMatches;
    });
  }, [data, query, selectedCategory]);
  const groupedBooks = useMemo(() => {
    const groups: Record<ReadingStatus, ReadingBook[]> = {
      finished: [],
      reading: [],
      unread: []
    };
    filteredBooks.forEach((book) => groups[readingStatus(book)].push(book));
    return groups;
  }, [filteredBooks]);
  const activeStatusMeta = readingStatusMeta[activeReadingStatus];
  const ActiveStatusIcon = activeStatusMeta.icon;
  const activeStatusBooks = groupedBooks[activeReadingStatus];
  const visibleActiveBooks = activeStatusBooks.slice(0, visibleByStatus[activeReadingStatus]);
  const selectedDaySeconds = data?.dailyStats.find((stat) => stat.date === selectedDate)?.durationSeconds || 0;
  const currentMonth = selectedDate.slice(0, 7);
  const currentMonthSeconds = data?.dailyStats.filter((stat) => stat.date.startsWith(currentMonth)).reduce((sum, stat) => sum + stat.durationSeconds, 0) || 0;

  async function sync() {
    if (isSyncing) return;
    setIsSyncing(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/workspace/weread", { method: "POST" });
      const result = await response.json() as WeReadLibraryData;
      if (!response.ok) throw new Error(result.error || "微信读书同步失败。");
      setData(result);
      setVisibleByStatus(initialVisibleByStatus);
      await onSynced();
      setSuccess(`同步完成：书架 ${result.summary.visibleShelfCount} 个可见条目。`);
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "微信读书同步失败。");
    } finally {
      setIsSyncing(false);
    }
  }

  if (isLoading) {
    return <section className="soft-card grid min-h-48 place-items-center text-sm text-muted-foreground"><span className="flex items-center gap-2"><LoaderCircle className="animate-spin" size={20} /> 正在读取微信书架...</span></section>;
  }

  return (
    <section className="grid gap-5">
      <div className="soft-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><LibraryBig size={20} /></span>
            <div><h2 className="font-semibold">微信读书同步</h2><p className="mt-1 text-sm text-muted-foreground">同步书架、分类、阅读进度和最近 12 个月每日阅读时长</p>{data?.lastSyncedAt ? <p className="mt-1 text-xs text-muted-foreground">上次同步：{new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(data.lastSyncedAt))}</p> : null}</div>
          </div>
          <button className="primary-button shrink-0" disabled={isSyncing || !data?.connected} type="button" onClick={sync}>{isSyncing ? <LoaderCircle className="animate-spin" size={17} /> : <RefreshCw size={17} />} {isSyncing ? "正在同步" : "同步微信读书"}</button>
        </div>
        {data && !data.connected ? <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">请先前往设置 → 外部连接，填写微信读书 API Key。</p> : null}
        {error ? <p className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{error}</p> : null}
        {success ? <p className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">{success}</p> : null}
      </div>

      {data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="soft-card p-4"><LibraryBig className="text-primary" size={19} /><p className="mt-3 text-xs text-muted-foreground">书架可见条目</p><strong className="mt-1 block text-2xl">{data.summary.visibleShelfCount}</strong><p className="mt-1 text-xs text-muted-foreground">{data.summary.electronicCount} 本电子书 · {data.summary.audioCount} 本有声书{data.summary.hasArticleCollection ? " · 文章收藏" : ""}</p></article>
            <article className="soft-card p-4"><Clock3 className="text-emerald-600" size={19} /><p className="mt-3 text-xs text-muted-foreground">{selectedDate} 阅读</p><strong className="mt-1 block text-2xl">{formatDuration(selectedDaySeconds)}</strong><p className="mt-1 text-xs text-muted-foreground">当天微信读书时长</p></article>
            <article className="soft-card p-4"><BookOpenText className="text-amber-600" size={19} /><p className="mt-3 text-xs text-muted-foreground">本月阅读</p><strong className="mt-1 block text-2xl">{formatDuration(currentMonthSeconds)}</strong><p className="mt-1 text-xs text-muted-foreground">{currentMonth.replace("-", " 年 ")} 月累计</p></article>
            <article className="soft-card p-4"><BookCheck className="text-sky-600" size={19} /><p className="mt-3 text-xs text-muted-foreground">阅读进度</p><strong className="mt-1 block text-2xl">{data.summary.startedCount} / {data.summary.finishedCount}</strong><p className="mt-1 text-xs text-muted-foreground">在读 / 已读完</p></article>
          </div>

          <div className="soft-card overflow-hidden">
            <div className="border-b border-border p-5 sm:p-6">
              <div><h2 className="font-semibold">我的微信书架</h2><p className="mt-1 text-sm text-muted-foreground">按阅读情况归类展示，支持搜索书名、作者和分类</p></div>
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_13rem]">
                <label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} /><input aria-label="搜索微信书架" className="workspace-control pl-10" placeholder="搜索书名、作者或分类" value={query} onChange={(event) => { setQuery(event.target.value); setVisibleByStatus(initialVisibleByStatus); }} /></label>
                <label><span className="sr-only">书籍分类</span><select aria-label="筛选书籍分类" className="workspace-control" value={selectedCategory} onChange={(event) => { setSelectedCategory(event.target.value); setVisibleByStatus(initialVisibleByStatus); }}><option value="all">全部分类（{data.books.length}）</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3" role="tablist" aria-label="按阅读状态筛选书籍">
                {readingStatusOrder.map((status) => {
                  const meta = readingStatusMeta[status];
                  const Icon = meta.icon;
                  const isActive = activeReadingStatus === status;
                  return (
                    <button
                      aria-selected={isActive}
                      className={cn(
                        "focus-ring flex min-h-16 items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition hover:-translate-y-0.5",
                        meta.tone,
                        isActive ? "ring-2 ring-primary/25 shadow-line" : "opacity-80 hover:opacity-100"
                      )}
                      key={status}
                      role="tab"
                      type="button"
                      onClick={() => setActiveReadingStatus(status)}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold"><Icon size={17} />{meta.label}</span>
                      <strong>{groupedBooks[status].length}</strong>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-6 p-4 sm:p-5">
              <section className="rounded-xl border border-border/80 bg-surface/55 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg border", activeStatusMeta.tone)}><ActiveStatusIcon size={18} /></span>
                    <div>
                      <h3 className="font-semibold">{activeStatusMeta.label} <span className="text-sm text-muted-foreground">({activeStatusBooks.length})</span></h3>
                      <p className="mt-1 text-xs text-muted-foreground">{activeStatusMeta.description}</p>
                    </div>
                  </div>
                </div>
                {visibleActiveBooks.length ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {visibleActiveBooks.map((book) => <BookCard book={book} key={book.id} />)}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">当前筛选条件下没有{activeStatusMeta.label}的书籍。</p>
                )}
                {activeStatusBooks.length > visibleByStatus[activeReadingStatus] ? (
                  <div className="mt-4 text-center">
                    <button className="secondary-button" type="button" onClick={() => setVisibleByStatus((counts) => ({ ...counts, [activeReadingStatus]: counts[activeReadingStatus] + 12 }))}>
                      继续显示{activeStatusMeta.label}（剩余 {activeStatusBooks.length - visibleByStatus[activeReadingStatus]} 本）
                    </button>
                  </div>
                ) : null}
              </section>
              {!filteredBooks.length ? <p className="col-span-full py-12 text-center text-sm text-muted-foreground">没有符合当前条件的书籍。</p> : null}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
