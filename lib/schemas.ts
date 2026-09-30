import { bsToAd } from "@/lib/nepali-date";
import { z } from "zod";

export const ENGAGEMENT_STATUS_OPTIONS = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "UNDER_REVIEW",
  "COMPLETE",
  "DELIVERED",
] as const;

export const SUBTASK_STATUS_OPTIONS = ["TODO", "IN_PROGRESS", "DONE"] as const;

const passwordBytes = (value: string) => new TextEncoder().encode(value).length;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(256),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const createStaffSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .refine((value) => passwordBytes(value) <= 72, {
      message: "Password must not exceed 72 UTF-8 bytes",
    }),
});
export type CreateStaffValues = z.infer<typeof createStaffSchema>;

export const clientSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  pan: z.string().trim().refine((value) => !value || /^[0-9]{9}$/.test(value), "PAN must contain exactly 9 digits"),
  location: z.string().trim().max(1000, "Address must be at most 1000 characters"),
  fileLocation: z.string().trim().max(1000, "File location must be at most 1000 characters"),
});
export type ClientValues = z.infer<typeof clientSchema>;

const dateValue = z
  .string()
  .trim()
  .refine((value) => {
    if (!value) return true;
    try {
      bsToAd(value);
      return true;
    } catch {
      return false;
    }
  }, "Enter a valid BS date as YYYY-MM-DD")
  .optional();

export const engagementSchema = z
  .object({
    clientId: z.string().min(1, "Client is required"),
    staffId: z.string().min(1, "Assigned staff is required"),
    natureOfWork: z
      .string()
      .trim()
      .min(1, "Nature of work is required")
      .max(2000),
    status: z.enum(ENGAGEMENT_STATUS_OPTIONS).optional(),
    startDate: dateValue,
    targetDate: dateValue,
    priority: z.string().trim().max(120).optional(),
  })
  .refine(
    (value) =>
      !value.startDate ||
      !value.targetDate ||
      value.targetDate >= value.startDate,
    {
      message: "Target date cannot precede start date",
      path: ["targetDate"],
    },
  );
export type EngagementValues = z.infer<typeof engagementSchema>;

export const subTaskSchema = z.object({
  dueDate: dateValue,
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).optional(),
  assignedToId: z.string().min(1, "Assignee is required"),
});
export type SubTaskValues = z.infer<typeof subTaskSchema>;

export const commentSchema = z.object({
  text: z.string().trim().min(1, "Comment cannot be empty").max(2000),
});
export type CommentValues = z.infer<typeof commentSchema>;
