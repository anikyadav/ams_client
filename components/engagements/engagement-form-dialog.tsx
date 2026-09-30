"use client";

import { adToBs, bsToAd } from "@/lib/nepali-date";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFiscalYear } from "@/components/providers/fiscal-year-provider";
import { useEffect, useState } from "react";
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
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { QueryState } from "@/components/shared/query-state";
import { useAuth } from "@/components/providers/auth-provider";
import { apiErrorMessage } from "@/lib/api";
import {
  useCreateEngagement,
  useUpdateEngagement,
  useClients,
  useStaff,
} from "@/lib/hooks";
import {
  engagementSchema,
  ENGAGEMENT_STATUS_OPTIONS,
  type EngagementValues,
} from "@/lib/schemas";
import { engagementStatusLabel } from "@/lib/formats";
import type { Engagement } from "@/lib/types";

export function EngagementFormDialog({
  open,
  onOpenChange,
  engagement,
  defaultClientId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  engagement?: Engagement;
  defaultClientId?: string;
}) {
  const { user } = useAuth();
  const clients = useClients();
  const staff = useStaff();
  const fiscalYear = useFiscalYear();
  const create = useCreateEngagement();
  const update = useUpdateEngagement();
  const [clientOpen, setClientOpen] = useState(false);
  const pending = create.isPending || update.isPending;
  const form = useForm<EngagementValues>({
    resolver: zodResolver(engagementSchema),
    defaultValues: {
      clientId: "",
      staffId: "",
      natureOfWork: "",
      startDate: "",
      targetDate: "",
      priority: "",
      status: "NOT_STARTED",
    },
  });
  useEffect(() => {
    if (open)
      form.reset({
        clientId: engagement?.clientId ?? defaultClientId ?? "",
        staffId: engagement?.staffId ?? "",
        natureOfWork: engagement?.natureOfWork ?? "",
        status: engagement?.status ?? "NOT_STARTED",
        startDate: engagement?.startDate
          ? adToBs(engagement.startDate.slice(0, 10))
          : "",
        targetDate: engagement?.targetDate
          ? adToBs(engagement.targetDate.slice(0, 10))
          : "",
        priority: engagement?.priority ?? "",
      });
  }, [open, engagement, defaultClientId, form]);
  if (!engagement && !fiscalYear.startDate)
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select a fiscal year</DialogTitle>
            <DialogDescription>
              Open or select a Nepali fiscal year before creating new records.
              The historical area is for reviewing existing work.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  if (user?.role !== "AUDITOR") return null;
  async function onSubmit(values: EngagementValues) {
    const payload = {
      ...values,
      startDate: values.startDate ? bsToAd(values.startDate) : null,
      targetDate: values.targetDate ? bsToAd(values.targetDate) : null,
      priority: values.priority || null,
    };
    try {
      if (engagement) await update.mutateAsync({ id: engagement.id, payload });
      else await create.mutateAsync(payload);
      toast.success(engagement ? "Engagement updated" : "Engagement created");
      onOpenChange(false);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!pending) onOpenChange(value);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {engagement ? "Edit engagement" : "New engagement"}
            </DialogTitle>
            <DialogDescription>
              Set the scope, primary staff member and dates for this job.
            </DialogDescription>
          </DialogHeader>
          <QueryState
            loading={clients.isLoading || staff.isLoading}
            error={clients.error || staff.error}
            retry={() => {
              void clients.refetch();
              void staff.refetch();
            }}
          />
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
          >
            <FormField control={form.control} name="clientId" label="Client">
              {(field) => (
                <NativeSelect {...field}>
                  <option value="">Select a client</option>
                  {clients.data?.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </FormField>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setClientOpen(true)}
            >
              Quick-add client
            </Button>
            <FormField
              control={form.control}
              name="staffId"
              label="Primary staff"
            >
              {(field) => (
                <NativeSelect {...field}>
                  <option value="">Select a staff member</option>
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
            <FormField
              control={form.control}
              name="natureOfWork"
              label="Nature of work"
            >
              {(field) => <Textarea {...field} rows={3} />}
            </FormField>
            <FormField control={form.control} name="status" label="Status">
              {(field) => (
                <NativeSelect {...field}>
                  {ENGAGEMENT_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {engagementStatusLabel[status]}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startDate"
                label="Start date (BS)"
              >
                {(field) => (
                  <Input
                    {...field}
                    placeholder="YYYY-MM-DD"
                    inputMode="numeric"
                  />
                )}
              </FormField>
              <FormField
                control={form.control}
                name="targetDate"
                label="Target date (BS)"
              >
                {(field) => (
                  <Input
                    {...field}
                    placeholder="YYYY-MM-DD"
                    inputMode="numeric"
                  />
                )}
              </FormField>
            </div>
            <FormField
              control={form.control}
              name="priority"
              label="Priority (optional)"
            >
              {(field) => <Input {...field} placeholder="e.g. High" />}
            </FormField>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  pending ||
                  clients.isLoading ||
                  staff.isLoading ||
                  !!clients.error ||
                  !!staff.error
                }
              >
                {pending
                  ? "Saving…"
                  : engagement
                    ? "Save changes"
                    : "Create engagement"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ClientFormDialog
        open={clientOpen}
        onOpenChange={setClientOpen}
        onCreated={(client) =>
          form.setValue("clientId", client.id, { shouldValidate: true })
        }
      />
    </>
  );
}
