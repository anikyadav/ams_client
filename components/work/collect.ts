import type { Engagement, SubTask } from "@/lib/types";

export type WorkTask = { task: SubTask; engagement: Engagement };

export function collectTasks(engagements: Engagement[]): WorkTask[] {
  return engagements.flatMap((engagement) =>
    engagement.subTasks.map((task) => ({ task, engagement })),
  );
}

/** Link that opens a task's drawer on its engagement. */
export const taskHref = (item: WorkTask) =>
  `/engagements/${item.engagement.id}?task=${item.task.id}`;
