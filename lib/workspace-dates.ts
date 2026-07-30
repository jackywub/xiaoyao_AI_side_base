const TIME_ZONE = "Asia/Shanghai";

export function currentDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function parseDateKey(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function dateKeyFromDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function shiftDateKey(value: string, offset: number) {
  const date = parseDateKey(value);
  date.setUTCDate(date.getUTCDate() + offset);
  return dateKeyFromDate(date);
}

export function getDateRange(endDate: string, days: number) {
  return Array.from({ length: days }, (_, index) =>
    shiftDateKey(endDate, index - days + 1)
  );
}

export function formatWorkspaceDate(value: string, includeYear = true) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "UTC",
    ...(includeYear ? { year: "numeric" as const } : {}),
    month: "long",
    day: "numeric",
    weekday: "short"
  }).format(parseDateKey(value));
}

export function getMonthGrid(value: string) {
  const selected = parseDateKey(value);
  const monthStart = new Date(Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth(), 1));
  const mondayOffset = (monthStart.getUTCDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setUTCDate(gridStart.getUTCDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setUTCDate(date.getUTCDate() + index);
    return {
      date: dateKeyFromDate(date),
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === selected.getUTCMonth()
    };
  });
}

export function shiftMonth(value: string, offset: number) {
  const date = parseDateKey(value);
  const targetDay = date.getUTCDate();
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(targetDay, lastDay));
  return dateKeyFromDate(target);
}

export function formatMonthTitle(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "UTC",
    year: "numeric",
    month: "long"
  }).format(parseDateKey(value));
}
