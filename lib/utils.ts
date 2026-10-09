export const DIFFICULTIES = ["Easy", "Hard"] as const;
export const STATUSES = ["Not Started", "In Progress", "Completed", "On Hold", "Cancelled"] as const;

export function money(value: number | null | undefined) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(value ?? 0);
}
export function dateLabel(value: string | null | undefined) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" : new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(date);
}
export function statusClass(status: string) {
  return "status status-" + status.toLowerCase().replaceAll(" ", "-");
}
export function errorMessage(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}