"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Dialog } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

export function FormDialog({ open, onOpenChange, dirty = false, pending = false, children }: {
  open: boolean; onOpenChange: (open: boolean) => void; dirty?: boolean; pending?: boolean; children: ReactNode;
}) {
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!open || !dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [open, dirty]);
  return <>
    <Dialog open={open} onOpenChange={(value) => {
      if (pending) return;
      if (!value && dirty) setConfirming(true);
      else onOpenChange(value);
    }}>{children}</Dialog>
    <AlertDialog open={open && confirming} onOpenChange={setConfirming}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle><AlertDialogDescription>Your changes have not been saved. Keep editing to finish your work.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep editing</AlertDialogCancel>
          <AlertDialogAction onClick={() => { setConfirming(false); onOpenChange(false); }}>Discard changes</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}

export function FormError({ message }: { message?: string }) {
  return message ? <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{message}</p> : null;
}
