import Link from "next/link";
import {
  ArrowRight,
  Building2,
  HeartHandshake,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { PublicSiteHeader } from "@/components/public/public-site-header";
import { Button } from "@/components/ui/button";

const imagePanels = [
  {
    label: "Hospital discipline",
    image:
      "https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=1000&q=88",
  },
  {
    label: "Patient service",
    image:
      "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1000&q=88",
  },
  {
    label: "Clinical teamwork",
    image:
      "https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=1000&q=88",
  },
];

export default function InspirationPage() {
  return (
    <main className="min-h-screen bg-[#f6fbff] text-foreground">
      <PublicSiteHeader />

      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-[1500px] gap-8 px-5 py-12 md:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 border border-border bg-surface-2 px-3 py-2 text-sm font-semibold text-module">
              <HeartHandshake className="h-4 w-4" />
              Inspiration behind Invinceible Core HMS
            </div>

            <div>
              <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight text-foreground md:text-7xl">
                Rev. Dr Nelson Mandela
              </h1>
              <p className="mt-5 max-w-2xl text-xl leading-9 text-muted-foreground">
                Director of St Francis Hillside Medicare KSM, sponsor of the
                system, and the person whose vision pushed this work from an
                idea into a serious hospital operating platform.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Director", "St Francis Hillside Medicare KSM"],
                ["Sponsor", "System build and hospital vision"],
                ["Inspiration", "Service, order, and accountability"],
              ].map(([title, detail]) => (
                <div key={title} className="border border-border bg-[#f7fcff] p-4">
                  <p className="text-sm font-semibold uppercase text-module">
                    {title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {detail}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="rounded-md bg-primary text-white hover:bg-brand-strong">
                <Link href="/login">
                  Enter system
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-md border-border-strong text-module hover:bg-surface-2"
              >
                <Link href="/reviews">View user reviews</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_0.72fr]">
            <div
              className="min-h-[720px] border border-border bg-cover bg-center shadow-2xl"
              style={{
                backgroundImage:
                  "url('/inspiration/rev-dr-nelson-mandela.png')",
              }}
            />
            <div className="grid gap-4">
              {imagePanels.map((panel) => (
                <div key={panel.label} className="border border-border bg-card p-3 shadow-lg">
                  <div
                    className="h-48 bg-cover bg-center"
                    style={{ backgroundImage: `url('${panel.image}')` }}
                  />
                  <p className="mt-3 text-sm font-semibold text-foreground">
                    {panel.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#eaf7ff]">
        <div className="mx-auto grid max-w-[1500px] gap-6 px-5 py-14 md:px-8 lg:grid-cols-3">
          <article className="border border-border bg-card p-7 shadow-sm">
            <Building2 className="mb-5 h-8 w-8 text-module" />
            <h2 className="text-2xl font-bold">A hospital-first vision</h2>
            <p className="mt-4 text-base leading-8 text-muted-foreground">
              The system follows the pressure of real hospital work: reception,
              clinician review, laboratory, pharmacy, inpatient care, billing,
              reports, and administration.
            </p>
          </article>

          <article className="border border-border bg-card p-7 shadow-sm">
            <Stethoscope className="mb-5 h-8 w-8 text-module" />
            <h2 className="text-2xl font-bold">Built around patient service</h2>
            <p className="mt-4 text-base leading-8 text-muted-foreground">
              Rev. Dr Nelson Mandela inspired a platform where hospital teams
              can work with order, speed, and clarity while keeping the patient
              journey connected.
            </p>
          </article>

          <article className="border border-border bg-card p-7 shadow-sm">
            <ShieldCheck className="mb-5 h-8 w-8 text-module" />
            <h2 className="text-2xl font-bold">Sponsored for long-term use</h2>
            <p className="mt-4 text-base leading-8 text-muted-foreground">
              His sponsorship gave the work a strong foundation: practical
              modules, controlled access, clean records, audit visibility, and
              room for a growing hospital network.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
