import { apiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function QueryState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: unknown;
  retry: () => void;
}) {
  if (loading)
    return (
      <div role="status" aria-label="Loading content" className="space-y-4 py-6">
        <span className="sr-only">Loading…</span>
        <Skeleton className="h-5 w-1/3" />
        {[0, 1, 2].map((row) => <div key={row} aria-hidden="true" className="flex items-center gap-4 rounded-xl border bg-card p-4"><Skeleton className="size-10 rounded-lg" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/3" /></div></div>)}
      </div>
    );
  if (error)
    return (
      <div role="alert" className="space-y-3 p-6">
        <p>{apiErrorMessage(error)}</p>
        <Button variant="outline" onClick={retry}>
          Try again
        </Button>
      </div>
    );
  return null;
}
