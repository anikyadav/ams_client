"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateEngagementProgress } from "@/lib/hooks";
import { apiErrorMessage } from "@/lib/api";
import type { Engagement } from "@/lib/types";

export function EngagementProgressControl({ engagement }: { engagement: Engagement }) {
  const { user } = useAuth();
  const update = useUpdateEngagementProgress();
  const [progress, setProgress] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  if (engagement.subTasks.length)
    return <p className="text-sm text-muted-foreground">Progress: {engagement.progress}%. Completing all sub-tasks automatically completes this engagement.</p>;
  if (!user || (user.role !== "AUDITOR" && engagement.staffId !== user.id)) return null;
  if (engagement.status === "DELIVERED") return <p className="text-sm text-muted-foreground">Delivered. Ask your auditor to reopen this engagement for further updates.</p>;
  const selected = progress ?? engagement.progress;
  return <form className="space-y-3 rounded-lg border bg-muted/30 p-4" aria-label="Update engagement progress" onSubmit={async (event) => {
    event.preventDefault();
    if (![25, 50, 75, 100].includes(selected)) return;
    try {
      await update.mutateAsync({ id: engagement.id, progress: selected, ...(comment.trim() ? { comment: comment.trim() } : {}) });
      setComment("");
      setProgress(null);
      toast.success(selected === 100 ? "Engagement marked complete" : "Engagement progress updated");
    } catch (error) { toast.error(apiErrorMessage(error)); }
  }}>
    <h3 className="font-medium">Update engagement progress</h3>
    <p className="text-sm text-muted-foreground">Current: {engagement.progress}%. Choose a milestone and share an update with your auditor. 100% marks this engagement complete.</p>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Engagement milestone">
      {[25, 50, 75, 100].map((value) => <Button key={value} type="button" variant={selected === value ? "default" : "outline"} aria-pressed={selected === value} disabled={update.isPending} onClick={() => setProgress(value)}>{value}%</Button>)}
    </div>
    <Textarea aria-label="Engagement update comment" placeholder="What has been completed? Any blockers or questions? (optional)" maxLength={2000} value={comment} disabled={update.isPending} onChange={(event) => setComment(event.target.value)} />
    <Button type="submit" disabled={update.isPending || ![25, 50, 75, 100].includes(selected)}>{update.isPending ? "Saving update..." : "Save progress update"}</Button>
  </form>;
}
