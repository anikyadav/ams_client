"use client";

import { nepalToday } from "@/lib/project-tracking";
import { createContext, useContext, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, apiErrorMessage } from "@/lib/api";
import {
  bsToAd,
  currentBsFiscalYear,
  fiscalYearLabel,
} from "@/lib/nepali-date";
import { useAuth } from "./auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export type FiscalYear = {
  id: string;
  startDate: string | null;
  endDate: string | null;
};
const FiscalContext = createContext<FiscalYear | null>(null);
export function useFiscalYear() {
  const year = useContext(FiscalContext);
  if (!year) throw new Error("Select a fiscal year before loading audit data");
  return year;
}

export function FiscalYearProvider({ children, renderControls }: { children: ReactNode; renderControls?: (controls: ReactNode) => ReactNode }) {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : window.sessionStorage.getItem(`audit-fiscal-year:${user?.id}`),
  );
  const [open, setOpen] = useState(false);
  const [startYear, setStartYear] = useState(() =>
    String(currentBsFiscalYear()),
  );
  const [copyFromId, setCopyFromId] = useState("");
  const [pending, setPending] = useState(false);
  const years = useQuery({
    queryKey: ["fiscal-years"],
    queryFn: async () => (await api.get<FiscalYear[]>("/fiscal-years")).data,
  });
  const today = nepalToday();
  const selected =
    years.data?.find((year) => year.id === selectedId) ??
    years.data?.find(
      (year) =>
        year.startDate &&
        year.endDate &&
        year.startDate.slice(0, 10) <= today &&
        year.endDate.slice(0, 10) > today,
    ) ??
    years.data?.find((year) => year.startDate) ??
    years.data?.[0];

  async function createYear(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      if (!/^\d{4}$/.test(startYear))
        throw new Error("Enter a four-digit BS starting year");
      const result = await api.post<FiscalYear>("/fiscal-years", {
        startDate: bsToAd(`${startYear}-04-01`),
        endDate: bsToAd(`${Number(startYear) + 1}-04-01`),
        ...(copyFromId ? { copyFromId } : {}),
      });
      await years.refetch();
      setSelectedId(result.data.id);
      window.sessionStorage.setItem(
        `audit-fiscal-year:${user?.id}`,
        result.data.id,
      );
      setOpen(false);
      toast.success("Fiscal year opened");
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  const controls = (
<div className="flex flex-wrap items-center gap-2 pb-3 text-sm">
        <label htmlFor="fiscal-year" className="font-medium text-muted-foreground">
          Fiscal year (BS)
        </label>
        <NativeSelect
          id="fiscal-year"
          value={selected?.id ?? ""}
          onChange={(event) => {
            setSelectedId(event.target.value);
            window.sessionStorage.setItem(
              `audit-fiscal-year:${user?.id}`,
              event.target.value,
            );
          }}
          disabled={pending || !years.data?.length}
          className="w-auto"
        >
          {!years.data?.length && (
            <option value="">
              {years.isLoading ? "Loading years…" : "No fiscal years"}
            </option>
          )}
          {years.data?.map((year) => (
            <option key={year.id} value={year.id}>
              {fiscalYearLabel(year)}
            </option>
          ))}
        </NativeSelect>
        {user?.role === "AUDITOR" && (
          <Button
            variant="outline"
            onClick={() => {
              setCopyFromId(selected?.id ?? "");
              setOpen(true);
            }}
            className="print:hidden"
          >
            Open fiscal year
          </Button>
        )}
        {selected?.startDate && (
          <span className="hidden text-xs text-muted-foreground xl:inline">
            1 Shrawan – end of Ashadh · All dates in BS
          </span>
        )}
      </div>
  );

  return (
    <>
      {renderControls ? renderControls(controls) : controls}
      {years.error && (
        <p role="alert">
          {apiErrorMessage(years.error)}{" "}
          <Button onClick={() => void years.refetch()}>Retry</Button>
        </p>
      )}
      {selected && (
        <FiscalContext.Provider value={selected}>
          <div key={selected.id}>
            {!selected.startDate && (
              <p className="mb-4 rounded-md border p-3 text-sm">
                Existing records are preserved here until their fiscal-year
                ownership is reviewed. Their creation dates do not establish the
                audited fiscal year.
              </p>
            )}
            {children}
          </div>
        </FiscalContext.Provider>
      )}
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!pending) setOpen(value);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open Nepali fiscal year</DialogTitle>
            <DialogDescription>
              Client profiles and saved IRD details can be copied into fresh yearly records. Audit
              work and its history stay in the original year.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createYear} className="space-y-4">
            <label className="block">
              Starting year (BS)
              <Input
                value={startYear}
                onChange={(event) => setStartYear(event.target.value)}
                inputMode="numeric"
                placeholder="2083"
                required
              />
            </label>
            <label className="block">
              Copy client profiles from
              <NativeSelect
                value={copyFromId}
                onChange={(event) => setCopyFromId(event.target.value)}
              >
                <option value="">Start with no clients</option>
                {years.data?.map((year) => (
                  <option key={year.id} value={year.id}>
                    {fiscalYearLabel(year)}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <p className="text-sm text-muted-foreground">
              1 Shrawan {startYear} to end of Ashadh {Number(startYear) + 1}
            </p>
            <Button disabled={pending} type="submit">
              {pending ? "Opening…" : "Open year"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
