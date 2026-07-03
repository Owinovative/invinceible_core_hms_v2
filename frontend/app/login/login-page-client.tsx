"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Eye,
  EyeOff,
  FlaskConical,
  Home,
  LockKeyhole,
  MessageCircle,
  Pill,
  ShieldCheck,
  User2,
  Wallet,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { getWhatsappLink, supportContacts } from "@/lib/creator-contacts";
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
  {
    icon: Activity,
    title: "One clinical flow",
    text: "Reception to triage, consultation, and discharge in a single queue.",
  },
  {
    icon: Wallet,
    title: "Payment integrity",
    text: "Cash, M-PESA, SHA coverage — reconciled and fiscal-ready.",
  },
  {
    icon: FlaskConical,
    title: "Diagnostics built in",
    text: "Lab orders, verification, and doctor review without paper.",
  },
  {
    icon: Pill,
    title: "Stock-aware pharmacy",
    text: "Dispense against live branch stock with full movement history.",
  },
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

      setError(
        "Unable to reach the hospital server. Check the API connection.",
      );
    }
  };

  return (
    <main className="app-canvas grid min-h-screen bg-background text-foreground lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <section
        aria-hidden
        className="relative hidden overflow-hidden bg-linear-160 from-brand-strong via-brand to-pulse text-primary-foreground lg:flex lg:flex-col lg:justify-between dark:from-surface-2 dark:via-surface-1 dark:to-brand/40"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "radial-gradient(currentColor 1px, transparent 1px)",
            backgroundSize: "26px 26px",
          }}
        />
        <div className="relative px-12 pt-12">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
              <Activity className="size-6" />
            </span>
            <div>
              <p className="text-lg leading-tight font-bold tracking-tight">
                Invinceible Core
              </p>
              <p className="text-xs font-medium tracking-[0.22em] uppercase opacity-80">
                Hospital OS
              </p>
            </div>
          </div>
        </div>

        <div className="relative max-w-xl px-12">
          <h1 className="text-4xl leading-[1.08] font-bold tracking-tight xl:text-5xl">
            The operating system for serious healthcare.
          </h1>
          <p className="mt-4 max-w-md text-base leading-7 opacity-85">
            Patient flow, billing, pharmacy, laboratory, and admissions —
            one secure, audited workspace for the whole facility.
          </p>
        </div>

        <div className="relative grid grid-cols-2 gap-3 px-12 pb-12">
          {loginHighlights.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"
            >
              <item.icon className="size-4.5 opacity-90" />
              <p className="mt-2 text-sm font-semibold">{item.title}</p>
              <p className="mt-0.5 text-xs leading-5 opacity-75">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Form panel */}
      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-105">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-linear-120 from-brand to-pulse text-primary-foreground">
                <Activity className="size-5" />
              </span>
              <div>
                <p className="leading-tight font-bold tracking-tight">
                  Invinceible <span className="text-gradient-brand">Core</span>
                </p>
                <p className="text-[0.65rem] font-medium tracking-widest text-muted-foreground uppercase">
                  Hospital OS
                </p>
              </div>
            </div>
          </div>

          <div className="surface-spotlight rounded-2xl p-7 md:p-8">
            <div className="mb-7">
              <p className="flex items-center gap-2 text-xs font-semibold tracking-widest text-module uppercase">
                <ShieldCheck className="size-3.5" aria-hidden />
                Secure staff access
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Welcome back
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sign in with your facility credentials.
              </p>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username or email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User2
                            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                            aria-hidden
                          />
                          <Input
                            autoComplete="username"
                            className="h-11 pl-9"
                            placeholder="e.g. jane.wanjiku"
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
                          <LockKeyhole
                            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                            aria-hidden
                          />
                          <Input
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            className="h-11 pr-11 pl-9"
                            placeholder="Enter password"
                            {...field}
                          />
                          <button
                            type="button"
                            aria-label={
                              showPassword ? "Hide password" : "Show password"
                            }
                            onClick={() => setShowPassword((value) => !value)}
                            className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                          >
                            {showPassword ? (
                              <EyeOff className="size-4" aria-hidden />
                            ) : (
                              <Eye className="size-4" aria-hidden />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {error ? (
                  <div
                    role="alert"
                    className="rounded-lg border border-destructive/25 bg-destructive-soft px-3.5 py-2.5 text-sm text-destructive"
                  >
                    {error}
                  </div>
                ) : null}

                <div className="flex items-center justify-between pt-1">
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-module underline-offset-4 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="h-11 w-full text-[0.95rem] font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in…" : "Sign in"}
                  <ArrowRight data-icon="inline-end" aria-hidden />
                </Button>

                <Button
                  asChild
                  type="button"
                  variant="ghost"
                  className="w-full text-muted-foreground"
                >
                  <Link href="/">
                    <Home data-icon="inline-start" aria-hidden />
                    Back to home
                  </Link>
                </Button>
              </form>
            </Form>
          </div>

          <details className="group mt-5 rounded-xl border border-border bg-card px-4 py-3">
            <summary className="cursor-pointer list-none text-xs font-semibold tracking-wider text-muted-foreground uppercase select-none">
              Need assistance?
            </summary>
            <div className="mt-3 grid gap-2">
              {supportContacts.map((creator) => (
                <a
                  key={creator.name}
                  href={getWhatsappLink(
                    creator.whatsappNumber,
                    creator.message,
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/60 px-3 py-2 text-sm transition-colors hover:border-module/40 hover:bg-module-soft"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {creator.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {creator.phone}
                    </span>
                  </span>
                  <MessageCircle
                    className="size-4 shrink-0 text-module"
                    aria-hidden
                  />
                </a>
              ))}
            </div>
          </details>
        </div>
      </section>
    </main>
  );
}
