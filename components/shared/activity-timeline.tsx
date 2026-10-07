import Link from "next/link";
import {
  CircleCheckBigIcon,
  CirclePlusIcon,
  FileCheck2Icon,
  ListChecksIcon,
  MessageSquareWarningIcon,
  ShieldCheckIcon,
  MessageSquareTextIcon,
  PencilIcon,
  RotateCcwIcon,
  Trash2Icon,
  TrendingUpIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";
import { formatDateTime } from "@/lib/formats";
import type { ActivityEntry } from "@/lib/types";

const ACTION_STYLE: Record<string, { icon: LucideIcon; label: string; tone: string }> = {
  ENGAGEMENT_COMPLETED: { icon: CircleCheckBigIcon, label: "Engagement completed", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  ENGAGEMENT_REOPENED: { icon: RotateCcwIcon, label: "Engagement reopened", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  DOCUMENT_UPDATED: { icon: PencilIcon, label: "Document updated", tone: "bg-primary/10 text-primary" },
  DOCUMENT_PASSWORD_REVEALED: { icon: PencilIcon, label: "Password accessed", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  SUBTASK_CREATED: { icon: CirclePlusIcon, label: "Created", tone: "bg-primary/10 text-primary" },
  SUBTASK_PROGRESS: { icon: TrendingUpIcon, label: "Progress", tone: "bg-primary/10 text-primary" },
  SUBTASK_COMPLETED: {
    icon: CircleCheckBigIcon,
    label: "Completed",
    tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
  SUBTASK_REOPENED: {
    icon: RotateCcwIcon,
    label: "Reopened",
    tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  SUBTASK_APPROVED: {
    icon: ShieldCheckIcon,
    label: "Approved",
    tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
  SUBTASK_CHANGES_REQUESTED: {
    icon: MessageSquareWarningIcon,
    label: "Changes requested",
    tone: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  },
  SUBTASK_CHECKLIST: { icon: ListChecksIcon, label: "Activity", tone: "bg-primary/10 text-primary" },
  REQUEST_ADDED: { icon: FileCheck2Icon, label: "Document requested", tone: "bg-muted text-muted-foreground" },
  REQUEST_RECEIVED: {
    icon: FileCheck2Icon,
    label: "Document received",
    tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
  REQUEST_REOPENED: { icon: RotateCcwIcon, label: "Request reopened", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  REQUEST_REMOVED: { icon: Trash2Icon, label: "Request removed", tone: "bg-destructive/10 text-destructive" },
  SUBTASK_NOTE: { icon: MessageSquareTextIcon, label: "Note", tone: "bg-muted text-muted-foreground" },
  SUBTASK_UPDATED: { icon: PencilIcon, label: "Updated", tone: "bg-muted text-muted-foreground" },
  SUBTASK_DELETED: { icon: Trash2Icon, label: "Deleted", tone: "bg-destructive/10 text-destructive" },
};
const FALLBACK_STYLE = { icon: PencilIcon, label: "Change", tone: "bg-muted text-muted-foreground" };

// Older entries stored raw enum values; show the same labels the app uses elsewhere.
const readable = (text: string) =>
  text
    .replace(/\bIN_PROGRESS\b/g, "In progress")
    .replace(/\bTODO\b/g, "Not started")
    .replace(/\bDONE\b/g, "Completed");

/** One audit-trail entry: what changed, who did it and when. */
export function ActivityEntryItem({
  entry,
  showEngagement = false,
  connector = true,
}: {
  entry: ActivityEntry;
  showEngagement?: boolean;
  connector?: boolean;
}) {
  const style = ACTION_STYLE[entry.action] ?? FALLBACK_STYLE;
  const Icon = style.icon;
  // First line is the headline; anything after it is the user's note.
  const [headline, ...rest] = readable(entry.summary).split(/\r?\n/);
  const note = rest.join("\n").replace(/^Note:\s*/, "");
  return (
    <li className="relative flex gap-3 text-sm">
      {connector && (
        <span aria-hidden="true" className="absolute top-8 -bottom-5 left-3.5 w-px bg-border" />
      )}
      <span
        aria-hidden="true"
        className={cn("z-10 flex size-7 shrink-0 items-center justify-center rounded-full", style.tone)}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="wrap-break-word">
          <span className="sr-only">{style.label}: </span>
          {headline}
        </p>
        {note && (
          <blockquote className="wrap-break-word whitespace-pre-wrap rounded-md border-l-2 bg-muted/50 px-3 py-2 text-muted-foreground">
            {note}
          </blockquote>
        )}
        <p className="text-xs text-muted-foreground">
          {entry.actor.name} ·{" "}
          <time dateTime={entry.createdAt}>{formatDateTime(entry.createdAt)}</time>
          {showEngagement && entry.engagement && (
            <>
              {" · "}
              <Link className="underline" href={`/engagements/${entry.engagement.id}`}>
                {entry.engagement.client.name} — {entry.engagement.natureOfWork}
              </Link>
            </>
          )}
        </p>
      </div>
    </li>
  );
}

/** Chronological audit trail: what changed, who did it and when. */
export function ActivityTimeline({
  entries,
  showEngagement = false,
}: {
  entries: ActivityEntry[];
  showEngagement?: boolean;
}) {
  return (
    <ol className="space-y-5">
      {entries.map((entry, index) => (
        <ActivityEntryItem
          key={entry.id}
          entry={entry}
          showEngagement={showEngagement}
          connector={index < entries.length - 1}
        />
      ))}
    </ol>
  );
}
