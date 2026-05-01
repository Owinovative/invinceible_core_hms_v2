import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AppLogo } from "@/components/shared/app-logo";
import { Button } from "@/components/ui/button";

const publicPages = [
  {
    title: "How the hospital flow works",
    href: "/workflow",
    text: "See the patient path from reception to billing, pharmacy, lab, IPD, and reports.",
  },
  {
    title: "Facilities in the system",
    href: "/facilities",
    text: "View the public facility directory area and how facilities are organized.",
  },
  {
    title: "System creators",
    href: "/creators",
    text: "Contact the engineers who built and maintain the platform.",
  },
];

const proofRows = [
  ["Reception", "Patient registration opens a visit and prepares the billing workspace."],
  ["Clinical work", "Doctors, nurses, laboratory, pharmacy, and IPD work against the same patient record."],
  ["Billing", "Services, lab orders, medicines, bed days, invoice edits, and receipts are kept together."],
  ["Administration", "Platform admins control facilities, branches, users, catalogs, audit, and location evidence."],
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f5fbff] text-slate-900">
      <section className="relative min-h-[78svh] overflow-hidden bg-sky-950 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=2600&q=88')",
          }}
        />
        <div className="absolute inset-0 bg-sky-950/78" />

        <div className="relative mx-auto flex min-h-[78svh] max-w-[1180px] flex-col px-5 py-5 md:px-8">
          <header className="flex items-center justify-between gap-4 border border-white/15 bg-sky-950 px-4 py-3">
            <AppLogo light />
            <nav className="hidden items-center gap-6 text-sm font-semibold text-sky-100 md:flex">
              <Link href="/workflow" className="hover:text-white">
                Workflow
              </Link>
              <Link href="/facilities" className="hover:text-white">
                Facilities
              </Link>
              <Link href="/creators" className="hover:text-white">
                Creators
              </Link>
            </nav>
            <Button asChild className="rounded-md bg-white text-sky-950 hover:bg-sky-100">
              <Link href="/login">
                Sign in
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </header>

          <div className="flex flex-1 items-center py-12">
            <div className="max-w-3xl space-y-6">
              <p className="text-sm font-semibold uppercase text-sky-200">
                Hospital management system
              </p>
              <h1 className="text-4xl font-bold leading-tight md:text-6xl">
                Invinceible Core HMS
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-sky-50">
                A working hospital system for patient flow, clinical notes,
                pharmacy, laboratory, inpatient care, billing, reports, audit,
                and platform administration.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="rounded-md bg-sky-300 text-sky-950 hover:bg-sky-200"
                >
                  <Link href="/login">
                    Enter the system
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-md border-white/30 bg-sky-950 text-white hover:bg-sky-900"
                >
                  <Link href="/workflow">See the workflow</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-5 py-12 md:px-8 md:py-16">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase text-sky-700">
              Public pages
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              Short home page. Clear next steps.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              The home page now stays brief. Details are placed on separate
              pages so visitors can understand the system without scrolling
              through a long page.
            </p>
          </div>

          <div className="grid gap-3">
            {publicPages.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className="group border border-sky-200 bg-white p-5 shadow-sm transition hover:border-sky-400"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">{page.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {page.text}
                    </p>
                  </div>
                  <span className="inline-flex h-10 w-10 items-center justify-center border border-sky-300 text-sky-700 group-hover:bg-sky-50">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-sky-200 bg-white">
        <div className="mx-auto max-w-[1180px] px-5 py-12 md:px-8 md:py-16">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-sky-700">
                Real workflow checks
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                What the system is built to handle
              </h2>
            </div>
            <Button asChild className="rounded-md bg-sky-700 text-white hover:bg-sky-800">
              <Link href="/login">
                Open login
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="overflow-hidden border border-sky-200">
            {proofRows.map(([area, detail]) => (
              <div
                key={area}
                className="grid gap-2 border-b border-sky-100 bg-white p-4 last:border-b-0 md:grid-cols-[180px_1fr]"
              >
                <p className="font-semibold text-sky-900">{area}</p>
                <p className="text-sm leading-6 text-slate-600">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
