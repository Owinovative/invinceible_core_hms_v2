"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function InvoiceVerifyContent() {
  const searchParams = useSearchParams();
  const invoice = searchParams.get("invoice") || "Invoice";
  const facility = searchParams.get("facility") || "Facility";
  const patient = searchParams.get("patient") || "Patient";
  const total = Number(searchParams.get("total") || 0);

  return (
    <main className="min-h-screen bg-[#eef7ff] px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-2xl rounded-md border border-sky-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
          Invinceible Core HMS
        </p>
        <h1 className="mt-3 text-3xl font-bold text-[#07345f]">
          Invoice verification
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          This page opens from the invoice QR code and shows the core invoice
          details carried by the printed document.
        </p>

        <dl className="mt-8 grid gap-4 text-sm">
          <div className="rounded-md border border-slate-200 p-4">
            <dt className="text-slate-500">Invoice number</dt>
            <dd className="mt-1 text-lg font-bold">{invoice}</dd>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-md border border-slate-200 p-4">
              <dt className="text-slate-500">Facility</dt>
              <dd className="mt-1 font-semibold">{facility}</dd>
            </div>
            <div className="rounded-md border border-slate-200 p-4">
              <dt className="text-slate-500">Patient</dt>
              <dd className="mt-1 font-semibold">{patient}</dd>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-md border border-slate-200 p-4">
              <dt className="text-slate-500">Verification code</dt>
              <dd className="mt-1 font-mono font-semibold">
                {searchParams.get("code") || "-"}
              </dd>
            </div>
            <div className="rounded-md border border-slate-200 p-4">
              <dt className="text-slate-500">Invoice total</dt>
              <dd className="mt-1 font-semibold">
                {new Intl.NumberFormat("en-KE", {
                  style: "currency",
                  currency: "KES",
                }).format(total)}
              </dd>
            </div>
          </div>
        </dl>

        <Link
          href="/login"
          className="mt-8 inline-flex rounded-md bg-[#075a9b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#064777]"
        >
          Open staff portal
        </Link>
      </section>
    </main>
  );
}

export default function InvoiceVerifyPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#eef7ff]" />}>
      <InvoiceVerifyContent />
    </Suspense>
  );
}
