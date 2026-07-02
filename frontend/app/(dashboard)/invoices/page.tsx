"use client";

import * as React from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CreditCard,
  Download,
  FileText,
  Loader2,
  Phone,
  Mail,
  MapPin,
  Globe,
} from "lucide-react";
import Link from "next/link";

import { useInvoiceById } from "@/hooks/use-invoice-by-id";
import {
  downloadInvoicePdf,
  downloadPaymentReceiptPdf,
} from "@/services/billing-service";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function patientName(
  patient?: {
    firstName?: string;
    middleName?: string | null;
    lastName?: string;
  } | null,
) {
  if (!patient) return "Unknown patient";
  return [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(" ");
}

function statusTone(status?: string | null) {
  switch ((status || "").toUpperCase()) {
    case "CLOSED":
    case "PAID":
      return "border-emerald-500/20 bg-success/10 text-emerald-300";
    case "PARTIALLY_PAID":
      return "border-amber-500/20 bg-amber-500/10 text-amber-300";
    default:
      return "border-cyan-500/20 bg-cyan-500/10 text-cyan-300";
  }
}

function buildInvoiceVerificationCode(invoice?: { id: number; invoiceNumber: string; patientId: number; facilityId: number; issuedAt?: string | null } | null) {
  if (!invoice) return "VAR-PENDING";

  const seed = [
    invoice.invoiceNumber,
    invoice.id,
    invoice.patientId,
    invoice.facilityId,
    invoice.issuedAt ? new Date(invoice.issuedAt).toISOString() : "",
  ].join("|");

  let checksum = 17;
  for (const char of seed) {
    checksum = (checksum * 31 + char.charCodeAt(0)) % 1679616;
  }

  return `VAR-${String(invoice.id).padStart(6, "0")}-${checksum
    .toString(36)
    .toUpperCase()
    .padStart(4, "0")}`;
}

function VerificationBarcode({ code }: { code: string }) {
  return (
    <div className="rounded-sm border border-border-strong bg-card p-1">
      <div
        className="h-9 w-44 bg-[repeating-linear-gradient(90deg,#111827_0_2px,#ffffff_2px_4px,#111827_4px_5px,#ffffff_5px_8px,#111827_8px_11px,#ffffff_11px_14px)]"
        aria-hidden="true"
      />
      <p className="mt-1 text-center text-[10px] font-bold tracking-[0.18em] text-foreground">
        {code}
      </p>
    </div>
  );
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const { data: invoice, isLoading } = useInvoiceById(id);
  const [isDownloadingPdf, setIsDownloadingPdf] = React.useState(false);

  const printableItems = Array.isArray(invoice?.items)
    ? invoice.items.filter((item) => item.isRemoved !== true)
    : [];

  const payments = Array.isArray(invoice?.payments) ? invoice.payments : [];
  const verificationCode =
    invoice?.verificationCode || buildInvoiceVerificationCode(invoice);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!invoice) return;

    setIsDownloadingPdf(true);

    try {
      await downloadInvoicePdf(invoice.id, invoice.invoiceNumber);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="space-y-6 print:space-y-0">
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          .print-hide {
            display: none !important;
          }

          .print-card {
            box-shadow: none !important;
            border: 1px solid #d4d4d8 !important;
            background: white !important;
          }

          .print-text-ink {
            color: #111827 !important;
          }

          .print-muted {
            color: #4b5563 !important;
          }

          .print-table th,
          .print-table td {
            color: #111827 !important;
            border-color: #d1d5db !important;
          }

          @page {
            margin: 8mm;
            size: A4;
          }

          #invoice-document {
            font-size: 10px !important;
          }

          #invoice-document h2 {
            font-size: 18px !important;
          }

          #invoice-document td,
          #invoice-document th {
            padding: 4px 6px !important;
          }
        }
      `}</style>

      <section className="print-hide relative overflow-hidden rounded-[2rem] border surface-spotlight shadow-md p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-600/10 via-cyan-500/5 to-transparent" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge className="rounded-full border-0 bg-success/10 px-3 py-1 text-success">
              Invoice Viewer
            </Badge>

            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10">
                <FileText className="h-7 w-7 text-primary" />
              </div>

              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Invoice Details
                </h1>
                <p className="text-muted-foreground">
                  View the invoice and download the official server PDF
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/billing">
              <Button type="button" variant="outline" className="rounded-2xl">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Billing
              </Button>
            </Link>

            <Button type="button" className="rounded-2xl" onClick={handlePrint}>
              <Download className="mr-2 h-4 w-4" />
              Preview print
            </Button>

            <Button
              type="button"
              variant="outline"
              className="rounded-2xl"
              onClick={handleDownloadPdf}
              disabled={!invoice || isDownloadingPdf}
            >
              {isDownloadingPdf ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Download PDF
            </Button>
          </div>
        </div>
      </section>

      {isLoading || !invoice ? (
        <Card className="print-card rounded-[1.8rem] surface-spotlight shadow-md">
          <CardContent className="p-6 text-sm text-muted-foreground print-text-ink">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading invoice...
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card id="invoice-document" className="print-card rounded-[1.8rem] surface-spotlight shadow-md">
          <CardContent className="p-6 md:p-10">
            <div className="space-y-8 print-text-ink">
              <div className="flex flex-col gap-6 border-b border-white/10 pb-8 print-muted">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {invoice.facility?.logoUrl ? (
                        <Image
                          src={invoice.facility.logoUrl}
                          alt={`${invoice.facility?.name || "Facility"} logo`}
                          width={56}
                          height={56}
                          unoptimized
                          className="h-14 w-14 rounded-lg border border-border bg-card object-contain p-1"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-card">
                          <CreditCard className="h-7 w-7 text-module" />
                        </div>
                      )}

                      <div>
                        <h2 className="text-3xl font-bold tracking-tight print-text-ink">
                          {invoice.facility?.name || "Hospital Name"}
                        </h2>
                        <p className="text-sm text-muted-foreground print-muted">
                          Official Patient Invoice
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-2 text-sm text-muted-foreground print-muted">
                      {invoice.facility?.address ? (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{invoice.facility.address}</span>
                        </div>
                      ) : null}

                      {invoice.facility?.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>{invoice.facility.phone}</span>
                        </div>
                      ) : null}

                      {invoice.facility?.email ? (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span>{invoice.facility.email}</span>
                        </div>
                      ) : null}

                      {invoice.facility?.website ? (
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          <span>{invoice.facility.website}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-3 lg:text-right">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground print-muted">
                        Invoice Number
                      </p>
                      <p className="text-xl font-bold print-text-ink">
                        {invoice.invoiceNumber}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground print-muted">
                        VAR Code
                      </p>
                      <VerificationBarcode code={verificationCode} />
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground print-muted">
                        Issued Date
                      </p>
                      <p className="text-sm font-medium print-text-ink">
                        {formatDate(invoice.issuedAt)}
                      </p>
                    </div>

                    <div className="inline-flex">
                      <Badge
                        className={`rounded-full border px-3 py-1 ${statusTone(
                          invoice.statusCode,
                        )}`}
                      >
                        {invoice.statusCode}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4 print-card">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground print-muted">
                    Bill To
                  </p>
                  <p className="mt-2 text-lg font-semibold print-text-ink">
                    {patientName(invoice.patient)}
                  </p>
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground print-muted">
                    <p>Patient No: {invoice.patient?.patientNumber || "—"}</p>
                    <p>Phone: {invoice.patient?.phonePrimary || "—"}</p>
                    <p>Gender: {invoice.patient?.gender || "—"}</p>
                  </div>
                </div>

                <div className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4 print-card">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground print-muted">
                    Visit Reference
                  </p>
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground print-muted">
                    <p>Appointment ID: {invoice.appointmentId ?? "—"}</p>
                    <p>Consultation ID: {invoice.consultationId ?? "—"}</p>
                    <p>Admission ID: {invoice.admissionId ?? "—"}</p>
                    <p>Branch: {invoice.branch?.name || "—"}</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-[1.2rem] border border-white/10 print-card">
                <table className="print-table min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-card/[0.03]">
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground print-muted">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground print-muted">
                        Ref
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground print-muted">
                        Description
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground print-muted">
                        Qty
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground print-muted">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground print-muted">
                        Line Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {printableItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-6 text-center text-muted-foreground print-muted"
                        >
                          No invoice lines found.
                        </td>
                      </tr>
                    ) : (
                      printableItems.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-white/10 last:border-b-0"
                        >
                          <td className="px-4 py-4 align-top text-xs print-text-ink">
                            {formatDate(item.createdAt)}
                          </td>
                          <td className="px-4 py-4 align-top text-xs font-semibold print-text-ink">
                            L{String(item.id).padStart(4, "0")}
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div>
                              <p className="font-medium print-text-ink">
                                {item.description}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground print-muted">
                                {item.notes || "—"}
                              </p>
                              {item.isAutoGenerated ? (
                                <p className="mt-1 text-xs text-cyan-300 print-muted">
                                  Auto generated
                                  {item.sourceModule
                                    ? ` • ${item.sourceModule}`
                                    : ""}
                                </p>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top print-text-ink">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-4 align-top print-text-ink">
                            {formatMoney(item.unitPrice)}
                          </td>
                          <td className="px-4 py-4 align-top font-semibold print-text-ink">
                            {formatMoney(item.lineTotal)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4 print-card">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground print-muted">
                    Notes
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground print-muted">
                    {invoice.notes || "No extra invoice notes."}
                  </p>

                  <div className="mt-6">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground print-muted">
                      Payment Options
                    </p>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground print-muted">
                      <p>Cash payments accepted at cashier desk.</p>
                      <p>
                        M-PESA Paybill: {invoice.facility?.mpesaPaybill || "—"}
                      </p>
                      <p>
                        M-PESA Till: {invoice.facility?.mpesaTillNumber || "—"}
                      </p>
                      <p>
                        M-PESA Shortcode:{" "}
                        {invoice.facility?.mpesaShortcode || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4 print-card">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground print-muted">
                        Subtotal
                      </span>
                      <span className="font-medium print-text-ink">
                        {formatMoney(invoice.subtotal)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground print-muted">
                        Discount
                      </span>
                      <span className="font-medium print-text-ink">
                        {formatMoney(invoice.discountAmount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground print-muted">
                        Tax
                      </span>
                      <span className="font-medium print-text-ink">
                        {formatMoney(invoice.taxAmount)}
                      </span>
                    </div>

                    <div className="border-t border-white/10 pt-3">
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-semibold print-text-ink">
                          Total
                        </span>
                        <span className="text-lg font-bold print-text-ink">
                          {formatMoney(invoice.totalAmount)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground print-muted">
                        Paid
                      </span>
                      <span className="font-medium print-text-ink">
                        {formatMoney(invoice.paidAmount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="font-semibold print-text-ink">
                        Balance
                      </span>
                      <span className="text-lg font-bold text-cyan-300 print-text-ink">
                        {formatMoney(invoice.balanceAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4 print-card">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground print-muted">
                  Payment History
                </p>

                {payments.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground print-muted">
                    No payments recorded yet.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="rounded-[1rem] border border-white/10 bg-black/10 p-3 print-card"
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-medium print-text-ink">
                              {payment.paymentMethod} •{" "}
                              {formatMoney(payment.amount)}
                            </p>
                            <p className="text-sm text-muted-foreground print-muted">
                              Receipt: {payment.receiptNumber}
                            </p>
                          </div>

                          <div className="text-sm text-muted-foreground print-muted">
                            {formatDate(payment.paidAt)}
                            {payment.statusCode === "COMPLETED" ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-2 rounded-xl print:hidden"
                                onClick={() =>
                                  void downloadPaymentReceiptPdf(
                                    payment.id,
                                    payment.receiptNumber,
                                  )
                                }
                              >
                                Download receipt
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-white/10 pt-6 text-center text-xs text-muted-foreground print-muted">
                This invoice was generated by the hospital management system.
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
