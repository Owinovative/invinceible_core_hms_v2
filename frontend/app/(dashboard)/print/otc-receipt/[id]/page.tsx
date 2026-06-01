"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Download,
  Loader2,
  Printer,
  Receipt,
  ShieldCheck,
} from "lucide-react";

import {
  downloadOtcReceiptPdf,
  getOtcSale,
  type OtcSale,
} from "@/services/otc-sales-service";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value?: string | null) {
  if (!value) return "Not finalized";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not finalized" : date.toLocaleString();
}

function patientLabel(sale?: OtcSale | null) {
  if (!sale?.patient) return sale?.customerName || "Walk-in customer";
  const name = [
    sale.patient.firstName,
    sale.patient.middleName,
    sale.patient.lastName,
  ]
    .filter(Boolean)
    .join(" ");
  return `${name || "Linked patient"}${
    sale.patient.patientNumber ? ` (${sale.patient.patientNumber})` : ""
  }`;
}

export default function OtcReceiptPrintPage() {
  const params = useParams<{ id: string }>();
  const saleId = Number(params.id);
  const [downloading, setDownloading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const saleQuery = useQuery({
    queryKey: ["otc-receipt-preview", saleId],
    queryFn: () => getOtcSale(saleId),
    enabled: Number.isFinite(saleId) && saleId > 0,
  });

  const sale = saleQuery.data;

  const handleDownload = async () => {
    if (!sale) return;
    setDownloading(true);
    setError(null);
    try {
      await downloadOtcReceiptPdf(sale.id, sale.saleNumber);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to download the OTC receipt PDF.",
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link href="/pharmacy/otc-sales">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to OTC sales
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
              <Receipt className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                OTC Receipt Preview
              </h1>
              <p className="text-sm text-slate-600">
                Exact protected route for the official server-generated
                receipt.
              </p>
            </div>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleDownload}
          disabled={!sale || downloading}
          className="rounded-xl"
        >
          {downloading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Download official PDF
        </Button>
      </div>

      {saleQuery.isLoading ? (
        <Card className="rounded-2xl">
          <CardContent className="flex items-center gap-2 p-6 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading receipt details...
          </CardContent>
        </Card>
      ) : null}

      {saleQuery.error || error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error ||
            (saleQuery.error instanceof Error
              ? saleQuery.error.message
              : "Receipt preview could not load.")}
        </div>
      ) : null}

      {sale ? (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Sale number</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold">{sale.saleNumber}</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Payment status</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className="bg-cyan-50 text-cyan-700">
                  {sale.paymentStatus.replace(/_/g, " ")}
                </Badge>
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold">{formatMoney(sale.totalAmount)}</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold">
                  {formatMoney(sale.balanceAmount)}
                </p>
              </CardContent>
            </Card>
          </section>

          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Receipt details</CardTitle>
              <Badge variant="outline" className="gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                Protected route
              </Badge>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Facility
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {sale.facility?.name || "Facility"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Branch
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {sale.branch?.name || "Branch"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Customer
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {patientLabel(sale)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Sold at
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {formatDate(sale.soldAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Paid
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {formatMoney(sale.paidAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Items
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {sale.items.length}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Medicine</th>
                      <th className="px-3 py-2">Qty</th>
                      <th className="px-3 py-2">Unit</th>
                      <th className="px-3 py-2 text-right">Line total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sale.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-3">
                          <p className="font-semibold">
                            {item.medicineNameSnapshot}
                          </p>
                          <p className="text-xs text-slate-500">
                            {[item.dosageFormSnapshot, item.strengthSnapshot]
                              .filter(Boolean)
                              .join(" / ") || "No form details"}
                          </p>
                        </td>
                        <td className="px-3 py-3">{item.quantity}</td>
                        <td className="px-3 py-3">
                          {formatMoney(item.unitPrice)}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold">
                          {formatMoney(item.lineTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl border bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Payment lines
                </p>
                <div className="mt-3 grid gap-2">
                  {sale.payments.length === 0 ? (
                    <p className="text-sm text-slate-600">
                      No payment lines recorded yet.
                    </p>
                  ) : null}
                  {sale.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex flex-col gap-2 rounded-lg bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-semibold">
                          {payment.paymentMethod.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-slate-500">
                          {payment.transactionRef ||
                            payment.mpesaReceiptNumber ||
                            payment.insuranceClaimReference ||
                            payment.insuranceProviderName ||
                            "No reference"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatMoney(
                            payment.paymentMethod === "INSURANCE"
                              ? payment.insuranceCoveredAmount || payment.amount
                              : payment.amount,
                          )}
                        </p>
                        <p className="text-xs text-slate-500">
                          {payment.insuranceClaimStatus || payment.statusCode}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button variant="outline" asChild>
                  <Link href="/pharmacy/otc-sales">New OTC sale</Link>
                </Button>
                <Button type="button" onClick={handleDownload}>
                  <Printer className="mr-2 h-4 w-4" />
                  Download printable receipt
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
