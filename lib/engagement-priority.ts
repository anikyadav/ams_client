export const ENGAGEMENT_PRIORITIES = ["High", "Medium", "Low"] as const;

export function normalizePriority(value?: string | null): string {
  const trimmed = value?.trim() ?? "";
  return ENGAGEMENT_PRIORITIES.find((priority) => priority.toLowerCase() === trimmed.toLowerCase()) ?? trimmed;
}

export function priorityGroup(value?: string | null): string {
  const normalized = normalizePriority(value);
  return ENGAGEMENT_PRIORITIES.includes(normalized as typeof ENGAGEMENT_PRIORITIES[number]) ? normalized : normalized ? "Other" : "Not set";
}
