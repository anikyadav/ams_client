"use client";

import { useState } from "react";
import { HistoryIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/formats";
import { apiErrorMessage } from "@/lib/api";
import { useEngagementActivity } from "@/lib/hooks";

/** Change history for an engagement; loaded only when expanded to avoid extra polling. */
export function ActivityPanel({ engagementId }: { engagementId: string }) {
  const [open, setOpen] = useState(false);
  const activity = useEngagementActivity(engagementId, open);
  return (
    <section aria-label="Activity history" className="space-y-3">
      <Button
        variant="outline"
        size="sm"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <HistoryIcon className="size-4" />
        {open ? "Hide activity history" : "Show activity history"}
      </Button>
      {open && activity.isLoading && (
        <p className="text-sm text-muted-foreground">Loading history…</p>
      )}
      {open && activity.error && (
        <p role="alert" className="text-sm text-destructive">
          {apiErrorMessage(activity.error)}
        </p>
      )}
      {open && activity.data?.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No recorded changes yet. Changes made from now on appear here.
        </p>
      )}
      {open && !!activity.data?.length && (
        <ol className="space-y-3 border-l pl-4">
          {activity.data.map((entry) => (
            <li key={entry.id} className="text-sm">
              <p>{entry.summary}</p>
              <p className="text-xs text-muted-foreground">
                {entry.actor.name} · {formatDateTime(entry.createdAt)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
