"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
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
import { SubTaskStatusControl } from "@/components/engagements/subtask-status-control";
import { collectTasks, taskHref } from "@/components/work/collect";
import { formatDate } from "@/lib/formats";
import { isOverdue } from "@/lib/project-tracking";
import { matchesQuickFilter, quickFilters, type QuickFilter } from "@/lib/task-ui";
import { useUrlParams } from "@/lib/use-url-params";
import { cn } from "@/lib/utils";
import type { Engagement } from "@/lib/types";

const PAGE = 40;
const chips = quickFilters.filter((filter) => filter.id !== "mine");

/** Every sub-task in the fiscal year, most urgent first, with status editable in place. */
export function WorkTasks({ engagements }: { engagements: Engagement[] }) {
  const url = useUrlParams();
  const assignee = url.get("assignee");
  const quick = url
    .get("quick")
    .split(",")
    .filter((id): id is QuickFilter => chips.some((chip) => chip.id === id));
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const all = useMemo(() => collectTasks(engagements), [engagements]);
  const people = useMemo(
    () => Array.from(new Map(all.map(({ task }) => [task.assignedToId, task.assignedTo])).values()),
    [all],
  );
  const rows = all
    .filter(
      ({ task, engagement }) =>
        `${task.title} ${engagement.client.name} ${engagement.natureOfWork}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (!assignee || task.assignedToId === assignee) &&
        quick.every((id) => matchesQuickFilter(task, id, undefined)),
    )
    .sort(
      (a, b) =>
        Number(isOverdue(b.task.dueDate, b.task.status === "DONE")) -
          Number(isOverdue(a.task.dueDate, a.task.status === "DONE")) ||
        Number(a.task.status === "DONE") - Number(b.task.status === "DONE") ||
        (a.task.dueDate ?? "9999").localeCompare(b.task.dueDate ?? "9999"),
    );
  const filtering = !!(search || assignee || quick.length);
  const toggle = (id: QuickFilter) =>
    url.set({
      quick:
        (quick.includes(id) ? quick.filter((item) => item !== id) : [...quick, id]).join(",") ||
        null,
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground md:top-2.5" />
          <Input
            className="pl-9"
            aria-label="Search all tasks"
            placeholder="Search task, client or engagement…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setLimit(PAGE);
            }}
          />
        </div>
        <NativeSelect
          className="w-auto"
          aria-label="Filter by assignee"
          value={assignee}
          onChange={(event) => url.set({ assignee: event.target.value || null })}
        >
          <option value="">All assignees</option>
          {people.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div role="group" aria-label="Quick filters" className="flex flex-wrap items-center gap-2">
        {chips.map(({ id, label }) => (
          <Button
            key={id}
            size="sm"
            variant={quick.includes(id) ? "default" : "outline"}
            aria-pressed={quick.includes(id)}
            onClick={() => toggle(id)}
          >
            {label}
            <span className="tabular-nums opacity-70">
              {all.filter(({ task }) => matchesQuickFilter(task, id, undefined)).length}
            </span>
          </Button>
        ))}
        {filtering && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSearch("");
              url.set({ assignee: null, quick: null });
            }}
          >
            Clear filters
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {rows.length} of {all.length} tasks
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No tasks match these filters.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Client · engagement</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, limit).map((item) => {
                const { task, engagement } = item;
                const overdue = isOverdue(task.dueDate, task.status === "DONE");
                return (
                  <TableRow key={task.id} aria-label={task.title}>
                    <TableCell className="max-w-64 whitespace-normal font-medium">
                      <Link href={taskHref(item)} className="hover:text-primary">
                        {task.title}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-60 whitespace-normal text-sm">
                      <Link href={`/engagements/${engagement.id}`} className="hover:underline">
                        {engagement.client.name}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        {engagement.natureOfWork}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2 text-sm">
                        <UserAvatar name={task.assignedTo.name} />
                        {task.assignedTo.name}
                      </span>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "whitespace-nowrap text-xs",
                        overdue ? "font-medium text-destructive" : "text-muted-foreground",
                      )}
                      title={task.dueDate ? formatDate(task.dueDate) : undefined}
                    >
                      {task.dueDate
                        ? task.status === "DONE"
                          ? formatDate(task.dueDate)
                          : deadlineLabel(task.dueDate)
                        : "No due date"}
                    </TableCell>
                    <TableCell>
                      <SubTaskStatusControl task={task} compact />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      {rows.length > limit && (
        <Button variant="outline" onClick={() => setLimit((value) => value + PAGE)}>
          Show more ({rows.length - limit} remaining)
        </Button>
      )}
    </div>
  );
}
