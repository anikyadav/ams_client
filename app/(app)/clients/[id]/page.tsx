"use client";

import Link from "next/link";
import { redirect, useParams } from "next/navigation";
import { useState } from "react";
import { isAxiosError } from "axios";
import { useAuth } from "@/components/providers/auth-provider";
import { useFiscalYear } from "@/components/providers/fiscal-year-provider";
import { useClient, useEngagements } from "@/lib/hooks";
import { formatDate } from "@/lib/formats";
import { fiscalYearLabel } from "@/lib/nepali-date";
import { PageHeader } from "@/components/shared/page-header";
import { QueryState } from "@/components/shared/query-state";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { EngagementFormDialog } from "@/components/engagements/engagement-form-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EngagementList } from "@/components/engagements/engagement-list";

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const year = useFiscalYear();
  const client = useClient(id);
  const engagements = useEngagements(
    user?.role === "AUDITOR" && Boolean(client.data) && !client.error,
  );
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  if (user?.role !== "AUDITOR") redirect("/tasks");
  const back = (
    <Link href="/clients" className="text-sm underline underline-offset-4">
      Back to clients
    </Link>
  );
  if (isAxiosError(client.error) && client.error.response?.status === 404)
    return (
      <div className="space-y-4">
        {back}
        <PageHeader
          title="Client not found"
          description="This client profile is not available in the selected fiscal year. Open the client's yearly profile from the clients list."
        />
      </div>
    );
  if (client.isLoading || client.error || !client.data)
    return (
      <div className="space-y-4">
        {back}
        <QueryState
          loading={client.isLoading}
          error={client.error}
          retry={() => void client.refetch()}
        />
      </div>
    );
  const profile = client.data;
  const jobs = (engagements.data ?? []).filter(
    (item) => item.clientId === profile.id && item.fiscalYearId === year.id,
  );
  const complete = jobs.filter(
    (item) => item.status === "COMPLETE" || item.status === "DELIVERED",
  ).length;
  const tasks = jobs.flatMap((item) => item.subTasks);
  const done = tasks.filter((item) => item.status === "DONE").length;

  return (
    <div className="space-y-6">
      {back}
      <PageHeader
        title={profile.name}
        description={`Client profile · ${fiscalYearLabel(year)}`}
        actions={
          <>
            <Button variant="outline" onClick={() => setEditing(true)}>
              Edit client
            </Button>
            <Button onClick={() => setCreating(true)}>New engagement</Button>
          </>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Client details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-3">
            {[
              ["Client name", profile.name],
              ["PAN", profile.pan || "Not provided"],
              ["Address", profile.location || "Not provided"],
              ["File location", profile.fileLocation || "Not provided"],
              ["Fiscal year", fiscalYearLabel(year)],
              ["Profile created (BS)", formatDate(profile.createdAt)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="mt-1 break-words font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm text-muted-foreground">
            This profile and its work belong to the selected fiscal year.
            Changes here apply to the client record for this fiscal year.
          </p>
        </CardContent>
      </Card>
      <QueryState
        loading={engagements.isLoading}
        error={engagements.error}
        retry={() => void engagements.refetch()}
      />
      {!engagements.isLoading && !engagements.error && (
        <>
          <section
            aria-label="Client work overview"
            className="grid grid-cols-2 gap-4 lg:grid-cols-4"
          >
            {[
              ["Engagements", jobs.length],
              ["Open", jobs.length - complete],
              ["Complete or delivered", complete],
              ["Tasks completed", `${done} / ${tasks.length}`],
            ].map(([label, value]) => (
              <Card key={label}>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">
                    {value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </section>
          <Card>
            <CardHeader>
              <CardTitle>Engagements for {fiscalYearLabel(year)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!jobs.length ? (
                <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  No engagements for this client in this fiscal year. Use New
                  engagement to add work.
                </p>
              ) : (
                <EngagementList engagements={jobs} />
              )}
            </CardContent>
          </Card>
        </>
      )}
      <ClientFormDialog
        open={editing}
        onOpenChange={setEditing}
        client={profile}
      />
      <EngagementFormDialog
        open={creating}
        onOpenChange={setCreating}
        defaultClientId={profile.id}
      />
    </div>
  );
}
