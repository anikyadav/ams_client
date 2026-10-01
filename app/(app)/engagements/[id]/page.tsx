"use client";

import { AssignLegacyYear } from "@/components/engagements/assign-legacy-year";
import Link from "next/link";
import { EngagementProgressControl } from "@/components/engagements/engagement-progress-control";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { EngagementStatusBadge } from "@/components/shared/status-badge";
import { QueryState } from "@/components/shared/query-state";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { EngagementFormDialog } from "@/components/engagements/engagement-form-dialog";
import { SubTaskFormDialog } from "@/components/engagements/subtask-form-dialog";
import { CommentThread } from "@/components/engagements/comment-thread";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/formats";
import { useAuth } from "@/components/providers/auth-provider";
import {
  useEngagement,
  useDeleteEngagement,
  useDeleteSubTask,
} from "@/lib/hooks";
import type { SubTask } from "@/lib/types";
import { apiErrorMessage } from "@/lib/api";
import { ProjectTasks } from "@/components/engagements/project-tasks";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  Flag,
  Plus,
  Settings2,
  Printer,
  TriangleAlert,
  CheckCheck,
} from "lucide-react";
import { isOverdue } from "@/lib/project-tracking";

export default function EngagementDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const engagement = useEngagement(id);
  const removeEngagement = useDeleteEngagement();
  const removeTask = useDeleteSubTask();
  const [editing, setEditing] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [task, setTask] = useState<SubTask>();
  const [deleting, setDeleting] = useState(false);
  const [deleteTask, setDeleteTask] = useState<string | null>(null);
  if (engagement.isLoading || engagement.error)
    return (
      <QueryState
        loading={engagement.isLoading}
        error={engagement.error}
        retry={() => void engagement.refetch()}
      />
    );
  const data = engagement.data;
  if (!data) return <p>Engagement not found.</p>;
  const auditor = user?.role === "AUDITOR";
  const overdueTasks = data.subTasks.filter((task) =>
    isOverdue(task.dueDate, task.status === "DONE"),
  );
  const completedTasks = data.subTasks.filter(
    (task) => task.status === "DONE",
  ).length;
  const addTask = () => {
    setTask(undefined);
    setTaskOpen(true);
  };
  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      {auditor && data.fiscalYearId === "legacy" && (
        <AssignLegacyYear engagementId={data.id} />
      )}
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
      >
        <Link
          className="flex items-center gap-1.5 hover:text-foreground"
          href="/engagements"
        >
          <ArrowLeft className="size-3.5" />
          Engagements
        </Link>
        <span>/</span>
        <span>{data.client.name}</span>
        <span>/</span>
        <span className="font-medium text-foreground">Project workspace</span>
      </nav>
      <header className="space-y-6 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div className="rounded-xl bg-primary p-3 text-primary-foreground shadow-sm">
              <BriefcaseBusiness className="size-6" />
            </div>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[.18em] text-muted-foreground">
                  Engagement workspace
                </span>
                <EngagementStatusBadge status={data.status} />
              </div>
              <h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">
                {data.natureOfWork}
              </h1>
              <p className="text-sm text-muted-foreground">
                {auditor ? (
                  <Link
                    href={`/clients/${data.clientId}`}
                    className="hover:underline"
                  >
                    {data.client.name}
                  </Link>
                ) : (
                  data.client.name
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {auditor && (
              <>
                <Button
                  variant="outline"
                  aria-label="Edit engagement"
                  onClick={() => setEditing(true)}
                >
                  <Settings2 />
                  Project settings
                </Button>
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={addTask}
                >
                  <Plus />
                  Add sub-task
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Print engagement"
              title="Print engagement"
              onClick={() => window.print()}
            >
              <Printer />
            </Button>
          </div>
        </div>
        <div className="grid gap-5 border-t pt-5 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Project lead
            </p>
            <div className="flex items-center gap-2 text-sm font-medium">
              <UserAvatar name={data.staff.name} />
              {data.staff.name}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Schedule (BS)
            </p>
            <p className="flex items-center gap-2 text-xs">
              <CalendarDays className="size-4 text-muted-foreground" />
              {formatDate(data.startDate)} → {formatDate(data.targetDate)}
            </p>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Priority
            </p>
            <p className="flex items-center gap-2 text-sm">
              <Flag className="size-4 text-orange-500" />
              {data.priority || "Not set"}
            </p>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium">Progress: {data.progress}%</span>
              <span className="text-muted-foreground">
                {completedTasks}/{data.subTasks.length} done
              </span>
            </div>
            <Progress
              className="h-2 [&_[data-slot=progress-indicator]]:bg-primary"
              value={data.progress}
              aria-label="Engagement progress"
            />
          </div>
        </div>
      </header>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CheckCheck className="size-4 text-emerald-500" />
          {completedTasks} completed
        </span>
        <span>
          {data.subTasks.filter((task) => task.status === "IN_PROGRESS").length}{" "}
          in progress
        </span>
        <span
          className={`flex items-center gap-1.5 ${overdueTasks.length ? "text-destructive" : ""}`}
        >
          <TriangleAlert className="size-3.5" />
          {overdueTasks.length} overdue
        </span>
        <span className="sm:ml-auto">
          One engagement. All the work, in one place.
        </span>
      </div>
      <ProjectTasks
        key={data.id}
        engagement={data}
        auditor={auditor}
        onAdd={addTask}
        onEdit={(task) => {
          setTask(task);
          setTaskOpen(true);
        }}
        onDelete={setDeleteTask}
      />
      <div className="grid items-start gap-6 border-t pt-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <CommentThread key={data.id} engagement={data} />
        <aside className="space-y-4">
          <h2 className="text-sm font-semibold">Project updates</h2>
          <EngagementProgressControl engagement={data} />
          <p className="text-xs leading-5 text-muted-foreground">
            Sub-tasks belong to this engagement. Use their status and progress
            to track delivery, and share project-wide updates here.
          </p>
          {auditor && (
            <Button
              variant="ghost"
              className="text-xs text-destructive print:hidden"
              onClick={() => setDeleting(true)}
            >
              Delete engagement
            </Button>
          )}
        </aside>
      </div>
      {auditor && (
        <>
          <EngagementFormDialog
            open={editing}
            onOpenChange={setEditing}
            engagement={data}
          />
          <SubTaskFormDialog
            open={taskOpen}
            onOpenChange={setTaskOpen}
            engagementId={data.id}
            engagementLabel={`${data.client.name} — ${data.natureOfWork}`}
            task={task}
          />
        </>
      )}
      <ConfirmDelete
        open={deleting}
        onOpenChange={setDeleting}
        title="Delete engagement?"
        description="This permanently deletes the engagement, its sub-tasks and comments."
        pending={removeEngagement.isPending}
        onConfirm={async () => {
          try {
            await removeEngagement.mutateAsync(data.id);
            toast.success("Engagement deleted");
            router.replace("/engagements");
          } catch (error) {
            toast.error(apiErrorMessage(error));
          }
        }}
      />
      <ConfirmDelete
        open={deleteTask !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTask(null);
        }}
        title="Delete sub-task?"
        description="This permanently removes the sub-task and its scoped comments."
        pending={removeTask.isPending}
        onConfirm={async () => {
          if (!deleteTask) return;
          try {
            await removeTask.mutateAsync(deleteTask);
            setDeleteTask(null);
            toast.success("Sub-task deleted");
          } catch (error) {
            toast.error(apiErrorMessage(error));
          }
        }}
      />
    </div>
  );
}
