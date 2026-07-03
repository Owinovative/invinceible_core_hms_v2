"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useSearchParams } from "next/navigation";
import {
  downloadPublicVerifiedInvoicePdf,
  getPublicVerifiedInvoice,
  type InvoiceRecord,
} from "@/services/billing-service";
import { Button } from "@/components/ui/button";

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function patientName(invoice?: InvoiceRecord | null) {
  const patient = invoice?.patient;
  return [patient?.firstName, patient?.middleName, patient?.lastName]
    .filter(Boolean)
    .join(" ");
}

function InvoiceVerifyContent() {
  const searchParams = useSearchParams();
  const invoiceNumber = searchParams.get("invoice") || "";
  const code = searchParams.get("code") || "";
  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const items = useMemo(
    () => (invoice?.items ?? []).filter((item) => !item.isRemoved),
    [invoice],
  );

  useEffect(() => {
    if (!invoiceNumber || !code) {
      setError("Invoice verification details are missing.");
      return;
    }

    getPublicVerifiedInvoice(invoiceNumber, code)
      .then(setInvoice)
      .catch((requestError) =>
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to verify invoice.",
        ),
      );
  }, [invoiceNumber, code]);

  return (
    <main className="min-h-screen bg-[#eef7ff] px-4 py-6 text-foreground">
      <section className="mx-auto max-w-4xl bg-card p-6 shadow-xl">
        {error ? (
          <div className="rounded-md border border-destructive/25 bg-destructive-soft p-4 text-sm text-destructive">
            {error}
          </div>
        ) : !invoice ? (
          <p className="text-sm text-muted-foreground">Loading verified invoice...</p>
        ) : (
          <>
            <div className="flex items-start justify-between gap-6 border-b-2 border-sky-600 pb-4">
              <div>
                <h1 className="font-serif text-2xl font-bold uppercase text-muted-foreground">
                  {invoice.facility?.name || "Hospital Facility"}
                </h1>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[invoice.facility?.email, invoice.facility?.phone]
                    .filter(Boolean)
                    .join(" | ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[invoice.facility?.address, invoice.facility?.town]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
              <div className="text-right">
                <p className="font-serif text-3xl text-muted-foreground">INVOICE</p>
                <p className="mt-2 font-mono text-xs">{code}</p>
                <Button
                  type="button"
                  size="sm"
                  className="mt-3 rounded-md bg-primary text-white"
                  onClick={() =>
                    void downloadPublicVerifiedInvoicePdf(invoiceNumber, code)
                  }
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-2 text-xs md:grid-cols-2">
              <div>
                <p>
                  <b>Patient:</b> {patientName(invoice) || "-"}
                </p>
                <p>
                  <b>Patient No:</b> {invoice.patient?.patientNumber || "-"}
                </p>
                <p>
                  <b>Phone:</b> {invoice.patient?.phonePrimary || "-"}
                </p>
              </div>
              <div className="md:text-right">
                <p>
                  <b>Invoice No:</b> {invoice.invoiceNumber}
                </p>
                <p>
                  <b>Date:</b>{" "}
                  {invoice.issuedAt
                    ? new Date(invoice.issuedAt).toLocaleDateString()
                    : "-"}
                </p>
                <p>
                  <b>Status:</b> {invoice.statusCode}
                </p>
              </div>
            </div>

            <table className="mt-5 w-full border-collapse text-xs">
              <thead>
                <tr className="border-y border-border-strong text-left text-muted-foreground">
                  <th className="py-2">Date</th>
                  <th className="py-2">Item</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Price</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr
                    key={item.id}
                    className={index % 2 === 0 ? "bg-muted" : "bg-card"}
                  >
                    <td className="py-2">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="py-2">{item.description}</td>
                    <td className="py-2 text-right">{item.quantity}</td>
                    <td className="py-2 text-right">
                      {formatMoney(item.unitPrice)}
                    </td>
                    <td className="py-2 text-right font-semibold">
                      {formatMoney(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="ml-auto mt-5 w-full max-w-sm space-y-2 text-xs">
              {[
                ["Subtotal", invoice.subtotal],
                ["VAT", invoice.taxAmount],
                ["Discount", invoice.discountAmount],
                ["Grand Total", invoice.totalAmount],
                ["Paid", invoice.paidAmount],
                ["Balance", invoice.balanceAmount],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="flex justify-between border px-3 py-2"
                >
                  <span>{label}</span>
                  <b>{formatMoney(Number(value || 0))}</b>
                </div>
              ))}
            </div>
          </>
        )}
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
