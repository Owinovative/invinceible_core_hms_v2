"use client";

import * as React from "react";
import {
  Banknote,
  Download,
  FileText,
  Loader2,
  Save,
  ShieldCheck,
  Upload,
} from "lucide-react";

import { useScope } from "@/providers/scope-provider";
import { useBeds } from "@/hooks/use-beds";
import { useBillingServices } from "@/hooks/use-billing-services";
import { useServiceTariffs } from "@/hooks/use-service-tariffs";
import { useCreateServiceTariff } from "@/hooks/use-create-service-tariff";
import { useImportServiceTariffPricing } from "@/hooks/use-import-service-tariff-pricing";
import { useLabTests } from "@/hooks/use-lab-tests";
import { useWards } from "@/hooks/use-wards";
import { getServiceTariffPricingTemplate } from "@/services/billing-service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { appSelectClass } from "@/lib/select-class";

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function optionalNumber(value: string) {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : undefined;
}

export default function BillingTariffsPage() {
  const { facilityId, selectedBranchId, facilityName, selectedBranchName } =
    useScope();
  const [tariffSearch, setTariffSearch] = React.useState("");
  const [tariffPage, setTariffPage] = React.useState(1);
  const tariffPageSize = 25;
  const deferredTariffSearch = React.useDeferredValue(tariffSearch);
  const { data: tariffData, isLoading } = useServiceTariffs({
    page: tariffPage,
    pageSize: tariffPageSize,
    search: deferredTariffSearch,
  });
  const { data: labTestsData = [] } = useLabTests();
  const { data: wardsData = [] } = useWards();
  const { data: bedsData = [] } = useBeds();
  const { data: billingServicesData = [] } = useBillingServices();
  const createTariffMutation = useCreateServiceTariff();
  const importTariffMutation = useImportServiceTariffPricing();

  const [message, setMessage] = React.useState<string | null>(null);
  const [isDownloadingTemplate, setIsDownloadingTemplate] =
    React.useState(false);
  const tariffFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("LAB");
  const [unitPrice, setUnitPrice] = React.useState("");
  const [billingServiceId, setBillingServiceId] = React.useState("");
  const [labTestId, setLabTestId] = React.useState("");
  const [labTestSearch, setLabTestSearch] = React.useState("");
  const [billingServiceSearch, setBillingServiceSearch] = React.useState("");
  const [wardId, setWardId] = React.useState("");
  const [bedId, setBedId] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const tariffs = tariffData?.data ?? [];
  const tariffMeta = tariffData?.meta;

  React.useEffect(() => {
    setTariffPage(1);
  }, [deferredTariffSearch]);

  const labTests = React.useMemo(
    () => (Array.isArray(labTestsData) ? labTestsData : []),
    [labTestsData],
  );
  const wards = React.useMemo(
    () => (Array.isArray(wardsData) ? wardsData : []),
    [wardsData],
  );
  const beds = React.useMemo(
    () => (Array.isArray(bedsData) ? bedsData : []),
    [bedsData],
  );
  const billingServices = React.useMemo(
    () => (Array.isArray(billingServicesData) ? billingServicesData : []),
    [billingServicesData],
  );

  const filteredLabTests = React.useMemo(() => {
    const query = labTestSearch.trim().toLowerCase();
    if (!query) return labTests.slice(0, 120);

    return labTests
      .filter((test) =>
        [test.testName, test.category, test.specimenType]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 120);
  }, [labTestSearch, labTests]);

  const filteredBillingServices = React.useMemo(() => {
    const query = billingServiceSearch.trim().toLowerCase();
    if (!query) return billingServices.slice(0, 120);

    return billingServices
      .filter((service) =>
        [service.name, service.code, service.category]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 120);
  }, [billingServiceSearch, billingServices]);

  const handleSelectLabTest = (value: string) => {
    setLabTestId(value);
    const selected = labTests.find((item) => String(item.id) === value);
    if (!selected) return;
    setCategory("LAB");
    setCode(`LAB_TEST_${selected.id}`);
    setName(selected.testName);
    setBillingServiceId("");
    setWardId("");
    setBedId("");
  };

  const handleSelectWard = (value: string) => {
    setWardId(value);
    const selected = wards.find((item) => String(item.id) === value);
    if (!selected) return;
    setCategory("IPD_BED");
    setCode(`WARD_${selected.id}`);
    setName(`${selected.name} bed-day`);
    setLabTestId("");
    setBillingServiceId("");
    setBedId("");
  };

  const handleSelectBed = (value: string) => {
    setBedId(value);
    const selected = beds.find((item) => String(item.id) === value);
    if (!selected) return;
    setCategory("IPD_BED");
    setCode(`BED_${selected.id}`);
    setName(`Bed ${selected.bedLabel || selected.bedNumber}`);
    setLabTestId("");
    setBillingServiceId("");
    setWardId(selected.wardId ? String(selected.wardId) : "");
  };

  const handleSelectBillingService = (value: string) => {
    setBillingServiceId(value);
    const selected = billingServices.find((item) => String(item.id) === value);
    if (!selected) return;
    setCategory(selected.category || "SERVICE");
    setCode(selected.code);
    setName(selected.name);
    setLabTestId("");
    setWardId("");
    setBedId("");
  };

  const handleCreateTariff = async () => {
    setMessage(null);

    if (!facilityId) {
      setMessage("A facility is required before a tariff can be saved.");
      return;
    }

    if (!code.trim() || !name.trim() || !unitPrice.trim()) {
      setMessage("Code, name, and price are required.");
      return;
    }

    try {
      await createTariffMutation.mutateAsync({
        code: code.trim(),
        name: name.trim(),
        category,
        facilityId,
        branchId: selectedBranchId,
        billingServiceId: optionalNumber(billingServiceId),
        labTestId: optionalNumber(labTestId),
        wardId: optionalNumber(wardId),
        bedId: optionalNumber(bedId),
        unitPrice: Number(unitPrice || 0),
        notes: notes.trim() || undefined,
      });

      setCode("");
      setName("");
      setUnitPrice("");
      setBillingServiceId("");
      setLabTestId("");
      setWardId("");
      setBedId("");
      setNotes("");
      setMessage("Tariff saved successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save tariff.",
      );
    }
  };

  const handleDownloadTemplate = async () => {
    setMessage(null);

    if (!facilityId) {
      setMessage("A facility is required before downloading a tariff template.");
      return;
    }

    try {
      setIsDownloadingTemplate(true);
      const template = await getServiceTariffPricingTemplate(
        facilityId,
        selectedBranchId,
      );
      const blob = new Blob([`\uFEFF${template.csvText}`], {
        type: "text/csv;charset=utf-8",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = template.fileName;
      link.click();
      window.URL.revokeObjectURL(url);
      setMessage(`Tariff template downloaded with ${template.rowCount} rows.`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to download tariff template.",
      );
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleImportTemplate = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setMessage(null);

    if (!facilityId) {
      setMessage("A facility is required before importing tariffs.");
      event.target.value = "";
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const csvText = await file.text();
      const result = await importTariffMutation.mutateAsync({
        facilityId,
        branchId: selectedBranchId,
        csvText,
      });
      setMessage(
        `Imported ${result.processed} tariffs: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to import tariff pricing.",
      );
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[1.4rem] border surface-spotlight p-6 shadow-md md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-amber-500/14 via-cyan-500/8 to-transparent" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge className="mb-4 rounded-full border-0 bg-amber-500/10 px-3 py-1 text-warning">
              Facility pricing
            </Badge>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-background/80">
                <Banknote className="h-7 w-7 text-amber-500" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Tariff Control
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {facilityName || "Facility"} /{" "}
                  {selectedBranchName || "Branch pricing"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-background/70 px-4 py-3 text-sm">
            <span className="font-semibold">
              {tariffMeta?.total ?? tariffs.length}
            </span>{" "}
            tariff records
          </div>
        </div>
      </section>

      {message ? (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-module">
          {message}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-4">
          <Card className="rounded-[1.2rem] surface-spotlight shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-cyan-500" />
                Branch Tariff Spreadsheet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border bg-background/65 p-4 text-sm text-muted-foreground">
                Download one pricing matrix for lab tests, billing services,
                bed charges, wards, and core clinical fees. Edit the prices in
                Excel, then import it back for this facility branch.
              </div>
              <input
                ref={tariffFileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleImportTemplate}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownloadTemplate}
                  disabled={!facilityId || isDownloadingTemplate}
                  className="h-12 rounded-xl"
                >
                  {isDownloadingTemplate ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download CSV
                </Button>
                <Button
                  type="button"
                  onClick={() => tariffFileInputRef.current?.click()}
                  disabled={!facilityId || importTariffMutation.isPending}
                  className="h-12 rounded-xl"
                >
                  {importTariffMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Import CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.2rem] surface-spotlight shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              New Tariff
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Category</label>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="h-12 w-full rounded-xl border bg-background px-3 text-sm"
                >
                  <option value="LAB">Lab</option>
                  <option value="IPD_BED">IPD bed</option>
                  <option value="SERVICE">Service</option>
                  <option value="RADIOLOGY">Radiology</option>
                  <option value="PROCEDURE">Procedure</option>
                  <option value="PHARMACY">Pharmacy</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Price</label>
                <Input
                  type="number"
                  value={unitPrice}
                  onChange={(event) => setUnitPrice(event.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Code</label>
              <Input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="h-12 rounded-xl"
                placeholder="LAB_TEST_1, WARD_2, BED_8"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Name</label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-12 rounded-xl"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Lab Test
                </label>
                <Input
                  value={labTestSearch}
                  onChange={(event) => setLabTestSearch(event.target.value)}
                  className="mb-2 h-12 rounded-xl"
                  placeholder="Search lab service name, specimen, or category"
                />
                <select
                  value={labTestId}
                  onChange={(event) => handleSelectLabTest(event.target.value)}
                  className={appSelectClass}
                >
                  <option value="">Select lab test</option>
                  {filteredLabTests.map((test) => (
                    <option key={test.id} value={String(test.id)}>
                      {test.testName}
                      {test.category ? ` / ${test.category}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Billing Service
                </label>
                <Input
                  value={billingServiceSearch}
                  onChange={(event) =>
                    setBillingServiceSearch(event.target.value)
                  }
                  className="mb-2 h-12 rounded-xl"
                  placeholder="Search service name, code, or category"
                />
                <select
                  value={billingServiceId}
                  onChange={(event) =>
                    handleSelectBillingService(event.target.value)
                  }
                  className={appSelectClass}
                >
                  <option value="">Select billing service</option>
                  {filteredBillingServices.map((service) => (
                    <option key={service.id} value={String(service.id)}>
                      {service.name} / {formatMoney(service.defaultPrice)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Ward</label>
                <select
                  value={wardId}
                  onChange={(event) => handleSelectWard(event.target.value)}
                  className={appSelectClass}
                >
                  <option value="">Select ward</option>
                  {wards.map((ward) => (
                    <option key={ward.id} value={String(ward.id)}>
                      {ward.name}
                      {ward.wardType ? ` / ${ward.wardType}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Bed</label>
                <select
                  value={bedId}
                  onChange={(event) => handleSelectBed(event.target.value)}
                  className={appSelectClass}
                >
                  <option value="">Select bed</option>
                  {beds.map((bed) => (
                    <option key={bed.id} value={String(bed.id)}>
                      {bed.bedNumber}
                      {bed.bedLabel ? ` / ${bed.bedLabel}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Notes</label>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="min-h-24 rounded-xl"
              />
            </div>

            <Button
              type="button"
              onClick={handleCreateTariff}
              disabled={createTariffMutation.isPending}
              className="h-12 w-full rounded-xl"
            >
              {createTariffMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Tariff
            </Button>
          </CardContent>
        </Card>
        </div>

        <Card className="rounded-[1.2rem] surface-spotlight shadow-md">
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle>Tariff Register</CardTitle>
              <Input
                value={tariffSearch}
                onChange={(event) => setTariffSearch(event.target.value)}
                placeholder="Search tariff code, name, service, lab, ward, bed"
                className="h-11 rounded-xl md:max-w-sm"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="rounded-xl border bg-background/60 p-4 text-sm text-muted-foreground">
                Loading tariffs...
              </div>
            ) : tariffs.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-background/60 p-4 text-sm text-muted-foreground">
                No tariffs found.
              </div>
            ) : (
              <div className="space-y-3">
                {tariffs.map((tariff) => (
                  <div
                    key={tariff.id}
                    className="rounded-xl border bg-background/65 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="rounded-full">
                            {tariff.category}
                          </Badge>
                          <Badge
                            className={
                              tariff.isActive
                                ? "rounded-full border-0 bg-success/10 text-success"
                                : "rounded-full border-0 bg-muted text-muted-foreground"
                            }
                          >
                            {tariff.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="mt-3 font-semibold">{tariff.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {tariff.code} /{" "}
                          {tariff.branch?.name || "Facility-wide"}
                        </p>
                        {tariff.notes ? (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {tariff.notes}
                          </p>
                        ) : null}
                      </div>
                      <p className="text-lg font-bold">
                        {formatMoney(tariff.unitPrice)}
                      </p>
                    </div>
                  </div>
                ))}
                {tariffMeta ? (
                  <div className="flex flex-col gap-3 rounded-xl border bg-background/70 p-3 text-sm md:flex-row md:items-center md:justify-between">
                    <span className="text-muted-foreground">
                      Page {tariffMeta.page} of {tariffMeta.totalPages} /
                      showing {tariffs.length} of {tariffMeta.total}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setTariffPage((current) => Math.max(1, current - 1))
                        }
                        disabled={tariffMeta.page <= 1 || isLoading}
                      >
                        Previous
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setTariffPage((current) => current + 1)
                        }
                        disabled={!tariffMeta.hasNextPage || isLoading}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
