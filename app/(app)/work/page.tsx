"use client";

import { redirect } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { PageHeader } from "@/components/shared/page-header";
import { QueryState } from "@/components/shared/query-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkCalendar } from "@/components/work/work-calendar";
import { WorkReview, readyForReview } from "@/components/work/work-review";
import { WorkTasks } from "@/components/work/work-tasks";
import { WorkWorkload } from "@/components/work/work-workload";
import { useEngagements } from "@/lib/hooks";
import { useUrlParams } from "@/lib/use-url-params";

const tabs = ["tasks", "workload", "calendar", "review"] as const;

export default function TeamWorkPage() {
  const { user } = useAuth();
  const query = useEngagements(user?.role === "AUDITOR");
  const url = useUrlParams();
  if (user && user.role !== "AUDITOR") redirect("/tasks");
  const requested = url.get("tab");
  const tab = tabs.find((item) => item === requested) ?? "tasks";
  const engagements = query.data ?? [];
  const pendingReview =
    engagements.filter((item) => item.status === "UNDER_REVIEW").length +
    engagements.filter(readyForReview).length +
    engagements
      .flatMap((item) => item.subTasks)
      .filter((task) => task.reviewState === "SUBMITTED").length;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Team work"
        description="Every task across the selected fiscal year: who has what, what is due and what is waiting for review."
      />
      <QueryState loading={query.isLoading} error={query.error} retry={() => void query.refetch()} />
      {query.data && (
        <Tabs
          value={tab}
          onValueChange={(value) =>
            url.set({ tab: value === "tasks" ? null : (value as string), assignee: null, quick: null })
          }
          className="gap-6"
        >
          <TabsList variant="line" className="h-10 w-full justify-start overflow-x-auto border-b">
            <TabsTrigger value="tasks" className="flex-none px-3 sm:px-4">
              Tasks
            </TabsTrigger>
            <TabsTrigger value="workload" className="flex-none px-3 sm:px-4">
              Workload
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex-none px-3 sm:px-4">
              Calendar
            </TabsTrigger>
            <TabsTrigger value="review" className="flex-none px-3 sm:px-4">
              Review queue
              {pendingReview > 0 && (
                <span className="rounded-full bg-primary/10 px-1.5 text-[10px] tabular-nums text-primary">
                  {pendingReview}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tasks">
            <WorkTasks engagements={engagements} />
          </TabsContent>
          <TabsContent value="workload">
            <WorkWorkload engagements={engagements} />
          </TabsContent>
          <TabsContent value="calendar">
            <WorkCalendar engagements={engagements} />
          </TabsContent>
          <TabsContent value="review">
            <WorkReview engagements={engagements} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
