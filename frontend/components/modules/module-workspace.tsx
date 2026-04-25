import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

import { getModuleBySlug } from "@/lib/module-catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const accentClasses = {
  amber: "from-amber-500/18 via-orange-500/8 to-transparent text-amber-700 dark:text-amber-300",
  cyan: "from-cyan-500/18 via-sky-500/8 to-transparent text-cyan-700 dark:text-cyan-300",
  emerald:
    "from-emerald-500/18 via-teal-500/8 to-transparent text-emerald-700 dark:text-emerald-300",
  rose: "from-rose-500/18 via-red-500/8 to-transparent text-rose-700 dark:text-rose-300",
  violet:
    "from-violet-500/18 via-indigo-500/8 to-transparent text-violet-700 dark:text-violet-300",
};

export function ModuleWorkspace({ slug }: { slug: string }) {
  const module = getModuleBySlug(slug);

  if (!module) {
    notFound();
  }

  const Icon = module.icon;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[1.4rem] border gradient-border p-6 panel-shadow md:p-8">
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${
            accentClasses[module.accent]
          }`}
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge className="mb-4 rounded-full border-0 bg-background/80 px-3 py-1 text-foreground">
              {module.category}
            </Badge>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-background/80 shadow-sm">
                <Icon className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  {module.title}
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {module.summary}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/billing/tariffs">
              <Button type="button" className="rounded-xl">
                Tariffs
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/reports">
              <Button type="button" variant="outline" className="rounded-xl">
                Reports
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.2rem] border bg-card/90 p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Workflow</h2>
              <p className="text-sm text-muted-foreground">
                The operational path this module should follow.
              </p>
            </div>
            <Sparkles className="h-5 w-5 text-cyan-500" />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {module.workflow.map((step, index) => (
              <div
                key={step}
                className="flex items-center gap-3 rounded-xl border bg-background/65 p-4"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                  {index + 1}
                </div>
                <p className="text-sm font-medium">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.2rem] border bg-card/90 p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Controls</h2>
              <p className="text-sm text-muted-foreground">
                The checks that make the workflow strong.
              </p>
            </div>
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
          </div>

          <div className="space-y-3">
            {module.controls.map((control) => (
              <div
                key={control}
                className="flex items-center gap-3 rounded-xl border bg-background/65 p-3"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-sm">{control}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {module.records.map((record) => (
          <div key={record} className="rounded-[1.1rem] border bg-card/90 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Record
            </p>
            <p className="mt-2 font-semibold">{record}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
