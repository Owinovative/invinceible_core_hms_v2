import Link from "next/link";
import {
  ArrowRight,
  BedDouble,
  Building2,
  ClipboardCheck,
  FileText,
  FlaskConical,
  HeartHandshake,
  Pill,
  ReceiptText,
  ShieldCheck,
  Star,
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

const photoFrames = [
  {
    title: "Clinical desk",
    image:
      "https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=900&q=86",
  },
  {
    title: "Ward movement",
    image:
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=900&q=86",
  },
  {
    title: "Pharmacy work",
    image:
      "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=900&q=86",
  },
];

const controlRows = [
  ["Facility structure", "Facilities, branches, departments, clinics, staff, and users are maintained from platform administration."],
  ["Clinical movement", "Queues, triage, consultation, laboratory, pharmacy, and admissions are connected around the patient visit."],
  ["Money trail", "Tariffs, invoice lines, dispensing charges, lab charges, bed days, payments, and reports stay visible."],
  ["Security evidence", "Audit logs, login activity, location evidence, role gates, and scoped notifications support accountability."],
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#eaf7ff] text-slate-950 dark:bg-[#081b31]">
      <section
        className="relative min-h-screen overflow-hidden bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=2200&q=88')",
        }}
      >
        <div className="absolute inset-0 bg-[#061a2f]/78" />

        <div className="relative mx-auto flex min-h-screen max-w-[1500px] flex-col px-5 py-5 md:px-8">
          <header className="flex items-center justify-between gap-4 border border-sky-300/25 bg-[#08243f]/92 px-4 py-4 shadow-2xl">
            <AppLogo light />
            <nav className="hidden min-w-0 items-center gap-7 text-sm font-semibold text-sky-50/82 lg:flex">
              <Link href="/workflow" className="hover:text-sky-200">
                Workflow
              </Link>
              <Link href="/facilities" className="hover:text-sky-200">
                Facilities
              </Link>
              <Link href="/inspiration" className="hover:text-sky-200">
                Inspiration
              </Link>
              <Link href="/reviews" className="hover:text-sky-200">
                Reviews
              </Link>
              <Link href="/creators" className="hover:text-sky-200">
                Creators
              </Link>
              <Link href="/login" className="hover:text-sky-200">
                Staff access
              </Link>
            </nav>
            <Button asChild className="rounded-md bg-sky-400 text-[#061a2f] hover:bg-sky-300">
              <Link href="/login">
                Enter system
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </header>

          <div className="grid flex-1 gap-8 py-8 lg:grid-cols-[1fr_0.92fr] lg:items-center">
            <div className="space-y-7">
              <div className="inline-flex items-center gap-2 border border-sky-300/30 bg-[#0d3155]/88 px-3 py-2 text-sm font-semibold text-sky-100 shadow-xl">
                <ShieldCheck className="h-4 w-4" />
                Hospital operating system
              </div>

              <div className="space-y-5">
                <h1 className="max-w-4xl text-5xl font-bold leading-[1.04] tracking-tight text-white md:text-7xl">
                  Invinceible Core HMS
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-sky-50/84 md:text-xl">
                  Built for patient registration, doctor work, lab requests,
                  pharmacy dispensing, inpatient care, billing, reports, and
                  administration.
                </p>
              </div>

              <div className="grid max-w-3xl gap-3 sm:grid-cols-3">
                {[
                  ["30+", "working modules"],
                  ["24/7", "audit-ready activity"],
                  ["1", "connected patient visit"],
                ].map(([value, label]) => (
                  <div key={label} className="border border-sky-300/30 bg-[#08243f]/88 p-4 shadow-xl">
                    <p className="text-3xl font-bold text-sky-300">{value}</p>
                    <p className="mt-1 text-xs font-semibold uppercase text-sky-50/65">
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="rounded-md bg-sky-400 text-[#061a2f] hover:bg-sky-300"
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
                  className="rounded-md border-sky-300/40 bg-[#08243f]/60 text-white hover:bg-sky-400/15"
                >
                  <Link href="/workflow">View hospital workflow</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="border border-sky-300/30 bg-[#08243f]/88 p-4 shadow-2xl">
                <div className="grid gap-4 sm:grid-cols-3">
                  {photoFrames.map((photo) => (
                    <div key={photo.title} className="border border-sky-300/25 bg-[#061a2f] p-2 shadow-xl">
                      <div
                        className="h-40 bg-cover bg-center"
                        style={{ backgroundImage: `url('${photo.image}')` }}
                      />
                      <p className="mt-3 truncate px-1 text-sm font-semibold text-sky-50">
                        {photo.title}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="border border-sky-300/30 bg-[#08243f]/88 p-4 shadow-xl">
                  <Building2 className="mb-3 h-5 w-5 text-sky-300" />
                  <p className="font-semibold text-white">Facility scope</p>
                  <p className="mt-2 text-sm leading-6 text-sky-50/72">
                    Staff work inside the correct hospital branch.
                  </p>
                </div>
                <div className="border border-sky-300/30 bg-[#08243f]/88 p-4 shadow-xl">
                  <ClipboardCheck className="mb-3 h-5 w-5 text-sky-300" />
                  <p className="font-semibold text-white">Patient movement</p>
                  <p className="mt-2 text-sm leading-6 text-sky-50/72">
                    Visits move from reception to clinical services.
                  </p>
                </div>
                <div className="border border-sky-300/30 bg-[#08243f]/88 p-4 shadow-xl">
                  <FileText className="mb-3 h-5 w-5 text-sky-300" />
                  <p className="font-semibold text-white">Records</p>
                  <p className="mt-2 text-sm leading-6 text-sky-50/72">
                    Invoices, summaries, and reports stay ready.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-sky-200 bg-[#f7fcff]">
        <div className="mx-auto grid max-w-[1500px] gap-6 px-5 py-14 md:px-8 xl:grid-cols-[1.05fr_0.95fr]">
          <Link
            href="/inspiration"
            className="group grid overflow-hidden border border-sky-200 bg-white shadow-xl md:grid-cols-[280px_1fr]"
          >
            <div
              className="min-h-[360px] bg-cover bg-center"
              style={{
                backgroundImage:
                  "url('/inspiration/rev-dr-nelson-mandela.png')",
              }}
            />
            <div className="flex flex-col justify-center p-7">
              <div className="mb-5 flex h-12 w-12 items-center justify-center border border-sky-200 bg-sky-50 text-sky-700">
                <HeartHandshake className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold uppercase text-sky-700">
                System inspiration
              </p>
              <h2 className="mt-2 max-w-xl text-4xl font-bold leading-tight text-slate-950">
                Rev. Dr Nelson Mandela
              </h2>
              <p className="mt-4 max-w-xl text-base leading-8 text-slate-600">
                Director of St Francis Hillside Medicare KSM, sponsor of this
                build, and the leadership force behind a system made for serious
                hospital work.
              </p>
              <span className="mt-6 inline-flex items-center gap-2 font-semibold text-sky-700 group-hover:text-sky-900">
                View inspiration page
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>

          <Link
            href="/reviews"
            className="group flex flex-col justify-between border border-sky-200 bg-[#eaf7ff] p-7 shadow-xl"
          >
            <div>
              <div className="mb-5 flex h-12 w-12 items-center justify-center border border-sky-200 bg-white text-sky-700">
                <Star className="h-5 w-5 fill-sky-600" />
              </div>
              <p className="text-sm font-semibold uppercase text-sky-700">
                Staff ratings
              </p>
              <h2 className="mt-2 max-w-xl text-4xl font-bold leading-tight text-slate-950">
                Reviews from people using the system.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-8 text-slate-600">
                Users can rate the HMS after five successful logins. One user,
                one review, with name and photo shown where available.
              </p>
            </div>
            <span className="mt-8 inline-flex items-center gap-2 font-semibold text-sky-700 group-hover:text-sky-900">
              Open reviews page
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
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

      <section className="border-y border-sky-200 bg-[#eaf7ff] dark:border-sky-900">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-16 md:px-8 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="border border-sky-200 bg-white p-6 shadow-xl">
            <p className="text-sm font-semibold uppercase text-sky-700">
              Main work areas
            </p>
            <h2 className="mt-2 text-4xl font-bold tracking-tight text-slate-950">
              Everything starts from the patient visit.
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Reception opens the visit. Doctors, lab, pharmacy, wards, and
              billing continue from the same record.
            </p>
            <Button asChild className="mt-6 rounded-md bg-sky-700 text-white hover:bg-sky-800">
              <Link href="/login">
                Go to staff portal
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {modules.map((module) => (
              <div key={module} className="border border-sky-200 bg-white px-4 py-3 shadow-sm">
                <p className="truncate text-sm font-semibold text-slate-800" title={module}>{module}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-[1500px] gap-8 px-5 py-12 md:px-8 lg:grid-cols-[1.05fr_0.95fr]">
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

          <div className="grid gap-4 border border-sky-200 bg-[#f8fcff] p-4 md:grid-cols-[230px_1fr]">
            <div
              className="min-h-[340px] border border-sky-200 bg-cover bg-center"
              style={{ backgroundImage: "url('/creators/eng-otieno.png')" }}
            />
            <div className="p-2">
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
        </div>
      </section>
    </main>
  );
}
