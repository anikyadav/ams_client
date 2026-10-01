import { formatDate } from "@/lib/formats";

export function deadlineLabel(date: string, now = new Date()) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const days = Math.round((Date.parse(date.slice(0, 10)) - Date.parse(today)) / 86_400_000);
  if (!Number.isFinite(days)) return "";
  if (days < 0) return `${-days} ${days === -1 ? "day" : "days"} overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

export function Deadline({ date, complete = false }: { date?: string | null; complete?: boolean }) {
  const label = date && !complete ? deadlineLabel(date) : "";
  return <div className="text-xs leading-5"><p className="text-muted-foreground">{date ? formatDate(date) : "No target date"}</p>{label && <p className={label.includes("overdue") ? "font-medium text-destructive" : "font-medium"}>{label}</p>}</div>;
}
