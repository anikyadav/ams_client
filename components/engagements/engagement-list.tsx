"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/page-header";
import { Search, ArrowRight } from "lucide-react";
import { Deadline } from "@/components/shared/deadline";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EngagementStatusBadge } from "@/components/shared/status-badge";
import { ENGAGEMENT_STATUS_OPTIONS } from "@/lib/schemas";
import { formatDate, engagementStatusLabel } from "@/lib/formats";
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
        {ENGAGEMENT_STATUS_OPTIONS.map((value) => <option key={value} value={value}>{engagementStatusLabel[value]}</option>)}
      </NativeSelect>
      <NativeSelect aria-label="Sort engagements" value={sort} onChange={(event) => setSort(event.target.value)}>
        <option value="target">Target date: earliest first</option><option value="client">Client name</option><option value="progress">Progress: lowest first</option>
      </NativeSelect>
    </div>
    <p className="text-sm text-muted-foreground">{visible.length} of {engagements.length} engagements · Open an engagement to manage its details and sub-tasks.</p>
    <div className="space-y-3 md:hidden">{visible.map((job) => <article key={job.id} className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><Link href={`/engagements/${job.id}`} className="font-semibold text-primary">{job.client.name}</Link><p className="mt-1 break-words text-sm">{job.natureOfWork}</p></div><EngagementStatusBadge status={job.status} /></div>
      <p className="my-3 text-sm text-muted-foreground">{job.staff.name}</p>
      <Deadline date={job.targetDate} complete={["COMPLETE", "DELIVERED"].includes(job.status)} />
      <div className="mt-4 flex items-center gap-3"><Progress className="flex-1" value={job.progress} aria-label={`Progress for ${job.natureOfWork}`} /><span className="text-xs tabular-nums">{job.progress}%</span></div>
      <Link className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary" href={`/engagements/${job.id}`}>Open engagement <ArrowRight aria-hidden="true" className="size-4" /></Link>
    </article>)}</div>
    <div className="hidden md:block"><Table>
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
    </Table></div>
    {!visible.length && <EmptyState icon={Search} title="No engagements match these filters." description="Try a different search or show all statuses." action={<Button variant="outline" onClick={() => { setSearch(""); setStatus(""); }}>Clear filters</Button>} />}
  </div>;
}
