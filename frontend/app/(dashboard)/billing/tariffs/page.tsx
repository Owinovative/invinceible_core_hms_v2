"use client";

import * as React from "react";
import { Banknote, Loader2, Save, ShieldCheck } from "lucide-react";

import { useScope } from "@/providers/scope-provider";
import { useServiceTariffs } from "@/hooks/use-service-tariffs";
import { useCreateServiceTariff } from "@/hooks/use-create-service-tariff";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
  const { data: tariffs = [], isLoading } = useServiceTariffs();
  const createTariffMutation = useCreateServiceTariff();

  const [message, setMessage] = React.useState<string | null>(null);
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("LAB");
  const [unitPrice, setUnitPrice] = React.useState("");
  const [billingServiceId, setBillingServiceId] = React.useState("");
  const [labTestId, setLabTestId] = React.useState("");
  const [wardId, setWardId] = React.useState("");
  const [bedId, setBedId] = React.useState("");
  const [notes, setNotes] = React.useState("");

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

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[1.4rem] border gradient-border p-6 panel-shadow md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-amber-500/14 via-cyan-500/8 to-transparent" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge className="mb-4 rounded-full border-0 bg-amber-500/10 px-3 py-1 text-amber-700 dark:text-amber-300">
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
            <span className="font-semibold">{tariffs.length}</span> active and
            inactive tariff records
          </div>
        </div>
      </section>

      {message ? (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-700 dark:text-cyan-200">
          {message}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="rounded-[1.2rem] gradient-border panel-shadow">
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
                  Lab Test ID
                </label>
                <Input
                  type="number"
                  value={labTestId}
                  onChange={(event) => setLabTestId(event.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Billing Service ID
                </label>
                <Input
                  type="number"
                  value={billingServiceId}
                  onChange={(event) => setBillingServiceId(event.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Ward ID</label>
                <Input
                  type="number"
                  value={wardId}
                  onChange={(event) => setWardId(event.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Bed ID</label>
                <Input
                  type="number"
                  value={bedId}
                  onChange={(event) => setBedId(event.target.value)}
                  className="h-12 rounded-xl"
                />
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

        <Card className="rounded-[1.2rem] gradient-border panel-shadow">
          <CardHeader>
            <CardTitle>Tariff Register</CardTitle>
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
                                ? "rounded-full border-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
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
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
