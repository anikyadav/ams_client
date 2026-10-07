"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { QueryState } from "@/components/shared/query-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BsDatePicker } from "@/components/ui/bs-date-picker";
import { useDocument } from "@/lib/hooks";
import { apiErrorMessage } from "@/lib/api";
import { adToBs, bsToAd } from "@/lib/nepali-date";
import type {
  DocumentChallenge,
  EngagementDocument,
  SubTask,
} from "@/lib/types";

export function DocumentTask({ task }: { task: SubTask }) {
  const { user } = useAuth();
  if (task.templateKey !== "DOCUMENT") return null;
  if (user?.role !== "AUDITOR" && user?.id !== task.assignedToId)
    return (
      <p className="text-sm text-muted-foreground">
        Document credentials are available to the auditor and the assigned staff
        member.
      </p>
    );
  return <DocumentLoader key={task.id} id={task.id} />;
}

export function ClientIrdDetails({ clientId }: { clientId: string }) {
  return <DocumentLoader key={clientId} id={clientId} clientProfile />;
}

function DocumentLoader({
  id,
  clientProfile = false,
}: {
  id: string;
  clientProfile?: boolean;
}) {
  const document = useDocument(id, clientProfile);
  if (!document.details.data)
    return (
      <QueryState
        loading={document.details.isLoading}
        error={document.details.error}
        retry={() => void document.details.refetch()}
      />
    );
  return (
    <DocumentForm
      document={document}
      initial={document.details.data}
      clientProfile={clientProfile}
    />
  );
}

function DocumentForm({
  document,
  initial,
  clientProfile,
}: {
  document: ReturnType<typeof useDocument>;
  initial: EngagementDocument;
  clientProfile: boolean;
}) {
  const prefix = useId();
  // Untouched fields follow refreshed data; local edits survive a refetch.
  const [registrationNoDraft, setRegistrationNo] = useState<string | null>(null);
  const [userIdDraft, setUserId] = useState<string | null>(null);
  const [renewalDraft, setRenewal] = useState<string | null>(null);
  const registrationNo = registrationNoDraft ?? initial.registrationNo ?? "";
  const userId = userIdDraft ?? initial.userId ?? "";
  const renewal = renewalDraft ??
    (initial.nextRenewalDate ? adToBs(initial.nextRenewalDate.slice(0, 10)) : "");
  const [password, setPassword] = useState("");
  const [clearPassword, setClearPassword] = useState(false);
  const [challenge, setChallenge] = useState<DocumentChallenge | null>(null);
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const hasPassword = document.details.data?.hasPassword ?? false;

  useEffect(() => {
    if (!revealed) return;
    const hide = () => setRevealed("");
    const timer = window.setTimeout(hide, 30_000);
    window.addEventListener("blur", hide);
    window.document.addEventListener("visibilitychange", hide);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("blur", hide);
      window.document.removeEventListener("visibilitychange", hide);
    };
  }, [revealed]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setRevealed("");
    setChallenge(null);
    try {
      await document.save({
        registrationNo: registrationNo || null,
        userId: userId || null,
        nextRenewalDate: renewal ? bsToAd(renewal) : null,
        ...(clearPassword ? { password: null } : password ? { password } : {}),
      });
      setRegistrationNo(null);
      setUserId(null);
      setRenewal(null);
      setPassword("");
      setClearPassword(false);
      toast.success("Client IRD details saved");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function startChallenge() {
    setBusy(true);
    setError("");
    setAnswer("");
    setChallenge(null);
    try {
      setChallenge(await document.challenge());
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function reveal(event: FormEvent) {
    event.preventDefault();
    if (!challenge || !/^\d+$/.test(answer)) {
      setError("Enter the calculation answer.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await document.reveal(challenge.token, Number(answer));
      setRevealed(result.password);
      setChallenge(null);
      setAnswer("");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="space-y-4 rounded-xl border p-4"
      aria-label="Document details"
    >
      <div>
        <h3 className="font-semibold">
          {clientProfile ? "Client IRD portal details" : "1. Document"}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          These are the client’s IRD website credentials. Details are shared by
          their engagements in this fiscal year. Password access is recorded.
        </p>
      </div>
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm" htmlFor={`${prefix}-registration`}>
              1.1 Registration No.
            </label>
            <Input
              id={`${prefix}-registration`}
              value={registrationNo}
              maxLength={200}
              onChange={(e) => setRegistrationNo(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm" htmlFor={`${prefix}-user`}>
              1.2 IRD user ID
            </label>
            <Input
              id={`${prefix}-user`}
              value={userId}
              maxLength={200}
              autoComplete="off"
              onChange={(e) => setUserId(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm" htmlFor={`${prefix}-password`}>
            1.3 {hasPassword ? "Replace IRD password" : "IRD password"}
          </label>
          <Input
            id={`${prefix}-password`}
            type="password"
            autoComplete="new-password"
            maxLength={1000}
            value={password}
            disabled={clearPassword}
            placeholder={
              hasPassword
                ? "Leave blank to keep saved password"
                : "Enter portal password"
            }
            onChange={(e) => setPassword(e.target.value)}
          />
          {hasPassword && (
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={clearPassword}
                onChange={(e) => setClearPassword(e.target.checked)}
              />
              Remove saved password when saving
            </label>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-sm" htmlFor={`${prefix}-renewal`}>
            1.4 Next renewal date (BS)
          </label>
          <BsDatePicker
            id={`${prefix}-renewal`}
            label="Next renewal date (BS)"
            value={renewal}
            onChange={setRenewal}
          />
        </div>
        <Button type="submit" disabled={saving || busy}>
          {saving ? "Saving…" : "Save IRD details"}
        </Button>
      </form>
      {hasPassword && (
        <div className="space-y-3 border-t pt-4">
          {revealed ? (
            <div className="space-y-2">
              <p
                className="break-all rounded-md bg-muted p-3 font-mono text-sm"
                aria-label="Revealed password"
              >
                {revealed}
              </p>
              <Button variant="outline" onClick={() => setRevealed("")}>
                Hide password
              </Button>
              <p className="text-xs text-muted-foreground">
                Automatically hides after 30 seconds or when you leave this
                window.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm">Saved password: ••••••••</p>
              <Button
                type="button"
                variant="outline"
                disabled={busy || saving}
                onClick={() => void startChallenge()}
              >
                {busy
                  ? "Please wait…"
                  : challenge
                    ? "New calculation"
                    : "Reveal saved password"}
              </Button>
            </>
          )}
          {challenge && (
            <form onSubmit={reveal} className="flex flex-wrap items-end gap-2">
              <div className="space-y-2">
                <label className="text-sm" htmlFor={`${prefix}-answer`}>
                  Solve {challenge.question} = ?
                </label>
                <Input
                  id={`${prefix}-answer`}
                  className="w-32"
                  inputMode="numeric"
                  autoComplete="off"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={busy}>
                Check and reveal
              </Button>
              <p className="w-full text-xs text-muted-foreground">
                Calculation expires after 2 minutes.
              </p>
            </form>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
