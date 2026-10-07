"use client";

import { useState } from "react";
import { Flag, Pencil } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Deadline } from "@/components/shared/deadline";
import { UserAvatar } from "@/components/shared/user-avatar";
import { SubTaskStatusBadge } from "@/components/shared/status-badge";
import { ActivityFeed } from "@/components/engagements/activity-feed";
import { DocumentTask } from "@/components/engagements/document-task";
import { TaskBadges } from "@/components/engagements/task-badges";
import { TaskBlocker } from "@/components/engagements/task-blocker";
import { TaskChecklist } from "@/components/engagements/task-checklist";
import { TaskReviewPanel } from "@/components/engagements/task-review";
import { SubTaskStatusControl } from "@/components/engagements/subtask-status-control";
import { isRequiredTask } from "@/lib/required-tasks";
import { priorityColors } from "@/lib/task-ui";
import type { Engagement, SubTask } from "@/lib/types";

export type DrawerTab = "details" | "activity";

/**
 * Every task opens here: details, status, document fields and the combined
 * comments/history feed. Open state lives in the URL (`?task=`), so a task can
 * be linked to directly.
 */
export function TaskDrawer({
  engagement,
  task,
  tab,
  auditor,
  onClose,
  onEdit,
}: {
  engagement: Engagement;
  task: SubTask | undefined;
  tab: DrawerTab;
  auditor: boolean;
  onClose: () => void;
  onEdit: (task: SubTask) => void;
}) {
  return (
    <Sheet
      open={!!task}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
        {task && (
          <TaskDrawerBody
            key={`${task.id}:${tab}`}
            engagement={engagement}
            task={task}
            tab={tab}
            auditor={auditor}
            onEdit={onEdit}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function TaskDrawerBody({
  engagement,
  task,
  tab,
  auditor,
  onEdit,
}: {
  engagement: Engagement;
  task: SubTask;
  tab: DrawerTab;
  auditor: boolean;
  onEdit: (task: SubTask) => void;
}) {
  const [active, setActive] = useState<DrawerTab>(tab);
  const comments = engagement.comments.filter(
    (comment) => comment.subTaskId === task.id,
  ).length;
  return (
    <>
      <SheetHeader className="space-y-2 border-b pr-12">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          <SubTaskStatusBadge status={task.status} />
          <span
            className={`flex items-center gap-1 ${priorityColors[task.priority ?? "MEDIUM"]}`}
          >
            <Flag className="size-3" />
            {task.priority ?? "MEDIUM"}
          </span>
          {isRequiredTask(task) && (
            <span className="rounded bg-primary/10 px-2 py-0.5 text-primary">
              Compulsory
            </span>
          )}
          <TaskBadges task={task} />
        </div>
        <SheetTitle className="break-words text-lg leading-snug">
          {task.title}
        </SheetTitle>
        <SheetDescription>
          Sub-task of {engagement.natureOfWork} · {engagement.client.name}
        </SheetDescription>
      </SheetHeader>
      <Tabs
        value={active}
        onValueChange={(value) => setActive(value as DrawerTab)}
        className="gap-0"
      >
        <TabsList variant="line" className="w-full justify-start border-b px-4">
          <TabsTrigger value="details" className="flex-none px-3">
            Details
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex-none px-3">
            Discussion &amp; activity
            {comments > 0 && (
              <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums">
                {comments}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="space-y-5 p-4">
          <p className="whitespace-pre-wrap break-words text-sm">
            {task.description || (
              <span className="text-muted-foreground">No description yet.</span>
            )}
          </p>
          <dl className="grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-4 text-sm">
            <div className="space-y-1">
              <dt className="text-muted-foreground">Assignee</dt>
              <dd className="flex items-center gap-2 font-medium">
                <UserAvatar name={task.assignedTo.name} />
                {task.assignedTo.name}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground">Due date</dt>
              <dd>
                <Deadline
                  date={task.dueDate ?? null}
                  complete={task.status === "DONE"}
                />
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground">Priority</dt>
              <dd className="font-medium">{task.priority ?? "MEDIUM"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground">Progress</dt>
              <dd className="flex items-center gap-2">
                <Progress
                  className="flex-1"
                  value={task.progress}
                  aria-label={`Progress for ${task.title}`}
                />
                <span className="text-xs tabular-nums">{task.progress}%</span>
              </dd>
            </div>
          </dl>
          <DocumentTask key={`document-${task.id}`} task={task} />
          <TaskChecklist key={`steps-${task.id}`} task={task} />
          <TaskReviewPanel task={task} />
          <TaskBlocker task={task} />
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Status</h3>
            <SubTaskStatusControl task={task} detailed />
          </div>
          {auditor && (
            <Button variant="outline" onClick={() => onEdit(task)}>
              <Pencil />
              Edit sub-task
            </Button>
          )}
        </TabsContent>
        <TabsContent value="activity" className="p-4">
          <ActivityFeed
            key={task.id}
            engagement={engagement}
            taskId={task.id}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
