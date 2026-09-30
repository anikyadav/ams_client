"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useCreateStaff } from "@/lib/hooks";
import {
  createStaffSchema,
  type CreateStaffValues,
} from "@/lib/schemas";
import { apiErrorMessage } from "@/lib/api";

export function StaffFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateStaff();
  const [pending, setPending] = useState(false);

  const form = useForm<CreateStaffValues>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: CreateStaffValues) {
    setPending(true);
    try {
      await create.mutateAsync({
        name: values.name,
        email: values.email,
        password: values.password,
      });
      toast.success("Staff member added");
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add staff member</DialogTitle>
          <DialogDescription>
            Create a login for a new member of your audit team.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
        >
          <FormField control={form.control} name="name" label="Full name">
            {(field) => (
              <Input autoFocus placeholder="e.g. Alex Kim" {...field} />
            )}
          </FormField>
          <FormField control={form.control} name="email" label="Email">
            {(field) => (
              <Input
                type="email"
                placeholder="alex@example.com"
                autoComplete="off"
                {...field}
              />
            )}
          </FormField>
          <FormField control={form.control} name="password" label="Password">
            {(field) => (
              <Input
                type="password"
                placeholder="At least 12 characters"
                autoComplete="new-password"
                {...field}
              />
            )}
          </FormField>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Add staff"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}