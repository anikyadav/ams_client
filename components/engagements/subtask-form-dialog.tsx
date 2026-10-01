"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormDialog as Dialog, FormError } from "@/components/shared/form-dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { QueryState } from "@/components/shared/query-state";
import { useAuth } from "@/components/providers/auth-provider";
import { useCreateSubTask, useUpdateSubTask, useStaff } from "@/lib/hooks";
import { subTaskSchema, type SubTaskValues } from "@/lib/schemas";
import { apiErrorMessage } from "@/lib/api";
import type { SubTask } from "@/lib/types";
import { adToBs, bsToAd } from "@/lib/nepali-date";

export function SubTaskFormDialog({
  open,
  onOpenChange,
  engagementId,
  engagementLabel,
  task,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  engagementId: string;
  engagementLabel?: string;
  task?: SubTask;
}) {
  const { user } = useAuth();
  const create = useCreateSubTask();
  const update = useUpdateSubTask();
  const staff = useStaff();
  const pending = create.isPending || update.isPending;
  const form = useForm<SubTaskValues>({
    resolver: zodResolver(subTaskSchema),
    defaultValues: { title: "", description: "", assignedToId: "", dueDate: "", priority: "MEDIUM" },
  });
  useEffect(() => {
    if (open)
      form.reset({
        title: task?.title ?? "",
        description: task?.description ?? "",
        assignedToId: task?.assignedToId ?? "",
        dueDate: task?.dueDate ? adToBs(task.dueDate.slice(0, 10)) : "",
        priority: task?.priority ?? "MEDIUM",
      });
  }, [open, task, form]);
  if (user?.role !== "AUDITOR") return null;
  async function onSubmit(values: SubTaskValues) {
    form.clearErrors("root.server");
    try {
      const payload = { ...values, description: values.description || null,
        dueDate: values.dueDate ? bsToAd(values.dueDate) : null };
      if (task) await update.mutateAsync({ id: task.id, payload });
      else await create.mutateAsync({ engagementId, payload });
      toast.success(task ? "Sub-task updated" : "Sub-task added");
      onOpenChange(false);
    } catch (error) {
      form.setError("root.server", { message: apiErrorMessage(error) });
    }
  }
  return (
    <Dialog dirty={form.formState.isDirty} pending={pending}
      open={open}
      onOpenChange={(value) => {
        if (!pending) onOpenChange(value);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? "Edit sub-task" : "Add sub-task"}</DialogTitle>
          <DialogDescription>
            {engagementLabel && <span className="mb-1 block font-medium">{engagementLabel}</span>}
            Define the work and assign it to a staff member.
          </DialogDescription>
        </DialogHeader>
        <QueryState
          loading={staff.isLoading}
          error={staff.error}
          retry={() => void staff.refetch()}
        />
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
        >
          <FormField control={form.control} name="title" label="Title">
            {(field) => <Input {...field} />}
          </FormField>
          <FormField
            control={form.control}
            name="description"
            label="Description (optional)"
          >
            {(field) => <Textarea {...field} rows={3} />}
          </FormField>
          <FormField
            control={form.control}
            name="assignedToId"
            label="Assigned to"
          >
            {(field) => (
              <NativeSelect {...field}>
                <option value="">Select staff member</option>
                {staff.data
                  ?.filter((member) => member.role === "STAFF")
                  .map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
              </NativeSelect>
            )}
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="dueDate" label="Due date (BS, optional)">
              {(field) => <Input {...field} placeholder="YYYY-MM-DD" />}
            </FormField>
            <FormField control={form.control} name="priority" label="Priority">
              {(field) => <NativeSelect {...field}>
                <option value="LOW">Low</option><option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option><option value="URGENT">Urgent</option>
              </NativeSelect>}
            </FormField>
          </div>
          <FormError message={form.formState.errors.root?.server?.message} />
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>Cancel</DialogClose>
            <Button
              type="submit"
              disabled={pending || staff.isLoading || !!staff.error}
            >
              {pending ? "Saving…" : task ? "Save changes" : "Add sub-task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
