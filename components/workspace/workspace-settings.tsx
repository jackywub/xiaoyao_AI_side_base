"use client";

import {
  BookOpenText,
  BrainCircuit,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  LibraryBig,
  Link2,
  LoaderCircle,
  LockKeyhole,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
  type LucideIcon
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type Provider = "WEREAD" | "OBSIDIAN" | "IMA";
type SettingsTab = "profile" | "security" | "connections";

type ProfileSettings = {
  displayName: string;
  avatarUrl: string;
  wechat: string;
  email: string;
  phone: string;
  wechatQrUrl: string;
};

type ConnectionSettings = {
  provider: Provider;
  status: "DISCONNECTED" | "CONNECTED" | "ERROR";
  endpoint: string;
  directory: string;
  hasApiKey: boolean;
  apiKeyHint: string;
  updatedAt: string;
};

type SettingsResponse = {
  profile?: ProfileSettings;
  connections?: ConnectionSettings[];
  error?: string;
  temporaryPassword?: string;
  requiresLogin?: boolean;
};

type ConnectionDraft = { endpoint: string; apiKey: string; directory: string };

const tabs: Array<{ id: SettingsTab; label: string; icon: LucideIcon }> = [
  { id: "profile", label: "个人资料", icon: UserRound },
  { id: "security", label: "密码安全", icon: ShieldCheck },
  { id: "connections", label: "外部连接", icon: Link2 }
];

const providerDetails: Record<Provider, {
  name: string;
  description: string;
  endpointLabel: string;
  placeholder: string;
  directoryLabel?: string;
  directoryPlaceholder?: string;
  icon: LucideIcon;
}> = {
  WEREAD: {
    name: "微信读书",
    description: "连接微信读书 Agent API，同步书架、分类、阅读进度与每日时长。",
    endpointLabel: "接口地址",
    placeholder: "https://i.weread.qq.com/api/agent/gateway",
    icon: BookOpenText
  },
  OBSIDIAN: {
    name: "Obsidian",
    description: "配置 Obsidian 知识库入口和复盘 Markdown 文件的实际保存目录。",
    endpointLabel: "知识库入口",
    placeholder: "obsidian://open?... 或 https://...",
    directoryLabel: "复盘保存目录",
    directoryPlaceholder: "/Users/你的名字/Obsidian资料库/每日复盘",
    icon: LibraryBig
  },
  IMA: {
    name: "IMA 知识库",
    description: "保存 IMA 知识库链接和后续接口访问凭据。",
    endpointLabel: "知识库地址",
    placeholder: "https://...",
    icon: BrainCircuit
  }
};

const providers = Object.keys(providerDetails) as Provider[];

function draftsFromConnections(connections: ConnectionSettings[]) {
  return Object.fromEntries(
    providers.map((provider) => {
      const connection = connections.find((item) => item.provider === provider);
      return [provider, { endpoint: connection?.endpoint || "", apiKey: "", directory: connection?.directory || "" }];
    })
  ) as Record<Provider, ConnectionDraft>;
}

export function WorkspaceSettings({
  onProfileChange
}: {
  onProfileChange: (profile: { displayName: string; avatarUrl: string }) => void;
}) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [profile, setProfile] = useState<ProfileSettings | null>(null);
  const [connections, setConnections] = useState<ConnectionSettings[]>([]);
  const [connectionDrafts, setConnectionDrafts] = useState<Record<Provider, ConnectionDraft>>(
    () => draftsFromConnections([])
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmedPassword, setConfirmedPassword] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadSettings() {
      try {
        const response = await fetch("/api/settings", {
          cache: "no-store",
          signal: controller.signal
        });
        if (response.status === 401) {
          window.location.assign("/login?next=/workspace");
          return;
        }
        const result = await response.json() as SettingsResponse;
        if (!response.ok || !result.profile) throw new Error(result.error || "设置加载失败。");
        const loadedConnections = result.connections || [];
        setProfile(result.profile);
        setConnections(loadedConnections);
        setConnectionDrafts(draftsFromConnections(loadedConnections));
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "设置加载失败。");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    loadSettings();
    return () => controller.abort();
  }, []);

  async function requestSettings(action: string, input: Record<string, unknown>) {
    if (isSaving) return null;
    setIsSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, input })
      });
      if (response.status === 401) {
        window.location.assign("/login?next=/workspace");
        return null;
      }
      const result = await response.json() as SettingsResponse;
      if (!response.ok) throw new Error(result.error || "设置保存失败。");
      if (result.profile) {
        setProfile(result.profile);
        onProfileChange({
          displayName: result.profile.displayName,
          avatarUrl: result.profile.avatarUrl
        });
      }
      if (result.connections) {
        setConnections(result.connections);
        setConnectionDrafts(draftsFromConnections(result.connections));
      }
      return result;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "设置保存失败。");
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    const result = await requestSettings("updateProfile", profile);
    if (result) setSuccess("个人资料已保存。");
  }

  async function uploadImage(kind: "avatar" | "wechatQr", file: File | undefined) {
    if (!file || isSaving) return;
    setIsSaving(true);
    setError("");
    setSuccess("");
    try {
      const formData = new FormData();
      formData.set("kind", kind);
      formData.set("file", file);
      const response = await fetch("/api/settings/upload", { method: "POST", body: formData });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "图片上传失败。");
      setProfile((current) => current ? {
        ...current,
        [kind === "avatar" ? "avatarUrl" : "wechatQrUrl"]: result.url
      } : current);
      if (kind === "avatar" && profile) {
        onProfileChange({ displayName: profile.displayName, avatarUrl: result.url });
      }
      setSuccess(kind === "avatar" ? "头像已更新。" : "微信二维码已更新。");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "图片上传失败。");
    } finally {
      setIsSaving(false);
    }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (nextPassword !== confirmedPassword) {
      setError("两次输入的新密码不一致。");
      return;
    }
    const result = await requestSettings("changePassword", { currentPassword, nextPassword });
    if (result) {
      setCurrentPassword("");
      setNextPassword("");
      setConfirmedPassword("");
      setSuccess("登录密码已修改，其他设备的会话已退出。");
    }
  }

  async function resetPassword() {
    if (!currentPassword || isSaving) return;
    if (!window.confirm("确定生成一个新的随机登录密码吗？生成后所有设备都需要重新登录。")) return;
    const result = await requestSettings("resetPassword", { currentPassword });
    if (result?.temporaryPassword) {
      setTemporaryPassword(result.temporaryPassword);
      setSuccess("密码已安全重置，请保存下方的新密码并重新登录。");
    }
  }

  async function saveConnection(provider: Provider) {
    const draft = connectionDrafts[provider];
    const result = await requestSettings("saveConnection", { provider, ...draft });
    if (result) setSuccess(`${providerDetails[provider].name}连接配置已加密保存。`);
  }

  async function removeConnection(provider: Provider) {
    if (!window.confirm(`确定移除${providerDetails[provider].name}的连接配置吗？`)) return;
    const result = await requestSettings("removeConnection", { provider });
    if (result) setSuccess(`${providerDetails[provider].name}连接配置已移除。`);
  }

  if (isLoading) {
    return <div className="soft-card grid min-h-80 place-items-center text-sm text-muted-foreground"><LoaderCircle className="mr-2 inline animate-spin" size={18} />正在加载设置...</div>;
  }

  return (
    <div className="grid gap-6">
      <nav className="soft-card grid grid-cols-3 gap-2 p-2" aria-label="设置分类">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              aria-current={activeTab === tab.id ? "page" : undefined}
              className={cn(
                "focus-ring flex min-h-12 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition",
                activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-strong hover:text-primary"
              )}
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={17} /> <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {error ? <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300" role="alert">{error}</p> : null}
      {success ? <p className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300" role="status"><CheckCircle2 size={17} />{success}</p> : null}

      {activeTab === "profile" && profile ? (
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <section className="soft-card p-5 sm:p-6">
            <h2 className="font-semibold">头像与微信二维码</h2>
            <div className="mt-6 grid gap-8">
              <div className="text-center">
                <Image alt={profile.displayName} className="mx-auto size-28 rounded-full border-4 border-primary/15 object-cover shadow-soft" height={224} src={profile.avatarUrl} unoptimized width={224} />
                <label className="secondary-button mt-4 cursor-pointer">
                  <Upload size={17} /> 上传头像
                  <input accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={isSaving} type="file" onChange={(event) => uploadImage("avatar", event.target.files?.[0])} />
                </label>
              </div>
              <div className="border-t border-border pt-6 text-center">
                <div className="mx-auto grid aspect-square w-full max-w-48 place-items-center overflow-hidden rounded-lg border border-border bg-white p-2 shadow-line">
                  <Image alt="微信二维码" className="h-full w-full object-contain" height={384} src={profile.wechatQrUrl} unoptimized width={384} />
                </div>
                <label className="secondary-button mt-4 cursor-pointer">
                  <Upload size={17} /> 上传微信二维码
                  <input accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={isSaving} type="file" onChange={(event) => uploadImage("wechatQr", event.target.files?.[0])} />
                </label>
              </div>
            </div>
          </section>

          <form className="soft-card p-5 sm:p-6" onSubmit={saveProfile}>
            <h2 className="font-semibold">个人与联系资料</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label>
                <span className="workspace-label">名称</span>
                <input className="workspace-control" disabled={isSaving} maxLength={100} required value={profile.displayName} onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} />
              </label>
              <label>
                <span className="workspace-label">微信号</span>
                <input className="workspace-control" disabled={isSaving} maxLength={100} value={profile.wechat} onChange={(event) => setProfile({ ...profile, wechat: event.target.value })} />
              </label>
              <label>
                <span className="workspace-label">邮箱</span>
                <input className="workspace-control" disabled={isSaving} maxLength={191} type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} />
              </label>
              <label>
                <span className="workspace-label">电话号码</span>
                <input className="workspace-control" disabled={isSaving} inputMode="tel" maxLength={50} type="tel" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} />
              </label>
            </div>
            <div className="mt-6 flex justify-end">
              <button className="primary-button w-full sm:w-auto" disabled={isSaving} type="submit">
                {isSaving ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />} 保存资料
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {activeTab === "security" ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
          <form className="soft-card p-5 sm:p-6" onSubmit={changePassword}>
            <div className="flex items-start gap-3">
              <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><LockKeyhole size={19} /></span>
              <div><h2 className="font-semibold">修改登录密码</h2><p className="mt-1 text-sm text-muted-foreground">更新后其他设备会退出，当前设备保持登录。</p></div>
            </div>
            <div className="mt-6 grid gap-4">
              <label><span className="workspace-label">当前密码</span><input autoComplete="current-password" className="workspace-control" disabled={isSaving} maxLength={200} required type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
              <label><span className="workspace-label">新密码</span><input autoComplete="new-password" className="workspace-control" disabled={isSaving} maxLength={200} minLength={12} required type="password" value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} /></label>
              <label><span className="workspace-label">确认新密码</span><input autoComplete="new-password" className="workspace-control" disabled={isSaving} maxLength={200} minLength={12} required type="password" value={confirmedPassword} onChange={(event) => setConfirmedPassword(event.target.value)} /></label>
            </div>
            <button className="primary-button mt-6 w-full" disabled={isSaving} type="submit"><KeyRound size={17} /> 修改密码</button>
          </form>

          <section className="soft-card p-5 sm:p-6">
            <h2 className="font-semibold">安全重置</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">输入左侧当前密码后，可生成新的随机密码。重置会退出所有设备。</p>
            <button className="secondary-button mt-6 w-full" disabled={isSaving || !currentPassword} type="button" onClick={resetPassword}><ShieldCheck size={17} /> 重置为随机密码</button>
            {temporaryPassword ? (
              <div className="mt-5 rounded-lg border border-primary/30 bg-primary/5 p-4">
                <p className="text-xs font-semibold text-muted-foreground">新的临时密码</p>
                <code className="mt-2 block break-all text-sm font-semibold text-primary">{temporaryPassword}</code>
                <a className="primary-button mt-4 w-full" href="/login">使用新密码重新登录</a>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {activeTab === "connections" ? (
        <div className="grid gap-4">
          {providers.map((provider) => {
            const detail = providerDetails[provider];
            const Icon = detail.icon;
            const connection = connections.find((item) => item.provider === provider);
            const draft = connectionDrafts[provider];
            return (
              <section className="soft-card p-5 sm:p-6" key={provider}>
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon size={20} /></span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{detail.name}</h2>{connection ? <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold", connection.status === "ERROR" ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400")}>{connection.status === "ERROR" ? "配置异常" : "已配置"}</span> : null}</div>
                      <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{detail.description}</p>
                    </div>
                  </div>
                  {connection?.endpoint ? <a className="secondary-button shrink-0" href={connection.endpoint} rel="noreferrer" target="_blank"><ExternalLink size={17} /> 打开入口</a> : null}
                </div>
                <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.8fr_auto] lg:items-end">
                  <label><span className="workspace-label">{detail.endpointLabel}</span><input className="workspace-control" disabled={isSaving} maxLength={1000} placeholder={detail.placeholder} value={draft.endpoint} onChange={(event) => setConnectionDrafts({ ...connectionDrafts, [provider]: { ...draft, endpoint: event.target.value } })} /></label>
                  <label><span className="workspace-label">API Key {connection?.hasApiKey ? `(${connection.apiKeyHint})` : ""}</span><input autoComplete="off" className="workspace-control" disabled={isSaving} maxLength={2000} placeholder={connection?.hasApiKey ? "留空则保留当前密钥" : "可选"} type="password" value={draft.apiKey} onChange={(event) => setConnectionDrafts({ ...connectionDrafts, [provider]: { ...draft, apiKey: event.target.value } })} /></label>
                  {provider === "OBSIDIAN" ? <label className="lg:col-span-2"><span className="workspace-label">{detail.directoryLabel}</span><input className="workspace-control" disabled={isSaving} maxLength={2000} placeholder={detail.directoryPlaceholder} value={draft.directory} onChange={(event) => setConnectionDrafts({ ...connectionDrafts, [provider]: { ...draft, directory: event.target.value } })} /></label> : null}
                  <div className="flex gap-2">
                    {connection ? <button aria-label={`移除${detail.name}连接`} className="icon-button text-red-500 hover:border-red-400" disabled={isSaving} title="移除连接" type="button" onClick={() => removeConnection(provider)}><Trash2 size={17} /></button> : null}
                    <button className="primary-button flex-1 lg:flex-none" disabled={isSaving || (provider === "OBSIDIAN" ? !draft.directory.trim() : !draft.endpoint.trim())} type="button" onClick={() => saveConnection(provider)}><Save size={17} /> 保存</button>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
