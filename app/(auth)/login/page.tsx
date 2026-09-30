"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheckIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { apiErrorMessage } from "@/lib/api";
import { loginSchema, type LoginValues } from "@/lib/schemas";

export default function LoginPage() {
  const { user, status, login } = useAuth();
  const [pending, setPending] = useState(false);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  if (user) {
    redirect(user.role === "STAFF" ? "/tasks" : "/dashboard");
  }
  if (status === "loading")
    return (
      <p role="status" className="text-center text-sm">
        Checking your session…
      </p>
    );

  async function onSubmit(values: LoginValues) {
    setPending(true);
    try {
      await login(values.email, values.password);
    } catch (error) {
      toast.error(apiErrorMessage(error));
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
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
          >
            <FormField control={form.control} name="email" label="Email">
              {(field) => (
                <Input
                  {...field}
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
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              )}
            </FormField>
            <Button type="submit" className="w-full" disabled={pending}>
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
