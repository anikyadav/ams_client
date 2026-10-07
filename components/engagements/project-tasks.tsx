"use client";

import { nepalToday } from "@/lib/project-tracking";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCheck,
  ChevronRight,
  Circle,
  LayoutList,
  Columns3,
  GanttChart,
  Search,
  Flag,
  Pencil,
  Trash2,
  MoreHorizontal,
  MessageSquare,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { deadlineLabel } from "@/components/shared/deadline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Progress } from "@/components/ui/progress";
import { UserAvatar } from "@/components/shared/user-avatar";
import { SubTaskStatusControl } from "./subtask-status-control";
import { TaskDrawer, type DrawerTab } from "./task-drawer";
import { TaskTable } from "./task-table";
import { TaskBadges } from "./task-badges";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api";
import { useUpdateSubTask } from "@/lib/hooks";
import { canUpdateSubTask } from "@/lib/permissions";
import { useAuth } from "@/components/providers/auth-provider";
import { isRequiredTask } from "@/lib/required-tasks";
import { formatDate, subTaskStatusLabel } from "@/lib/formats";
import { isOverdue } from "@/lib/project-tracking";
import { useUrlParams } from "@/lib/use-url-params";
import {
  matchesQuickFilter,
  priorityColors,
  quickFilters,
  type QuickFilter,
} from "@/lib/task-ui";
import { cn } from "@/lib/utils";
import type { Engagement, SubTask, SubTaskStatus } from "@/lib/types";
import { GitBranch } from "lucide-react";

const stages: { status: SubTaskStatus; label: string; color: string }[] = [
  { status: "TODO", label: "To do", color: "bg-slate-400" },
  { status: "IN_PROGRESS", label: "In progress", color: "bg-blue-500" },
  { status: "DONE", label: "Done", color: "bg-emerald-500" },
];

const views = [
  { id: "checklist", label: "Checklist", icon: CheckCheck },
  { id: "board", label: "Board", icon: Columns3 },
  { id: "list", label: "List", icon: LayoutList },
  { id: "timeline", label: "Timeline", icon: GanttChart },
];

type Props = {
  engagement: Engagement;
  auditor: boolean;
  onEdit: (task: SubTask) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
};

function DueChip({ task }: { task: SubTask }) {
  if (!task.dueDate)
    return <span className="text-muted-foreground">No due date</span>;
  const done = task.status === "DONE";
  const label = done ? "" : deadlineLabel(task.dueDate);
  return (
    <span
      title={formatDate(task.dueDate)}
      className={cn(
        "flex items-center gap-1 whitespace-nowrap",
        label.includes("overdue")
          ? "font-medium text-destructive"
          : "text-muted-foreground",
      )}
    >
      <CalendarDays className="size-3.5" />
      {label || formatDate(task.dueDate)}
    </span>
  );
}

export function ProjectTasks({
  engagement,
  auditor,
  onEdit,
  onDelete,
  onAdd,
}: Props) {
  const { user } = useAuth();
  const url = useUrlParams();
  const setUrl = url.set;
  const view = views.some((item) => item.id === url.get("view"))
    ? url.get("view")
    : "checklist";
  const status = url.get("status");
  const assignee = url.get("assignee");
  const quick = url
    .get("quick")
    .split(",")
    .filter((id): id is QuickFilter =>
      quickFilters.some((filter) => filter.id === id),
    );
  const selected = url.get("task");
  const drawerTab: DrawerTab =
    url.get("ttab") === "activity" ? "activity" : "details";
  const updateTask = useUpdateSubTask();
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<SubTaskStatus | null>(null);
  const [search, setSearch] = useState(url.get("q"));
  const urlSearch = url.get("q");
  useEffect(() => {
    if (search === urlSearch) return;
    const timer = setTimeout(() => setUrl({ q: search || null }), 250);
    return () => clearTimeout(timer);
  }, [search, urlSearch, setUrl]);

  const selectedTask = engagement.subTasks.find((task) => task.id === selected);
  const open = (id: string, tab: DrawerTab = "details") =>
    url.set({ task: id, ttab: tab === "details" ? null : tab });
  const close = () => url.set({ task: null, ttab: null });
  const toggleQuick = (id: QuickFilter) =>
    url.set({
      quick:
        (quick.includes(id)
          ? quick.filter((item) => item !== id)
          : [...quick, id]
        ).join(",") || null,
    });
  const clearFilters = () => {
    setSearch("");
    url.set({ q: null, status: null, assignee: null, quick: null });
  };

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
        (!assignee || task.assignedToId === assignee) &&
        quick.every((id) => matchesQuickFilter(task, id, user?.id)),
    )
    .sort(
      (a, b) =>
        (a.sortOrder ?? 100) - (b.sortOrder ?? 100) ||
        (a.dueDate || "9999").localeCompare(b.dueDate || "9999"),
    );
  const filtering = !!(search || status || assignee || quick.length);
  const complete = engagement.subTasks.filter(
    (task) => task.status === "DONE",
  ).length;
  const required = engagement.subTasks.filter(isRequiredTask);
  const requiredComplete = required.filter(
    (task) => task.status === "DONE",
  ).length;

  async function moveTask(id: string, to: SubTaskStatus) {
    const task = engagement.subTasks.find((item) => item.id === id);
    setDragging(null);
    setDropTarget(null);
    if (!task || task.status === to || !user || !canUpdateSubTask(user, task))
      return;
    try {
      await updateTask.mutateAsync({ id, payload: { status: to } });
      toast.success(`Moved to ${subTaskStatusLabel[to]}`);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  function taskRow(task: SubTask, card = false) {
    const movable = card && !!user && canUpdateSubTask(user, task) && !task.checklist?.length;
    const comments = engagement.comments.filter(
      (comment) => comment.subTaskId === task.id,
    ).length;
    return (
      <article
        id={`subtask-${task.id}`}
        key={task.id}
        aria-label={task.title}
        draggable={movable}
        onDragStart={
          movable
            ? (event) => {
                event.dataTransfer.setData("text/plain", task.id);
                event.dataTransfer.effectAllowed = "move";
                setDragging(task.id);
              }
            : undefined
        }
        onDragEnd={movable ? () => setDragging(null) : undefined}
        className={cn(
          "group scroll-mt-6 rounded-lg border bg-card px-3 py-2.5 shadow-xs transition-shadow hover:shadow-sm",
          selected === task.id && "ring-2 ring-primary/40",
          movable && "cursor-grab active:cursor-grabbing",
          dragging === task.id && "opacity-50",
          card ? "space-y-3" : "flex flex-wrap items-center gap-x-4 gap-y-2",
        )}
      >
        <div
          className={cn(
            "flex min-w-0 items-start gap-2",
            !card && "flex-1 basis-64",
          )}
        >
          <Flag
            aria-label={`Priority ${task.priority ?? "MEDIUM"}`}
            className={cn(
              "mt-1 size-3.5 shrink-0",
              priorityColors[task.priority ?? "MEDIUM"],
            )}
          />
          <div className="min-w-0 space-y-1">
            <h3 className="break-words text-sm font-medium leading-6">
              <button
                className="text-left hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
                onClick={() => open(task.id)}
              >
                {task.templateKey && task.sortOrder
                  ? `${task.sortOrder}. `
                  : ""}
                {task.title}
              </button>
            </h3>
            <div className="flex flex-wrap items-center gap-1.5">
              {isRequiredTask(task) && (
                <span className="inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  Compulsory
                </span>
              )}
              <TaskBadges task={task} />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <span
            className="flex items-center gap-2"
            title={task.assignedTo.name}
          >
            <UserAvatar name={task.assignedTo.name} />
            <span className={cn(!card && "hidden lg:inline")}>
              {task.assignedTo.name}
            </span>
          </span>
          <DueChip task={task} />
          <span
            className="hidden items-center gap-2 sm:flex"
            title={`${task.progress}% complete`}
          >
            <Progress
              className="h-1.5 w-16"
              value={task.progress}
              aria-label={`Progress for ${task.title}`}
            />
            <span className="tabular-nums text-muted-foreground">
              {task.progress}%
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <SubTaskStatusControl task={task} compact />
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Discussion & updates (${comments})`}
            title="Discussion & activity"
            onClick={() => open(task.id, "activity")}
          >
            <MessageSquare />
            <span className="tabular-nums">{comments}</span>
          </Button>
          {auditor && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Actions for ${task.title}`}
                  />
                }
              >
                <MoreHorizontal />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(task)}>
                  <Pencil />
                  Edit sub-task
                </DropdownMenuItem>
                {!isRequiredTask(task) && (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDelete(task.id)}
                  >
                    <Trash2 />
                    Delete sub-task
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Engagement checklist</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Six compulsory tasks for every engagement. Select a task to open its
            details and discussion.
          </p>
        </div>
        <span className="rounded-lg border px-3 py-2 text-sm font-medium">
          {requiredComplete} of {auditor ? 6 : required.length}{" "}
          {auditor ? "compulsory" : "visible compulsory"} tasks complete
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b">
        <div className="flex gap-5" aria-label="Task views">
          {views.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              aria-pressed={view === id}
              onClick={() => url.set({ view: id === "checklist" ? null : id })}
              className={`flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${view === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
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
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground md:top-2.5" />
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
            onChange={(event) =>
              url.set({ status: event.target.value || null })
            }
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
            onChange={(event) =>
              url.set({ assignee: event.target.value || null })
            }
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
        </div>
        <div
          role="group"
          aria-label="Quick filters"
          className="flex flex-wrap items-center gap-2"
        >
          {quickFilters
            .filter(({ id }) => auditor || id !== "review")
            .map(({ id, label }) => (
              <Button
                key={id}
                size="sm"
                variant={quick.includes(id) ? "default" : "outline"}
                aria-pressed={quick.includes(id)}
                onClick={() => toggleQuick(id)}
              >
                {label}
                <span className="tabular-nums opacity-70">
                  {
                    engagement.subTasks.filter((task) =>
                      matchesQuickFilter(task, id, user?.id),
                    ).length
                  }
                </span>
              </Button>
            ))}
          {filtering && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      </div>
      {engagement.subTasks.length > 0 && !tasks.length && (
        <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
          No sub-tasks match these filters.
        </p>
      )}
      {view === "checklist" && (
        <div className="space-y-6">
          <section aria-label="Compulsory tasks" className="space-y-2">
            {tasks.filter(isRequiredTask).map((task) => taskRow(task))}
          </section>
          <section
            aria-label="Additional sub-tasks"
            className="space-y-2 border-t pt-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Additional sub-tasks</h3>
              {auditor && (
                <Button variant="outline" onClick={onAdd}>
                  Create new sub-task
                </Button>
              )}
            </div>
            {tasks
              .filter((task) => !isRequiredTask(task))
              .map((task) => taskRow(task))}
            {!tasks.some((task) => !isRequiredTask(task)) && (
              <p className="text-sm text-muted-foreground">
                Use additional sub-tasks for work outside the six compulsory
                tasks.
              </p>
            )}
          </section>
        </div>
      )}
      {view === "board" && (
        <p className="text-xs text-muted-foreground">
          Drag a card to another column to change its status, or use the status
          menu on the card.
        </p>
      )}
      {view === "board" && (
        <div className="grid items-start gap-4 lg:grid-cols-3">
          {stages.map((stage) => (
            <section
              key={stage.status}
              aria-label={`${stage.label} tasks`}
              onDragOver={(event) => {
                if (!dragging) return;
                event.preventDefault();
                setDropTarget(stage.status);
              }}
              onDragLeave={() => setDropTarget(null)}
              onDrop={(event) => {
                event.preventDefault();
                void moveTask(
                  event.dataTransfer.getData("text/plain") || dragging || "",
                  stage.status,
                );
              }}
              className={cn(
                "min-w-0 rounded-xl border border-border/60 bg-muted/40 p-3 transition-colors",
                dropTarget === stage.status && "border-primary bg-primary/5",
              )}
            >
              <header className="mb-3 flex items-center gap-2 px-1 py-1">
                <span className={`size-2 rounded-full ${stage.color}`} />
                <h2 className="text-xs font-semibold">{stage.label}</h2>
                <span className="rounded-md bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {tasks.filter((task) => task.status === stage.status).length}
                </span>
              </header>
              <div className="space-y-2">
                {tasks
                  .filter((task) => task.status === stage.status)
                  .map((task) => taskRow(task, true))}
              </div>
              {!tasks.some((task) => task.status === stage.status) && (
                <div className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-xs text-muted-foreground">
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
        <>
          {(tasks.length > 0 || auditor) && (
            <TaskTable
              engagement={engagement}
              tasks={tasks}
              auditor={auditor}
              selected={selected || null}
              onOpen={open}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          )}
          {!tasks.length && !engagement.subTasks.length && !auditor && (
            <p className="p-6 text-sm text-muted-foreground">
              No sub-tasks yet. Add the first piece of work to this engagement.
            </p>
          )}
        </>
      )}
      {view === "timeline" && (
        <ProjectTimeline
          engagement={engagement}
          tasks={tasks}
          onSelect={open}
        />
      )}
      <TaskDrawer
        engagement={engagement}
        task={selectedTask}
        tab={drawerTab}
        auditor={auditor}
        onClose={close}
        onEdit={(task) => {
          close();
          onEdit(task);
        }}
      />
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
  const today = nepalToday();
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
                <span className="absolute inset-y-0 left-3 flex items-center text-xs text-muted-foreground">
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
                  <span className="absolute inset-y-0 left-3 flex items-center text-xs text-muted-foreground">
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
