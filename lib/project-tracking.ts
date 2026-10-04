// Deadlines are calendar dates in Nepal, matching the application's BS inputs.
const NEPAL_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit",
});

/** Today's calendar date in Nepal as YYYY-MM-DD. */
export function nepalToday(now = new Date()) {
  return NEPAL_DATE.format(now);
}

/** Engagements in these statuses no longer need attention for deadlines. */
export function isClosedStatus(status: string) {
  return status === "COMPLETE" || status === "DELIVERED";
}

export function isOverdue(date: string | null | undefined, complete: boolean, now = new Date()) {
  if (!date || complete) return false;
  return date.slice(0, 10) < nepalToday(now);
}
