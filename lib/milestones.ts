export const SUBTASK_MILESTONES = [25, 50, 75, 100] as const;
export type SubTaskMilestone = (typeof SUBTASK_MILESTONES)[number];