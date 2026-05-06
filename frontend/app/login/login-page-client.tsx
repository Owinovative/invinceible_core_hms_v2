"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Home,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
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

      setError(
        "Unable to reach the hospital server. Check the API connection.",
      );
    }
  };

  return (
    <main
      className="clinical-shell-bg relative min-h-screen overflow-hidden bg-cover bg-center text-slate-950"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=2200&q=88')",
      }}
    >
      <div className="absolute inset-0 bg-white/86" />
      <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-sky-100/80 lg:block" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1500px] items-center gap-8 px-5 py-10 lg:grid-cols-[1.08fr_0.92fr] lg:px-8">
        <section className="hidden lg:block">
          <div className="max-w-2xl space-y-7 rounded-lg border border-sky-200 bg-white/82 p-8 shadow-[0_24px_70px_rgba(3,76,126,0.16)]">
            <AppLogo />
            <BadgeLike />
            <div className="space-y-4">
              <h1 className="text-5xl font-extrabold leading-[1.04] text-sky-950">
                Secure clinical access for serious hospital work.
              </h1>
              <p className="max-w-xl text-base font-medium leading-8 text-slate-700">
                Sign in to manage patient flow, billing, pharmacy, laboratory,
                admissions, reporting, and facility operations.
              </p>
            </div>

            <div className="grid gap-3">
              {loginHighlights.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 shadow-sm"
                >
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span className="min-w-0 truncate text-sm font-semibold text-sky-950">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Card className="mx-auto w-full max-w-[500px] rounded-lg border border-sky-200 bg-[#f8fdff] py-0 text-sky-950 shadow-[0_28px_80px_rgba(3,76,126,0.18)]">
          <CardContent className="relative p-7 md:p-9">
            <div className="mb-7 flex flex-col items-center text-center lg:hidden">
              <AppLogo />
            </div>

            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-sky-200 bg-white text-sky-700 shadow-sm">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <p className="text-xs font-bold uppercase text-sky-700">
                Invinceible Core HMS
              </p>
              <h2 className="mt-2 text-4xl font-extrabold tracking-tight text-sky-950">
                Sign in
              </h2>
              <p className="mt-2 text-sm font-medium text-slate-600">
                Authorized hospital staff only.
              </p>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5"
              >
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
                            className="h-12 rounded-md border-sky-200 bg-white pl-10 text-base font-medium shadow-inner"
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
                            className="h-12 rounded-md border-sky-200 bg-white pl-10 pr-12 text-base font-medium shadow-inner"
                            placeholder="Enter password"
                            {...field}
                          />
                          <button
                            type="button"
                            aria-label={
                              showPassword ? "Hide password" : "Show password"
                            }
                            onClick={() => setShowPassword((value) => !value)}
                            className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-sky-100 hover:text-sky-700"
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

                <Button
                  type="submit"
                  className="h-12 w-full rounded-md bg-sky-700 text-base font-bold text-white shadow-[0_12px_30px_rgba(2,132,199,0.24)] hover:bg-sky-800"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign in"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                <Button
                  asChild
                  type="button"
                  variant="outline"
                  className="h-11 w-full rounded-md border-sky-200 bg-white text-sky-800 hover:bg-sky-50"
                >
                  <Link href="/">
                    <Home className="mr-2 h-4 w-4" />
                    Back to home
                  </Link>
                </Button>
              </form>
            </Form>

            <div className="mt-7 rounded-lg border border-sky-200 bg-white p-4 shadow-sm">
              <p className="mb-3 text-xs font-bold uppercase text-sky-800">
                Need assistance?
              </p>
              <div className="grid gap-2">
                {supportContacts.map((creator) => (
                  <a
                    key={creator.name}
                    href={getWhatsappLink(
                      creator.whatsappNumber,
                      creator.message,
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm transition hover:border-sky-400 hover:bg-white"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">
                        {creator.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {creator.phone}
                      </span>
                    </span>
                    <MessageCircle className="h-4 w-4 shrink-0 text-sky-700" />
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
    <div className="inline-flex items-center gap-2 rounded-md border border-sky-200 bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800 shadow-sm">
      System access
    </div>
  );
}
