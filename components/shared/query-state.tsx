import { apiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";

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
      <p role="status" className="p-6 text-sm text-muted-foreground">
        Loading…
      </p>
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
