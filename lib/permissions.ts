import type { Engagement, SubTask, User } from "./types";

export function canViewEngagement(
  user: Pick<User, "id" | "role">,
  engagement: Engagement,
) {
  return (
    user.role === "AUDITOR" ||
    engagement.staffId === user.id ||
    engagement.subTasks.some((task) => task.assignedToId === user.id)
  );
}

export function canUpdateSubTask(
  user: Pick<User, "id" | "role">,
  task: SubTask,
) {
  return user.role === "AUDITOR" || task.assignedToId === user.id;
}
