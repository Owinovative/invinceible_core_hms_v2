import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicSiteHeader } from "@/components/public/public-site-header";
import { Button } from "@/components/ui/button";

const directoryRows = [
  ["Facility register", "Created and edited from the platform by super admins."],
  ["Branches", "Each branch can have its own users, stock, tariffs, billing, and patient scope."],
  ["Departments", "Departments connect staff, services, queues, and reporting lines."],
  ["Public listing", "Approved facilities can be published here without exposing private platform controls."],
];

export default function FacilitiesPage() {
  return (
    <main className="min-h-screen bg-[#f5fbff] text-slate-900">
      <PublicSiteHeader />
      <section className="bg-white">
        <div className="mx-auto grid max-w-[1180px] gap-8 px-5 py-12 md:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase text-sky-700">
              Facilities
            </p>
            <h1 className="mt-2 text-4xl font-bold leading-tight text-slate-950 md:text-5xl">
              The facility directory sits outside the private platform.
            </h1>
            <p className="mt-4 text-base leading-8 text-slate-600">
              The live facility register remains protected in platform
              administration. This public area is ready for approved facilities
              that the super admin chooses to show.
            </p>
            <Button asChild className="mt-6 rounded-md bg-sky-700 text-white hover:bg-sky-800">
              <Link href="/login">
                Enter the system
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div
            className="min-h-[320px] border border-sky-200 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1600&q=86')",
            }}
          />
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-5 py-12 md:px-8 md:py-16">
        <div className="overflow-hidden border border-sky-200 bg-white">
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
