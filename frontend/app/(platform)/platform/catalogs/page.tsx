"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  DatabaseZap,
  Download,
  FlaskConical,
  Loader2,
  Pill,
  ReceiptText,
  Search,
  ServerCog,
  ShieldCheck,
  Upload,
} from "lucide-react";

import {
  useImportMasterCatalogCsv,
  useMasterCatalogOverview,
  useMasterCatalogRows,
} from "@/hooks/use-master-catalog";
import {
  getMasterCatalogTemplate,
  type MasterCatalogKind,
} from "@/services/master-catalog-service";
import type { BillingServiceItem } from "@/services/billing-service";
import type { LabTestCatalogItem } from "@/services/lab-service";
import type { PharmacyMedicine } from "@/services/pharmacy-service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const catalogTabs: Array<{
  kind: MasterCatalogKind;
  label: string;
  title: string;
  icon: typeof Pill;
  signal: string;
}> = [
  {
    kind: "medicines",
    label: "Master Drugs",
    title: "Medicine kernel",
    icon: Pill,
    signal: "drug.catalog",
  },
  {
    kind: "billing-services",
    label: "Services",
    title: "Billing service kernel",
    icon: ReceiptText,
    signal: "charge.catalog",
  },
  {
    kind: "lab-tests",
    label: "Lab Tests",
    title: "Laboratory test kernel",
    icon: FlaskConical,
    signal: "lab.catalog",
  },
];

function boolLabel(value?: boolean | null) {
  return value === false ? "Inactive" : "Active";
}

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function PlatformCatalogsPage() {
  const [activeKind, setActiveKind] =
    React.useState<MasterCatalogKind>("medicines");
  const [message, setMessage] = React.useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = React.useState("");
  const [debouncedCatalogSearch, setDebouncedCatalogSearch] =
    React.useState("");
  const [page, setPage] = React.useState(1);
  const pageSize = 50;
  const [isDownloading, setIsDownloading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const activeTab = catalogTabs.find((item) => item.kind === activeKind)!;
  const ActiveIcon = activeTab.icon;
  const { data: overview } = useMasterCatalogOverview();
  const {
    data: rowsData,
    isLoading,
    isFetching,
    isError,
    error,
  } = useMasterCatalogRows(activeKind, {
    page,
    pageSize,
    search: debouncedCatalogSearch,
  });
  const importMutation = useImportMasterCatalogCsv(activeKind);
  const rows = rowsData?.data ?? [];
  const meta = rowsData?.meta;

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedCatalogSearch(catalogSearch.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(handle);
  }, [catalogSearch]);

  const handleDownload = async () => {
    setMessage(null);

    try {
      setIsDownloading(true);
      const template = await getMasterCatalogTemplate(activeKind);
      const blob = new Blob([`\uFEFF${template.csvText}`], {
        type: "text/csv;charset=utf-8",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = template.fileName;
      link.click();
      window.URL.revokeObjectURL(url);
      setMessage(
        `${template.fileName} downloaded with ${template.rowCount} rows.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to download the master CSV.",
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(null);
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const csvText = await file.text();
      const result = await importMutation.mutateAsync(csvText);
      setMessage(
        `CSV applied: ${result.processed} processed, ${result.created} created, ${result.updated} updated, ${result.skipped} skipped.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to import the master CSV.",
      );
    } finally {
      event.target.value = "";
    }
  };

  const renderRows = () => {
    if (isLoading) {
      return (
        <div className="border border-border bg-surface-2 p-4 text-sm text-muted-foreground">
          Loading catalog rows...
        </div>
      );
    }

    if (isError) {
      return (
        <div className="border border-destructive/25 bg-destructive-soft p-4 text-sm text-destructive">
          {error instanceof Error
            ? error.message
            : "Unable to load this catalog page."}
        </div>
      );
    }

    if (rows.length === 0) {
      return (
        <div className="border border-dashed border-border bg-surface-2 p-4 text-sm text-muted-foreground">
          No matching master rows found in this catalog.
        </div>
      );
    }

    if (activeKind === "medicines") {
      const medicines = rows as PharmacyMedicine[];
      return (
        <table className="w-full min-w-[820px] table-fixed text-left text-sm">
          <thead className="sticky top-0 z-10 bg-accent text-xs uppercase text-foreground">
            <tr>
              <th className="w-[120px] px-3 py-3">Code</th>
              <th className="px-3 py-3">Drug</th>
              <th className="w-[130px] px-3 py-3">Form</th>
              <th className="w-[130px] px-3 py-3">Strength</th>
              <th className="w-[150px] px-3 py-3">Manufacturer</th>
              <th className="w-[110px] px-3 py-3">Default</th>
              <th className="w-[100px] px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {medicines.map((medicine) => (
              <tr
                key={medicine.id}
                className="border-t border-cyan-400/10 transition hover:bg-cyan-400/5"
              >
                <td className="truncate px-3 py-2 font-mono text-module">
                  {medicine.code || `MED-${medicine.id}`}
                </td>
                <td className="truncate px-3 py-2 font-semibold text-foreground">
                  {medicine.name}
                </td>
                <td className="truncate px-3 py-2 text-muted-foreground">
                  {medicine.dosageForm || "-"}
                </td>
                <td className="truncate px-3 py-2 text-muted-foreground">
                  {medicine.strength || "-"}
                </td>
                <td className="truncate px-3 py-2 text-muted-foreground">
                  {medicine.manufacturer || "-"}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {formatMoney(medicine.unitPrice)}
                </td>
                <td className="px-3 py-2">
                  <Badge className="rounded border-0 bg-success-soft font-mono text-success">
                    {boolLabel(medicine.isActive)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (activeKind === "billing-services") {
      const services = rows as BillingServiceItem[];
      return (
        <table className="w-full min-w-[720px] table-fixed text-left text-sm">
          <thead className="sticky top-0 z-10 bg-accent text-xs uppercase text-foreground">
            <tr>
              <th className="w-[130px] px-3 py-3">Code</th>
              <th className="px-3 py-3">Service</th>
              <th className="w-[150px] px-3 py-3">Category</th>
              <th className="w-[120px] px-3 py-3">Default</th>
              <th className="w-[100px] px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr
                key={service.id}
                className="border-t border-cyan-400/10 transition hover:bg-cyan-400/5"
              >
                <td className="truncate px-3 py-2 font-mono text-module">
                  {service.code}
                </td>
                <td className="truncate px-3 py-2 font-semibold text-foreground">
                  {service.name}
                </td>
                <td className="truncate px-3 py-2 text-muted-foreground">
                  {service.category || "SERVICE"}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {formatMoney(service.defaultPrice)}
                </td>
                <td className="px-3 py-2">
                  <Badge className="rounded border-0 bg-success-soft font-mono text-success">
                    {boolLabel(service.isActive)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    const labTests = rows as LabTestCatalogItem[];
    return (
      <table className="w-full min-w-[620px] table-fixed text-left text-sm">
        <thead className="sticky top-0 z-10 bg-accent text-xs uppercase text-foreground">
          <tr>
            <th className="px-3 py-3">Test</th>
            <th className="w-[170px] px-3 py-3">Category</th>
            <th className="w-[160px] px-3 py-3">Specimen</th>
            <th className="w-[100px] px-3 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {labTests.map((test) => (
            <tr
              key={test.id}
              className="border-t border-cyan-400/10 transition hover:bg-cyan-400/5"
            >
              <td className="truncate px-3 py-2 font-semibold text-foreground">
                {test.testName}
              </td>
              <td className="truncate px-3 py-2 text-muted-foreground">
                {test.category || "-"}
              </td>
              <td className="truncate px-3 py-2 text-muted-foreground">
                {test.specimenType || "-"}
              </td>
              <td className="px-3 py-2">
                <Badge className="rounded border-0 bg-success-soft font-mono text-success">
                  {boolLabel(test.isActive)}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="space-y-5 text-foreground">
      <section className="relative overflow-hidden rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1 bg-primary" />
        <div className="relative flex flex-col gap-5 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div>
            <Badge className="rounded border border-border bg-surface-2 text-module">
              platform.catalogs/write-enabled
            </Badge>
            <div className="mt-4 flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border bg-surface-2">
                <DatabaseZap className="h-6 w-6 text-module" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                  Master Catalog Command
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  Platform owns the master lists. Facilities own branch prices,
                  stock, consultation fees, lab fees, and bed-day tariffs.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 2xl:w-[520px]">
            <div className="border border-border bg-surface-2 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Drugs
              </p>
              <p className="mt-1 text-2xl font-bold">
                {overview?.medicines.total ?? "-"}
              </p>
            </div>
            <div className="border border-border bg-surface-2 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Services
              </p>
              <p className="mt-1 text-2xl font-bold">
                {overview?.billingServices.total ?? "-"}
              </p>
            </div>
            <div className="border border-border bg-surface-2 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Lab Tests
              </p>
              <p className="mt-1 text-2xl font-bold">
                {overview?.labTests.total ?? "-"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {message ? (
        <div className="border border-border bg-surface-2 px-4 py-3 text-sm text-module">
          {message}
        </div>
      ) : null}

      <section className="grid gap-4 2xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="border border-border bg-card p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <ActiveIcon className="h-5 w-5 text-module" />
              <div>
                <p className="font-semibold">{activeTab.title}</p>
                <p className="text-xs text-muted-foreground">
                  {activeTab.signal}
                </p>
              </div>
            </div>

            <div className="grid gap-2">
              {catalogTabs.map((item) => {
                const Icon = item.icon;
                const active = item.kind === activeKind;
                return (
                  <button
                    key={item.kind}
                    type="button"
                    onClick={() => {
                      setActiveKind(item.kind);
                      setMessage(null);
                      setCatalogSearch("");
                      setDebouncedCatalogSearch("");
                      setPage(1);
                    }}
                    className={`flex items-center justify-between border px-4 py-3 text-left transition ${
                      active
                        ? "border-border-strong bg-surface-2 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      <span className="font-mono text-sm">{item.label}</span>
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border border-border bg-card p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <ServerCog className="h-5 w-5 text-success" />
              <h2 className="font-semibold">CSV Operation</h2>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleImport}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleDownload}
                disabled={isDownloading}
                className="h-12 rounded-md border-border-strong bg-card text-module hover:bg-surface-2"
              >
                {isDownloading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download CSV
              </Button>
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={importMutation.isPending}
                className="h-12 rounded-md bg-primary text-white hover:bg-brand-strong"
              >
                {importMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Import CSV
              </Button>
            </div>

            {importMutation.data?.errors?.length ? (
              <div className="mt-4 border border-warning/30 bg-warning-soft p-3 font-mono text-xs text-warning">
                {importMutation.data.errors.slice(0, 5).map((error) => (
                  <p key={`${error.row}-${error.message}`}>
                    row {error.row}: {error.message}
                  </p>
                ))}
              </div>
            ) : null}
          </div>

          <div className="border border-border bg-card p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-success" />
              <h2 className="font-semibold">Facility Pricing Gates</h2>
            </div>
            <div className="space-y-2">
              <Link
                href="/pharmacy-pricing"
                className="flex items-center justify-between border border-border bg-surface-2 px-4 py-3 text-sm text-foreground hover:border-border-strong"
              >
                Pharmacy branch prices and stock
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/billing/tariffs"
                className="flex items-center justify-between border border-border bg-surface-2 px-4 py-3 text-sm text-foreground hover:border-border-strong"
              >
                Lab, consultation, bed and service tariffs
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="min-w-0 border border-border bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b border-cyan-400/10 p-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="font-semibold">{activeTab.label} Register</p>
              <p className="text-xs text-muted-foreground">
                showing {rows.length} of {meta?.total ?? 0} rows
                {isFetching && !isLoading ? " - refreshing" : ""}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-[320px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
                <Input
                  value={catalogSearch}
                  onChange={(event) => setCatalogSearch(event.target.value)}
                  className="h-11 rounded-md border-border bg-card pl-9"
                  placeholder={
                    activeKind === "medicines"
                      ? "Search drugs"
                      : activeKind === "lab-tests"
                        ? "Search lab services"
                        : "Search services"
                  }
                />
              </div>
              <Badge className="rounded border-0 bg-accent text-module">
                csv.sync
              </Badge>
            </div>
          </div>
          <div className="max-h-[620px] overflow-auto">{renderRows()}</div>
          <div className="flex flex-col gap-3 border-t border-border p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              Page {meta?.page ?? page} of {meta?.totalPages ?? 1} -{" "}
              {meta?.pageSize ?? pageSize} per page
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={(meta?.page ?? page) <= 1 || isFetching}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-md border-border-strong bg-card text-module hover:bg-surface-2"
              >
                Previous
              </Button>
              <Button
                type="button"
                disabled={!meta?.hasNextPage || isFetching}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-md bg-primary text-white hover:bg-brand-strong"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
