"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, LockKeyhole, User2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/providers/auth-provider";
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

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading } = useAuth();
  const [error, setError] = React.useState<string | null>(null);

  const nextPath = searchParams.get("next");

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setError(null);

    try {
      await login(values);

      if (nextPath?.startsWith("/") && !nextPath.startsWith("//")) {
        router.replace(nextPath);
      }
    } catch {
      setError("Invalid username or password.");
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(8, 47, 73, 0.92), rgba(15, 23, 42, 0.96) 48%, rgba(6, 78, 59, 0.78))",
        }}
      />

      <div className="absolute inset-0 bg-slate-950/55" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/50 via-slate-950/35 to-cyan-950/35" />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-cyan-400/10 to-transparent" />

      <div className="relative flex min-h-screen items-center justify-center px-6 py-10">
        <Card className="w-full max-w-md rounded-[2rem] border-white/15 bg-white/10 text-white shadow-2xl backdrop-blur-2xl">
          <CardContent className="p-8 md:p-10">
            <div className="mb-8 flex flex-col items-center text-center">
              <AppLogo className="mb-4" light />
              <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
            </div>

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

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/90">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
                          <Input
                            type="password"
                            className="h-12 rounded-xl border-white/20 bg-white/10 pl-10 text-white placeholder:text-white/45"
                            placeholder="Enter password"
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

                <div className="flex justify-end">
                  <Link
                    href="/forgot-password"
                    className="text-sm text-white/75 transition hover:text-white"
                  >
                    Forgot password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  className="h-12 w-full rounded-xl bg-white text-slate-900 hover:bg-white/90"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign in"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
