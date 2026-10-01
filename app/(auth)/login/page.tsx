"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { ShieldCheckIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/components/providers/auth-provider";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { apiErrorMessage } from "@/lib/api";
import { loginSchema, type LoginValues } from "@/lib/schemas";
import { useApiReadiness } from "@/lib/use-api-readiness";

export default function LoginPage() {
  const { user, status, login } = useAuth();
  const [pending, setPending] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const { readiness, elapsed, run } = useApiReadiness();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  if (user) {
    redirect(user.role === "STAFF" ? "/tasks" : "/dashboard");
  }
  async function onSubmit(values: LoginValues) {
    if (status === "loading" || pending) return;
    setLoginError(null);
    setSubmitted(true);
    setPending(true);
    try {
      await run((signal) => login(values.email, values.password, signal));
    } catch (error) {
        setLoginError(
          axios.isAxiosError(error) && error.response?.status === 401
            ? "Invalid email or password. Please try again."
            : apiErrorMessage(error),
        );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <ShieldCheckIcon className="size-6" />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Audit Practice
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to manage engagements and your team&apos;s work.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="px-5 pt-5 pb-2">
          <h2 className="text-base font-medium">Welcome back</h2>
          <p className="text-sm text-muted-foreground">
            Use your work account to continue.
          </p>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-2">
          {readiness === "starting" && elapsed >= 2 && (
            <div className="mb-4 space-y-1 text-sm text-muted-foreground">
              <p role="status">
                The server may be waking up. This usually takes about a minute, sometimes longer.
                {pending ? " We’ll sign you in automatically. Please keep this page open." : " Please wait."}
              </p>
              <p>Time elapsed: {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</p>
            </div>
          )}
          {readiness === "failed" && (
            <div className="mb-4 space-y-2">
              <p role="alert" className="text-sm text-destructive">
                The server is still unavailable after two minutes. Please try again.
              </p>
              <Button type="button" variant="outline" onClick={() => {
                setLoginError(null);
                if (submitted) void form.handleSubmit(onSubmit)();
                else void run();
              }}>
                Retry
              </Button>
            </div>
          )}
          {readiness === "ready" && status === "loading" && (
            <p role="status" className="mb-4 text-sm text-muted-foreground">
              Checking your session…
            </p>
          )}
          {loginError && <p role="alert" className="mb-4 text-sm text-destructive">{loginError}</p>}
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
          >
            <FormField control={form.control} name="email" label="Email">
              {(field) => (
                <Input
                  {...field}
                  disabled={pending}
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              )}
            </FormField>
            <FormField control={form.control} name="password" label="Password">
              {(field) => (
                <Input
                  {...field}
                  disabled={pending}
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              )}
            </FormField>
            <Button type="submit" className="w-full" disabled={pending || readiness !== "ready" || status === "loading"}>
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Seed accounts: auditor@example.com or staff1@example.com
      </p>
    </div>
  );
}
