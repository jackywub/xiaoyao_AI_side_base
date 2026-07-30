"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { formatCurrency, type LedgerEntry, type LedgerProject } from "@/lib/workspace-data";

const chartColors = ["#4f63d8", "#159570", "#d68a22", "#d85c5c", "#2d8ab8", "#8463a8"];

function shortCurrency(value: number) {
  if (Math.abs(value) >= 10_000) return `${(value / 10_000).toFixed(1)}万`;
  return String(Math.round(value));
}

export function WorkspaceLedgerAnalysis({
  entries,
  projects,
  selectedMonth,
  selectedProjectId,
  selectedProjectName
}: {
  entries: LedgerEntry[];
  projects: LedgerProject[];
  selectedMonth: string;
  selectedProjectId: string;
  selectedProjectName: string;
}) {
  const { dailyData, hasChartEntries, monthlyIncome, monthlyNet, projectData } = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const dayCount = new Date(year, month, 0).getDate();
    const chartEntries = selectedProjectId === "all"
      ? entries
      : entries.filter((entry) => entry.projectId === selectedProjectId);
    const daily = Array.from({ length: dayCount }, (_, index) => {
      const day = index + 1;
      const date = `${selectedMonth}-${String(day).padStart(2, "0")}`;
      const dayEntries = chartEntries.filter((entry) => entry.date === date);
      const income = dayEntries.filter((entry) => entry.type === "income").reduce((sum, entry) => sum + entry.amount, 0);
      const expense = dayEntries.filter((entry) => entry.type === "expense").reduce((sum, entry) => sum + entry.amount, 0);
      return { date: `${day}日`, income, expense, net: income - expense };
    });
    const byProject = projects.map((project) => ({
      id: project.id,
      name: project.name,
      value: entries
        .filter((entry) => entry.projectId === project.id && entry.type === "income")
        .reduce((sum, entry) => sum + entry.amount, 0)
    })).filter((project) => project.value > 0);

    return {
      dailyData: daily,
      hasChartEntries: chartEntries.length > 0,
      monthlyNet: daily.reduce((sum, day) => sum + day.net, 0),
      projectData: byProject,
      monthlyIncome: byProject.reduce((sum, project) => sum + project.value, 0)
    };
  }, [entries, projects, selectedMonth, selectedProjectId]);

  return (
    <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
      <article className="soft-card min-w-0 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-semibold">每日净收益曲线</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              当前展示：{selectedProjectName} · 按天汇总收入减去支出，观察整月收益节奏
            </p>
          </div>
          <div className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-right text-xs text-muted-foreground">
            <span>本月净收益</span>
            <strong className="ml-2 text-sm text-primary">{formatCurrency(monthlyNet)}</strong>
          </div>
        </div>
        <div className="mt-6 h-72 w-full sm:h-80">
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={dailyData} margin={{ bottom: 4, left: 0, right: 12, top: 8 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 5" vertical={false} />
              <XAxis axisLine={false} dataKey="date" interval="preserveStartEnd" minTickGap={20} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} />
              <YAxis axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={shortCurrency} tickLine={false} width={46} />
              <Tooltip contentStyle={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(value) => [formatCurrency(Number(value)), "净收益"]} />
              <ReferenceLine stroke="hsl(var(--muted-foreground))" strokeOpacity={0.35} y={0} />
              <Line activeDot={{ r: 5 }} dataKey="net" dot={false} name="净收益" stroke="hsl(var(--primary))" strokeWidth={3} type="monotone" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {!hasChartEntries ? (
          <p className="mt-3 rounded-lg border border-dashed border-border bg-background/45 px-3 py-2 text-center text-xs text-muted-foreground">
            {selectedProjectName} 在所选月份还没有收支记录，曲线暂时保持为 0。
          </p>
        ) : null}
      </article>

      <article className="soft-card min-w-0 p-5 sm:p-6">
        <div>
          <h2 className="font-semibold">月度收入构成</h2>
          <p className="mt-1 text-sm text-muted-foreground">各副业项目占当月总收入的比例</p>
        </div>
        {projectData.length ? (
          <>
            <div className="relative mt-4 h-52 w-full">
              <ResponsiveContainer height="100%" width="100%">
                <PieChart>
                  <Pie data={projectData} dataKey="value" innerRadius="58%" nameKey="name" outerRadius="88%" paddingAngle={3} stroke="transparent">
                    {projectData.map((project, index) => <Cell fill={chartColors[index % chartColors.length]} key={project.id} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
                <span className="text-xs text-muted-foreground">当月收入</span>
                <strong className="mt-1 text-lg text-primary">{formatCurrency(monthlyIncome)}</strong>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              {projectData.map((project, index) => (
                <div className="flex items-center gap-2 text-xs" key={project.id}>
                  <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{project.name}</span>
                  <strong>{((project.value / monthlyIncome) * 100).toFixed(1)}%</strong>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="grid min-h-72 place-items-center text-center text-sm text-muted-foreground">所选月份还没有收入记录。</div>
        )}
      </article>
    </section>
  );
}
