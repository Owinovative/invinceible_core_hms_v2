import Link from "next/link";
import {
  ArrowRight,
  BedDouble,
  Building2,
  ClipboardCheck,
  FileText,
  FlaskConical,
  Pill,
  ReceiptText,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import { AppLogo } from "@/components/shared/app-logo";
import { Button } from "@/components/ui/button";
import { creatorContacts } from "@/lib/creator-contacts";

const workflow = [
  {
    area: "Reception",
    detail: "Register the patient, open a visit, assign facility and branch, and prepare billing.",
    icon: Users,
  },
  {
    area: "Doctor",
    detail: "See pending and started consultations, write notes, request lab work, prescribe, or admit.",
    icon: Stethoscope,
  },
  {
    area: "Laboratory",
    detail: "Receive orders, result tests, return results to the doctor, and keep billing aligned.",
    icon: FlaskConical,
  },
  {
    area: "Pharmacy",
    detail: "Dispense medicines from branch stock, respect branch prices, and create invoice lines.",
    icon: Pill,
  },
  {
    area: "IPD",
    detail: "Manage beds, treatment sheets, inpatient charges, summaries, and discharge documents.",
    icon: BedDouble,
  },
  {
    area: "Cashier",
    detail: "Review service, lab, medicine, and bed charges before printing a clean invoice.",
    icon: ReceiptText,
  },
];

const modules = [
  "Patients",
  "Appointments",
  "Doctor queue",
  "Consultation",
  "Laboratory",
  "Pharmacy",
  "IPD",
  "Billing",
  "Invoices",
  "Reports",
  "Audit",
  "Settings",
];

const controlRows = [
  ["Facility structure", "Facilities, branches, departments, clinics, staff, and users are maintained from platform administration."],
  ["Clinical movement", "Queues, triage, consultation, laboratory, pharmacy, and admissions are connected around the patient visit."],
  ["Money trail", "Tariffs, invoice lines, dispensing charges, lab charges, bed days, payments, and reports stay visible."],
  ["Security evidence", "Audit logs, login activity, location evidence, role gates, and scoped notifications support accountability."],
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f5fbff] text-slate-950">
      <section className="min-h-screen border-b border-sky-200 bg-[#f5fbff]">
        <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col px-5 py-5 md:px-8">
          <header className="flex items-center justify-between gap-4 border border-sky-200 bg-white px-4 py-3 shadow-sm">
            <AppLogo />
            <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-600 lg:flex">
              <Link href="/workflow" className="hover:text-sky-700">
                Workflow
              </Link>
              <Link href="/facilities" className="hover:text-sky-700">
                Facilities
              </Link>
              <Link href="/creators" className="hover:text-sky-700">
                Creators
              </Link>
              <Link href="/login" className="hover:text-sky-700">
                Staff access
              </Link>
            </nav>
            <Button asChild className="rounded-md bg-sky-700 text-white hover:bg-sky-800">
              <Link href="/login">
                Enter system
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </header>

          <div className="grid flex-1 gap-8 py-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div className="space-y-7">
              <div className="inline-flex items-center gap-2 border border-sky-200 bg-white px-3 py-2 text-sm font-semibold text-sky-800 shadow-sm">
                <ShieldCheck className="h-4 w-4" />
                Level 6 hospital management workspace
              </div>

              <div className="space-y-5">
                <h1 className="max-w-4xl text-5xl font-bold leading-[1.04] tracking-tight text-slate-950 md:text-7xl">
                  Invinceible Core HMS
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-slate-600 md:text-xl">
                  A complete hospital operating system for patient flow,
                  clinical work, pharmacy, laboratory, inpatient care, billing,
                  audit, reporting, and platform control.
                </p>
              </div>

              <div className="grid max-w-3xl gap-3 sm:grid-cols-3">
                {[
                  ["30+", "working modules"],
                  ["24/7", "audit-ready activity"],
                  ["1", "connected patient visit"],
                ].map(([value, label]) => (
                  <div key={label} className="border border-sky-200 bg-white p-4 shadow-sm">
                    <p className="text-3xl font-bold text-sky-800">{value}</p>
                    <p className="mt-1 text-xs font-semibold uppercase text-slate-500">
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="rounded-md bg-sky-700 text-white hover:bg-sky-800"
                >
                  <Link href="/login">
                    Open hospital portal
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-md border-sky-300 bg-white text-sky-800 hover:bg-sky-50"
                >
                  <Link href="/workflow">View hospital workflow</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              <div
                className="min-h-[390px] border border-sky-200 bg-cover bg-center shadow-lg"
                style={{
                  backgroundImage:
                    "url('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1800&q=86')",
                }}
              />
              <div className="grid gap-4 md:grid-cols-3">
                <div className="border border-sky-200 bg-white p-4 shadow-sm">
                  <Building2 className="mb-3 h-5 w-5 text-sky-700" />
                  <p className="font-semibold">Facility and branch scope</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Staff work inside the right hospital branch.
                  </p>
                </div>
                <div className="border border-sky-200 bg-white p-4 shadow-sm">
                  <ClipboardCheck className="mb-3 h-5 w-5 text-sky-700" />
                  <p className="font-semibold">Operational queue</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Patient work is visible from arrival to discharge.
                  </p>
                </div>
                <div className="border border-sky-200 bg-white p-4 shadow-sm">
                  <FileText className="mb-3 h-5 w-5 text-sky-700" />
                  <p className="font-semibold">Printable records</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Invoices, summaries, charts, and reports stay ready.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[1440px] px-5 py-16 md:px-8">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-sky-700">
                Patient visit workflow
              </p>
              <h2 className="mt-2 max-w-3xl text-4xl font-bold tracking-tight text-slate-950">
                One patient journey, every desk connected.
              </h2>
            </div>
            <Button asChild className="rounded-md bg-sky-700 text-white hover:bg-sky-800">
              <Link href="/login">
                Enter the system
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {workflow.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.area} className="border border-sky-200 bg-[#f8fcff] p-5">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center border border-sky-200 bg-white text-sky-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-950">
                    {item.area}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {item.detail}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-sky-200 bg-[#eaf7ff]">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-16 md:px-8 xl:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold uppercase text-sky-700">
              Real system coverage
            </p>
            <h2 className="mt-2 text-4xl font-bold tracking-tight text-slate-950">
              The home page now says what the software actually does.
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              No fake testimonials, no floating decorations, and no empty
              marketing language. The public site points visitors to the real
              hospital workflow and the staff portal.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {modules.map((module) => (
              <div key={module} className="border border-sky-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-sm font-semibold text-slate-800">{module}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-16 md:px-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="overflow-hidden border border-sky-200">
            {controlRows.map(([area, detail]) => (
              <div
                key={area}
                className="grid gap-2 border-b border-sky-100 p-5 last:border-b-0 md:grid-cols-[220px_1fr]"
              >
                <p className="font-semibold text-sky-900">{area}</p>
                <p className="text-sm leading-7 text-slate-600">{detail}</p>
              </div>
            ))}
          </div>

          <div className="border border-sky-200 bg-[#f8fcff] p-6">
            <p className="text-sm font-semibold uppercase text-sky-700">
              Built by
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-950">
              Eng. Otieno Owino and Eng. Moikoyo Paul
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Full-stack software engineers with more than 7 years of software
              delivery experience, building practical systems for real
              operational work.
            </p>
            <div className="mt-6 grid gap-3">
              {creatorContacts.map((creator) => (
                <div key={creator.name} className="border border-sky-200 bg-white p-4">
                  <p className="font-semibold text-slate-950">{creator.name}</p>
                  <p className="mt-1 text-sm text-sky-700">{creator.role}</p>
                  <p className="mt-2 text-sm text-slate-600">{creator.phone}</p>
                </div>
              ))}
            </div>
            <Button asChild className="mt-6 rounded-md bg-sky-700 text-white hover:bg-sky-800">
              <Link href="/creators">
                View creator contacts
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
