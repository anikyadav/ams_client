import Link from "next/link";
import { formatDateTime } from "@/lib/formats";
import type { ActivityEntry } from "@/lib/types";

/** Chronological audit trail: what changed, who did it and when. */
export function ActivityTimeline({
  entries,
  showEngagement = false,
}: {
  entries: ActivityEntry[];
  showEngagement?: boolean;
}) {
  return (
    <ol className="space-y-4 border-l pl-4">
      {entries.map((entry) => (
        <li key={entry.id} className="relative text-sm">
          <span aria-hidden="true" className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-primary" />
          <p className="break-words">{entry.summary}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
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
        </li>
      ))}
    </ol>
  );
}
