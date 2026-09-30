import { Badge } from "@/components/ui/badge";
import {
  engagementBadge,
  engagementStatusLabel,
  subTaskBadge,
  subTaskStatusLabel,
} from "@/lib/formats";
import type { EngagementStatus, SubTaskStatus } from "@/lib/types";

export function EngagementStatusBadge({
  status,
}: {
  status: EngagementStatus;
}) {
  return (
    <Badge className={engagementBadge(status)}>
      {engagementStatusLabel[status]}
    </Badge>
  );
}

export function SubTaskStatusBadge({ status }: { status: SubTaskStatus }) {
  return (
    <Badge className={subTaskBadge(status)}>{subTaskStatusLabel[status]}</Badge>
  );
}