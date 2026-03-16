import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function daysUntil(dateString: string | null | undefined): number | null {
  if (!dateString) return null;
  const diff = new Date(dateString).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function deadlineUrgencyLabel(days: number | null): string {
  if (days == null) return "No deadline";
  if (days < 0) return "Expired";
  if (days <= 7) return "This week";
  if (days <= 30) return "This month";
  if (days <= 90) return "Next 3 months";
  return "90+ days";
}
