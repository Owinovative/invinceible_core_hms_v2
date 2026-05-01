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
    <main className="min-h-screen bg-[#f5fbff] text-slate-900">
      <PublicSiteHeader />
      <section className="bg-sky-950 text-white">
        <div className="mx-auto grid max-w-[1180px] gap-8 px-5 py-12 md:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase text-sky-200">
              System workflow
            </p>
            <h1 className="mt-2 text-4xl font-bold leading-tight md:text-5xl">
              The hospital flow is built around the patient visit.
            </h1>
            <p className="mt-4 text-base leading-8 text-sky-50">
              The system connects front desk, doctors, lab, pharmacy, IPD,
              billing, and reports so work does not disappear between desks.
            </p>
            <Button asChild className="mt-6 rounded-md bg-sky-300 text-sky-950 hover:bg-sky-200">
              <Link href="/login">
                Enter the system
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div
            className="min-h-[320px] border border-white/20 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1600&q=86')",
            }}
          />
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-5 py-12 md:px-8 md:py-16">
        <div className="space-y-3">
          {steps.map(([number, area, detail]) => (
            <div
              key={number}
              className="grid gap-4 border border-sky-200 bg-white p-5 shadow-sm md:grid-cols-[70px_180px_1fr] md:items-start"
            >
              <p className="text-2xl font-bold text-sky-700">{number}</p>
              <p className="font-semibold text-slate-950">{area}</p>
              <p className="text-sm leading-6 text-slate-600">{detail}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
