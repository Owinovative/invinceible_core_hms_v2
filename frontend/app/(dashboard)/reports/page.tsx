"use client";

import * as React from "react";
import {
  Activity,
  AlertTriangle,
  BedDouble,
  Download,
  FileText,
  FlaskConical,
  Loader2,
  Pill,
  Users,
} from "lucide-react";

import { useReportsDashboard } from "@/hooks/use-reports-dashboard";
import { useModuleOperationsReport } from "@/hooks/use-module-operations-report";
import { useProfitAnalytics } from "@/hooks/use-profit-analytics";
import { useOtcSalesReport } from "@/hooks/use-otc-sales-report";
import { useScope } from "@/providers/scope-provider";
import {
  getOtcSalesReportExport,
  getProfitAnalyticsExport,
  getModuleOperationsExport,
  getReportsDashboardExport,
  type CsvExportResponse,
} from "@/services/report-service";

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

function downloadCsvExport(file: CsvExportResponse) {
  const blob = new Blob([`\uFEFF${file.csvText}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.fileName;
  link.click();
  window.URL.revokeObjectURL(url);
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
  const { data: moduleReport } = useModuleOperationsReport(
    appliedDateFrom,
    appliedDateTo,
  );
  const { data: profitReport } = useProfitAnalytics(
    appliedDateFrom,
    appliedDateTo,
  );
  const { data: otcReport } = useOtcSalesReport(
    appliedDateFrom,
    appliedDateTo,
  );
  const [downloadState, setDownloadState] = React.useState<
    "dashboard" | "modules" | "profit" | "otc" | null
  >(null);

  const counts = data?.counts;
  const money = data?.money;
  const beds = data?.beds;

  const appointmentChart = data?.charts.appointmentsByStatus ?? [];
  const invoiceChart = data?.charts.invoicesByStatus ?? [];
  const paymentChart = data?.charts.paymentsByMethod ?? [];
  const moduleStatusChart =
    data?.charts.moduleRecordsByStatus ?? moduleReport?.byStatus ?? [];
  const moduleChart =
    data?.charts.moduleRecordsByModule ??
    moduleReport?.byModule.map((item) => ({
      label: item.moduleTitle,
      moduleSlug: item.moduleSlug,
      value: item.count,
    })) ??
    [];
  const lowStockList = data?.lowStockList ?? [];
  const recentInvoices = data?.recentInvoices ?? [];
  const recentModuleRecords =
    data?.recentModuleRecords ?? moduleReport?.recentRecords ?? [];

  const maxAppointmentValue = Math.max(
    ...appointmentChart.map((x) => x.value),
    0,
  );
  const maxInvoiceValue = Math.max(...invoiceChart.map((x) => x.value), 0);
  const maxPaymentValue = Math.max(...paymentChart.map((x) => x.value), 0);
  const maxModuleValue = Math.max(...moduleChart.map((x) => x.value), 0);
  const maxModuleStatusValue = Math.max(
    ...moduleStatusChart.map((x) => x.value),
    0,
  );

  const handleDownloadDashboard = async () => {
    setDownloadState("dashboard");
    try {
      downloadCsvExport(
        await getReportsDashboardExport(appliedDateFrom, appliedDateTo),
      );
    } finally {
      setDownloadState(null);
    }
  };

  const handleDownloadModules = async () => {
    setDownloadState("modules");
    try {
      downloadCsvExport(
        await getModuleOperationsExport(appliedDateFrom, appliedDateTo),
      );
    } finally {
      setDownloadState(null);
    }
  };

  const handleDownloadProfit = async () => {
    setDownloadState("profit");
    try {
      downloadCsvExport(
        await getProfitAnalyticsExport(appliedDateFrom, appliedDateTo),
      );
    } finally {
      setDownloadState(null);
    }
  };

  const handleDownloadOtc = async () => {
    setDownloadState("otc");
    try {
      downloadCsvExport(
        await getOtcSalesReportExport(appliedDateFrom, appliedDateTo),
      );
    } finally {
      setDownloadState(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border surface-spotlight shadow-md p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-600/10 via-cyan-500/5 to-transparent" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <Badge className="rounded-full border-0 bg-success/10 px-3 py-1 text-success">
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
                  Date-filtered analytics for operations, billing, lab,
                  pharmacy, and IPD
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
            <div className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Facility
              </p>
              <p className="mt-2 text-sm font-semibold">
                {facilityName || "No facility"}
              </p>
            </div>

            <div className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4">
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
        <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
          <CardHeader>
            <CardTitle>Report Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-8">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Date From
              </label>
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

            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full rounded-2xl"
                onClick={handleDownloadDashboard}
                disabled={downloadState === "dashboard"}
              >
                {downloadState === "dashboard" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Dashboard CSV
              </Button>
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full rounded-2xl"
                onClick={handleDownloadModules}
                disabled={downloadState === "modules"}
              >
                {downloadState === "modules" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Modules CSV
              </Button>
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full rounded-2xl"
                onClick={handleDownloadProfit}
                disabled={downloadState === "profit"}
              >
                {downloadState === "profit" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Profit CSV
              </Button>
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full rounded-2xl"
                onClick={handleDownloadOtc}
                disabled={downloadState === "otc"}
              >
                {downloadState === "otc" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                OTC CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {isLoading ? (
        <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
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
            <Card className="rounded-[1.6rem] surface-spotlight shadow-md">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">Patients</p>
                  <p className="mt-2 text-2xl font-bold">
                    {counts?.patients ?? 0}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.6rem] surface-spotlight shadow-md">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">Appointments</p>
                  <p className="mt-2 text-2xl font-bold">
                    {counts?.appointments ?? 0}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <Activity className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.6rem] surface-spotlight shadow-md">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Active Admissions
                  </p>
                  <p className="mt-2 text-2xl font-bold">
                    {counts?.activeAdmissions ?? 0}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <BedDouble className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.6rem] surface-spotlight shadow-md">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Pending Lab Orders
                  </p>
                  <p className="mt-2 text-2xl font-bold">
                    {counts?.pendingLabOrders ?? 0}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <FlaskConical className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <Card className="rounded-[1.6rem] surface-spotlight shadow-md">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">Prescriptions</p>
                  <p className="mt-2 text-2xl font-bold">
                    {counts?.prescriptions ?? 0}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <Pill className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.6rem] surface-spotlight shadow-md">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">Invoices</p>
                  <p className="mt-2 text-2xl font-bold">
                    {counts?.invoices ?? 0}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.6rem] surface-spotlight shadow-md">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">Low Stock</p>
                  <p className="mt-2 text-2xl font-bold">
                    {counts?.lowStockItems ?? 0}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <AlertTriangle className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.6rem] surface-spotlight shadow-md">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">Out of Stock</p>
                  <p className="mt-2 text-2xl font-bold">
                    {counts?.outOfStockItems ?? 0}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <AlertTriangle className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 md:grid-cols-3">
            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle>Total Invoiced</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {formatMoney(money?.totalInvoiced)}
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle>Total Collected</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {formatMoney(money?.totalCollected)}
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle>Outstanding Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {formatMoney(money?.outstandingBalance)}
                </p>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
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
                      <div className="h-2 rounded-full bg-card/10">
                        <div
                          className="h-2 rounded-full bg-cyan-400"
                          style={{
                            width: barWidth(item.value, maxAppointmentValue),
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
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
                      <div className="h-2 rounded-full bg-card/10">
                        <div
                          className="h-2 rounded-full bg-emerald-400"
                          style={{
                            width: barWidth(item.value, maxInvoiceValue),
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
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
                        <span className="font-medium">
                          {formatMoney(item.value)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-card/10">
                        <div
                          className="h-2 rounded-full bg-emerald-400"
                          style={{
                            width: barWidth(item.value, maxPaymentValue),
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle>Bed Occupancy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-4">
                  <p className="text-sm text-muted-foreground">Total Beds</p>
                  <p className="mt-1 text-2xl font-bold">
                    {beds?.totalBeds ?? 0}
                  </p>
                </div>
                <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-4">
                  <p className="text-sm text-muted-foreground">Occupied Beds</p>
                  <p className="mt-1 text-2xl font-bold">
                    {beds?.occupiedBeds ?? 0}
                  </p>
                </div>
                <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-4">
                  <p className="text-sm text-muted-foreground">
                    Available Beds
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {beds?.availableBeds ?? 0}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle>Critical Stock Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {lowStockList.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-card/[0.02] p-4 text-sm text-muted-foreground">
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
                      <p className="font-medium">{item.medicineName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Branch: {item.branchName}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Stock: {item.stockQuantity} • Reorder:{" "}
                        {item.reorderLevel}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle>Drug Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {formatMoney(profitReport?.summary.revenue)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {profitReport?.summary.dispensedLines ?? 0} dispensed lines
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle>Drug Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {formatMoney(profitReport?.summary.cost)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Based on branch buying prices
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle>Gross Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {formatMoney(profitReport?.summary.grossProfit)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Pharmacy sales less buying cost
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle>Margin</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {Number(profitReport?.summary.marginPercent ?? 0).toFixed(1)}%
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Gross margin on dispensed drugs
                </p>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle>OTC Drug Sales</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      One-page pharmacy sales, payment mix, stock deduction, and
                      insurance claim position for the selected date range.
                    </p>
                  </div>
                  <Badge className="w-fit rounded-full border border-white/10 bg-card/[0.04] px-3 py-1 text-muted-foreground">
                    {otcReport?.summary.totalSales ?? 0} sales
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-4">
                    <p className="text-sm text-muted-foreground">Net OTC Sales</p>
                    <p className="mt-1 text-2xl font-bold">
                      {formatMoney(otcReport?.summary.netSales)}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-4">
                    <p className="text-sm text-muted-foreground">Collected</p>
                    <p className="mt-1 text-2xl font-bold">
                      {formatMoney(otcReport?.summary.paidAmount)}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-4">
                    <p className="text-sm text-muted-foreground">Balance</p>
                    <p className="mt-1 text-2xl font-bold">
                      {formatMoney(otcReport?.summary.outstandingBalance)}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-4">
                    <p className="text-sm text-muted-foreground">
                      Pending Insurance
                    </p>
                    <p className="mt-1 text-2xl font-bold">
                      {otcReport?.summary.pendingInsuranceSales ?? 0}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-4">
                    <p className="text-sm text-muted-foreground">Paid Sales</p>
                    <p className="mt-1 text-2xl font-bold">
                      {otcReport?.summary.paidSales ?? 0}
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-3">
                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-4">
                    <p className="font-semibold">Payments by Method</p>
                    <div className="mt-3 space-y-3">
                      {(otcReport?.paymentsByMethod ?? []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No OTC payments in this period.
                        </p>
                      ) : null}
                      {(otcReport?.paymentsByMethod ?? []).map((item) => (
                        <div
                          key={item.method}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span>{item.method.replace(/_/g, " ")}</span>
                          <span className="text-right font-semibold">
                            {formatMoney(item.amount)}
                            <span className="ml-2 text-muted-foreground">
                              ({item.count})
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-4">
                    <p className="font-semibold">Insurance Claims</p>
                    <div className="mt-3 space-y-3">
                      {(otcReport?.insuranceByStatus ?? []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No OTC insurance claim lines in this period.
                        </p>
                      ) : null}
                      {(otcReport?.insuranceByStatus ?? []).map((item) => (
                        <div
                          key={item.status}
                          className="rounded-[0.8rem] border border-white/10 bg-card/[0.03] p-3 text-sm"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {item.status.replace(/_/g, " ")}
                            </span>
                            <span>{item.count}</span>
                          </div>
                          <p className="mt-1 text-muted-foreground">
                            Covered {formatMoney(item.coveredAmount)} / Co-pay{" "}
                            {formatMoney(item.coPayAmount)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-4">
                    <p className="font-semibold">Top OTC Medicines</p>
                    <div className="mt-3 space-y-3">
                      {(otcReport?.topMedicines ?? []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No OTC medicine movement in this period.
                        </p>
                      ) : null}
                      {(otcReport?.topMedicines ?? []).slice(0, 8).map((item) => (
                        <div
                          key={item.medicineId}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="truncate">{item.medicineName}</span>
                          <span className="shrink-0 text-right font-semibold">
                            {item.quantity} / {formatMoney(item.revenue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="font-semibold">Recent OTC Sales</p>
                  {(otcReport?.recentSales ?? []).length === 0 ? (
                    <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-card/[0.02] p-4 text-sm text-muted-foreground">
                      No OTC sales found in this date range.
                    </div>
                  ) : null}
                  {(otcReport?.recentSales ?? []).slice(0, 8).map((sale) => (
                    <div
                      key={sale.id}
                      className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="font-semibold">{sale.saleNumber}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {sale.patientName ||
                              sale.customerName ||
                              "Walk-in customer"}{" "}
                            / {sale.branchName || "Branch"}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {sale.itemCount} item(s) /{" "}
                            {formatDate(sale.soldAt || sale.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            {formatMoney(sale.totalAmount)}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Paid {formatMoney(sale.paidAmount)} / Balance{" "}
                            {formatMoney(sale.balanceAmount)}
                          </p>
                          <Badge className="mt-2 rounded-full border px-3 py-1 border-white/10 bg-card/[0.04] text-muted-foreground">
                            {sale.paymentStatus.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle>Profit by Medicine</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(profitReport?.byMedicine ?? []).length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-card/[0.02] p-4 text-sm text-muted-foreground">
                    No dispensed drug profit data for this period.
                  </div>
                ) : (
                  profitReport?.byMedicine.slice(0, 12).map((item) => (
                    <div
                      key={`${item.branchId ?? "facility"}-${item.medicineId}`}
                      className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="font-semibold">{item.medicineName}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.branchName || "Facility-wide"} / Qty{" "}
                            {item.quantity}
                          </p>
                        </div>
                        <div className="grid gap-2 text-sm md:grid-cols-3 lg:min-w-[420px]">
                          <span>Revenue: {formatMoney(item.revenue)}</span>
                          <span>Cost: {formatMoney(item.cost)}</span>
                          <span className="font-semibold text-emerald-300">
                            Profit: {formatMoney(item.profit)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle>Module Work by Area</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {moduleChart.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No module data.
                  </p>
                ) : (
                  moduleChart.map((item) => (
                    <div key={item.moduleSlug} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{item.label}</span>
                        <span className="font-medium">{item.value}</span>
                      </div>
                      <div className="h-2 rounded-full bg-card/10">
                        <div
                          className="h-2 rounded-full bg-cyan-400"
                          style={{
                            width: barWidth(item.value, maxModuleValue),
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle>Module Work by Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {moduleStatusChart.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No status data.
                  </p>
                ) : (
                  moduleStatusChart.map((item) => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{item.label}</span>
                        <span className="font-medium">{item.value}</span>
                      </div>
                      <div className="h-2 rounded-full bg-card/10">
                        <div
                          className="h-2 rounded-full bg-emerald-400"
                          style={{
                            width: barWidth(item.value, maxModuleStatusValue),
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle>Module Totals</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-4">
                  <p className="text-sm text-muted-foreground">All Records</p>
                  <p className="mt-1 text-2xl font-bold">
                    {counts?.moduleRecords ?? 0}
                  </p>
                </div>
                <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-4">
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="mt-1 text-2xl font-bold">
                    {counts?.activeModuleRecords ?? 0}
                  </p>
                </div>
                <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-4">
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="mt-1 text-2xl font-bold">
                    {counts?.completedModuleRecords ?? 0}
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle>Recent Module Work</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentModuleRecords.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-card/[0.02] p-4 text-sm text-muted-foreground">
                    No module records found in this date range.
                  </div>
                ) : (
                  recentModuleRecords.map((record) => (
                    <div
                      key={record.id}
                      className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="font-semibold">{record.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {record.moduleTitle} / {record.recordNumber}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Stage: {record.workflowStage} / Updated:{" "}
                            {formatDate(record.updatedAt)}
                          </p>
                        </div>

                        <div className="text-right">
                          <Badge className="rounded-full border px-3 py-1 border-white/10 bg-card/[0.04] text-muted-foreground">
                            {record.statusCode}
                          </Badge>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {record.priorityCode}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </section>

          <section>
            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle>Recent Invoices</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentInvoices.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-card/[0.02] p-4 text-sm text-muted-foreground">
                    No invoices found in this date range.
                  </div>
                ) : (
                  recentInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="font-semibold">
                            {invoice.invoiceNumber}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {invoice.patientName}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Issued: {formatDate(invoice.issuedAt)}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-semibold">
                            {formatMoney(invoice.totalAmount)}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Balance: {formatMoney(invoice.balanceAmount)}
                          </p>
                          <Badge className="mt-2 rounded-full border px-3 py-1 border-white/10 bg-card/[0.04] text-muted-foreground">
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
