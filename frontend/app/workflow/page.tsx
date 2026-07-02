import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicSiteHeader } from "@/components/public/public-site-header";
import { Button } from "@/components/ui/button";

const steps = [
  ["1", "Reception", "Open or find the patient record, create the visit, confirm facility and branch, and prepare the billing workspace."],
  ["2", "Triage and queue", "Capture vitals and route the patient to the correct doctor queue."],
  ["3", "Doctor review", "Start the consultation, write notes, request lab tests, prescribe medicines, admit to IPD, or complete the visit."],
  ["4", "Lab and pharmacy", "Lab results return to the doctor. Pharmacy dispensing updates stock and adds the correct billing line."],
  ["5", "Billing and reports", "Cashier reviews invoice items, removes wrong lines when authorized, prints the invoice, and reports collections."],
];

export default function WorkflowPage() {
  return (
    <main className="min-h-screen bg-[#eef8ff] text-foreground">
      <PublicSiteHeader />
      <section className="border-b border-border bg-card text-foreground">
        <div className="mx-auto grid min-h-[calc(100vh-82px)] max-w-[1500px] gap-8 px-5 py-8 md:px-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-center">
          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase text-module">
              System workflow
            </p>
            <h1 className="max-w-2xl text-4xl font-bold leading-tight md:text-6xl">
              The hospital flow is built around the patient visit.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-muted-foreground">
              The system connects front desk, doctors, lab, pharmacy, IPD,
              billing, and reports so work does not disappear between desks.
            </p>
            <Button asChild className="mt-6 rounded-md bg-primary text-white hover:bg-brand-strong">
              <Link href="/login">
                Enter the system
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-[1.25fr_0.75fr]">
            <div
              className="min-h-[520px] border border-border bg-cover bg-center shadow-xl"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1800&q=86')",
              }}
            />
            <div className="grid gap-4">
              <div
                className="min-h-[250px] border border-border bg-cover bg-center"
                style={{
                  backgroundImage:
                    "url('https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=900&q=86')",
                }}
              />
              <div
                className="min-h-[250px] border border-border bg-cover bg-center"
                style={{
                  backgroundImage:
                    "url('https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=900&q=86')",
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-5 py-8 md:px-8">
        <div className="grid gap-3 xl:grid-cols-5">
          {steps.map(([number, area, detail]) => (
            <div
              key={number}
              className="border border-border bg-card p-5 shadow-sm"
            >
              <p className="text-2xl font-bold text-module">{number}</p>
              <p className="mt-4 font-semibold text-foreground">{area}</p>
              <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
