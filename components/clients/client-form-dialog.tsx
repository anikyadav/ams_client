"use client";

import { useFiscalYear } from "@/components/providers/fiscal-year-provider";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Textarea } from "@/components/ui/textarea";
import { clientSchema, type ClientValues } from "@/lib/schemas";
import { apiErrorMessage } from "@/lib/api";
import { useCreateClient, useUpdateClient } from "@/lib/hooks";
import type { Client } from "@/lib/types";

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client;
  onCreated?: (client: Client) => void;
}) {
  const fiscalYear = useFiscalYear();
  const create = useCreateClient();
  const update = useUpdateClient();
  const [pending, setPending] = useState(false);

  const form = useForm<ClientValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: { name: "", pan: "", location: "", fileLocation: "" },
  });
  useEffect(() => {
    if (open) form.reset({ name: client?.name ?? "", pan: client?.pan ?? "", location: client?.location ?? "", fileLocation: client?.fileLocation ?? "" });
  }, [open, client, form]);

  async function onSubmit(values: ClientValues) {
    setPending(true);
    const payload = { name: values.name, pan: values.pan || null, location: values.location || null, fileLocation: values.fileLocation || null };
    try {
      if (client) {
        await update.mutateAsync({ id: client.id, ...payload });
        toast.success("Client updated");
      } else {
        const created = await create.mutateAsync(payload);
        onCreated?.(created);
        toast.success("Client created");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  if (!client && !fiscalYear.startDate)
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
  return (
    <Dialog open={open} onOpenChange={(value) => { if (!pending) onOpenChange(value); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? "Edit client" : "New client"}</DialogTitle>
          <DialogDescription>
            {client
              ? "Update the client details below."
              : "Register a client in your practice."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
        >
          <FormField control={form.control} name="name" label="Name">
            {(field) => (
              <Input
                autoFocus
                placeholder="e.g. Acme Holdings Ltd"
                {...field}
              />
            )}
          </FormField>
          <FormField control={form.control} name="pan" label="PAN (9 digits, optional)">
            {(field) => <Input {...field} inputMode="numeric" maxLength={9} placeholder="e.g. 012345678" />}
          </FormField>
          <FormField control={form.control} name="location" label="Address (optional)">
            {(field) => <Textarea {...field} maxLength={1000} rows={2} autoComplete="street-address" placeholder="Street, municipality, district" />}
          </FormField>
          <FormField control={form.control} name="fileLocation" label="File location (optional)">
            {(field) => <Input {...field} maxLength={1000} placeholder="e.g. Cabinet A / Shelf 2 or shared folder path" />}
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
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : client ? "Save changes" : "Create client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
