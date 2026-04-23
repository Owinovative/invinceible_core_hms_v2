"use client";

import * as React from "react";
import {
  Activity,
  AlertTriangle,
  BedDouble,
  CreditCard,
  FileText,
  FlaskConical,
  Loader2,
  Pill,
  Users,
  Wallet,
} from "lucide-react";

import { useReportsDashboard } from "@/hooks/use-reports-dashboard";
import { useScope } from "@/providers/scope-provider";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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

function barWidth(value: number, max: number) {
  if (max <= 0) return "0%";
  return `${Math.max((value / max) * 100, 6)}%`;
}

export default function ReportsPage() {
  const { facilityName, selectedBranchName } = useScope();

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [dateFrom, setDateFrom] = React.useState(
    monthStart.toISOString().slice(0, 10),
  );
  const [dateTo, setDateTo] = React.useState(today.toISOString().slice(0, 10));
  const [appliedDateFrom, setAppliedDateFrom] = React.useState(dateFrom);
  const [appliedDateTo, setAppliedDateTo] = React.useState(dateTo);

  const { data, isLoading, isFetching } = useReportsDashboard(
    appliedDateFrom,
    appliedDateTo,
  );

  const counts = data?.counts;
  const money = data?.money;
  const beds = data?.beds;

  const appointmentChart = data?.charts.appointmentsByStatus ?? [];
  const invoiceChart = data?.charts.invoicesByStatus ?? [];
  const paymentChart = data?.charts.paymentsByMethod ?? [];
  const lowStockList = data?.lowStockList ?? [];
  const recentInvoices = data?.recentInvoices ?? [];

  const maxAppointmentValue = Math.max(...appointmentChart.map((x) => x.value), 0);
  const maxInvoiceValue = Math.max(...invoiceChart.map((x) => x.value), 0);
  const maxPaymentValue = Math.max(...paymentChart.map((x) => x.value), 0);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border gradient-border panel-shadow p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-fuchsia-600/10 via-cyan-500/5 to-transparent" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-fuchsia-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <Badge className="rounded-full border-0 bg-fuchsia-600/10 px-3 py-1 text-fuchsia-700 dark:text-fuchsia-300">
              Reports V2
            </Badge>

            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10">
                <Activity className="h-7 w-7 text-primary" />
              </div>

              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Reports Dashboard
                </h1>
                <p className="text-muted-foreground">
                  Date-filtered analytics for operations, billing, lab, pharmacy, and IPD
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
            <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Facility
              </p>
              <p className="mt-2 text-sm font-semibold">{facilityName || "No facility"}</p>
            </div>

            <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Branch
              </p>
              <p className="mt-2 text-sm font-semibold">
                {selectedBranchName || "No branch"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <Card className="rounded-[1.8rem] gradient-border panel-shadow">
          <CardHeader>
            <CardTitle>Report Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Date From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-12 rounded-2xl"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Date To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-12 rounded-2xl"
              />
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                className="h-12 w-full rounded-2xl"
                onClick={() => {
                  setAppliedDateFrom(dateFrom);
                  setAppliedDateTo(dateTo);
                }}
              >
                Apply Filters
              </Button>
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full rounded-2xl"
                onClick={() => {
                  const resetTo = new Date().toISOString().slice(0, 10);
                  const resetFrom = new Date(
                    new Date().getFullYear(),
                    new Date().getMonth(),
                    1,
                  )
                    .toISOString()
                    .slice(0, 10);

                  setDateFrom(resetFrom);
                  setDateTo(resetTo);
                  setAppliedDateFrom(resetFrom);
                  setAppliedDateTo(resetTo);
                }}
              >
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {isLoading ? (
        <Card className="rounded-[1.8rem] gradient-border panel-shadow">
          <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading reports dashboard...
          </CardContent>
        </Card>
      ) : (
        <>
          {isFetching ? (
            <div className="rounded-[1.2rem] border border-cyan-500/20 bg-cyan-500/8 px-4 py-3 text-sm text-cyan-300">
              Refreshing dashboard...
            </div>
          ) : null}

          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <Card className="rounded-[1.6rem] gradient-border panel-shadow">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">Patients</p>
                  <p className="mt-2 text-2xl font-bold">{counts?.patients ?? 0}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.6rem] gradient-border panel-shadow">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">Appointments</p>
                  <p className="mt-2 text-2xl font-bold">{counts?.appointments ?? 0}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <Activity className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.6rem] gradient-border panel-shadow">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">Active Admissions</p>
                  <p className="mt-2 text-2xl font-bold">{counts?.activeAdmissions ?? 0}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <BedDouble className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.6rem] gradient-border panel-shadow">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Lab Orders</p>
                  <p className="mt-2 text-2xl font-bold">{counts?.pendingLabOrders ?? 0}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <FlaskConical className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <Card className="rounded-[1.6rem] gradient-border panel-shadow">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">Prescriptions</p>
                  <p className="mt-2 text-2xl font-bold">{counts?.prescriptions ?? 0}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <Pill className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.6rem] gradient-border panel-shadow">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">Invoices</p>
                  <p className="mt-2 text-2xl font-bold">{counts?.invoices ?? 0}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.6rem] gradient-border panel-shadow">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">Low Stock</p>
                  <p className="mt-2 text-2xl font-bold">{counts?.lowStockItems ?? 0}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <AlertTriangle className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.6rem] gradient-border panel-shadow">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">Out of Stock</p>
                  <p className="mt-2 text-2xl font-bold">{counts?.outOfStockItems ?? 0}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <AlertTriangle className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 md:grid-cols-3">
            <Card className="rounded-[1.8rem] gradient-border panel-shadow">
              <CardHeader>
                <CardTitle>Total Invoiced</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{formatMoney(money?.totalInvoiced)}</p>
              </CardContent>
            </Card>

            <Card className="rounded-[1.8rem] gradient-border panel-shadow">
              <CardHeader>
                <CardTitle>Total Collected</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{formatMoney(money?.totalCollected)}</p>
              </CardContent>
            </Card>

            <Card className="rounded-[1.8rem] gradient-border panel-shadow">
              <CardHeader>
                <CardTitle>Outstanding Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{formatMoney(money?.outstandingBalance)}</p>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <Card className="rounded-[1.8rem] gradient-border panel-shadow">
              <CardHeader>
                <CardTitle>Appointments by Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {appointmentChart.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data.</p>
                ) : (
                  appointmentChart.map((item) => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{item.label}</span>
                        <span className="font-medium">{item.value}</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10">
                        <div
                          className="h-2 rounded-full bg-cyan-400"
                          style={{ width: barWidth(item.value, maxAppointmentValue) }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[1.8rem] gradient-border panel-shadow">
              <CardHeader>
                <CardTitle>Invoices by Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {invoiceChart.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data.</p>
                ) : (
                  invoiceChart.map((item) => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{item.label}</span>
                        <span className="font-medium">{item.value}</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10">
                        <div
                          className="h-2 rounded-full bg-emerald-400"
                          style={{ width: barWidth(item.value, maxInvoiceValue) }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[1.8rem] gradient-border panel-shadow">
              <CardHeader>
                <CardTitle>Payments by Method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {paymentChart.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data.</p>
                ) : (
                  paymentChart.map((item) => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{item.label}</span>
                        <span className="font-medium">{formatMoney(item.value)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10">
                        <div
                          className="h-2 rounded-full bg-fuchsia-400"
                          style={{ width: barWidth(item.value, maxPaymentValue) }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <Card className="rounded-[1.8rem] gradient-border panel-shadow">
              <CardHeader>
                <CardTitle>Bed Occupancy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm text-muted-foreground">Total Beds</p>
                  <p className="mt-1 text-2xl font-bold">{beds?.totalBeds ?? 0}</p>
                </div>
                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm text-muted-foreground">Occupied Beds</p>
                  <p className="mt-1 text-2xl font-bold">{beds?.occupiedBeds ?? 0}</p>
                </div>
                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm text-muted-foreground">Available Beds</p>
                  <p className="mt-1 text-2xl font-bold">{beds?.availableBeds ?? 0}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.8rem] gradient-border panel-shadow">
              <CardHeader>
                <CardTitle>Critical Stock Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {lowStockList.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-muted-foreground">
                    No stock alerts for this period.
                  </div>
                ) : (
                  lowStockList.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-[1rem] border p-4 ${
                        item.isOutOfStock
                          ? "border-red-500/20 bg-red-500/10"
                          : "border-amber-500/20 bg-amber-500/10"
                      }`}
                    >
                      <p className="font-medium">
                        {item.medicineName}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Branch: {item.branchName}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Stock: {item.stockQuantity} • Reorder: {item.reorderLevel}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </section>

          <section>
            <Card className="rounded-[1.8rem] gradient-border panel-shadow">
              <CardHeader>
                <CardTitle>Recent Invoices</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentInvoices.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-muted-foreground">
                    No invoices found in this date range.
                  </div>
                ) : (
                  recentInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="font-semibold">{invoice.invoiceNumber}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {invoice.patientName}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Issued: {formatDate(invoice.issuedAt)}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-semibold">{formatMoney(invoice.totalAmount)}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Balance: {formatMoney(invoice.balanceAmount)}
                          </p>
                          <Badge className="mt-2 rounded-full border px-3 py-1 border-white/10 bg-white/[0.04] text-muted-foreground">
                            {invoice.statusCode}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
