"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, apiErrorMessage } from "@/lib/api";
import { fiscalYearLabel } from "@/lib/nepali-date";
import type { FiscalYear } from "@/components/providers/fiscal-year-provider";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";

export function AssignLegacyYear({ engagementId }: { engagementId: string }) {
  const [target, setTarget] = useState("");
  const [pending, setPending] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const years = useQuery({
    queryKey: ["fiscal-years"],
    queryFn: async () => (await api.get<FiscalYear[]>("/fiscal-years")).data,
  });
  async function assign() {
    setPending(true);
    try {
      await api.post(`/fiscal-years/${target}/assign-legacy`, { engagementId });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["clients"] }),
        queryClient.invalidateQueries({ queryKey: ["engagements"] }),
      ]);
      queryClient.removeQueries({ queryKey: ["engagement", engagementId] });
      toast.success(
        "Historical engagement assigned. Select its fiscal year to view it.",
      );
      router.push("/engagements");
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="space-y-3 rounded-md border p-4 print:hidden">
      <p>
        Confirm the audited fiscal year for this historical engagement. Its
        tasks, comments, and dates will be preserved. This assignment is
        permanent.
      </p>
      <label>
        Audited fiscal year
        <NativeSelect
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          disabled={pending}
        >
          <option value="">Select reviewed fiscal year</option>
          {years.data
            ?.filter((year) => year.startDate)
            .map((year) => (
              <option key={year.id} value={year.id}>
                {fiscalYearLabel(year)}
              </option>
            ))}
        </NativeSelect>
      </label>
      <Button disabled={!target || pending} onClick={() => void assign()}>
        {pending ? "Assigning…" : "Confirm fiscal-year assignment"}
      </Button>
    </div>
  );
}
