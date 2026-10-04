"use client";

import { useState } from "react";
import { redirect } from "next/navigation";
import { QueryState } from "@/components/shared/query-state";
import { PlusIcon, UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PageHeader,
  EmptyState,
  RoleBadge,
} from "@/components/shared/page-header";
import { UserAvatar } from "@/components/shared/user-avatar";
import { StaffFormDialog } from "@/components/staff/staff-form-dialog";
import { StaffEditDialog } from "@/components/staff/staff-edit-dialog";
import type { User } from "@/lib/types";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useAuth } from "@/components/providers/auth-provider";
import { useStaff } from "@/lib/hooks";
import { formatDate } from "@/lib/formats";

export default function StaffPage() {
  const { user } = useAuth();
  const staff = useStaff();
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<{ member: User; resetPassword: boolean } | null>(null);

  const isAuditor = user?.role === "AUDITOR";
  if (!isAuditor) redirect("/tasks");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team members"
        description="The staff assigned to carry out audit work."
        actions={
          isAuditor ? (
            <Button onClick={() => setFormOpen(true)}>
              <PlusIcon className="size-4" />
              Add staff
            </Button>
          ) : null
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>All staff</CardTitle>
        </CardHeader>
        <CardContent>
          {staff.isLoading || staff.error ? (
            <QueryState
              loading={staff.isLoading}
              error={staff.error}
              retry={() => void staff.refetch()}
            />
          ) : staff.data && staff.data.length === 0 ? (
            <EmptyState
              icon={UsersIcon}
              title="No staff members"
              description="Add your first team member to get started."
            />
          ) : (
            <Table>
              <TableBody>
                {(staff.data ?? []).map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserAvatar name={member.name} />
                        <span className="font-medium">{member.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.email}
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={member.role} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(member.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" aria-label={`Edit ${member.name}`} onClick={() => setSelected({ member, resetPassword: false })}>Edit</Button>
                        <Button variant="outline" size="sm" aria-label={`Reset password for ${member.name}`} onClick={() => setSelected({ member, resetPassword: true })}>Reset password</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <StaffFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <StaffEditDialog member={selected?.member ?? null} resetPassword={selected?.resetPassword ?? false} onClose={() => setSelected(null)} />
    </div>
  );
}
