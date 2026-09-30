import Link from "next/link";
import type { Engagement } from "@/lib/types";

export function AddSubTaskAction({ engagement }: { engagement: Engagement }) {
  return <Link className="text-sm font-medium underline underline-offset-4" href={`/engagements/${engagement.id}#subtasks`}>Manage engagement</Link>;
}
