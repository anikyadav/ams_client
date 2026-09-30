"use client";

import Link from "next/link";
import { useState } from "react";
import { redirect } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { QueryState } from "@/components/shared/query-state";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/components/providers/auth-provider";
import { useClients, useDeleteClient } from "@/lib/hooks";
import { apiErrorMessage } from "@/lib/api";
import type { Client } from "@/lib/types";

export default function ClientsPage() {
  const { user } = useAuth();
  const clients = useClients();
  const remove = useDeleteClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client>();
  const [deleting, setDeleting] = useState<Client>();
  if (user?.role !== "AUDITOR") redirect("/tasks");
  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Independent client profiles for the selected fiscal year."
        actions={
          <Button
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
          >
            Add client
          </Button>
        }
      />
      <Card>
        <CardContent>
          <QueryState
            loading={clients.isLoading}
            error={clients.error}
            retry={() => void clients.refetch()}
          />
          {!clients.isLoading &&
            !clients.error &&
            (clients.data?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>PAN</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>File location</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.data.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <Link
                          href={`/clients/${client.id}`}
                          className="font-medium hover:underline"
                        >
                          {client.name}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{client.pan || "—"}</TableCell>
                      <TableCell className="max-w-64 whitespace-normal break-words">{client.location || "—"}</TableCell>
                      <TableCell className="max-w-64 whitespace-normal break-words">{client.fileLocation || "—"}</TableCell>
                      <TableCell className="space-x-2 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditing(client);
                            setFormOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleting(client)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">
                No clients yet. Add a client to create an engagement.
              </p>
            ))}
        </CardContent>
      </Card>
      <ClientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        client={editing}
      />
      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(undefined);
        }}
        title={`Delete ${deleting?.name ?? "client"}?`}
        description="Only clients with no linked engagements can be deleted."
        pending={remove.isPending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.mutateAsync(deleting.id);
            setDeleting(undefined);
            toast.success("Client deleted");
          } catch (error) {
            toast.error(apiErrorMessage(error));
          }
        }}
      />
    </div>
  );
}
