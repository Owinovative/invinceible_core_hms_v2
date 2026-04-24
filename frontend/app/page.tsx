import Link from "next/link";
import {
  ArrowRight,
  BedDouble,
  BellRing,
  CalendarClock,
  CheckCircle2,
  FlaskConical,
  ShieldCheck,
  Stethoscope,
  Warehouse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppLogo } from "@/components/shared/app-logo";

const journey = [
  {
    title: "Front desk",
    text: "Register patients, book appointments, and move queues without switching tools.",
    icon: CalendarClock,
  },
  {
    title: "Clinical flow",
    text: "Triage, consultation, lab requests, admissions, and treatment notes stay connected.",
    icon: Stethoscope,
  },
  {
    title: "Revenue",
    text: "Invoices, cashier actions, and billing status stay visible to the right teams.",
    icon: CheckCircle2,
  },
  {
    title: "Inventory",
    text: "Pharmacy dispensing and stock alerts keep clinical operations moving.",
    icon: Warehouse,
  },
];

const photoPanels = [
  {
    label: "Patient flow",
    image:
      "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=1200&q=85",
  },
  {
    label: "Clinical desk",
    image:
      "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=85",
  },
  {
    label: "Operations",
    image:
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=85",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative min-h-[92svh] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=2400&q=85')",
          }}
        />
        <div className="absolute inset-0 bg-slate-950/72" />
        <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(7,11,20,0.96)_0%,rgba(7,11,20,0.82)_44%,rgba(8,47,73,0.48)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />

        <div className="relative mx-auto flex min-h-[92svh] max-w-7xl flex-col px-5 py-6 md:px-8">
          <header className="flex items-center justify-between gap-4">
            <AppLogo light />
            <Button
              asChild
              className="rounded-lg bg-white text-slate-950 hover:bg-white/90"
            >
              <Link href="/login">
                Sign in
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </header>

          <div className="flex flex-1 items-center py-16">
            <div className="max-w-3xl space-y-8">
              <Badge className="rounded-full border-white/15 bg-white/10 px-3 py-1 text-white">
                Level 6 hospital operations core
              </Badge>

              <div className="space-y-5">
                <h1 className="max-w-4xl text-5xl font-bold leading-[1.02] md:text-7xl">
                  Invinceible Core HMS
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-white/75 md:text-xl">
                  A fast command center for patients, clinicians, billing,
                  pharmacy, admissions, alerts, and hospital operations.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="rounded-lg bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                >
                  <Link href="/login">
                    Enter system
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-lg border-white/20 bg-white/5 text-white hover:bg-white/10"
                >
                  <Link href="#workflow">View workflow</Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 border-t border-white/10 pt-5 md:grid-cols-3">
            <div className="flex items-center gap-3 text-white/80">
              <BellRing className="h-5 w-5 text-amber-300" />
              Live alerts
            </div>
            <div className="flex items-center gap-3 text-white/80">
              <FlaskConical className="h-5 w-5 text-cyan-300" />
              Lab to consultation loop
            </div>
            <div className="flex items-center gap-3 text-white/80">
              <BedDouble className="h-5 w-5 text-emerald-300" />
              IPD and pharmacy continuity
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl px-5 py-14 md:px-8">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-cyan-300">
              System direction
            </p>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">
              Start from flow, not menu hunting.
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
            The system is organized around the real hospital day: receive,
            treat, charge, dispense, admit, monitor, and improve.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {journey.map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.title}
                className="rounded-lg border border-white/10 bg-white/[0.035] p-5"
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {item.text}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-5 pb-16 md:grid-cols-3 md:px-8">
        {photoPanels.map((panel) => (
          <div
            key={panel.label}
            className="relative min-h-72 overflow-hidden rounded-lg border border-white/10 bg-cover bg-center"
            style={{ backgroundImage: `url('${panel.image}')` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/25 to-transparent" />
            <div className="absolute bottom-0 p-5">
              <p className="text-sm font-semibold text-white">{panel.label}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="border-t border-white/10 bg-white/[0.025]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-300" />
            <p className="text-sm text-muted-foreground">
              Access is reserved for authorized hospital staff.
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-lg">
            <Link href="/login">Continue to login</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
