// Deadlines are calendar dates in Nepal, matching the application's BS inputs.
export function isOverdue(date: string | null | undefined, complete: boolean, now = new Date()) {
  if (!date || complete) return false;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  return date.slice(0, 10) < today;
}
