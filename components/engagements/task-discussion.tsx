"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CommentThread } from "./comment-thread";
import type { Engagement, SubTask } from "@/lib/types";

export function TaskDiscussion({ engagement, task }: { engagement: Engagement; task: SubTask }) {
  const [open, setOpen] = useState(false);
  const count = engagement.comments.filter((comment) => comment.subTaskId === task.id).length;
  return <>
    <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Discussion & updates ({count})</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
          <DialogDescription>{engagement.client.name} · {task.progress}% · {task.status === "DONE" ? "Complete" : task.status === "TODO" ? "Not started" : "In progress"}</DialogDescription>
        </DialogHeader>
        <CommentThread engagement={engagement} taskId={task.id} />
      </DialogContent>
    </Dialog>
  </>;
}
