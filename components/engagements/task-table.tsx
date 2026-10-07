"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deadlineLabel } from "@/components/shared/deadline";
import { UserAvatar } from "@/components/shared/user-avatar";
import { TaskBadges } from "@/components/engagements/task-badges";
import { SubTaskStatusControl } from "@/components/engagements/subtask-status-control";
import { apiErrorMessage } from "@/lib/api";
import { formatDate } from "@/lib/formats";
import { useCreateSubTask, useStaff, useUpdateSubTask } from "@/lib/hooks";
import { isOverdue } from "@/lib/project-tracking";
import { isRequiredTask } from "@/lib/required-tasks";
import { priorityColors } from "@/lib/task-ui";
import { cn } from "@/lib/utils";
import type { Engagement, SubTask } from "@/lib/types";
import type { DrawerTab } from "@/components/engagements/task-drawer";

type SortKey = "order" | "title" | "assignee" | "priority" | "due" | "status" | "progress";
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const statusRank = { TODO: 0, IN_PROGRESS: 1, DONE: 2 } as const;

const compare: Record<SortKey, (a: SubTask, b: SubTask) => number> = {
  order: (a, b) => (a.sortOrder ?? 100) - (b.sortOrder ?? 100),
  title: (a, b) => a.title.localeCompare(b.title),
  assignee: (a, b) => a.assignedTo.name.localeCompare(b.assignedTo.name),
  priority: (a, b) =>
    PRIORITIES.indexOf(b.priority ?? "MEDIUM") - PRIORITIES.indexOf(a.priority ?? "MEDIUM"),
  due: (a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"),
  status: (a, b) => statusRank[a.status] - statusRank[b.status],
  progress: (a, b) => a.progress - b.progress,
};

/**
 * Dense, sortable task table. Auditors edit assignee and priority in place and
 * add tasks from the last row; staff can change the status of their own tasks.
 */
export function TaskTable({
  engagement,
  tasks,
  auditor,
  selected,
  onOpen,
  onEdit,
  onDelete,
}: {
  engagement: Engagement;
  tasks: SubTask[];
  auditor: boolean;
  selected: string | null;
  onOpen: (id: string, tab?: DrawerTab) => void;
  onEdit: (task: SubTask) => void;
  onDelete: (id: string) => void;
}) {
  const staff = useStaff();
  const update = useUpdateSubTask();
  const create = useCreateSubTask();
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "order", dir: 1 });
  const [title, setTitle] = useState("");
  const rows = [...tasks].sort(
    (a, b) => compare[sort.key](a, b) * sort.dir || compare.order(a, b),
  );
  const members = (staff.data ?? []).filter((member) => member.role === "STAFF");

  async function patch(task: SubTask, payload: Record<string, unknown>, message: string) {
    try {
      await update.mutateAsync({ id: task.id, payload });
      toast.success(message);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  async function add(event: FormEvent) {
    event.preventDefault();
    const value = title.trim();
    if (!value) return;
    try {
      await create.mutateAsync({
        engagementId: engagement.id,
        payload: { title: value, assignedToId: engagement.staffId, priority: "MEDIUM" },
      });
      setTitle("");
      toast.success("Sub-task added");
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  const header = (key: SortKey, label: string, className?: string) => {
    const active = sort.key === key;
    const Icon = !active ? ArrowUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
    return (
      <TableHead
        className={className}
        aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
      >
        <button
          type="button"
          className="flex items-center gap-1 font-medium hover:text-foreground"
          onClick={() =>
            setSort(active ? { key, dir: sort.dir === 1 ? -1 : 1 } : { key, dir: 1 })
          }
        >
          {label}
          <Icon className={cn("size-3", !active && "opacity-40")} />
        </button>
      </TableHead>
    );
  };

  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table className="min-w-[860px]">
        <TableHeader>
          <TableRow>
            {header("title", "Task")}
            {header("assignee", "Assignee")}
            {header("priority", "Priority")}
            {header("due", "Due")}
            {header("status", "Status")}
            {header("progress", "Progress")}
            <TableHead className="w-24">
              <span className="sr-only">Discussion and actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((task) => {
            const comments = engagement.comments.filter(
              (comment) => comment.subTaskId === task.id,
            ).length;
            const overdue = isOverdue(task.dueDate, task.status === "DONE");
            return (
              <TableRow
                key={task.id}
                id={`subtask-${task.id}`}
                aria-label={task.title}
                data-state={selected === task.id ? "selected" : undefined}
              >
                <TableCell className="max-w-72 whitespace-normal">
                  <button
                    className="text-left font-medium hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
                    onClick={() => onOpen(task.id)}
                  >
                    {task.templateKey && task.sortOrder ? `${task.sortOrder}. ` : ""}
                    {task.title}
                  </button>
                  {isRequiredTask(task) && (
                    <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      Compulsory
                    </span>
                  )}
                  <span className="mt-1 block">
                    <TaskBadges task={task} />
                  </span>
                </TableCell>
                <TableCell>
                  {auditor && members.length ? (
                    <NativeSelect
                      aria-label={`Assignee for ${task.title}`}
                      className="h-9 w-auto min-w-36 md:h-8"
                      value={task.assignedToId}
                      disabled={update.isPending}
                      onChange={(event) =>
                        void patch(task, { assignedToId: event.target.value }, "Assignee updated")
                      }
                    >
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </NativeSelect>
                  ) : (
                    <span className="flex items-center gap-2 text-sm">
                      <UserAvatar name={task.assignedTo.name} />
                      {task.assignedTo.name}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {auditor ? (
                    <NativeSelect
                      aria-label={`Priority for ${task.title}`}
                      className={cn("h-9 w-auto md:h-8", priorityColors[task.priority ?? "MEDIUM"])}
                      value={task.priority ?? "MEDIUM"}
                      disabled={update.isPending}
                      onChange={(event) =>
                        void patch(task, { priority: event.target.value }, "Priority updated")
                      }
                    >
                      {PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority[0] + priority.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </NativeSelect>
                  ) : (
                    <span className={cn("text-sm", priorityColors[task.priority ?? "MEDIUM"])}>
                      {task.priority ?? "MEDIUM"}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {task.dueDate ? (
                    <span
                      title={formatDate(task.dueDate)}
                      className={cn(
                        "flex items-center gap-1 whitespace-nowrap text-xs",
                        overdue ? "font-medium text-destructive" : "text-muted-foreground",
                      )}
                    >
                      <CalendarDays className="size-3.5" />
                      {task.status === "DONE" ? formatDate(task.dueDate) : deadlineLabel(task.dueDate)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">No due date</span>
                  )}
                </TableCell>
                <TableCell>
                  <SubTaskStatusControl task={task} compact />
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2" title={`${task.progress}% complete`}>
                    <Progress
                      className="h-1.5 w-16"
                      value={task.progress}
                      aria-label={`Progress for ${task.title}`}
                    />
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {task.progress}%
                    </span>
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Discussion & updates (${comments})`}
                      title="Discussion & activity"
                      onClick={() => onOpen(task.id, "activity")}
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
                </TableCell>
              </TableRow>
            );
          })}
          {auditor && (
            <TableRow>
              <TableCell colSpan={7}>
                <form onSubmit={add} className="flex items-center gap-2">
                  <Plus aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                  <Input
                    aria-label="Quick add sub-task"
                    className="h-9 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0 md:h-8"
                    placeholder="Add a task — type a title and press Enter (assigned to the lead)"
                    maxLength={200}
                    value={title}
                    disabled={create.isPending}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </form>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
