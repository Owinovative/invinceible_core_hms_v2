"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, User2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPassword } from "@/services/auth-service";
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

const forgotSchema = z.object({
  username: z.string().min(1, "Username is required"),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{
    message: string;
    devResetLink?: string;
  } | null>(null);

  const form = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: {
      username: "",
    },
  });

  const onSubmit = async (values: ForgotFormValues) => {
    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await forgotPassword(values);
      setResult({
        message: response.message,
        devResetLink: response.devResetLink,
      });
    } catch {
      setError("Unable to process request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.25),transparent_25%),radial-gradient(circle_at_top_right,rgba(6,182,212,0.18),transparent_22%),radial-gradient(circle_at_bottom_center,rgba(14,165,233,0.14),transparent_18%)]" />
      <div className="absolute inset-0 opacity-[0.18]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(148,163,184,0.12) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(148,163,184,0.12) 1px, transparent 1px)
            `,
            backgroundSize: "34px 34px",
          }}
        />
      </div>
      <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="absolute right-0 top-24 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl" />

      <div className="relative flex min-h-screen items-center justify-center px-6 py-10">
        <Card className="w-full max-w-md rounded-[2rem] border-white/15 bg-white/10 text-white shadow-2xl backdrop-blur-2xl">
          <CardContent className="p-8 md:p-10">
            <div className="mb-8 flex flex-col items-center text-center">
              <AppLogo className="mb-4" light />
              <h1 className="text-3xl font-bold tracking-tight">Reset access</h1>
              <p className="mt-2 text-sm text-white/70">Enter your username</p>
            </div>

            {!result ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/90">Username</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
                            <Input
                              className="h-12 rounded-xl border-white/20 bg-white/10 pl-10 text-white placeholder:text-white/45"
                              placeholder="Enter username"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-300" />
                      </FormItem>
                    )}
                  />

                  {error ? (
                    <div className="rounded-xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      {error}
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    className="h-12 w-full rounded-xl bg-white text-slate-900 hover:bg-white/90"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Please wait..." : "Continue"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>

                  <Button
                    asChild
                    variant="ghost"
                    className="h-11 w-full rounded-xl text-white hover:bg-white/10 hover:text-white"
                  >
                    <Link href="/login">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to sign in
                    </Link>
                  </Button>
                </form>
              </Form>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-300/20 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
                  {result.message}
                </div>

                {result.devResetLink ? (
                  <Button
                    asChild
                    className="h-12 w-full rounded-xl bg-white text-slate-900 hover:bg-white/90"
                  >
                    <Link href={result.devResetLink.replace("http://localhost:3000", "")}>
                      Open reset page
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : null}

                <Button
                  asChild
                  variant="ghost"
                  className="h-11 w-full rounded-xl text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="/login">Back to sign in</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
