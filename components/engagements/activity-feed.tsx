"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { MentionText, MentionTextarea } from "@/components/engagements/mention-textarea";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { ActivityEntryItem } from "@/components/shared/activity-timeline";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useAuth } from "@/components/providers/auth-provider";
import {
  useCreateEngagementComment,
  useCreateSubTaskComment,
  useDeleteComment,
  useEngagementActivity,
  useParticipants,
  useSubTaskActivity,
  useUpdateComment,
} from "@/lib/hooks";
import { apiErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/formats";
import { commentSchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import type { ActivityEntry, Comment, Engagement } from "@/lib/types";

type FeedFilter = "all" | "comments" | "history";
type FeedItem =
  | { kind: "comment"; id: string; at: string; comment: Comment }
  | { kind: "history"; id: string; at: string; entry: ActivityEntry };

const filters: { id: FeedFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "comments", label: "Comments" },
  { id: "history", label: "History" },
];

/**
 * One feed for what was said and what changed, newest first. Scoped to a
 * single sub-task when `taskId` is given, otherwise the whole engagement.
 */
export function ActivityFeed({
  engagement,
  taskId,
}: {
  engagement: Engagement;
  taskId?: string;
}) {
  const { user } = useAuth();
  const create = useCreateEngagementComment();
  const createScoped = useCreateSubTaskComment();
  const update = useUpdateComment();
  const remove = useDeleteComment();
  const engagementActivity = useEngagementActivity(engagement.id, !taskId);
  const taskActivity = useSubTaskActivity(taskId ?? "");
  const activity = taskId ? taskActivity : engagementActivity;
  const participants = useParticipants(engagement.id);
  const people = Array.isArray(participants.data) ? participants.data : [];
  // History is secondary: a failed or malformed response must never break comments.
  const history = Array.isArray(activity.data) ? activity.data : [];
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [text, setText] = useState("");
  const [scope, setScope] = useState(taskId ?? "");
  const [editing, setEditing] = useState<Comment | null>(null);
  const [editText, setEditText] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const isAuditor = user?.role === "AUDITOR";
  const pending = create.isPending || createScoped.isPending;

  const comments = engagement.comments.filter(
    (comment) => !taskId || comment.subTaskId === taskId,
  );
  const items: FeedItem[] = [
    ...comments.map(
      (comment): FeedItem => ({
        kind: "comment",
        id: `c-${comment.id}`,
        at: comment.createdAt,
        comment,
      }),
    ),
    ...history.map(
      (entry): FeedItem => ({
        kind: "history",
        id: `h-${entry.id}`,
        at: entry.createdAt,
        entry,
      }),
    ),
  ]
    .filter(
      (item) =>
        filter === "all" ||
        (filter === "comments" ? item.kind === "comment" : item.kind === "history"),
    )
    .sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id));
  const count = (id: FeedFilter) =>
    id === "all"
      ? comments.length + history.length
      : id === "comments"
        ? comments.length
        : history.length;

  async function submit() {
    const result = commentSchema.safeParse({ text });
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }
    try {
      if (scope)
        await createScoped.mutateAsync({
          subTaskId: scope,
          text: result.data.text,
        });
      else
        await create.mutateAsync({
          engagementId: engagement.id,
          text: result.data.text,
        });
      setText("");
      toast.success("Comment added");
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  async function saveEdit(comment: Comment) {
    const result = commentSchema.safeParse({ text: editText });
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }
    try {
      await update.mutateAsync({ id: comment.id, text: result.data.text });
      setEditing(null);
      toast.success("Comment updated");
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  return (
    <section
      className="space-y-5"
      aria-label={taskId ? "Sub-task activity" : "Engagement activity"}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">
          {taskId ? "Sub-task activity" : "Activity"}
        </h3>
        <div role="group" aria-label="Activity filter" className="flex gap-1">
          {filters.map(({ id, label }) => (
            <Button
              key={id}
              size="sm"
              variant={filter === id ? "default" : "ghost"}
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
            >
              {label}
              <span className="tabular-nums opacity-70">{count(id)}</span>
            </Button>
          ))}
        </div>
      </div>

      <form
        className="space-y-3 rounded-lg border bg-muted/30 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {!taskId && (
          <label className="block space-y-1 text-xs text-muted-foreground">
            <span>Comment on</span>
            <NativeSelect value={scope} onChange={(event) => setScope(event.target.value)}>
              <option value="">Engagement</option>
              {engagement.subTasks.map((task) => (
                <option value={task.id} key={task.id}>
                  {task.title}
                </option>
              ))}
            </NativeSelect>
          </label>
        )}
        <label className="block space-y-1 text-xs text-muted-foreground">
          <span>Your comment</span>
          <MentionTextarea
            className="text-foreground"
            value={text}
            people={people}
            maxLength={2000}
            required
            rows={2}
            placeholder="Share an update, ask a question or flag a blocker… Type @ to mention someone"
            onChange={setText}
          />
        </label>
        <Button type="submit" size="sm" disabled={pending || !text.trim()}>
          {pending ? "Posting…" : "Post comment"}
        </Button>
      </form>

      {activity.isLoading && filter !== "comments" && (
        <p className="text-sm text-muted-foreground">Loading history…</p>
      )}
      {activity.error && filter !== "comments" && (
        <p role="alert" className="text-sm text-destructive">
          {apiErrorMessage(activity.error)}
        </p>
      )}
      {items.length === 0 && !activity.isLoading && (
        <p className="text-sm text-muted-foreground">
          {filter === "comments"
            ? "No comments yet."
            : filter === "history"
              ? "No recorded changes yet."
              : "Nothing here yet. Comments and changes will appear in this feed."}
        </p>
      )}
      <ol className="space-y-5">
        {items.map((item, index) => {
          if (item.kind === "history")
            return (
              <ActivityEntryItem
                key={item.id}
                entry={item.entry}
                connector={index < items.length - 1}
              />
            );
          const { comment } = item;
          const own = comment.authorId === user?.id;
          return (
            <li key={item.id} className="flex gap-3 text-sm">
              <UserAvatar name={comment.author.name} />
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="flex flex-wrap gap-x-2 text-xs">
                  <span className="text-sm font-medium">{comment.author.name}</span>
                  <time className="text-muted-foreground" dateTime={comment.createdAt}>
                    {formatDateTime(comment.createdAt)}
                  </time>
                  {!taskId && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                      {comment.subTaskId
                        ? (engagement.subTasks.find((task) => task.id === comment.subTaskId)
                            ?.title ?? "Deleted sub-task")
                        : "Engagement"}
                    </span>
                  )}
                </p>
                {editing?.id === comment.id && own ? (
                  <form
                    className="space-y-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void saveEdit(comment);
                    }}
                  >
                    <Textarea
                      aria-label="Edit comment"
                      value={editText}
                      maxLength={2000}
                      onChange={(event) => setEditText(event.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" disabled={update.isPending} type="submit">
                        Save comment
                      </Button>
                      <Button
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={() => setEditing(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <p
                    className={cn(
                      "whitespace-pre-wrap break-words rounded-lg border bg-card px-3 py-2",
                    )}
                  >
                    <MentionText text={comment.text} people={people} />
                  </p>
                )}
                {(isAuditor || own) && editing?.id !== comment.id && (
                  <div className="flex gap-1">
                    {own && (
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => {
                          setEditing(comment);
                          setEditText(comment.text);
                        }}
                      >
                        Edit comment
                      </Button>
                    )}
                    {isAuditor && (
                      <Button size="xs" variant="ghost" onClick={() => setDeleting(comment.id)}>
                        Delete comment
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <ConfirmDelete
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete comment?"
        description="This permanently removes this comment."
        pending={remove.isPending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.mutateAsync(deleting);
            setDeleting(null);
            toast.success("Comment deleted");
          } catch (error) {
            toast.error(apiErrorMessage(error));
          }
        }}
      />
    </section>
  );
}
