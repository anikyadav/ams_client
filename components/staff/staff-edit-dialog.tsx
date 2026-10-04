"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FormDialog, FormError } from "@/components/shared/form-dialog";
import { DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useUpdateStaff } from "@/lib/hooks";
import { editStaffSchema, type EditStaffValues } from "@/lib/schemas";
import { apiErrorMessage } from "@/lib/api";
import type { User } from "@/lib/types";

export function StaffEditDialog({ member, resetPassword, onClose }: {
  member: User | null;
  resetPassword: boolean;
  onClose: () => void;
}) {
  const update = useUpdateStaff();
  const form = useForm<EditStaffValues>({
    resolver: zodResolver(editStaffSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });
  useEffect(() => {
    form.reset({ name: member?.name ?? "", email: member?.email ?? "", password: "", confirmPassword: "" });
  }, [member, resetPassword, form]);

  async function onSubmit(values: EditStaffValues) {
    if (!member) return;
    form.clearErrors("root.server");
    if (resetPassword && !values.password) {
      form.setError("password", { message: "Enter a new password" });
      return;
    }
    try {
      await update.mutateAsync({
        id: member.id,
        ...(resetPassword ? {} : { name: values.name, email: values.email }),
        ...(values.password ? { password: values.password } : {}),
      });
      toast.success(resetPassword ? "Staff password reset" : "Staff account updated");
      form.reset();
      onClose();
    } catch (error) {
      form.setError("root.server", { message: apiErrorMessage(error) });
    }
  }

  return (
    <FormDialog open={Boolean(member)} onOpenChange={(open) => { if (!open) onClose(); }} dirty={form.formState.isDirty} pending={update.isPending}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{resetPassword ? "Reset staff password" : "Edit staff account"}</DialogTitle>
          <DialogDescription>
            {resetPassword ? `Set a new login password for ${member?.name}. Share it with the staff member securely.` : "Update the staff member’s name and login email. Leave the password blank to keep their current password."}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          {!resetPassword && <>
            <FormField control={form.control} name="name" label="Full name">
              {(field) => <Input autoFocus disabled={update.isPending} {...field} />}
            </FormField>
            <FormField control={form.control} name="email" label="Login email">
              {(field) => <Input type="email" autoComplete="off" disabled={update.isPending} {...field} />}
            </FormField>
          </>}
          <FormField control={form.control} name="password" label={resetPassword ? "New password" : "New password (optional)"}>
            {(field) => <Input type="password" autoFocus={resetPassword} autoComplete="new-password" placeholder="At least 12 characters" disabled={update.isPending} {...field} />}
          </FormField>
          <FormField control={form.control} name="confirmPassword" label="Confirm new password">
            {(field) => <Input type="password" autoComplete="new-password" disabled={update.isPending} {...field} />}
          </FormField>
          <FormError message={form.formState.errors.root?.server?.message} />
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={update.isPending} />}>Cancel</DialogClose>
            <Button type="submit" disabled={update.isPending || !form.formState.isDirty}>
              {update.isPending ? "Saving…" : resetPassword ? "Reset password" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </FormDialog>
  );
}
