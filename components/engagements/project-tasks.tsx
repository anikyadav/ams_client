"use client";

import { useState } from "react";
import {
  CalendarDays,
  CheckCheck,
  ChevronRight,
  Circle,
  GitBranch,
  LayoutList,
  Columns3,
  GanttChart,
  Search,
  Flag,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/shared/user-avatar";
import { SubTaskStatusControl } from "./subtask-status-control";
import { TaskDiscussion } from "./task-discussion";
import { formatDate, subTaskStatusLabel } from "@/lib/formats";
import { isOverdue } from "@/lib/project-tracking";
import type { Engagement, SubTask, SubTaskStatus } from "@/lib/types";

const stages: { status: SubTaskStatus; label: string; color: string }[] = [
  { status: "TODO", label: "To do", color: "bg-slate-400" },
  { status: "IN_PROGRESS", label: "In progress", color: "bg-blue-500" },
  { status: "DONE", label: "Done", color: "bg-emerald-500" },
];
const priorityColors = {
  LOW: "text-slate-500",
  MEDIUM: "text-blue-600 dark:text-blue-400",
  HIGH: "text-orange-600 dark:text-orange-400",
  URGENT: "text-rose-600 dark:text-rose-400",
};

type Props = {
  engagement: Engagement;
  auditor: boolean;
  onEdit: (task: SubTask) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
};

export function ProjectTasks({
  engagement,
  auditor,
  onEdit,
  onDelete,
  onAdd,
}: Props) {
  const [view, setView] = useState("board");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [assignee, setAssignee] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const selectedTask = engagement.subTasks.find((task) => task.id === selected);
  const tasks = engagement.subTasks
    .filter(
      (task) =>
        `${task.title} ${task.description ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (!status ||
          (status === "OVERDUE"
            ? isOverdue(task.dueDate, task.status === "DONE")
            : task.status === status)) &&
        (!assignee || task.assignedToId === assignee),
    )
    .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
  const complete = engagement.subTasks.filter(
    (task) => task.status === "DONE",
  ).length;

  function taskCard(task: SubTask, list = false) {
    const overdue = isOverdue(task.dueDate, task.status === "DONE");
    return (
      <article
        id={`subtask-${task.id}`}
        key={task.id}
        aria-label={task.title}
        className={`group scroll-mt-6 rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md ${list ? "grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_240px]" : "space-y-4"}`}
      >
        <div className="min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2 text-[11px] font-medium">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <GitBranch className="size-3.5" />
              SUB-TASK
            </span>
            <span
              className={`flex items-center gap-1 ${priorityColors[task.priority ?? "MEDIUM"]}`}
            >
              <Flag className="size-3" />
              {task.priority ?? "MEDIUM"}
            </span>
          </div>
          <h3 className="break-words text-sm font-semibold leading-6">
            <button
              className="text-left hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-500"
              onClick={() => setSelected(task.id)}
            >
              {task.title}
            </button>
          </h3>
          {task.description && (
            <p className="line-clamp-2 break-words text-xs leading-5 text-muted-foreground">
              {task.description}
            </p>
          )}
          <p
            className="truncate text-[11px] text-muted-foreground"
            title={engagement.natureOfWork}
          >
            ↳ {engagement.natureOfWork}
          </p>
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-2">
              <UserAvatar name={task.assignedTo.name} />
              <span>{task.assignedTo.name}</span>
            </span>
            <span
              className={`flex items-center gap-1 ${overdue ? "text-destructive" : "text-muted-foreground"}`}
            >
              <CalendarDays className="size-3.5" />
              {task.dueDate ? formatDate(task.dueDate) : "No due date"}
              {overdue ? " · Overdue" : ""}
            </span>
          </div>
          <SubTaskStatusControl task={task} />
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Progress
              className="h-1.5 flex-1"
              value={task.progress}
              aria-label={`Progress for ${task.title}`}
            />
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {task.progress}%
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1 border-t pt-3">
            <TaskDiscussion engagement={engagement} task={task} />
            {auditor && (
              <>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Edit sub-task"
                  title="Edit sub-task"
                  onClick={() => onEdit(task)}
                >
                  <Pencil />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Delete sub-task"
                  title="Delete sub-task"
                  onClick={() => onDelete(task.id)}
                >
                  <Trash2 />
                </Button>
              </>
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <section
      id="subtasks"
      className="min-w-0 space-y-5"
      aria-label="Project tasks"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b">
        <div className="flex gap-5" aria-label="Task views">
          {[
            { id: "board", label: "Board", icon: Columns3 },
            { id: "list", label: "List", icon: LayoutList },
            { id: "timeline", label: "Timeline", icon: GanttChart },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              aria-pressed={view === id}
              onClick={() => setView(id)}
              className={`flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${view === id ? "border-blue-600 text-blue-600 dark:text-blue-400" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
        <span className="pb-3 text-xs text-muted-foreground">
          {engagement.subTasks.length} sub-tasks · {complete} complete
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            aria-label="Search sub-tasks"
            placeholder="Search tasks…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <NativeSelect
          className="w-auto"
          aria-label="Filter sub-task status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">All statuses</option>
          <option value="TODO">To do</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="DONE">Done</option>
          <option value="OVERDUE">Overdue</option>
        </NativeSelect>
        <NativeSelect
          className="w-auto"
          aria-label="Filter sub-task assignee"
          value={assignee}
          onChange={(event) => setAssignee(event.target.value)}
        >
          <option value="">All assignees</option>
          {Array.from(
            new Map(
              engagement.subTasks.map((task) => [
                task.assignedToId,
                task.assignedTo,
              ]),
            ).values(),
          ).map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </NativeSelect>
        {(search || status || assignee) && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearch("");
              setStatus("");
              setAssignee("");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3 dark:border-blue-900 dark:bg-blue-950/30">
        <span className="rounded-md bg-blue-600 p-2 text-white">
          <GitBranch className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold tracking-widest text-blue-600 dark:text-blue-400">
            PARENT ENGAGEMENT
          </p>
          <p className="break-words text-sm font-semibold">
            {engagement.natureOfWork}
          </p>
        </div>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCheck className="size-4" />
          {complete}/{engagement.subTasks.length} completed
        </span>
        <span className="text-xs font-medium">
          {engagement.progress}% overall
        </span>
      </div>
      {engagement.subTasks.length > 0 && !tasks.length && (
        <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
          No sub-tasks match these filters.
        </p>
      )}
      {view === "board" && (
        <div className="grid items-start gap-4 lg:grid-cols-3">
          {stages.map((stage) => (
            <section
              key={stage.status}
              aria-label={`${stage.label} tasks`}
              className="min-w-0 rounded-xl border border-border/60 bg-muted/40 p-3"
            >
              <header className="mb-4 flex items-center gap-2 px-1 py-1">
                <span className={`size-2 rounded-full ${stage.color}`} />
                <h2 className="text-xs font-semibold">{stage.label}</h2>
                <span className="rounded-md bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {tasks.filter((task) => task.status === stage.status).length}
                </span>
              </header>
              <div className="space-y-3">
                {tasks
                  .filter((task) => task.status === stage.status)
                  .map((task) => taskCard(task))}
              </div>
              {!tasks.some((task) => task.status === stage.status) && (
                <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-xs text-muted-foreground">
                  <Circle className="size-5 opacity-40" />
                  No tasks here
                </div>
              )}
              {auditor && stage.status === "TODO" && (
                <Button
                  variant="ghost"
                  className="mt-3 w-full justify-start text-muted-foreground"
                  onClick={onAdd}
                >
                  + Create sub-task
                </Button>
              )}
            </section>
          ))}
        </div>
      )}
      {view === "list" && (
        <div className="space-y-3">
          {tasks.map((task) => taskCard(task, true))}
          {!tasks.length && !engagement.subTasks.length && (
            <p className="p-6 text-sm text-muted-foreground">
              No sub-tasks yet. Add the first piece of work to this engagement.
            </p>
          )}
        </div>
      )}
      {view === "timeline" && (
        <ProjectTimeline
          engagement={engagement}
          tasks={tasks}
          onSelect={setSelected}
        />
      )}
      <Dialog
        open={!!selectedTask}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedTask.title}</DialogTitle>
                <DialogDescription>
                  Sub-task of {engagement.natureOfWork} ·{" "}
                  {engagement.client.name}
                </DialogDescription>
              </DialogHeader>
              <p className="whitespace-pre-wrap text-sm">
                {selectedTask.description || "No description yet."}
              </p>
              <dl className="grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Assignee</dt>
                  <dd>{selectedTask.assignedTo.name}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Due date (BS)</dt>
                  <dd>{formatDate(selectedTask.dueDate ?? null)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Priority</dt>
                  <dd>{selectedTask.priority ?? "MEDIUM"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Parent engagement</dt>
                  <dd>{engagement.natureOfWork}</dd>
                </div>
              </dl>
              <SubTaskStatusControl task={selectedTask} />
              <div className="flex flex-wrap gap-2">
                <TaskDiscussion engagement={engagement} task={selectedTask} />
                {auditor && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelected(null);
                      onEdit(selectedTask);
                    }}
                  >
                    Edit sub-task
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

// Tasks have a due date, not a scheduled start date. Show real deadline milestones
// rather than inventing task durations; the parent bar represents its full schedule.
function ProjectTimeline({
  engagement,
  tasks,
  onSelect,
}: {
  engagement: Engagement;
  tasks: SubTask[];
  onSelect: (id: string) => void;
}) {
  const day = 86_400_000;
  const toDay = (value: string) =>
    Date.parse(`${value.slice(0, 10)}T00:00:00Z`);
  const dates = [
    engagement.startDate,
    engagement.targetDate,
    ...tasks.map((task) => task.dueDate),
  ]
    .filter((date): date is string => !!date)
    .map(toDay)
    .filter(Number.isFinite);
  if (!dates.length)
    return (
      <div className="rounded-xl border border-dashed p-10 text-center">
        <CalendarDays className="mx-auto mb-3 size-7 text-muted-foreground" />
        <h3 className="font-medium">Give your project a timeline</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Set engagement dates or sub-task deadlines to see them here.
        </p>
      </div>
    );
  const min = Math.min(...dates) - 2 * day;
  const max = Math.max(Math.max(...dates) + 2 * day, min + 14 * day);
  const position = (value: string) =>
    ((toDay(value) - min) / (max - min)) * 100;
  const ticks = Array.from({ length: 7 }, (_, index) =>
    new Date(min + ((max - min) * index) / 6).toISOString(),
  );
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const todayPosition = position(today);
  const gridStyle = {
    backgroundImage:
      "linear-gradient(to right, var(--border) 1px, transparent 1px)",
    backgroundSize: "16.6667% 100%",
  };
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-[260px_1fr] border-b bg-muted/40">
            <div className="p-4 text-xs font-semibold">
              Engagement / sub-task
            </div>
            <div className="flex justify-between px-3 py-4 text-[10px] text-muted-foreground">
              {ticks.map((date) => (
                <span key={date}>{formatDate(date)}</span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-[260px_1fr] border-b bg-blue-50/50 dark:bg-blue-950/20">
            <div className="flex items-center gap-2 p-4 text-xs font-semibold">
              <GitBranch className="size-4 shrink-0 text-blue-600" />
              <span className="truncate" title={engagement.natureOfWork}>
                {engagement.natureOfWork}
              </span>
            </div>
            <div className="relative mx-3 min-h-14" style={gridStyle}>
              {engagement.startDate && engagement.targetDate ? (
                <div
                  title={`${formatDate(engagement.startDate)} – ${formatDate(engagement.targetDate)}`}
                  className="absolute top-4 h-6 min-w-2 overflow-hidden rounded bg-blue-200 dark:bg-blue-900"
                  style={{
                    left: `${position(engagement.startDate)}%`,
                    width: `${Math.max(1, position(engagement.targetDate) - position(engagement.startDate))}%`,
                  }}
                >
                  <div
                    className="h-full bg-blue-600"
                    style={{ width: `${engagement.progress}%` }}
                  />
                  <span className="absolute inset-0 px-2 pt-1 text-[10px] font-medium text-blue-950 dark:text-white">
                    {engagement.progress}%
                  </span>
                </div>
              ) : (
                <span className="absolute inset-y-0 left-3 flex items-center text-[11px] text-muted-foreground">
                  {engagement.targetDate
                    ? `Target: ${formatDate(engagement.targetDate)}`
                    : "Set start and target dates"}
                </span>
              )}
            </div>
          </div>
          {tasks.map((task) => (
            <div
              key={task.id}
              className="grid grid-cols-[260px_1fr] border-b last:border-0"
            >
              <button
                onClick={() => onSelect(task.id)}
                className="flex items-center gap-2 border-l-2 border-l-blue-200 py-4 pl-7 pr-3 text-left text-xs hover:bg-muted/50"
              >
                <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
                <span className="truncate" title={task.title}>
                  {task.title}
                </span>
              </button>
              <div className="relative mx-3 min-h-14" style={gridStyle}>
                {todayPosition >= 0 && todayPosition <= 100 && (
                  <div
                    aria-hidden="true"
                    className="absolute inset-y-0 border-l border-dashed border-rose-400"
                    style={{ left: `${todayPosition}%` }}
                  />
                )}
                {task.dueDate ? (
                  <button
                    aria-label={`Open ${task.title}, due ${formatDate(task.dueDate)}`}
                    title={`${task.title} · ${formatDate(task.dueDate)} · ${subTaskStatusLabel[task.status]}`}
                    onClick={() => onSelect(task.id)}
                    className={`absolute top-5 size-4 -translate-x-1/2 rotate-45 rounded-sm border-2 border-background ring-2 ring-background ${task.status === "DONE" ? "bg-emerald-500" : isOverdue(task.dueDate, false) ? "bg-rose-500" : "bg-blue-500"}`}
                    style={{ left: `${position(task.dueDate)}%` }}
                  />
                ) : (
                  <span className="absolute inset-y-0 left-3 flex items-center text-[11px] text-muted-foreground">
                    Unscheduled · No due date
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        BS dates · Parent bar: engagement schedule · Diamonds: sub-task
        deadlines · Dashed line: today. Select a sub-task to view its details.
      </p>
    </div>
  );
}
