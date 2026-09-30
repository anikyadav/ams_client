"use client";

import Link from "next/link";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EngagementStatusBadge } from "@/components/shared/status-badge";
import { ENGAGEMENT_STATUS_OPTIONS } from "@/lib/schemas";
import { formatDate } from "@/lib/formats";
import { isOverdue } from "@/lib/project-tracking";
import type { Engagement } from "@/lib/types";

export function EngagementList({ engagements }: { engagements: Engagement[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("target");
  const overdue = (job: Engagement) => isOverdue(job.targetDate, ["COMPLETE", "DELIVERED"].includes(job.status));
  const visible = engagements.filter((job) =>
    `${job.client.name} ${job.natureOfWork} ${job.staff.name}`.toLowerCase().includes(search.toLowerCase()) &&
    (!status || (status === "OVERDUE" ? overdue(job) : job.status === status)),
  ).sort((a, b) => sort === "client" ? a.client.name.localeCompare(b.client.name) : sort === "progress" ? a.progress - b.progress : (a.targetDate || "9999").localeCompare(b.targetDate || "9999"));
  return <div className="space-y-4">
    <div className="grid gap-3 md:grid-cols-3">
      <Input aria-label="Search engagements" placeholder="Search client, work or staff…" value={search} onChange={(event) => setSearch(event.target.value)} />
      <NativeSelect aria-label="Filter engagement status" value={status} onChange={(event) => setStatus(event.target.value)}>
        <option value="">All statuses</option><option value="OVERDUE">Overdue</option>
        {ENGAGEMENT_STATUS_OPTIONS.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
      </NativeSelect>
      <NativeSelect aria-label="Sort engagements" value={sort} onChange={(event) => setSort(event.target.value)}>
        <option value="target">Target date: earliest first</option><option value="client">Client name</option><option value="progress">Progress: lowest first</option>
      </NativeSelect>
    </div>
    <p className="text-sm text-muted-foreground">{visible.length} of {engagements.length} engagements · Open an engagement to manage its details and sub-tasks.</p>
    <Table>
      <TableHeader><TableRow>{["Client / engagement", "Status", "Primary staff", "Priority", "Sub-tasks", "Progress", "Target (BS)", ""].map((label) => <TableHead key={label}>{label}</TableHead>)}</TableRow></TableHeader>
      <TableBody>{visible.map((job) => <TableRow key={job.id}>
        <TableCell><Link href={`/engagements/${job.id}`} className="block font-medium hover:underline">{job.client.name}</Link><Link href={`/engagements/${job.id}`} className="mt-1 block text-sm text-muted-foreground hover:underline">{job.natureOfWork}</Link></TableCell>
        <TableCell><EngagementStatusBadge status={job.status} /></TableCell>
        <TableCell>{job.staff.name}</TableCell><TableCell>{job.priority || "—"}</TableCell>
        <TableCell>{job.subTasks.filter((task) => task.status === "DONE").length} / {job.subTasks.length} done</TableCell>
        <TableCell><div className="min-w-24 space-y-1"><span>{job.progress}%</span><Progress value={job.progress} aria-label={`Progress for ${job.natureOfWork}`} /></div></TableCell>
        <TableCell>{formatDate(job.targetDate)}{overdue(job) && <span className="block text-xs font-medium text-destructive">Overdue</span>}</TableCell>
        <TableCell><Link className="text-sm underline" href={`/engagements/${job.id}`} aria-label={`Open ${job.natureOfWork} for ${job.client.name}`}>Open engagement</Link></TableCell>
      </TableRow>)}</TableBody>
    </Table>
    {!visible.length && <p className="p-4 text-sm text-muted-foreground">No engagements match these filters.</p>}
  </div>;
}
