export const requiredTaskKeys = [
  "DOCUMENT",
  "VAT_RECO",
  "SALES_RECO",
  "PURCHASE_RECO",
  "SALES_CONFIRMATION",
  "PURCHASE_CONFIRMATION",
] as const;
export function isRequiredTask(task: { templateKey?: string | null }) {
  return requiredTaskKeys.some((key) => key === task.templateKey);
}
