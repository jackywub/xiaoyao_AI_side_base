"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import {
  currentDateKey,
  formatMonthTitle,
  formatWorkspaceDate,
  getMonthGrid,
  shiftDateKey,
  shiftMonth
} from "@/lib/workspace-dates";
import { cn } from "@/lib/utils";

export type CalendarMarker = {
  completionRate: number;
  hasIncome: boolean;
};

type WorkspaceCalendarProps = {
  selectedDate: string;
  onSelect: (date: string) => void;
  markers?: Record<string, CalendarMarker>;
  className?: string;
};

const weekDays = ["一", "二", "三", "四", "五", "六", "日"];

export function WorkspaceCalendar({
  selectedDate,
  onSelect,
  markers = {},
  className
}: WorkspaceCalendarProps) {
  const [monthOffset, setMonthOffset] = useState(0);
  const visibleMonth = shiftMonth(selectedDate, monthOffset);
  const today = currentDateKey();

  function selectDate(date: string) {
    setMonthOffset(0);
    onSelect(date);
  }

  return (
    <section className={cn("soft-card p-4 sm:p-5", className)} aria-label="日期选择">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <CalendarDays className="shrink-0 text-primary" size={18} />
          <div className="min-w-0">
            <p className="font-semibold">{formatMonthTitle(visibleMonth)}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{formatWorkspaceDate(selectedDate)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="icon-button size-9" title="上个月" type="button" onClick={() => setMonthOffset((value) => value - 1)}>
            <ChevronLeft size={16} />
          </button>
          <button className="focus-ring min-h-9 rounded-lg px-2.5 text-xs font-semibold text-primary hover:bg-primary/10" type="button" onClick={() => selectDate(today)}>
            今天
          </button>
          <button className="icon-button size-9" title="下个月" type="button" onClick={() => setMonthOffset((value) => value + 1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1" aria-hidden="true">
        {weekDays.map((day) => <span className="grid h-7 place-items-center text-[11px] font-semibold text-muted-foreground" key={day}>周{day}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {getMonthGrid(visibleMonth).map((item) => {
          const marker = markers[item.date];
          const selected = item.date === selectedDate;
          return (
            <button
              aria-label={formatWorkspaceDate(item.date)}
              aria-pressed={selected}
              className={cn(
                "focus-ring relative grid aspect-square min-h-9 place-items-center rounded-md text-xs font-semibold transition",
                selected && "bg-primary text-primary-foreground shadow-line",
                !selected && item.date === today && "border border-primary/40 text-primary",
                !selected && item.inMonth && "hover:bg-primary/10 hover:text-primary",
                !item.inMonth && "text-muted-foreground/40"
              )}
              key={item.date}
              type="button"
              onClick={() => selectDate(item.date)}
            >
              {item.day}
              {marker ? (
                <span className="absolute inset-x-1 bottom-1 flex justify-center gap-0.5" aria-hidden="true">
                  <span className={cn("h-0.5 flex-1 rounded-full", selected ? "bg-primary-foreground/70" : marker.completionRate >= 100 ? "bg-emerald-500" : marker.completionRate > 0 ? "bg-amber-500" : "bg-border")} />
                  {marker.hasIncome ? <span className={cn("size-1 rounded-full", selected ? "bg-primary-foreground" : "bg-emerald-500")} /> : null}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-[auto_1fr_auto] items-center gap-2 border-t border-border pt-4">
        <button className="icon-button size-10" title="前一天" type="button" onClick={() => selectDate(shiftDateKey(selectedDate, -1))}><ChevronLeft size={17} /></button>
        <input className="workspace-control text-center" aria-label="选择日期" type="date" value={selectedDate} onChange={(event) => selectDate(event.target.value)} />
        <button className="icon-button size-10" title="后一天" type="button" onClick={() => selectDate(shiftDateKey(selectedDate, 1))}><ChevronRight size={17} /></button>
      </div>
    </section>
  );
}
