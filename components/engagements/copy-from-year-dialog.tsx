"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { QueryState } from "@/components/shared/query-state";
import { useFiscalYear, type FiscalYear } from "@/components/providers/fiscal-year-provider";
import { api, apiErrorMessage } from "@/lib/api";
import { useCloneEngagements, useEngagementsOfYear, type CloneResult } from "@/lib/hooks";
import { fiscalYearLabel } from "@/lib/nepali-date";

/** Start this year's engagements from an earlier year's: same client, lead, tasks, steps and requests. */
export function CopyFromYearDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const current = useFiscalYear();
  const years = useQuery({
    queryKey: ["fiscal-years"],
    queryFn: async () => (await api.get<FiscalYear[]>("/fiscal-years")).data,
  });
  const earlier = (years.data ?? []).filter((year) => year.id !== current.id && year.id !== "legacy");
  const [yearId, setYearId] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [result, setResult] = useState<CloneResult | null>(null);
  const sourceId = yearId || earlier[0]?.id || "";
  const source = useEngagementsOfYear(sourceId);
  const clone = useCloneEngagements();
  const available = source.data ?? [];

  function close(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setPicked([]);
      setResult(null);
    }
  }
  async function copy() {
    try {
      const outcome = await clone.mutateAsync(picked);
      setResult(outcome);
      setPicked([]);
      if (outcome.created.length)
        toast.success(`Copied ${outcome.created.length} engagement${outcome.created.length === 1 ? "" : "s"}`);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Copy from a previous year</DialogTitle>
          <DialogDescription>
            Copies the client, lead, tasks, steps and document requests into {fiscalYearLabel(current)}.
            Work is reset to not started and dates move forward by the gap between the two years.
          </DialogDescription>
        </DialogHeader>
        {result ? (
          <div className="space-y-4" aria-live="polite">
            <p className="text-sm">
              Created <strong>{result.created.length}</strong>, skipped{" "}
              <strong>{result.skipped.length}</strong>.
            </p>
            {result.created.length > 0 && (
              <ul className="space-y-1 text-sm">
                {result.created.map((item) => (
                  <li key={item.id}>
                    <Link className="text-primary underline" href={`/engagements/${item.id}`}>
                      {item.clientName} — {item.natureOfWork}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {result.skipped.length > 0 && (
              <ul className="space-y-1 rounded-lg border bg-muted/40 p-3 text-sm">
                {result.skipped.map((item) => (
                  <li key={item.sourceId}>
                    <strong>{item.label}</strong>: {item.reason}
                  </li>
                ))}
              </ul>
            )}
            <Button onClick={() => close(false)}>Done</Button>
          </div>
        ) : earlier.length === 0 && !years.isLoading ? (
          <p className="text-sm text-muted-foreground">There is no earlier fiscal year to copy from.</p>
        ) : (
          <div className="space-y-4">
            <label className="block space-y-1 text-sm">
              <span>Copy from</span>
              <NativeSelect
                value={sourceId}
                onChange={(event) => {
                  setYearId(event.target.value);
                  setPicked([]);
                }}
              >
                {earlier.map((year) => (
                  <option key={year.id} value={year.id}>
                    {fiscalYearLabel(year)}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <QueryState
              loading={source.isLoading}
              error={source.error}
              retry={() => void source.refetch()}
            />
            {source.data && available.length === 0 && (
              <p className="text-sm text-muted-foreground">That year has no engagements.</p>
            )}
            {available.length > 0 && (
              <fieldset className="space-y-2">
                <legend className="sr-only">Engagements to copy</legend>
                <label className="flex items-center gap-2 border-b pb-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--primary)]"
                    checked={picked.length === available.length}
                    onChange={(event) =>
                      setPicked(event.target.checked ? available.map((item) => item.id) : [])
                    }
                  />
                  Select all ({available.length})
                </label>
                <ul className="space-y-1">
                  {available.map((item) => (
                    <li key={item.id}>
                      <label className="flex items-start gap-2 rounded-md px-1 py-1 text-sm hover:bg-muted/50">
                        <input
                          type="checkbox"
                          className="mt-0.5 size-4 accent-[var(--primary)]"
                          checked={picked.includes(item.id)}
                          onChange={(event) =>
                            setPicked((value) =>
                              event.target.checked
                                ? [...value, item.id]
                                : value.filter((id) => id !== item.id),
                            )
                          }
                        />
                        <span>
                          <span className="font-medium">{item.client.name}</span> — {item.natureOfWork}
                          <span className="block text-xs text-muted-foreground">
                            Lead {item.staff.name} · {item.subTasks.length} tasks
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button disabled={!picked.length || clone.isPending} onClick={() => void copy()}>
                {clone.isPending
                  ? "Copying…"
                  : `Copy ${picked.length || ""} engagement${picked.length === 1 ? "" : "s"}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
