import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BedDouble,
  Bot,
  Building2,
  CalendarClock,
  CheckCircle2,
  Code2,
  FlaskConical,
  MessageCircle,
  PhoneCall,
  Pill,
  ShieldCheck,
  Stethoscope,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/shared/app-logo";
import { creatorContacts, getWhatsappLink } from "@/lib/creator-contacts";

const systemPillars = [
  {
    title: "Patient command flow",
    text: "Registration, appointments, queues, triage, consultation, admissions, and follow-up stay connected in one working path.",
    icon: CalendarClock,
    tone: "text-cyan-300",
  },
  {
    title: "Clinical continuity",
    text: "Doctors, nurses, lab teams, pharmacy, IPD, and emergency teams work from the same operational truth.",
    icon: Stethoscope,
    tone: "text-emerald-300",
  },
  {
    title: "Revenue assurance",
    text: "Billing, invoices, cashier actions, tariffs, services, pharmacy dispensing, and lab charges stay visible.",
    icon: Wallet,
    tone: "text-amber-300",
  },
  {
    title: "Operational intelligence",
    text: "Notifications, audit trails, reports, stock alerts, and module activity help leaders see what needs attention.",
    icon: Activity,
    tone: "text-sky-300",
  },
];

const photoPanels = [
  {
    label: "Reception to clinical queue",
    image:
      "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=1400&q=86",
  },
  {
    label: "Doctor and lab coordination",
    image:
      "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1400&q=86",
  },
  {
    label: "IPD and facility operations",
    image:
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1400&q=86",
  },
];

const operatingMap = [
  { label: "Front desk", icon: Building2 },
  { label: "Doctors", icon: Stethoscope },
  { label: "Laboratory", icon: FlaskConical },
  { label: "Pharmacy", icon: Pill },
  { label: "Admissions", icon: BedDouble },
  { label: "Billing", icon: Wallet },
  { label: "Reports", icon: Activity },
  { label: "Security", icon: ShieldCheck },
];

const heroSignals = [
  { label: "Lab to doctor loop", icon: FlaskConical },
  { label: "Pharmacy and billing link", icon: Pill },
  { label: "IPD bed and treatment flow", icon: BedDouble },
];

const aiRoadmap = [
  "Clinical note drafting",
  "Doctor text autofill",
  "Discharge summary assistance",
  "Structured patient history prompts",
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative min-h-[88svh] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=2600&q=88')",
          }}
        />
        <div className="absolute inset-0 bg-slate-950/72" />
        <div className="absolute inset-0 bg-[linear-gradient(112deg,rgba(2,6,23,0.98)_0%,rgba(5,15,31,0.9)_42%,rgba(8,68,70,0.58)_72%,rgba(245,158,11,0.18)_100%)]" />
        <div className="premium-aurora opacity-50" />
        <div className="clinical-mesh" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-background to-transparent" />

        <div className="relative mx-auto flex min-h-[88svh] max-w-7xl flex-col px-5 py-5 md:px-8">
          <header className="flex items-center justify-between gap-4 rounded-[1.4rem] border border-white/12 bg-white/10 px-4 py-3 backdrop-blur-2xl">
            <AppLogo light />
            <nav className="hidden items-center gap-6 text-sm font-medium text-white/76 lg:flex">
              <Link href="#workflow" className="transition hover:text-white">
                Workflow
              </Link>
              <Link href="#modules" className="transition hover:text-white">
                Modules
              </Link>
              <Link href="#creators" className="transition hover:text-white">
                Creators
              </Link>
              <Link href="#ai-next" className="transition hover:text-white">
                AI next
              </Link>
            </nav>
            <Button
              asChild
              className="motion-sheen rounded-xl bg-white text-slate-950 hover:bg-white/90"
            >
              <Link href="/login">
                Sign in
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </header>

          <div className="flex flex-1 items-center py-12 md:py-16">
            <div className="max-w-4xl space-y-8 text-white">
              <Badge className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-white shadow-2xl backdrop-blur-xl">
                Level 6 hospital management operating system
              </Badge>

              <div className="space-y-5">
                <h1 className="max-w-5xl text-5xl font-bold leading-[1.02] md:text-7xl">
                  Invinceible Core HMS
                </h1>
                <p className="max-w-3xl text-lg leading-8 text-white/78 md:text-xl">
                  A premium hospital command center for patient flow, clinical
                  work, billing, pharmacy, laboratory, IPD, reporting, and
                  facility operations.
                </p>
              </div>

              <div className="grid max-w-4xl gap-3 sm:grid-cols-3">
                {[
                  ["30+", "working hospital modules"],
                  ["7+", "years creator experience"],
                  ["24/7", "facility workflow visibility"],
                ].map(([value, label]) => (
                  <div
                    key={label}
                    className="rounded-[1.25rem] border border-white/12 bg-white/10 px-4 py-4 backdrop-blur-xl"
                  >
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="mt-1 text-xs uppercase text-white/60">
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="motion-sheen rounded-xl bg-cyan-300 text-slate-950 hover:bg-cyan-200"
                >
                  <Link href="/login">
                    Enter hospital system
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/12"
                >
                  <Link href="#workflow">Explore the workflow</Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 border-t border-white/10 pt-5 md:grid-cols-3">
            {heroSignals.map((item) => {
              const Icon = item.icon;

              return (
              <div
                key={item.label}
                className="flex items-center gap-3 text-sm font-semibold text-white/82"
              >
                <Icon className="h-5 w-5 text-cyan-200" />
                {item.label}
              </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="workflow" className="premium-system-bg relative overflow-hidden">
        <div className="clinical-mesh" />
        <div className="relative mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20">
          <div className="mb-9 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">
                Workflow first
              </p>
              <h2 className="mt-2 max-w-3xl text-3xl font-bold md:text-5xl">
                Built around how a serious hospital actually moves.
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              Every display should help staff do real work faster: receive the
              patient, assess, request services, bill cleanly, dispense safely,
              admit when needed, and report what happened.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {systemPillars.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className="premium-card rounded-[1.4rem] p-5"
                >
                  <div className="relative">
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white/10">
                      <Icon className={`h-5 w-5 ${item.tone}`} />
                    </div>
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {item.text}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-5 py-4 md:grid-cols-3 md:px-8">
        {photoPanels.map((panel) => (
          <div
            key={panel.label}
            className="premium-image-panel min-h-80 rounded-[1.5rem]"
            style={{ backgroundImage: `url('${panel.image}')` }}
          >
            <div className="absolute bottom-0 z-10 p-5">
              <p className="text-sm font-semibold text-white">{panel.label}</p>
            </div>
          </div>
        ))}
      </section>

      <section id="modules" className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="grid gap-8 xl:grid-cols-[0.8fr_1.2fr] xl:items-start">
          <div className="space-y-4">
            <Badge className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              Hospital coverage
            </Badge>
            <h2 className="text-3xl font-bold md:text-5xl">
              More content, less noise, clearer direction.
            </h2>
            <p className="text-sm leading-7 text-muted-foreground">
              The interface is being shaped to feel like a high-trust clinical
              product: strong enough for administrators, quick enough for staff,
              and calm enough for a hospital environment.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {operatingMap.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="premium-card rounded-[1.2rem] px-4 py-5"
                >
                  <div className="relative flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-semibold">{item.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="creators" className="border-y border-white/10 bg-slate-950 text-white">
        <div className="relative overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=2400&q=85')",
            }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(2,6,23,0.96),rgba(6,78,59,0.64),rgba(15,23,42,0.92))]" />
          <div className="premium-aurora" />

          <div className="relative mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20">
            <div className="mb-8 max-w-3xl">
              <Badge className="rounded-full border border-white/15 bg-white/10 text-white">
                Built by software engineers
              </Badge>
              <h2 className="mt-4 text-3xl font-bold md:text-5xl">
                Created by Eng. Otieno Owino and Eng. Moikoyo Paul.
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/72 md:text-base">
                The system is built by two full-stack software engineers with
                more than 7 years of software delivery experience, multiple
                production systems delivered, and a clear split of backend and
                frontend strength.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {creatorContacts.map((creator) => (
                <article
                  key={creator.name}
                  className="engineer-card premium-card rounded-[1.5rem] p-6 text-slate-950 dark:text-white"
                >
                  <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="mb-5 flex h-13 w-13 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white/10">
                        <Code2 className="h-6 w-6 text-cyan-300" />
                      </div>
                      <h3 className="text-2xl font-bold">{creator.name}</h3>
                      <p className="mt-1 text-sm font-semibold text-cyan-700 dark:text-cyan-300">
                        {creator.role}
                      </p>
                      <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 dark:text-white/68">
                        {creator.focus}
                      </p>
                    </div>

                    <div className="min-w-[190px] rounded-[1.1rem] border border-slate-200/70 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <PhoneCall className="h-4 w-4 text-emerald-500" />
                        {creator.phone}
                      </div>
                      <Button
                        asChild
                        className="mt-4 w-full rounded-xl bg-emerald-500 text-white hover:bg-emerald-400"
                      >
                        <a
                          href={getWhatsappLink(
                            creator.whatsappNumber,
                            creator.message,
                          )}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <MessageCircle className="h-4 w-4" />
                          WhatsApp
                        </a>
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="ai-next" className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="premium-card rounded-[1.7rem] p-6 md:p-8">
          <div className="relative grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <Badge className="rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
                Next phase
              </Badge>
              <h2 className="mt-4 text-3xl font-bold md:text-5xl">
                AI clinical assistant, prepared for the next build.
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                The next major phase can connect a ChatGPT-powered assistant to
                help doctors draft notes, autofill clinical text, and turn
                structured patient facts into cleaner documentation.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {aiRoadmap.map((item) => (
                <div
                  key={item}
                  className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
                      <Bot className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-semibold">{item}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-white/[0.025]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <p className="text-sm text-muted-foreground">
              Access is reserved for authorized hospital staff.
            </p>
          </div>
          <Button asChild className="rounded-xl bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950">
            <Link href="/login">
              Continue to login
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
