"use client";

import { LoaderCircle, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Message = { id: string; role: "user" | "assistant" | "system"; content: string; createdAt: string };

const quickPrompts = [
  "根据我当前的任务，帮我安排今天的优先顺序",
  "分析项目风险，并给出下一步行动",
  "根据最近记录，给我一份简短复盘",
  "把一个复杂任务拆成可执行的子任务"
];

export function WorkspaceAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("");
  const [provider, setProvider] = useState("Hermes");
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/workspace/assistant", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "AI 助手加载失败。");
        setMessages(data.messages || []);
        setModel(data.currentModel || "");
        setProvider(data.provider || "Hermes");
        setAvailable(Boolean(data.available));
      })
      .catch((reason) => {
        if (reason.name !== "AbortError") setError(reason.message || "AI 助手加载失败。");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, sending]);

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = prompt.trim();
    if (!content || sending) return;
    const localMessage: Message = { id: `local-${Date.now()}`, role: "user", content, createdAt: new Date().toISOString() };
    setMessages((current) => [...current, localMessage]);
    setPrompt("");
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/workspace/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: content, model })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "AI 助手暂时无法回答。");
      setMessages((current) => [...current, data.message]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AI 助手暂时无法回答。");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <section className="soft-card flex min-h-[38rem] flex-col overflow-hidden">
        <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-4"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground"><Sparkles size={19} /></span><div><h2 className="font-semibold">成长工作台 AI 助手</h2><p className="mt-0.5 text-xs text-muted-foreground">{provider} · {model || "自动模型"}</p></div></div><span className={`text-xs font-semibold ${available ? "text-emerald-600" : "text-amber-600"}`}>{available ? "已连接" : "未连接"}</span></header>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {loading ? <div className="grid min-h-72 place-items-center text-sm text-muted-foreground"><LoaderCircle className="animate-spin" size={22} /></div> : null}
          {!loading && !messages.length ? <div className="mx-auto max-w-md py-20 text-center"><Sparkles className="mx-auto text-primary" size={28} /><h3 className="mt-4 font-semibold">从当前工作台开始对话</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">助手会读取未完成任务、项目进度和习惯摘要，帮助你做计划、拆任务和复盘。</p></div> : null}
          {messages.map((message) => <article className={`max-w-[88%] rounded-lg px-4 py-3 text-sm leading-7 ${message.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "border border-border bg-background"}`} key={message.id}><p className="whitespace-pre-wrap">{message.content}</p></article>)}
          {sending ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="animate-spin" size={16} /> 正在结合工作台数据思考...</div> : null}
          <div ref={endRef} />
        </div>
        <form className="border-t border-border p-4" onSubmit={send}><div className="flex gap-2"><textarea className="workspace-control min-h-14 flex-1 resize-none" disabled={sending || !available} placeholder={available ? "输入你的问题，Enter 换行后点击发送" : "Hermes 未连接，请先确认本机服务"} value={prompt} onChange={(event) => setPrompt(event.target.value)} /><button className="icon-button h-14 w-14" disabled={sending || !available || !prompt.trim()} title="发送" type="submit"><Send size={18} /></button></div>{error ? <p className="mt-3 text-sm text-red-600" role="alert">{error}</p> : null}</form>
      </section>
      <aside className="space-y-3"><p className="text-sm font-semibold">快捷提问</p>{quickPrompts.map((item) => <button className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-left text-sm leading-6 transition hover:border-primary/45 hover:text-primary" key={item} type="button" onClick={() => setPrompt(item)}>{item}</button>)}<div className="rounded-lg border border-border bg-surface-strong p-4 text-xs leading-6 text-muted-foreground">AI 建议用于辅助思考。涉及重要决定时，请结合真实情况判断。</div></aside>
    </div>
  );
}
