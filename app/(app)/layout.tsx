"use client";

import { FiscalYearProvider } from "@/components/providers/fiscal-year-provider";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { DesktopSidebar } from "@/components/layout/sidebar";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { CommandPalette } from "@/components/layout/command-palette";

function RedirectToLogin() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/login");
  }, [router]);
  return null;
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === "anonymous") {
    return <RedirectToLogin />;
  }

  return (
    <div className="flex min-h-screen">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:p-3 focus:text-primary-foreground">Skip to content</a>
      <DesktopSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <FiscalYearProvider renderControls={(controls) => <WorkspaceHeader controls={controls} />}>
          <main id="main-content" className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <CommandPalette />
            {children}
          </main>
        </FiscalYearProvider>
      </div>
    </div>
  );
}
