"use client";

import { useState } from "react";
import { BriefcaseIcon, CopyIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QueryState } from "@/components/shared/query-state";
import { canViewEngagement } from "@/lib/permissions";
import { PageHeader, EmptyState } from "@/components/shared/page-header";
import { CopyFromYearDialog } from "@/components/engagements/copy-from-year-dialog";
import { EngagementFormDialog } from "@/components/engagements/engagement-form-dialog";

import { useAuth } from "@/components/providers/auth-provider";
import { useEngagements } from "@/lib/hooks";
import { EngagementList } from "@/components/engagements/engagement-list";

export default function EngagementsPage() {
  const { user } = useAuth();
  const engagements = useEngagements();
  const [formOpen, setFormOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);

  const isAuditor = user?.role === "AUDITOR";

  const list =
    engagements.data && user
      ? engagements.data.filter((e) => canViewEngagement(user, e))
      : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Engagements"
        description={
          isAuditor
            ? "Audit engagements for the selected fiscal year."
            : "Engagements where you are primary staff or have an assigned sub-task."
        }
        actions={
          isAuditor ? (
            <>
              <Button variant="outline" onClick={() => setCopyOpen(true)}>
                <CopyIcon className="size-4" />
                Copy from previous year
              </Button>
              <Button onClick={() => setFormOpen(true)}>
                <PlusIcon className="size-4" />
                New engagement
              </Button>
            </>
          ) : null
        }
      />

      <Card>
        <CardContent>
          {engagements.isLoading || engagements.error ? (
            <QueryState
              loading={engagements.isLoading}
              error={engagements.error}
              retry={() => void engagements.refetch()}
            />
          ) : list.length === 0 ? (
            <EmptyState
              icon={BriefcaseIcon}
              title="No engagements found"
              description={
                isAuditor
                  ? "Create your first engagement to get started."
                  : "You have not been assigned to any engagements yet."
              }
            />
          ) : (
            <EngagementList engagements={list} />
          )}
        </CardContent>
      </Card>

      {isAuditor && (
        <>
          <EngagementFormDialog open={formOpen} onOpenChange={setFormOpen} />
          <CopyFromYearDialog open={copyOpen} onOpenChange={setCopyOpen} />
        </>
      )}
    </div>
  );
}
