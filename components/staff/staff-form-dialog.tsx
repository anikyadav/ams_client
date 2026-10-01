"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
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

  useEffect(() => { if (open) form.reset(); }, [open, form]);

  async function onSubmit(values: CreateStaffValues) {
    setPending(true);
    form.clearErrors("root.server");
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
      form.setError("root.server", { message: apiErrorMessage(error) });
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog dirty={form.formState.isDirty} pending={pending} open={open} onOpenChange={onOpenChange}>
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
          <FormError message={form.formState.errors.root?.server?.message} />
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Add staff"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}