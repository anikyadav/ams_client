"use client";

import Link from "next/link";
import { EngagementProgressControl } from "@/components/engagements/engagement-progress-control";
import { DashboardTasks } from "@/components/engagements/dashboard-tasks";
import { useEffect, useState } from "react";
import { PlusIcon, RefreshCwIcon } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useFiscalYear } from "@/components/providers/fiscal-year-provider";
import { useClients, useEngagements } from "@/lib/hooks";
import {
  dashboardQueue,
  stages,
  summarizeDashboard,
  type DashboardFilter,
} from "@/lib/dashboard";
import { engagementStatusLabel, formatDate } from "@/lib/formats";
import { fiscalYearLabel } from "@/lib/nepali-date";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/shared/page-header";
import { QueryState } from "@/components/shared/query-state";
import { EngagementStatusBadge } from "@/components/shared/status-badge";
import { EngagementFormDialog } from "@/components/engagements/engagement-form-dialog";
import { AddSubTaskAction } from "@/components/engagements/add-subtask-action";

const filterLabels = {
  OPEN: "Open work",
  OVERDUE: "Overdue",
  DUE_SOON: "Due within 7 days",
  NO_TARGET: "No target date",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const year = useFiscalYear();
  const engagements = useEngagements();
  const clients = useClients();
  const [filter, setFilter] = useState<DashboardFilter>("OPEN");
  const [formOpen, setFormOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const auditor = user?.role === "AUDITOR";
  const loading = engagements.isLoading || (auditor && clients.isLoading);
  const error = engagements.error || (auditor ? clients.error : null);
  const fetching = engagements.isFetching || (auditor && clients.isFetching);
  const refresh = () => {
    void engagements.refetch();
    if (auditor) void clients.refetch();
    setNow(new Date());
  };
  const summary = user
    ? summarizeDashboard(
        engagements.data ?? [],
        clients.data ?? [],
        user,
        year.id,
        now,
      )
    : null;
  const queue = summary ? dashboardQueue(summary, filter) : [];
  const queueLabel =
    filter in filterLabels
      ? filterLabels[filter as keyof typeof filterLabels]
      : engagementStatusLabel[filter as keyof typeof engagementStatusLabel];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`${fiscalYearLabel(year)} · ${auditor ? "Your practice at a glance." : "Your visible engagements and assigned tasks at a glance."}`}
        actions={
          <>
            <Button
              variant="outline"
              onClick={refresh}
              disabled={fetching}
              aria-label="Refresh dashboard"
            >
              <RefreshCwIcon
                className={`size-4 ${fetching ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            {auditor && (
              <Button variant="outline" nativeButton={false} render={<Link href="/staff" />}>Manage staff</Button>
            )}
            {auditor && (
              <Button onClick={() => setFormOpen(true)}>
                <PlusIcon className="size-4" />
                New engagement
              </Button>
            )}
          </>
        }
      />
      <QueryState loading={loading} error={error} retry={refresh} />
      {!loading && !error && summary && (
        <>
          <section
            aria-label="Fiscal year overview"
            className="grid grid-cols-2 gap-4 xl:grid-cols-4"
          >
            {[
              {
                title: auditor ? "Clients" : "Clients in your work",
                value: summary.clientCount,
                detail: auditor
                  ? `${summary.clientsWithoutWork} without engagements`
                  : "Across engagements visible to you",
                href: auditor ? "/clients" : "/engagements",
              },
              {
                title: "Engagements",
                value: summary.list.length,
                detail: `${summary.open.length} open · ${summary.completed} complete or delivered`,
                href: "/engagements",
              },
              {
                title: "Under review",
                value: summary.byStage.UNDER_REVIEW,
                detail: "Ready for review follow-up",
                filter: "UNDER_REVIEW" as const,
              },
              {
                title: "Overdue",
                value: summary.overdue.length,
                detail: "Open engagements past their target",
                filter: "OVERDUE" as const,
              },
            ].map((metric) => (
              <Card key={metric.title} aria-label={`${metric.title} summary`}>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {metric.title}
                  </p>
                  <p
                    className={`text-3xl font-semibold tabular-nums ${metric.title === "Overdue" && metric.value ? "text-amber-700 dark:text-amber-400" : ""}`}
                  >
                    {metric.value}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {metric.detail}
                  </p>
                  {metric.href ? (
                    <Link
                      href={metric.href}
                      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      View {metric.title.toLowerCase()}
                    </Link>
                  ) : (
                    <button
                      onClick={() => setFilter(metric.filter!)}
                      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      View {metric.title.toLowerCase()}
                    </button>
                  )}
                </CardContent>
              </Card>
            ))}
          </section>
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>Needs attention</CardTitle>
                <Link
                  href="/engagements"
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  View all engagements
                </Link>
              </div>
              <p className="text-sm text-muted-foreground">
                Targets compared with today, {formatDate(summary.today)}.
                Upcoming includes today and the next 7 days; complete and
                delivered work is excluded from alerts.
              </p>
              <div className="flex flex-wrap gap-2">
                {(
                  Object.keys(filterLabels) as (keyof typeof filterLabels)[]
                ).map((key) => (
                  <Button
                    key={key}
                    variant={filter === key ? "default" : "outline"}
                    size="sm"
                    aria-pressed={filter === key}
                    onClick={() => setFilter(key)}
                  >
                    {filterLabels[key]} (
                    {key === "OPEN"
                      ? summary.open.length
                      : key === "OVERDUE"
                        ? summary.overdue.length
                        : key === "DUE_SOON"
                          ? summary.dueSoon.length
                          : summary.noTarget.length}
                    )
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm font-medium" aria-live="polite">
                {queueLabel} · {queue.length} engagement
                {queue.length === 1 ? "" : "s"}
              </p>
              {queue.length === 0 ? (
                <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  {summary.list.length === 0
                    ? "No engagements in this fiscal year yet."
                    : "No engagements match this view."}
                </p>
              ) : (
                <div className="divide-y">
                  {queue.slice(0, 8).map((item) => (
                    <article
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0"
                    >
                      <div className="min-w-0 flex-1">
                        <Link
                          className="font-medium hover:underline"
                          href={
                            auditor
                              ? `/clients/${item.clientId}`
                              : `/engagements/${item.id}`
                          }
                        >
                          {item.client.name}
                        </Link>
                        <p className="mt-1 break-words text-sm text-muted-foreground">
                          <Link
                            href={`/engagements/${item.id}`}
                            className="hover:underline"
                          >
                            {item.natureOfWork}
                          </Link>
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Primary staff: {item.staff.name}
                        </p>
                        {auditor && (
                          <div className="mt-3">
                            <AddSubTaskAction key={`${year.id}-${item.id}`} engagement={item} />
                          </div>
                        )}
                      </div>
                      <div className="space-y-2 text-right">
                        <EngagementStatusBadge status={item.status} />
                        <p
                          className={`text-xs ${summary.overdue.some((record) => record.id === item.id) ? "font-medium text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}
                        >
                          {item.targetDate
                            ? `Target: ${formatDate(item.targetDate.slice(0, 10))}`
                            : "No target date"}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {queue.length > 8 && (
                <p className="text-xs text-muted-foreground">
                  Showing the first 8 by target date. Open the engagements page
                  for the full list.
                </p>
              )}
            </CardContent>
          </Card>
          <div className="grid items-start gap-6 xl:grid-cols-[2fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Engagement stages</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Select a stage to filter the attention list above.
                </p>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {stages.map((stage) => (
                  <button
                    key={stage}
                    aria-pressed={filter === stage}
                    onClick={() => setFilter(stage)}
                    className={`space-y-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring ${filter === stage ? "border-primary bg-muted" : ""}`}
                  >
                    <p className="text-xs font-medium">
                      {engagementStatusLabel[stage]}
                    </p>
                    <p className="text-2xl font-semibold tabular-nums">
                      {summary.byStage[stage]}
                    </p>
                    <Progress
                      value={
                        summary.list.length
                          ? (summary.byStage[stage] / summary.list.length) * 100
                          : 0
                      }
                      aria-label={`${engagementStatusLabel[stage]} share`}
                    />
                  </button>
                ))}
              </CardContent>
            </Card>
            <Card aria-label="Task progress summary">
              <CardHeader>
                <CardTitle>
                  {auditor ? "Task progress" : "My task progress"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-3xl font-semibold tabular-nums">
                  {summary.taskCount
                    ? `${summary.taskProgress}%`
                    : "No tasks yet"}
                </p>
                <Progress
                  value={summary.taskProgress}
                  aria-label="Tasks completed"
                />
                <p className="text-sm text-muted-foreground">
                  {summary.byTask.DONE} of {summary.taskCount} tasks done
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{summary.byTask.TODO} to do</span>
                  <span>{summary.byTask.IN_PROGRESS} in progress</span>
                </div>
              </CardContent>
            </Card>
          </div>
          {!auditor && <Card>
            <CardHeader><CardTitle>My assigned engagements</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {summary.list.filter((item) => item.staffId === user?.id).map((item) => <article key={item.id} className="space-y-3">
                <Link href={`/engagements/${item.id}`} className="font-medium underline">{item.client.name} - {item.natureOfWork}</Link>
                <EngagementStatusBadge status={item.status} />
                <EngagementProgressControl engagement={item} />
              </article>)}
              {!summary.list.some((item) => item.staffId === user?.id) && <p className="text-sm text-muted-foreground">Your assigned sub-tasks appear below.</p>}
            </CardContent>
          </Card>}
          <DashboardTasks key={year.id} engagements={summary.list} />

        </>
      )}
      {auditor && (
        <EngagementFormDialog open={formOpen} onOpenChange={setFormOpen} />
      )}
    </div>
  );
}
