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
  const [isDownloading, setIsDownloading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const activeTab = catalogTabs.find((item) => item.kind === activeKind)!;
  const ActiveIcon = activeTab.icon;
  const { data: overview } = useMasterCatalogOverview();
  const { data: rowsData = [], isLoading } = useMasterCatalogRows(activeKind);
  const importMutation = useImportMasterCatalogCsv(activeKind);
  const rows = Array.isArray(rowsData) ? rowsData : [];

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
        <div className="border border-cyan-400/15 bg-black/35 p-4 font-mono text-sm text-cyan-100/70">
          Loading catalog rows...
        </div>
      );
    }

    if (rows.length === 0) {
      return (
        <div className="border border-dashed border-cyan-400/20 bg-black/30 p-4 font-mono text-sm text-cyan-100/70">
          No master rows found in this catalog.
        </div>
      );
    }

    if (activeKind === "medicines") {
      const medicines = rows as PharmacyMedicine[];
      return (
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-cyan-400/10 font-mono text-xs uppercase text-cyan-100/70">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Drug</th>
              <th className="px-4 py-3">Form</th>
              <th className="px-4 py-3">Strength</th>
              <th className="px-4 py-3">Manufacturer</th>
              <th className="px-4 py-3">Default</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {medicines.slice(0, 120).map((medicine) => (
              <tr
                key={medicine.id}
                className="border-t border-cyan-400/10 transition hover:bg-cyan-400/5"
              >
                <td className="px-4 py-3 font-mono text-cyan-200">
                  {medicine.code || `MED-${medicine.id}`}
                </td>
                <td className="px-4 py-3 font-semibold text-white">
                  {medicine.name}
                </td>
                <td className="px-4 py-3 text-white/70">
                  {medicine.dosageForm || "-"}
                </td>
                <td className="px-4 py-3 text-white/70">
                  {medicine.strength || "-"}
                </td>
                <td className="px-4 py-3 text-white/70">
                  {medicine.manufacturer || "-"}
                </td>
                <td className="px-4 py-3 text-white/80">
                  {formatMoney(medicine.unitPrice)}
                </td>
                <td className="px-4 py-3">
                  <Badge className="rounded border-0 bg-emerald-500/10 font-mono text-emerald-200">
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
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-cyan-400/10 font-mono text-xs uppercase text-cyan-100/70">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Default</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {services.slice(0, 120).map((service) => (
              <tr
                key={service.id}
                className="border-t border-cyan-400/10 transition hover:bg-cyan-400/5"
              >
                <td className="px-4 py-3 font-mono text-cyan-200">
                  {service.code}
                </td>
                <td className="px-4 py-3 font-semibold text-white">
                  {service.name}
                </td>
                <td className="px-4 py-3 text-white/70">
                  {service.category || "SERVICE"}
                </td>
                <td className="px-4 py-3 text-white/80">
                  {formatMoney(service.defaultPrice)}
                </td>
                <td className="px-4 py-3">
                  <Badge className="rounded border-0 bg-emerald-500/10 font-mono text-emerald-200">
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
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-cyan-400/10 font-mono text-xs uppercase text-cyan-100/70">
          <tr>
            <th className="px-4 py-3">Test</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Specimen</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {labTests.slice(0, 120).map((test) => (
            <tr
              key={test.id}
              className="border-t border-cyan-400/10 transition hover:bg-cyan-400/5"
            >
              <td className="px-4 py-3 font-semibold text-white">
                {test.testName}
              </td>
              <td className="px-4 py-3 text-white/70">
                {test.category || "-"}
              </td>
              <td className="px-4 py-3 text-white/70">
                {test.specimenType || "-"}
              </td>
              <td className="px-4 py-3">
                <Badge className="rounded border-0 bg-emerald-500/10 font-mono text-emerald-200">
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
    <div className="space-y-5 text-white">
      <section className="relative overflow-hidden rounded-lg border border-cyan-400/20 bg-[#020617] p-6 shadow-2xl shadow-cyan-950/40 md:p-8">
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,rgba(34,211,238,.16)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,185,129,.1)_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-cyan-300" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <Badge className="rounded border border-cyan-400/30 bg-cyan-400/10 font-mono text-cyan-100">
              platform.catalogs/write-enabled
            </Badge>
            <div className="mt-5 flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-md border border-cyan-400/20 bg-cyan-400/10">
                <DatabaseZap className="h-7 w-7 text-cyan-200" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
                  Master Catalog Command
                </h1>
                <p className="mt-3 max-w-3xl font-mono text-sm leading-7 text-cyan-100/65">
                  Platform owns the master lists. Facilities own branch prices,
                  stock, consultation fees, lab fees, and bed-day tariffs.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[560px]">
            <div className="border border-cyan-400/15 bg-black/35 p-4">
              <p className="font-mono text-xs uppercase text-cyan-100/50">
                Drugs
              </p>
              <p className="mt-2 text-2xl font-bold">
                {overview?.medicines.total ?? "-"}
              </p>
            </div>
            <div className="border border-cyan-400/15 bg-black/35 p-4">
              <p className="font-mono text-xs uppercase text-cyan-100/50">
                Services
              </p>
              <p className="mt-2 text-2xl font-bold">
                {overview?.billingServices.total ?? "-"}
              </p>
            </div>
            <div className="border border-cyan-400/15 bg-black/35 p-4">
              <p className="font-mono text-xs uppercase text-cyan-100/50">
                Lab Tests
              </p>
              <p className="mt-2 text-2xl font-bold">
                {overview?.labTests.total ?? "-"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {message ? (
        <div className="border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 font-mono text-sm text-cyan-100">
          {message}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[0.78fr_1.22fr]">
        <div className="space-y-4">
          <div className="border border-cyan-400/15 bg-[#03111f] p-4">
            <div className="mb-4 flex items-center gap-3">
              <ActiveIcon className="h-5 w-5 text-cyan-200" />
              <div>
                <p className="font-semibold">{activeTab.title}</p>
                <p className="font-mono text-xs text-cyan-100/50">
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
                    }}
                    className={`flex items-center justify-between border px-4 py-3 text-left transition ${
                      active
                        ? "border-cyan-300 bg-cyan-300/12 text-cyan-50"
                        : "border-cyan-400/10 bg-black/25 text-cyan-100/65 hover:border-cyan-300/50 hover:text-cyan-50"
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

          <div className="border border-cyan-400/15 bg-[#03111f] p-4">
            <div className="mb-4 flex items-center gap-3">
              <ServerCog className="h-5 w-5 text-emerald-300" />
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
                className="h-12 rounded-md border-cyan-400/25 bg-black/20 font-mono text-cyan-100 hover:bg-cyan-400/10"
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
                className="h-12 rounded-md bg-cyan-300 font-mono text-slate-950 hover:bg-cyan-200"
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
              <div className="mt-4 border border-amber-400/25 bg-amber-400/10 p-3 font-mono text-xs text-amber-100">
                {importMutation.data.errors.slice(0, 5).map((error) => (
                  <p key={`${error.row}-${error.message}`}>
                    row {error.row}: {error.message}
                  </p>
                ))}
              </div>
            ) : null}
          </div>

          <div className="border border-emerald-400/15 bg-[#03111f] p-4">
            <div className="mb-4 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-300" />
              <h2 className="font-semibold">Facility Pricing Gates</h2>
            </div>
            <div className="space-y-2">
              <Link
                href="/pharmacy-pricing"
                className="flex items-center justify-between border border-emerald-400/10 bg-black/25 px-4 py-3 font-mono text-sm text-emerald-100/75 hover:border-emerald-300/50"
              >
                Pharmacy branch prices and stock
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/billing/tariffs"
                className="flex items-center justify-between border border-emerald-400/10 bg-black/25 px-4 py-3 font-mono text-sm text-emerald-100/75 hover:border-emerald-300/50"
              >
                Lab, consultation, bed and service tariffs
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="border border-cyan-400/15 bg-[#03111f]">
          <div className="flex flex-col gap-3 border-b border-cyan-400/10 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-semibold">{activeTab.label} Register</p>
              <p className="font-mono text-xs text-cyan-100/50">
                showing {Math.min(rows.length, 120)} of {rows.length} rows
              </p>
            </div>
            <Badge className="rounded border-0 bg-cyan-400/10 font-mono text-cyan-100">
              csv.sync
            </Badge>
          </div>
          <div className="overflow-x-auto">{renderRows()}</div>
        </div>
      </section>
    </div>
  );
}
