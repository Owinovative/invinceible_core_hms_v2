import Link from "next/link";
import { ArrowRight, Building2, GitBranch, MapPin, Users } from "lucide-react";
import { PublicSiteHeader } from "@/components/public/public-site-header";
import { Button } from "@/components/ui/button";

const directoryRows = [
  ["Facility setup", "Hospitals are arranged with branches, departments, clinics, staff, and service points."],
  ["Branch control", "Each branch can keep its own stock, tariffs, users, queues, and patient movement."],
  ["Staff access", "Users work with the roles and branch scope assigned to them by administration."],
  ["Service structure", "Consultation, lab, pharmacy, inpatient, and billing services stay connected."],
];

const facilityCards = [
  { title: "Hospitals", detail: "Main facility records and operating details.", icon: Building2 },
  { title: "Branches", detail: "Separate locations with their own workflow.", icon: GitBranch },
  { title: "Teams", detail: "Staff access matched to work areas.", icon: Users },
  { title: "Locations", detail: "Facility movement tracked by branch.", icon: MapPin },
];

export default function FacilitiesPage() {
  return (
    <main className="min-h-screen bg-sky-50 text-slate-900 dark:bg-sky-950">
      <PublicSiteHeader />
      <section className="border-b border-sky-200 bg-white">
        <div className="mx-auto grid max-w-[1240px] gap-8 px-5 py-14 md:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase text-sky-700">
              Facilities
            </p>
            <h1 className="text-4xl font-bold leading-tight text-slate-950 md:text-6xl">
              Facility structure for real hospital work.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
              Invinceible Core HMS keeps hospitals, branches, departments,
              clinics, staff, and service points organized around daily
              operations.
            </p>
            <Button asChild className="rounded-md bg-sky-600 text-white hover:bg-sky-700">
              <Link href="/login">
                Enter the system
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="border border-sky-200 bg-sky-100 p-3 shadow-xl">
            <div
              className="min-h-[360px] border border-white bg-cover bg-center"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1600&q=86')",
              }}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1240px] gap-5 px-5 py-12 md:grid-cols-4 md:px-8 md:py-16">
        {facilityCards.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="border border-sky-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center border border-sky-200 bg-sky-50 text-sky-700">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-950">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
            </article>
          );
        })}
      </section>

      <section className="mx-auto max-w-[1240px] px-5 pb-14 md:px-8 md:pb-16">
        <div className="overflow-hidden border border-sky-200 bg-white shadow-sm">
          {directoryRows.map(([label, detail]) => (
            <div
              key={label}
              className="grid gap-2 border-b border-sky-100 p-5 last:border-b-0 md:grid-cols-[220px_1fr]"
            >
              <p className="font-semibold text-sky-900">{label}</p>
              <p className="text-sm leading-6 text-slate-600">{detail}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
