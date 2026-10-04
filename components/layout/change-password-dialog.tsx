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
import { apiErrorMessage } from "@/lib/api";
import { useChangePassword } from "@/lib/hooks";
import { changePasswordSchema, type ChangePasswordValues } from "@/lib/schemas";

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const change = useChangePassword();
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  useEffect(() => {
    if (open) form.reset();
  }, [open, form]);

  async function onSubmit(values: ChangePasswordValues) {
    form.clearErrors("root.server");
    try {
      await change.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success("Password updated");
      onOpenChange(false);
    } catch (error) {
      form.setError("root.server", { message: apiErrorMessage(error) });
    }
  }

  return (
    <Dialog dirty={form.formState.isDirty} pending={change.isPending} open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>Use at least 12 characters. You stay signed in on this device.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FormField control={form.control} name="currentPassword" label="Current password">
            {(field) => <Input type="password" autoComplete="current-password" autoFocus {...field} />}
          </FormField>
          <FormField control={form.control} name="newPassword" label="New password">
            {(field) => <Input type="password" autoComplete="new-password" {...field} />}
          </FormField>
          <FormField control={form.control} name="confirmPassword" label="Confirm new password">
            {(field) => <Input type="password" autoComplete="new-password" {...field} />}
          </FormField>
          <FormError message={form.formState.errors.root?.server?.message} />
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={change.isPending} />}>Cancel</DialogClose>
            <Button type="submit" disabled={change.isPending}>
              {change.isPending ? "Saving…" : "Update password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
