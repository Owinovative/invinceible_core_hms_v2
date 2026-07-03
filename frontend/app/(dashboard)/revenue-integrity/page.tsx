"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  FileWarning,
  Loader2,
  ReceiptText,
} from "lucide-react";

import { useCashierClose } from "@/hooks/use-cashier-close";
import { useRevenueIntegrity } from "@/hooks/use-revenue-integrity";
import type { InvoiceItemRecord, InvoiceRecord } from "@/services/billing-service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function patientName(invoice?: InvoiceRecord | null) {
  const patient = invoice?.patient;
  if (!patient) return "Unknown patient";
  return [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(" ");
}

function staffName(staff?: InvoiceItemRecord["updatedBy"]) {
  if (!staff) return "System";
  const name = [staff.firstName, staff.lastName].filter(Boolean).join(" ");
  return name || staff.staffCode || "Staff";
}

function ExceptionLine({ item }: { item: InvoiceItemRecord }) {
  return (
    <div className="rounded-xl border bg-background/65 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full">
              {item.sourceModule || "MANUAL"}
            </Badge>
            {item.isRemoved ? (
              <Badge className="rounded-full border-0 bg-destructive/10 text-destructive">
                Removed
              </Badge>
            ) : (
              <Badge className="rounded-full border-0 bg-amber-500/10 text-warning">
                Price check
              </Badge>
            )}
          </div>
          <p className="mt-3 font-semibold">{item.description}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {patientName(item.invoice)} / {item.invoice?.invoiceNumber || "No invoice"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Qty {item.quantity} / Unit {formatMoney(item.unitPrice)} / Total{" "}
            {formatMoney(item.lineTotal)}
          </p>
          {item.removedReason ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Reason: {item.removedReason}
            </p>
          ) : null}
          {item.updatedBy ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Updated by {staffName(item.updatedBy)}
            </p>
          ) : null}
        </div>

        {item.invoiceId ? (
          <Link
            href={`/billing/${item.invoiceId}`}
            className="rounded-xl border px-3 py-2 text-sm font-semibold transition hover:bg-muted"
          >
            Open invoice
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default function RevenueIntegrityPage() {
  const [closeDate, setCloseDate] = React.useState(todayKey());
  const { data: integrity, isLoading: integrityLoading } = useRevenueIntegrity();
  const { data: close, isLoading: closeLoading } = useCashierClose(closeDate);

  const missingPriceItems = integrity?.missingPriceItems ?? [];
  const removedItems = integrity?.removedItems ?? [];
  const payments = close?.payments ?? [];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[1.4rem] border surface-spotlight p-6 shadow-md md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-amber-500/16 via-cyan-500/8 to-transparent" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge className="mb-4 rounded-full border-0 bg-amber-500/10 px-3 py-1 text-warning">
              Revenue assurance
            </Badge>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-background/80">
                <ClipboardCheck className="h-7 w-7 text-amber-500" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Revenue Integrity
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Catch missing prices, removed charges, and daily cash movement.
                </p>
              </div>
            </div>
          </div>

          <div className="w-full max-w-xs">
            <label className="mb-2 block text-sm font-medium">Cashier date</label>
            <Input
              type="date"
              value={closeDate}
              onChange={(event) => setCloseDate(event.target.value)}
              className="h-12 rounded-xl"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-[1.2rem] surface-spotlight shadow-md">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Missing Prices</p>
              <p className="mt-2 text-2xl font-bold">
                {integrity?.summary.missingPriceCount ?? 0}
              </p>
            </div>
            <AlertTriangle className="h-7 w-7 text-amber-500" />
          </CardContent>
        </Card>

        <Card className="rounded-[1.2rem] surface-spotlight shadow-md">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Removed Lines</p>
              <p className="mt-2 text-2xl font-bold">
                {integrity?.summary.removedLineCount ?? 0}
              </p>
            </div>
            <FileWarning className="h-7 w-7 text-destructive" />
          </CardContent>
        </Card>

        <Card className="rounded-[1.2rem] surface-spotlight shadow-md">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Collected</p>
              <p className="mt-2 text-2xl font-bold">
                {formatMoney(close?.summary.totalCollected)}
              </p>
            </div>
            <Banknote className="h-7 w-7 text-emerald-500" />
          </CardContent>
        </Card>

        <Card className="rounded-[1.2rem] surface-spotlight shadow-md">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Invoices Issued</p>
              <p className="mt-2 text-2xl font-bold">
                {close?.summary.invoiceCount ?? 0}
              </p>
            </div>
            <ReceiptText className="h-7 w-7 text-cyan-500" />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <Card className="rounded-[1.2rem] surface-spotlight shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Auto-charge Price Exceptions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {integrityLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading exceptions...
              </div>
            ) : missingPriceItems.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl border bg-background/65 p-4 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                No zero-price auto charges found.
              </div>
            ) : (
              missingPriceItems.map((item) => (
                <ExceptionLine key={item.id} item={item} />
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[1.2rem] surface-spotlight shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-500" />
              Cashier Day Close
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {closeLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading day close...
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border bg-background/65 p-4">
                    <p className="text-xs text-muted-foreground">Payments</p>
                    <p className="mt-2 text-xl font-bold">
                      {close?.summary.paymentCount ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl border bg-background/65 p-4">
                    <p className="text-xs text-muted-foreground">Removed value</p>
                    <p className="mt-2 text-xl font-bold">
                      {formatMoney(close?.summary.removedLineValue)}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border bg-background/65 p-4">
                  <p className="text-sm font-semibold">Collections by method</p>
                  <div className="mt-3 space-y-2">
                    {Object.entries(close?.summary.paymentsByMethod ?? {}).length ===
                    0 ? (
                      <p className="text-sm text-muted-foreground">
                        No completed payments for this date.
                      </p>
                    ) : (
                      Object.entries(close?.summary.paymentsByMethod ?? {}).map(
                        ([method, amount]) => (
                          <div
                            key={method}
                            className="flex items-center justify-between text-sm"
                          >
                            <span>{method}</span>
                            <span className="font-semibold">
                              {formatMoney(amount)}
                            </span>
                          </div>
                        ),
                      )
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {payments.slice(0, 8).map((payment) => (
                    <div
                      key={payment.id}
                      className="rounded-xl border bg-background/65 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">
                            {payment.receiptNumber}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {patientName(payment.invoice)} /{" "}
                            {payment.paymentMethod}
                          </p>
                        </div>
                        <p className="font-semibold">
                          {formatMoney(payment.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="rounded-[1.2rem] surface-spotlight shadow-md">
          <CardHeader>
            <CardTitle>Removed Billing Lines Audit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {removedItems.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-background/65 p-4 text-sm text-muted-foreground">
                No removed billing lines found in the current scope.
              </div>
            ) : (
              removedItems.map((item) => <ExceptionLine key={item.id} item={item} />)
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
