import Link from "next/link";
import {
  ArrowRight,
  BedDouble,
  ClipboardCheck,
  FlaskConical,
  HeartHandshake,
  MessageSquareText,
  Pill,
  ReceiptText,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import { AppLogo } from "@/components/shared/app-logo";
import { Button } from "@/components/ui/button";
import { creatorContacts, getWhatsappLink } from "@/lib/creator-contacts";

const heroPhotos = [
  {
    title: "Clinical desk",
    image:
      "https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=1000&q=88",
  },
  {
    title: "Ward care",
    image:
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1000&q=88",
  },
  {
    title: "Pharmacy",
    image:
      "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1000&q=88",
  },
];

const flow = [
  { title: "Reception", detail: "Patient visit opens here.", icon: Users },
  { title: "Doctor", detail: "Notes, diagnosis, tests, medicine.", icon: Stethoscope },
  { title: "Lab", detail: "Results return to the doctor.", icon: FlaskConical },
  { title: "Pharmacy", detail: "Stock reduces and billing updates.", icon: Pill },
  { title: "IPD", detail: "Beds, sheets, summaries.", icon: BedDouble },
  { title: "Cashier", detail: "Invoice, receipt, reports.", icon: ReceiptText },
];

const controlLines = [
  ["Facilities", "Branches, users, roles, locations."],
  ["Billing", "Invoices, SHA, M-PESA, receipts."],
  ["Evidence", "Audit logs, location, reports."],
  ["AI", "Clinical notes and user assistance."],
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#eef8ff] text-slate-950">
      <section
        className="relative min-h-screen overflow-hidden bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=2400&q=90')",
        }}
      >
        <div className="absolute inset-0 bg-[#061d35]/82" />

        <div className="relative mx-auto flex min-h-screen max-w-[1540px] flex-col px-5 py-5 md:px-8">
          <header className="flex items-center justify-between gap-4 border border-sky-300/30 bg-[#06365f]/94 px-4 py-4 shadow-2xl">
            <AppLogo light />
            <nav className="hidden items-center gap-7 text-sm font-semibold text-sky-50 lg:flex">
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
            </nav>
            <Button asChild className="rounded-md bg-sky-400 text-[#06233e] hover:bg-sky-300">
              <Link href="/login">
                Enter system
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </header>

          <div className="grid flex-1 gap-8 py-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
            <section className="space-y-7">
              <div className="inline-flex items-center gap-2 border border-sky-300/35 bg-[#0a4778]/88 px-3 py-2 text-sm font-semibold text-sky-50">
                <ShieldCheck className="h-4 w-4" />
                Hospital operating system
              </div>

              <div>
                <h1 className="max-w-4xl text-5xl font-bold leading-[1.03] tracking-tight text-white md:text-7xl">
                  Invinceible Core HMS
                </h1>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-sky-50/86">
                  Patient visits, clinical work, pharmacy, billing, SHA, reports,
                  and administration in one controlled workspace.
                </p>
              </div>

              <div className="grid max-w-3xl gap-3 sm:grid-cols-3">
                {[
                  ["30+", "modules"],
                  ["24/7", "audit trail"],
                  ["15", "day facility grace"],
                ].map(([value, label]) => (
                  <div key={label} className="border border-sky-300/30 bg-[#082b4d]/90 p-4">
                    <p className="text-3xl font-bold text-sky-300">{value}</p>
                    <p className="mt-1 text-xs font-semibold uppercase text-sky-50/70">
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="rounded-md bg-sky-400 text-[#06233e] hover:bg-sky-300">
                  <Link href="/login">
                    Open hospital portal
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-md border-sky-300/45 bg-[#082b4d]/70 text-white hover:bg-sky-400/15"
                >
                  <Link href="/workflow">View workflow</Link>
                </Button>
              </div>
            </section>

            <section className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-3">
                {heroPhotos.map((photo) => (
                  <Link
                    href="/workflow"
                    key={photo.title}
                    className="group border border-sky-300/35 bg-[#082b4d]/92 p-2 shadow-2xl"
                  >
                    <div
                      className="h-[310px] bg-cover bg-center transition duration-300 group-hover:scale-[1.01]"
                      style={{ backgroundImage: `url('${photo.image}')` }}
                    />
                    <p className="mt-3 px-1 pb-1 text-sm font-semibold text-white">
                      {photo.title}
                    </p>
                  </Link>
                ))}
              </div>

              <div className="grid gap-3 border border-sky-300/30 bg-[#082b4d]/92 p-4 md:grid-cols-4">
                {controlLines.map(([title, detail]) => (
                  <div key={title} className="border border-sky-300/20 bg-[#06365f] p-4">
                    <p className="text-sm font-bold text-white">{title}</p>
                    <p className="mt-2 text-xs leading-5 text-sky-50/72">
                      {detail}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>

      <section className="border-b border-sky-200 bg-white">
        <div className="mx-auto grid max-w-[1540px] gap-5 px-5 py-10 md:px-8 lg:grid-cols-6">
          {flow.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                href="/workflow"
                key={item.title}
                className="border border-sky-200 bg-[#f7fcff] p-5 shadow-sm hover:border-sky-400"
              >
                <Icon className="h-6 w-6 text-sky-700" />
                <p className="mt-5 text-lg font-bold text-slate-950">
                  {item.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {item.detail}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="bg-[#e7f6ff]">
        <div className="mx-auto grid max-w-[1540px] gap-6 px-5 py-12 md:px-8 xl:grid-cols-[1.05fr_0.95fr]">
          <Link
            href="/inspiration"
            className="group grid overflow-hidden border border-sky-200 bg-white shadow-xl md:grid-cols-[340px_1fr]"
          >
            <div
              className="min-h-[460px] bg-cover bg-center"
              style={{ backgroundImage: "url('/inspiration/rev-dr-nelson-mandela.png')" }}
            />
            <div className="flex flex-col justify-center p-7">
              <HeartHandshake className="mb-5 h-9 w-9 text-sky-700" />
              <p className="text-sm font-semibold uppercase text-sky-700">
                Inspired by
              </p>
              <h2 className="mt-2 text-4xl font-bold leading-tight text-slate-950">
                Rev. Dr Nelson Mandela
              </h2>
              <p className="mt-4 max-w-xl text-base leading-8 text-slate-600">
                Director of St Francis Hillside Medicare KSM and sponsor of the
                system build.
              </p>
              <span className="mt-7 inline-flex items-center gap-2 font-semibold text-sky-700 group-hover:text-sky-900">
                View page
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>

          <div className="grid gap-6">
            <Link
              href="/reviews"
              className="group border border-sky-200 bg-white p-6 shadow-xl"
            >
              <MessageSquareText className="mb-4 h-8 w-8 text-sky-700" />
              <h2 className="text-3xl font-bold text-slate-950">
                Staff reviews
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Ratings and comments from system users after real logins.
              </p>
              <span className="mt-6 inline-flex items-center gap-2 font-semibold text-sky-700 group-hover:text-sky-900">
                Open reviews
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>

            <Link
              href="/creators"
              className="grid overflow-hidden border border-sky-200 bg-white shadow-xl md:grid-cols-[240px_1fr]"
            >
              <div
                className="min-h-[280px] bg-cover bg-center"
                style={{ backgroundImage: "url('/creators/eng-otieno.png')" }}
              />
              <div className="p-6">
                <p className="text-sm font-semibold uppercase text-sky-700">
                  Creators
                </p>
                <h2 className="mt-2 text-3xl font-bold text-slate-950">
                  Built by Eng. Otieno Owino and Eng. Moikoyo Paul
                </h2>
                <div className="mt-5 grid gap-3">
                  {creatorContacts.map((creator) => (
                    <a
                      key={creator.name}
                      href={getWhatsappLink(creator.whatsappNumber, creator.message)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between border border-sky-200 bg-[#f7fcff] px-4 py-3 text-sm font-semibold text-slate-900"
                    >
                      <span>{creator.name}</span>
                      <span className="text-sky-700">{creator.phone}</span>
                    </a>
                  ))}
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
