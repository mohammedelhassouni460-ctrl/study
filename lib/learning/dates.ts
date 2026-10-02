/** Date helpers working on calendar days ("YYYY-MM-DD"), timezone-safe. */

const DAY_MS = 24 * 60 * 60 * 1000;

export function toISODate(date: Date, timeZone = "Europe/Paris"): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function parseISODate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(isoDate: string, days: number): string {
  const date = parseISODate(isoDate);
  return new Date(date.getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (negative when `to` is in the past). */
export function daysBetween(from: string, to: string): number {
  return Math.round((parseISODate(to).getTime() - parseISODate(from).getTime()) / DAY_MS);
}

export function startOfMonthUTC(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

const frenchDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });
const frenchWeekday = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

export function formatFrenchDate(isoDate: string): string {
  return frenchDate.format(parseISODate(isoDate));
}

export function formatFrenchWeekday(isoDate: string): string {
  const s = frenchWeekday.format(parseISODate(isoDate));
  return s.charAt(0).toUpperCase() + s.slice(1);
}
