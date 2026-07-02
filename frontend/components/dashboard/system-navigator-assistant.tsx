"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Compass,
  Loader2,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  adminCriticalFunctions,
  type AdminCriticalFunction,
} from "@/components/dashboard/admin-command-center";
import { useCreateClinicalAiDraft } from "@/hooks/use-ai-assistant";
import type { AuthUser } from "@/types/auth";

const quickPrompts = [
  "I need to reset or reactivate a locked user",
  "I want to set drug prices for a branch",
  "I need to know where to download reports",
  "A cashier needs to remove a wrong invoice line",
  "I want to see who did something in the system",
  "A doctor is stuck finding the right patient queue",
];

function isAdminUser(user: AuthUser | null) {
  return ["SUPER_ADMIN", "ADMIN", "FACILITY_ADMIN"].includes(
    user?.roleCode ?? "",
  );
}

function visibleFunctionsForUser(user: AuthUser | null) {
  if (isAdminUser(user)) return adminCriticalFunctions;

  return adminCriticalFunctions.filter(
    (item) =>
      !item.href.startsWith("/platform") &&
      !["Super admin", "Admin", "Facility admin"].includes(item.owner),
  );
}

function matchFunctions(prompt: string, functions: AdminCriticalFunction[]) {
  const normalized = prompt.toLowerCase();
  const words = normalized
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2);

  const scored = functions.map((item) => {
    const haystack = [
      item.title,
      item.category,
      item.owner,
      item.impact,
      item.signal,
      item.href,
    ]
      .join(" ")
      .toLowerCase();

    const score = words.reduce(
      (sum, word) => sum + (haystack.includes(word) ? 1 : 0),
      0,
    );

    return { item, score };
  });

  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ item }) => item);
}

function SuggestedRoute({ item }: { item: AdminCriticalFunction }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className="group rounded-lg border border-border bg-background/75 p-3 transition hover:border-cyan-400/45 hover:bg-cyan-500/5"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-cyan-500/10 text-module">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{item.title}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
            {item.impact}
          </p>
          <div className="mt-2 flex items-center gap-1 text-xs text-module">
            Open module
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}

export function SystemNavigatorAssistant({
  user,
  scopeText,
  healthScore,
  openAlerts,
  activeAdmissions,
  pendingLabs,
}: {
  user: AuthUser | null;
  scopeText: string;
  healthScore: string | number;
  openAlerts: number;
  activeAdmissions: number;
  pendingLabs: number;
}) {
  const mutation = useCreateClinicalAiDraft();
  const [prompt, setPrompt] = React.useState(
    "I am stuck and I need to know which module to use.",
  );

  const suggestions = React.useMemo(() => {
    const visibleFunctions = visibleFunctionsForUser(user);
    const matched = matchFunctions(prompt, visibleFunctions);
    return matched.length > 0
      ? matched
      : visibleFunctions
          .filter((item) =>
            ["critical", "high"].includes(item.urgency),
          )
          .slice(0, 5);
  }, [prompt, user]);

  const errorMessage = React.useMemo(() => {
    if (!mutation.error) return null;
    if (mutation.error instanceof ApiError) return mutation.error.message;
    if (mutation.error instanceof Error) return mutation.error.message;
    return "Unable to ask the navigator assistant.";
  }, [mutation.error]);

  const askNavigator = async () => {
    await mutation.mutateAsync({
      task: "SYSTEM_NAVIGATION",
      prompt,
      audience: "hospital system user",
      context: {
        user: {
          username: user?.username,
          roleCode: user?.roleCode,
          facility: user?.homeFacilityName,
          branch: user?.homeBranchName,
        },
        scopeText,
        currentSignals: {
          healthScore,
          openAlerts,
          activeAdmissions,
          pendingLabs,
        },
        availableRoutes: visibleFunctionsForUser(user).map((item) => ({
          title: item.title,
          href: item.href,
          category: item.category,
          owner: item.owner,
          urgency: item.urgency,
          impact: item.impact,
          signal: item.signal,
        })),
      },
    });
  };

  return (
    <Card className="relative overflow-hidden rounded-[1.4rem] surface-spotlight shadow-md">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,.14),transparent_30%),linear-gradient(135deg,rgba(15,23,42,.04),transparent)]" />
      <CardHeader className="relative">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <Badge className="rounded-md border-0 bg-success/10 text-success">
              AI system navigator
            </Badge>
            <CardTitle className="mt-3 flex items-center gap-2 text-2xl">
              <Compass className="h-6 w-6 text-cyan-500" />
              Stuck User Assistant
            </CardTitle>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
              Type what the user is trying to do. The assistant suggests the
              correct module, route, and next operational steps using the
              system map.
            </p>
          </div>
          <div className="rounded-md border border-border bg-background/70 px-3 py-2 text-xs text-muted-foreground">
            {scopeText}
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <Search className="h-4 w-4 text-cyan-500" />
              What is the user trying to do?
            </label>
            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              className="min-h-[135px] rounded-md"
              placeholder="Example: The cashier has opened the wrong charge and needs to fix the invoice before printing."
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPrompt(item)}
                className="rounded-md border border-border bg-background/75 px-3 py-2 text-left text-xs text-muted-foreground transition hover:border-cyan-400/45 hover:text-foreground"
              >
                {item}
              </button>
            ))}
          </div>

          <Button
            type="button"
            className="h-11 w-full rounded-md bg-primary text-white hover:bg-brand-strong"
            onClick={askNavigator}
            disabled={mutation.isPending || !prompt.trim()}
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Ask AI navigator
          </Button>

          <div className="rounded-md border border-border bg-muted/35 p-3">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <p className="text-xs leading-5 text-muted-foreground">
                The navigator does not bypass permissions. Admin-only actions
                still require the right role and scope.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Route className="h-4 w-4 text-cyan-500" />
              <p className="text-sm font-semibold">Suggested routes</p>
            </div>
            {suggestions.map((item) => (
              <SuggestedRoute key={`${item.title}-${item.href}`} item={item} />
            ))}
          </div>

          <div className="rounded-md border border-border bg-background/82 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Bot className="h-4 w-4 text-emerald-500" />
              <p className="text-sm font-semibold">AI guidance</p>
            </div>
            {errorMessage ? (
              <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-destructive">
                {errorMessage}
              </div>
            ) : mutation.data?.output ? (
              <div className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                {mutation.data.output}
              </div>
            ) : (
              <div className="flex min-h-[260px] items-center justify-center rounded-md border border-dashed border-border bg-muted/25 p-6 text-center text-sm leading-6 text-muted-foreground">
                Ask the navigator to get a clear module recommendation and
                step-by-step path.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
