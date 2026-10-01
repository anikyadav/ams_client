import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function NativeSelect({
  className,
  ...props
}: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-11 md:h-10 w-full rounded-lg border border-input bg-background px-2 text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
