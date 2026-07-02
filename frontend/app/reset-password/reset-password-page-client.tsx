"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, LockKeyhole } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPassword } from "@/services/auth-service";
import { AppLogo } from "@/components/shared/app-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const resetSchema = z
  .object({
    newPassword: z.string().min(6, "Minimum 6 characters"),
    confirmPassword: z.string().min(6, "Minimum 6 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetFormValues = z.infer<typeof resetSchema>;

export default function ResetPasswordPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isDone, setIsDone] = React.useState(false);

  const form = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: ResetFormValues) => {
    if (!token) {
      setError("Missing reset token.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await resetPassword({
        token,
        newPassword: values.newPassword,
      });
      setIsDone(true);
      setTimeout(() => {
        router.push("/login");
      }, 1800);
    } catch {
      setError("Reset failed. Token may be invalid or expired.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5fbff]">
      <div className="relative flex min-h-screen items-center justify-center px-6 py-10">
        <Card className="w-full max-w-md rounded-lg border-border bg-card text-foreground shadow-xl">
          <CardContent className="p-8 md:p-10">
            <div className="mb-8 flex flex-col items-center text-center">
              <AppLogo className="mb-4" />
              <h1 className="text-3xl font-bold tracking-tight">New password</h1>
              <p className="mt-2 text-sm text-muted-foreground">Create a fresh password.</p>
            </div>

            {isDone ? (
              <div className="space-y-4">
                <div className="rounded-md border border-success/25 bg-success-soft px-4 py-4 text-sm text-success">
                  Password updated successfully.
                </div>
                <Button
                  asChild
                  className="h-12 w-full rounded-md bg-primary text-white hover:bg-brand-strong"
                >
                  <Link href="/login">Go to sign in</Link>
                </Button>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
                            <Input
                              type="password"
                              className="h-12 rounded-md border-border bg-card pl-10"
                              placeholder="Enter new password"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
                            <Input
                              type="password"
                              className="h-12 rounded-md border-border bg-card pl-10"
                              placeholder="Confirm password"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {error ? (
                    <div className="rounded-md border border-destructive/25 bg-destructive-soft px-4 py-3 text-sm text-destructive">
                      {error}
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    className="h-12 w-full rounded-md bg-primary text-white hover:bg-brand-strong"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Please wait..." : "Reset password"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>

                  <Button
                    asChild
                    variant="ghost"
                    className="h-11 w-full rounded-md text-muted-foreground hover:bg-surface-2 hover:text-module"
                  >
                    <Link href="/login">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to sign in
                    </Link>
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
