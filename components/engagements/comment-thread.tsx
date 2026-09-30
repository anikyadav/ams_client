"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { useAuth } from "@/components/providers/auth-provider";
import {
  useCreateEngagementComment,
  useCreateSubTaskComment,
  useUpdateComment,
  useDeleteComment,
} from "@/lib/hooks";
import { apiErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/formats";
import { commentSchema } from "@/lib/schemas";
import type { Engagement, Comment } from "@/lib/types";

export function CommentThread({ engagement, taskId }: { engagement: Engagement; taskId?: string }) {
  const { user } = useAuth();
  const create = useCreateEngagementComment();
  const createScoped = useCreateSubTaskComment();
  const update = useUpdateComment();
  const remove = useDeleteComment();
  const [text, setText] = useState("");
  const [scope, setScope] = useState(taskId ?? "");
  const [editing, setEditing] = useState<Comment | null>(null);
  const [editText, setEditText] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const isAuditor = user?.role === "AUDITOR";
  const pending = create.isPending || createScoped.isPending;
  const comments = engagement.comments.filter((comment) => !taskId || comment.subTaskId === taskId).sort(
    (a, b) =>
      a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>{taskId ? "Task discussion & updates" : "Comments"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        )}
        <ol className="space-y-4">
          {comments.map((comment) => (
            <li key={comment.id} className="space-y-2 border-b pb-4">
              <div className="flex flex-wrap gap-x-3 text-sm">
                <span className="font-medium">{comment.author.name}</span>
                <time
                  className="text-muted-foreground"
                  dateTime={comment.createdAt}
                >
                  {formatDateTime(comment.createdAt)}
                </time>
              </div>
              <p className="text-xs text-muted-foreground">
                {comment.subTaskId
                  ? `Sub-task: ${engagement.subTasks.find((task) => task.id === comment.subTaskId)?.title ?? "Deleted sub-task"}`
                  : "Engagement"}
              </p>
              {editing?.id === comment.id && comment.authorId === user?.id ? (
                <form
                  className="space-y-2"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const result = commentSchema.safeParse({ text: editText });
                    if (!result.success) {
                      toast.error(result.error.issues[0].message);
                      return;
                    }
                    try {
                      await update.mutateAsync({
                        id: comment.id,
                        text: result.data.text,
                      });
                      setEditing(null);
                      toast.success("Comment updated");
                    } catch (error) {
                      toast.error(apiErrorMessage(error));
                    }
                  }}
                >
                  <Textarea
                    aria-label="Edit comment"
                    value={editText}
                    maxLength={2000}
                    onChange={(event) => setEditText(event.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button disabled={update.isPending} type="submit">
                      Save comment
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditing(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <p className="whitespace-pre-wrap break-words text-sm">
                  {comment.text}
                </p>
              )}
              {(isAuditor || comment.authorId === user?.id) && editing?.id !== comment.id && (
                <div className="flex gap-2">
                  {comment.authorId === user?.id && (
                  <Button
                    size="sm"
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
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleting(comment.id)}
                  >
                    Delete comment
                  </Button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label className="block space-y-1 text-sm">
            <span>Comment on</span>
            <NativeSelect
              value={scope}
              disabled={Boolean(taskId)}
              onChange={(event) => setScope(event.target.value)}
            >
              <option value="">Engagement</option>
              {engagement.subTasks.map((task) => (
                <option value={task.id} key={task.id}>
                  {task.title}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="block space-y-1 text-sm">
            <span>Your comment</span>
            <Textarea
              value={text}
              maxLength={2000}
              required
              onChange={(event) => setText(event.target.value)}
              rows={3}
            />
          </label>
          <Button type="submit" disabled={pending || !text.trim()}>
            {pending ? "Posting…" : "Post comment"}
          </Button>
        </form>
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
      </CardContent>
    </Card>
  );
}
