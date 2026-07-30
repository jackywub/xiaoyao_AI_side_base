"use client";

import { Download, LockKeyhole, MapPinned, Sparkles, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

import { TalentNumberMap } from "@/components/talent-number-map";
import {
  calculateTalentNumberMap,
  compactBirthDateToIso,
  lunarBirthDateToIso,
  type TalentNumberMapData
} from "@/lib/talent-number";

type TalentNumberGeneratorProps = {
  description: string;
  eyebrow?: string;
  title: string;
};

type BirthCalendarMode = "solar" | "lunar";

export function TalentNumberGenerator({ description, eyebrow, title }: TalentNumberGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [compactDate, setCompactDate] = useState("");
  const [calendarMode, setCalendarMode] = useState<BirthCalendarMode>("solar");
  const [mapData, setMapData] = useState<TalentNumberMapData | null>(null);
  const [error, setError] = useState("");
  const mapRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  function openForm() {
    setCompactDate("");
    setCalendarMode("solar");
    setMapData(null);
    setError("");
    setIsOpen(true);
  }

  function generateMap(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const isoDate = calendarMode === "solar" ? compactBirthDateToIso(compactDate) : lunarBirthDateToIso(compactDate);
      const selected = new Date(`${isoDate}T00:00:00`);
      if (selected > new Date()) throw new Error("出生日期不能晚于今天。");
      setMapData(calculateTalentNumberMap(isoDate));
      setError("");
    } catch (calculationError) {
      setMapData(null);
      setError(calculationError instanceof Error ? calculationError.message : "暂时无法计算这一天的地图。");
    }
  }

  function downloadMap() {
    if (!mapRef.current || !mapData) return;
    const source = new XMLSerializer().serializeToString(mapRef.current);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const renderedImage = new window.Image();
    renderedImage.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1520;
      canvas.height = 2096;
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        return;
      }
      context.fillStyle = "#fffdf8";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(renderedImage, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((pngBlob) => {
        URL.revokeObjectURL(objectUrl);
        if (!pngBlob) return;
        const downloadUrl = URL.createObjectURL(pngBlob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `天赋数字地图-${mapData.source.year}${mapData.source.month}${mapData.source.day}.png`;
        link.click();
        URL.revokeObjectURL(downloadUrl);
      }, "image/png");
    };
    renderedImage.onerror = () => URL.revokeObjectURL(objectUrl);
    renderedImage.src = objectUrl;
  }

  const displayedSolarDate = mapData ? `${mapData.source.year}${mapData.source.month}${mapData.source.day}` : "";
  const activeLabel = calendarMode === "solar" ? "阳历生日" : "农历生日";

  return (
    <aside className="mx-auto w-full max-w-xl self-start">
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-[linear-gradient(145deg,hsl(var(--surface)/0.96),hsl(var(--surface-strong)/0.85))] p-7 shadow-soft sm:p-9">
        <div className="absolute -right-12 -top-16 size-48 rounded-full border border-primary/10" />
        <div className="absolute -right-3 -top-6 size-32 rounded-full border border-gold/15" />
        <div className="relative">
          <div className="grid size-12 place-items-center rounded-full border border-primary/25 bg-primary/10 text-primary"><MapPinned size={21} /></div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-primary">{eyebrow || "Talent Map Generator"}</p>
          <h2 className="mt-3 font-display text-3xl font-semibold">{title}</h2>
          <p className="mt-4 leading-8 text-muted-foreground">{description}</p>
          <button className="primary-button mt-7 w-full sm:w-auto" type="button" onClick={openForm}><Sparkles size={17} />生成我的天赋数字地图</button>
          <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole size={13} />出生日期仅在当前浏览器中计算</p>
        </div>
      </div>

      {isOpen ? (
        <div aria-labelledby="talent-map-dialog-title" aria-modal="true" className="fixed inset-0 z-[90] grid items-start justify-items-center overflow-hidden bg-foreground/45 px-4 pb-4 pt-7 backdrop-blur-sm sm:items-center sm:py-6" role="dialog" onClick={() => setIsOpen(false)}>
          <div className="relative h-[min(820px,calc(100vh-3.5rem))] w-full max-w-[30rem] overflow-hidden rounded-[2rem] border border-primary/15 bg-[linear-gradient(145deg,hsl(var(--background)/0.98),hsl(var(--surface-strong)/0.92))] shadow-[0_28px_80px_rgba(20,16,12,0.28)]" onClick={(event) => event.stopPropagation()}>
            <button aria-label="关闭天赋数字地图" className="icon-button absolute right-4 top-4 z-20 bg-white/90" type="button" onClick={() => setIsOpen(false)}><X size={18} /></button>
            <h2 className="sr-only" id="talent-map-dialog-title">生成你的天赋数字地图</h2>

            <form className="h-full space-y-4 overflow-y-auto px-3 pb-4 pt-9 sm:px-4 sm:pb-5 sm:pt-10" onSubmit={generateMap}>
              <div className="overflow-hidden rounded-[1.8rem] border border-primary/10 bg-surface/80 shadow-[0_14px_40px_rgba(96,65,38,0.08)]">
                <TalentNumberMap data={mapData} svgRef={mapRef} />
              </div>

              <section className="rounded-[1.65rem] border border-border/70 bg-surface/95 px-6 py-6 shadow-[0_14px_40px_rgba(96,65,38,0.08)]">
                <div className="grid grid-cols-2 text-center text-lg font-semibold">
                  {(["solar", "lunar"] as const).map((mode) => {
                    const isActive = calendarMode === mode;
                    return (
                      <button
                        aria-pressed={isActive}
                        className={`relative pb-4 transition ${isActive ? "text-primary" : "text-muted-foreground"}`}
                        key={mode}
                        type="button"
                        onClick={() => {
                          setCalendarMode(mode);
                          setMapData(null);
                          setError("");
                        }}
                      >
                        {mode === "solar" ? "阳历生日" : "农历生日"}
                        {isActive ? <span className="absolute bottom-1 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-primary" /> : null}
                      </button>
                    );
                  })}
                </div>

                <label className="relative mx-auto mt-7 block max-w-[22rem]" htmlFor="talent-map-birth-date">
                  <span className="sr-only">{activeLabel}</span>
                  <input
                    autoFocus
                    className="min-h-14 w-full rounded-full border border-border/70 bg-background/80 px-6 pr-14 text-center text-2xl text-foreground shadow-[0_12px_32px_rgba(96,65,38,0.08)] outline-none transition placeholder:text-muted-foreground/55 focus:border-primary focus:ring-4 focus:ring-primary/15"
                    id="talent-map-birth-date"
                    inputMode="numeric"
                    maxLength={8}
                    placeholder="如：19890830"
                    value={compactDate}
                    onChange={(event) => {
                      setCompactDate(event.target.value.replace(/\D/g, "").slice(0, 8));
                      setError("");
                    }}
                  />
                  {compactDate ? (
                    <button
                      aria-label="清空出生日期"
                      className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-primary/10 text-primary transition hover:bg-primary/15"
                      type="button"
                      onClick={() => {
                        setCompactDate("");
                        setMapData(null);
                        setError("");
                      }}
                    >
                      <X size={18} />
                    </button>
                  ) : null}
                </label>

                {mapData ? (
                  <p className="mt-4 text-center text-sm text-muted-foreground">
                    {calendarMode === "lunar" ? "已转为阳历生日" : "当前按阳历生日"}：{displayedSolarDate}
                  </p>
                ) : (
                  <p className="mt-4 text-center text-sm text-muted-foreground">{calendarMode === "lunar" ? "输入农历生日后，会先自动转换为阳历生日再计算。" : "请输入 8 位阳历生日，系统会生成房屋地图和联动数字。"}</p>
                )}

                {error ? <p className="mt-3 text-center text-sm text-red-600" role="alert">{error}</p> : null}

                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <button className="primary-button" type="submit"><Sparkles size={17} />{mapData ? "重新生成" : "生成天赋数字图"}</button>
                  {mapData ? <button className="secondary-button" type="button" onClick={downloadMap}><Download size={16} />下载图片</button> : null}
                </div>
                <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground"><LockKeyhole size={13} />出生日期仅在当前浏览器中计算</p>
              </section>
            </form>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
