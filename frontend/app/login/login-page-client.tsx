"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  User2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/providers/auth-provider";
import { AppLogo } from "@/components/shared/app-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ApiError } from "@/lib/api";
import { creatorContacts, getWhatsappLink } from "@/lib/creator-contacts";
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
  username: z.string().trim().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const loginHighlights = [
  "Facility and branch aware workspace",
  "Protected billing, pharmacy, lab, and IPD workflows",
  "Audit-friendly operating discipline",
];

export default function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading } = useAuth();
  const [error, setError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

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
      await login({
        username: values.username.trim(),
        password: values.password.trim(),
      });

      if (nextPath?.startsWith("/") && !nextPath.startsWith("//")) {
        router.replace(nextPath);
      } else {
        router.replace("/dashboard");
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message);
        return;
      }

      setError("Unable to reach the hospital server. Check the API connection.");
    }
  };

  return (
    <main className="premium-system-bg relative min-h-screen overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-35"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=2400&q=86')",
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(2,6,23,0.92),rgba(7,17,30,0.82)_48%,rgba(6,78,59,0.56))]" />
      <div className="premium-aurora" />
      <div className="clinical-mesh" />

      <div className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-8 px-5 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <section className="hidden text-white lg:block">
          <div className="max-w-2xl space-y-7">
            <AppLogo light />
            <BadgeLike />
            <div className="space-y-4">
              <h1 className="text-5xl font-bold leading-[1.02]">
                Secure clinical access, designed for serious hospital work.
              </h1>
              <p className="max-w-xl text-base leading-8 text-white/72">
                Enter a premium command center for patient flow, billing,
                pharmacy, laboratory, admissions, reporting, and facility
                operations.
              </p>
            </div>

            <div className="grid gap-3">
              {loginHighlights.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-[1.15rem] border border-white/12 bg-white/10 px-4 py-3 backdrop-blur-xl"
                >
                  <ShieldCheck className="h-4 w-4 text-emerald-300" />
                  <span className="text-sm font-semibold text-white/84">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Card className="premium-card mx-auto w-full max-w-md rounded-[2rem] py-0 text-foreground">
          <CardContent className="relative p-7 md:p-9">
            <div className="mb-7 flex flex-col items-center text-center lg:hidden">
              <AppLogo light />
            </div>

            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-500">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <p className="text-xs font-semibold uppercase text-cyan-700 dark:text-cyan-300">
                Invinceible Core HMS
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight">
                Sign in
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Authorized hospital staff only.
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username or email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            className="h-12 rounded-xl border-white/10 bg-white/70 pl-10 shadow-inner dark:bg-white/8"
                            placeholder="Enter username or email"
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
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            className="h-12 rounded-xl border-white/10 bg-white/70 pl-10 pr-12 shadow-inner dark:bg-white/8"
                            placeholder="Enter password"
                            {...field}
                          />
                          <button
                            type="button"
                            aria-label={
                              showPassword ? "Hide password" : "Show password"
                            }
                            onClick={() => setShowPassword((value) => !value)}
                            className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-cyan-500/10 hover:text-cyan-500"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {error ? (
                  <div className="rounded-xl border border-red-300/25 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-200">
                    {error}
                  </div>
                ) : null}

                <div className="flex justify-end">
                  <Link
                    href="/forgot-password"
                    className="text-sm text-muted-foreground transition hover:text-cyan-500"
                  >
                    Forgot password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  className="motion-sheen h-12 w-full rounded-xl bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-white/90"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign in"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </Form>

            <div className="mt-7 rounded-[1.2rem] border border-white/10 bg-white/[0.05] p-4">
              <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
                Need assistance?
              </p>
              <div className="grid gap-2">
                {creatorContacts.map((creator) => (
                  <a
                    key={creator.name}
                    href={getWhatsappLink(
                      creator.whatsappNumber,
                      creator.message,
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm transition hover:border-emerald-400/40 hover:bg-emerald-500/10"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">
                        {creator.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {creator.phone}
                      </span>
                    </span>
                    <MessageCircle className="h-4 w-4 shrink-0 text-emerald-400" />
                  </a>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function BadgeLike() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-xl">
      <Sparkles className="h-3.5 w-3.5 text-amber-300" />
      Premium hospital workspace
    </div>
  );
}
