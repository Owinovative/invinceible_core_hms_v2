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
    <main className="min-h-screen bg-[#eef8ff] text-foreground">
      <PublicSiteHeader />
      <section className="border-b border-border bg-card">
        <div className="mx-auto grid min-h-[calc(100vh-82px)] max-w-[1500px] gap-8 px-5 py-8 md:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase text-module">
              Facilities
            </p>
            <h1 className="text-4xl font-bold leading-tight text-foreground md:text-6xl">
              Facility structure for real hospital work.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
              Invinceible Core HMS keeps hospitals, branches, departments,
              clinics, staff, and service points organized around daily
              operations.
            </p>
            <Button asChild className="rounded-md bg-primary text-white hover:bg-primary">
              <Link href="/login">
                Enter the system
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
            <div
              className="min-h-[540px] border border-border bg-cover bg-center shadow-xl"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1600&q=86')",
              }}
            />
            <div className="grid gap-4">
              <div
                className="min-h-[260px] border border-border bg-cover bg-center"
                style={{
                  backgroundImage:
                    "url('https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=900&q=86')",
                }}
              />
              <div
                className="min-h-[260px] border border-border bg-cover bg-center"
                style={{
                  backgroundImage:
                    "url('https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=900&q=86')",
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1500px] gap-5 px-5 py-8 md:grid-cols-4 md:px-8">
        {facilityCards.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center border border-border bg-surface-2 text-module">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold text-foreground">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.detail}</p>
            </article>
          );
        })}
      </section>

      <section className="mx-auto max-w-[1500px] px-5 pb-10 md:px-8">
        <div className="overflow-hidden border border-border bg-card shadow-sm">
          {directoryRows.map(([label, detail]) => (
            <div
              key={label}
              className="grid gap-2 border-b border-border p-5 last:border-b-0 md:grid-cols-[220px_1fr]"
            >
              <p className="font-semibold text-foreground">{label}</p>
              <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
