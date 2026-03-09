import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (date == null) return "-";
  const d = typeof date === "string" ? parseDateOnly(date) ?? new Date(date) : date;
  const time = d.getTime();
  if (Number.isNaN(time)) return "-";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  }).format(d);
}

export function formatDateInput(date: Date | string): string {
  if (typeof date === "string" && isDateOnly(date)) {
    return date;
  }

  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toISODate(dateStr: string): Date {
  return parseDateOnly(dateStr);
}

export function isDateOnly(value: string): boolean {
  return DATE_ONLY_PATTERN.test(value);
}

export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function toStoredDate(value: string | undefined | null): Date | null {
  if (!value) {
    return null;
  }

  return parseDateOnly(value);
}

export function fromStoredDate(value: Date | undefined | null): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.toISOString().slice(0, 10);
}

export function todayDateOnly(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
