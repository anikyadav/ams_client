"use client";

import Link from "next/link";
import { Building2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { EmptyState } from "@/components/shared/page-header";
import { useState } from "react";
import { redirect } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { QueryState } from "@/components/shared/query-state";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { IrdExport } from "@/components/clients/ird-export";
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
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("asc");
  const visible = (clients.data ?? []).filter((client) => `${client.name} ${client.pan ?? ""}`.toLowerCase().includes(search.trim().toLowerCase())).sort((a, b) => sort === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
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
          <><IrdExport />
          <Button
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
          >
            Add client
          </Button></>
        }
      />
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" /><Input className="pl-9 bg-card" aria-label="Search clients" placeholder="Search by client name or PAN" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <NativeSelect className="sm:w-48" aria-label="Sort clients" value={sort} onChange={(event) => setSort(event.target.value)}><option value="asc">Name: A to Z</option><option value="desc">Name: Z to A</option></NativeSelect>
      </div>
      {!clients.isLoading && !clients.error && <p role="status" className="text-sm text-muted-foreground">{visible.length} of {clients.data?.length ?? 0} clients</p>}
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
              <>
              <div className="space-y-3 md:hidden">{visible.map((client) => <article key={client.id} className="rounded-xl border p-4">
                <Link href={`/clients/${client.id}`} className="font-semibold text-primary">{client.name}</Link>
                <dl className="mt-3 space-y-2 text-sm"><div><dt className="text-xs text-muted-foreground">PAN</dt><dd>{client.pan || "Not provided"}</dd></div><div><dt className="text-xs text-muted-foreground">Address</dt><dd className="break-words">{client.location || "Not provided"}</dd></div></dl>
                <div className="mt-4 flex gap-2"><Button variant="outline" onClick={() => { setEditing(client); setFormOpen(true); }}>Edit</Button><Button variant="ghost" className="text-destructive" onClick={() => setDeleting(client)}>Delete</Button></div>
              </article>)}</div>
              <div className="hidden md:block"><Table>
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
                  {visible.map((client) => (
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
              </Table></div>
              {!visible.length && <EmptyState icon={Search} title="No matching clients" description="Try another name or PAN, or clear your search." action={<Button variant="outline" onClick={() => setSearch("")}>Clear search</Button>} />}
              </>
            ) : (
              <EmptyState icon={Building2} title="No clients yet" description="Add your first client to start organizing their audit work." action={<Button onClick={() => { setEditing(undefined); setFormOpen(true); }}>Add your first client</Button>} />
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
