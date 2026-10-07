"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { QueryState } from "@/components/shared/query-state";
import { useSubTask } from "@/lib/hooks";

// Tasks have a single home: the drawer on their engagement. This keeps old
// /tasks/:id links working.
export default function TaskRedirectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const task = useSubTask(id);
  const engagementId = task.data?.engagementId;
  useEffect(() => {
    if (engagementId) router.replace(`/engagements/${engagementId}?task=${id}`);
  }, [engagementId, id, router]);
  return (
    <QueryState
      loading={task.isLoading || !!engagementId}
      error={task.error ?? (task.isLoading || task.data ? null : new Error("Task not found"))}
      retry={() => void task.refetch()}
    />
  );
}
