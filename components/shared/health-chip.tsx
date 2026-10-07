import { cn } from "@/lib/utils";
import { engagementHealth, healthLabel, type HealthLevel } from "@/lib/health";
import type { Engagement } from "@/lib/types";

const tone: Record<HealthLevel, { chip: string; dot: string }> = {
  ON_TRACK: {
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  AT_RISK: {
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  OFF_TRACK: {
    chip: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
    dot: "bg-rose-500",
  },
};

/** Traffic-light chip for an open engagement; renders nothing once it is closed. */
export function HealthChip({ engagement }: { engagement: Engagement }) {
  const health = engagementHealth(engagement);
  if (!health) return null;
  return (
    <span
      title={health.reasons.join(" · ")}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        tone[health.level].chip,
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", tone[health.level].dot)} />
      {healthLabel[health.level]}
      <span className="sr-only">: {health.reasons.join(", ")}</span>
    </span>
  );
}
