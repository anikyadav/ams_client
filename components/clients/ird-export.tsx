"use client";

import { useId, useState, type FormEvent } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFiscalYear } from "@/components/providers/fiscal-year-provider";
import { useIrdExport } from "@/lib/hooks";
import { apiErrorMessage } from "@/lib/api";
import { fiscalYearLabel } from "@/lib/nepali-date";
import type { DocumentChallenge } from "@/lib/types";
import { isAxiosError } from "axios";

export function IrdExport() {
  const year = useFiscalYear();
  return <ExportDialog key={year.id} />;
}

function ExportDialog() {
  const year = useFiscalYear();
  const actions = useIrdExport();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [challenge, setChallenge] = useState<DocumentChallenge | null>(null);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function start() {
    setOpen(true);
    setBusy(true);
    setError("");
    setAnswer("");
    setChallenge(null);
    try {
      setChallenge(await actions.challenge());
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function download(event: FormEvent) {
    event.preventDefault();
    if (!challenge || !/^\d+$/.test(answer)) {
      setError("Enter the calculation answer.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const blob = await actions.download(challenge.token, Number(answer));
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ird-credentials-${fiscalYearLabel(year).replace(/[^a-zA-Z0-9-]/g, "-")}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setOpen(false);
      setChallenge(null);
      setAnswer("");
    } catch (err) {
      // Error responses also arrive as blobs because this request downloads a file.
      if (isAxiosError(err) && err.response?.data instanceof Blob) {
        try {
          const body = JSON.parse(await err.response.data.text()) as {
            message?: string;
          };
          setError(body.message || "Export failed. Try again.");
        } catch {
          setError("Export failed. Try again.");
        }
      } else setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button variant="outline" onClick={() => void start()}>
        <Download className="size-4" />
        Export IRD credentials
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) {
            setOpen(value);
            if (!value) {
              setChallenge(null);
              setAnswer("");
            }
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export client IRD credentials</DialogTitle>
            <DialogDescription>
              All clients in {fiscalYearLabel(year)} will be included, with
              their IRD user IDs and passwords. Clients without saved
              credentials have blank fields. The downloaded Excel file contains
              readable passwords; keep it private.
            </DialogDescription>
          </DialogHeader>
          {busy && (
            <p role="status" className="text-sm">
              Please wait…
            </p>
          )}
          {challenge && (
            <form onSubmit={download} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor={inputId} className="text-sm">
                  Solve {challenge.question} = ?
                </label>
                <Input
                  id={inputId}
                  autoComplete="off"
                  inputMode="numeric"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Calculation expires after 2 minutes. This export is recorded.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={busy}>
                  Download Excel list
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void start()}
                >
                  New calculation
                </Button>
              </div>
            </form>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {!challenge && !busy && (
            <Button variant="outline" onClick={() => void start()}>
              Try again
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
