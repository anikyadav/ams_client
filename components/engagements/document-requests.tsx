"use client";

import { useState, type FormEvent } from "react";
import { CalendarDays, FileCheck2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { BsDatePicker } from "@/components/ui/bs-date-picker";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { deadlineLabel } from "@/components/shared/deadline";
import { useAuth } from "@/components/providers/auth-provider";
import { apiErrorMessage } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/formats";
import {
  useCreateDocumentRequest,
  useDeleteDocumentRequest,
  useUpdateDocumentRequest,
} from "@/lib/hooks";
import { bsToAd } from "@/lib/nepali-date";
import { isOverdue } from "@/lib/project-tracking";
import { cn } from "@/lib/utils";
import type { DocumentRequest, Engagement } from "@/lib/types";

/** What the client still owes us: a per-engagement list that is ticked off as documents arrive. */
export function DocumentRequests({ engagement }: { engagement: Engagement }) {
  const { user } = useAuth();
  const create = useCreateDocumentRequest();
  const update = useUpdateDocumentRequest();
  const remove = useDeleteDocumentRequest();
  const auditor = user?.role === "AUDITOR";
  const requests = engagement.documentRequests ?? [];
  const received = requests.filter((request) => request.status === "RECEIVED").length;
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [reference, setReference] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const sorted = [...requests].sort(
    (a, b) =>
      Number(a.status === "RECEIVED") - Number(b.status === "RECEIVED") ||
      (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") ||
      a.createdAt.localeCompare(b.createdAt),
  );

  async function run(action: () => Promise<unknown>, message?: string) {
    try {
      await action();
      if (message) toast.success(message);
      return true;
    } catch (error) {
      toast.error(apiErrorMessage(error));
      return false;
    }
  }
  async function add(event: FormEvent) {
    event.preventDefault();
    const value = title.trim();
    if (!value) return;
    let dueDate: string | null = null;
    try {
      dueDate = due ? bsToAd(due) : null;
    } catch {
      toast.error("Enter the due date as a valid BS date");
      return;
    }
    const ok = await run(
      () =>
        create.mutateAsync({
          engagementId: engagement.id,
          payload: { title: value, dueDate },
        }),
      "Request added",
    );
    if (ok) {
      setTitle("");
      setDue("");
    }
  }
  const receive = (request: DocumentRequest, note: string) =>
    run(
      () =>
        update.mutateAsync({
          id: request.id,
          payload: {
            status: "RECEIVED",
            ...(note.trim() ? { reference: note.trim() } : {}),
          },
        }),
      "Marked as received",
    );

  return (
    <section aria-label="Document requests" className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Document requests</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            What the client still needs to send. Tick each one off when it arrives and note where it
            is kept.
          </p>
        </div>
        {requests.length > 0 && (
          <span className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium">
            <Progress
              className="w-24"
              value={(received / requests.length) * 100}
              aria-label="Documents received"
            />
            {received} of {requests.length} received
          </span>
        )}
      </div>

      {auditor && (
        <form onSubmit={add} className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/30 p-3">
          <label className="min-w-56 flex-1 space-y-1 text-xs text-muted-foreground">
            <span>New request</span>
            <Input
              className="text-foreground"
              aria-label="Requested document"
              placeholder="e.g. Bank statements for the year"
              maxLength={200}
              value={title}
              disabled={create.isPending}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <div className="space-y-1 text-xs text-muted-foreground">
            <span>Needed by (BS, optional)</span>
            <BsDatePicker label="Needed by (BS)" value={due} onChange={setDue} />
          </div>
          <Button type="submit" disabled={create.isPending || !title.trim()}>
            Add request
          </Button>
        </form>
      )}

      {requests.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No documents have been requested yet.
          {auditor ? " Add the first one above." : ""}
        </p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((request) => {
            const done = request.status === "RECEIVED";
            const overdue = isOverdue(request.dueDate, done);
            return (
              <li
                key={request.id}
                aria-label={request.title}
                className="space-y-2 rounded-lg border bg-card px-3 py-2.5"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    id={`request-${request.id}`}
                    type="checkbox"
                    className="size-4 shrink-0 accent-[var(--primary)]"
                    checked={done}
                    disabled={update.isPending}
                    onChange={(event) => {
                      if (event.target.checked) setEditing(request.id);
                      else
                        void run(
                          () =>
                            update.mutateAsync({
                              id: request.id,
                              payload: { status: "REQUESTED" },
                            }),
                          "Reopened request",
                        );
                      setReference(request.reference ?? "");
                    }}
                  />
                  <label
                    htmlFor={`request-${request.id}`}
                    className={cn(
                      "min-w-0 flex-1 basis-56 text-sm font-medium",
                      done && "text-muted-foreground line-through",
                    )}
                  >
                    {request.title}
                  </label>
                  <span
                    className={cn(
                      "flex items-center gap-1 whitespace-nowrap text-xs",
                      overdue ? "font-medium text-destructive" : "text-muted-foreground",
                    )}
                    title={request.dueDate ? formatDate(request.dueDate) : undefined}
                  >
                    <CalendarDays className="size-3.5" aria-hidden="true" />
                    {request.dueDate
                      ? done
                        ? formatDate(request.dueDate)
                        : deadlineLabel(request.dueDate)
                      : "No due date"}
                  </span>
                  {auditor && (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Delete request ${request.title}`}
                      onClick={() => setDeleting(request.id)}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
                {done && (
                  <p className="flex flex-wrap items-center gap-2 pl-7 text-xs text-muted-foreground">
                    <FileCheck2 className="size-3.5 text-emerald-600" aria-hidden="true" />
                    Received
                    {request.receivedBy ? ` by ${request.receivedBy.name}` : ""}
                    {request.receivedAt ? ` on ${formatDateTime(request.receivedAt)}` : ""}
                    {request.reference ? ` · ${request.reference}` : ""}
                  </p>
                )}
                {editing === request.id && !done && (
                  <form
                    className="flex flex-wrap items-center gap-2 pl-7"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      if (await receive(request, reference)) setEditing(null);
                    }}
                  >
                    <Input
                      autoFocus
                      aria-label={`Where is ${request.title} kept?`}
                      className="min-w-56 flex-1"
                      placeholder="Where is it kept? (folder, email, file location)"
                      maxLength={500}
                      value={reference}
                      onChange={(event) => setReference(event.target.value)}
                    />
                    <Button type="submit" size="sm" disabled={update.isPending}>
                      Mark received
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDelete
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete request?"
        description="This removes the request from the list."
        pending={remove.isPending}
        onConfirm={async () => {
          if (!deleting) return;
          if (await run(() => remove.mutateAsync(deleting), "Request deleted"))
            setDeleting(null);
        }}
      />
    </section>
  );
}

