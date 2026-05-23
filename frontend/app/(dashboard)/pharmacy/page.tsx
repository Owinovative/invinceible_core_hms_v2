
"use client";

import * as React from "react";
import {
  ClipboardList,
  Loader2,
  PackageCheck,
  Pill,
  Search,
} from "lucide-react";

import { useScope } from "@/providers/scope-provider";
import { usePharmacyQueue } from "@/hooks/use-pharmacy-queue";
import { usePrescriptionById } from "@/hooks/use-prescription-by-id";
import { useDispensePrescription } from "@/hooks/use-dispense-prescription";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  PharmacyDispenseItem,
  PharmacyDispenseRecord,
  PharmacyPrescriptionItem,
} from "@/services/pharmacy-service";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function patientName(
  patient?:
    | {
        firstName?: string;
        middleName?: string | null;
        lastName?: string;
      }
    | null,
) {
  if (!patient) return "Unknown patient";
  return [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(" ");
}

function staffName(
  staff?:
    | {
        firstName?: string;
        lastName?: string;
        staffCode?: string;
      }
    | null,
) {
  if (!staff) return "—";
  const name = [staff.firstName, staff.lastName].filter(Boolean).join(" ");
  return name || staff.staffCode || "—";
}

function statusTone(status?: string | null) {
  switch ((status || "").toUpperCase()) {
    case "DISPENSED":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
    case "PARTIALLY_DISPENSED":
      return "border-amber-500/20 bg-amber-500/10 text-amber-300";
    case "PRESCRIBED":
      return "border-cyan-500/20 bg-cyan-500/10 text-cyan-300";
    default:
      return "border-white/10 bg-white/[0.04] text-muted-foreground";
  }
}

export default function PharmacyPage() {
  const { facilityName, selectedBranchName } = useScope();

  const { data, isLoading } = usePharmacyQueue();
  const dispensePrescriptionMutation = useDispensePrescription();

  const queue = Array.isArray(data) ? data : [];

  const [message, setMessage] = React.useState<string | null>(null);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = React.useState<
    number | null
  >(null);
  const [queueSearch, setQueueSearch] = React.useState("");
  const [queueStatus, setQueueStatus] = React.useState("OPEN");
  const [dispenseQuantities, setDispenseQuantities] = React.useState<
    Record<number, number>
  >({});

  React.useEffect(() => {
    if (!selectedPrescriptionId && queue.length > 0) {
      setSelectedPrescriptionId(queue[0].id);
    }
  }, [queue, selectedPrescriptionId]);

  const filteredQueue = React.useMemo(() => {
    const query = queueSearch.trim().toLowerCase();

    return queue.filter((item) => {
      const status = (item.statusCode || "").toUpperCase();
      if (queueStatus === "PRESCRIBED" && status !== "PRESCRIBED") {
        return false;
      }
      if (queueStatus === "PARTIAL" && status !== "PARTIALLY_DISPENSED") {
        return false;
      }
      if (!query) return true;

      const haystack = [
        item.prescriptionNumber,
        item.patient?.patientNumber,
        patientName(item.patient),
        item.branch?.name,
        item.items?.map((line) => line.medicine?.name).join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [queue, queueSearch, queueStatus]);

  const selectedQueueItem =
    filteredQueue.find((item) => item.id === selectedPrescriptionId) ??
    queue.find((item) => item.id === selectedPrescriptionId) ??
    null;

  const { data: prescriptionDetail, isLoading: detailLoading } =
    usePrescriptionById(selectedPrescriptionId);

  const prescription = prescriptionDetail ?? selectedQueueItem;
  const items: PharmacyPrescriptionItem[] = Array.isArray(prescription?.items)
    ? prescription.items
    : [];
  const dispenses: PharmacyDispenseRecord[] = Array.isArray(
    prescription?.dispenses,
  )
    ? prescription.dispenses
    : [];

  const dispensedByItemId = React.useMemo(() => {
    const map = new Map<number, number>();
    dispenses.forEach((dispense) => {
      (dispense.items ?? []).forEach((item) => {
        map.set(
          item.prescriptionItemId,
          (map.get(item.prescriptionItemId) ?? 0) + item.quantityDispensed,
        );
      });
    });
    return map;
  }, [dispenses]);

  React.useEffect(() => {
    const next: Record<number, number> = {};
    items.forEach((item) => {
      const dispensed = dispensedByItemId.get(item.id) ?? 0;
      const remaining = Math.max(0, item.quantity - dispensed);
      if (remaining > 0) next[item.id] = remaining;
    });
    setDispenseQuantities(next);
  }, [dispensedByItemId, items]);


  const totalQueue = queue.length;
  const totalPrescribed = queue.filter(
    (item) => (item.statusCode || "").toUpperCase() === "PRESCRIBED",
  ).length;
  const totalPartial = queue.filter(
    (item) => (item.statusCode || "").toUpperCase() === "PARTIALLY_DISPENSED",
  ).length;

  const handleDispense = async () => {
    if (!selectedPrescriptionId) return;

    setMessage(null);

    const payloadItems = items
      .map((item) => {
        const dispensed = dispensedByItemId.get(item.id) ?? 0;
        const remaining = Math.max(0, item.quantity - dispensed);
        const quantityDispensed = Math.min(
          Math.max(0, Number(dispenseQuantities[item.id] ?? 0)),
          remaining,
        );

        return {
          prescriptionItemId: item.id,
          medicineId: item.medicineId,
          quantityDispensed,
          notes: item.instructions || undefined,
        };
      })
      .filter((item) => item.quantityDispensed > 0);

    if (payloadItems.length === 0) {
      setMessage("Enter at least one quantity to dispense.");
      return;
    }

    await dispensePrescriptionMutation.mutateAsync({
      id: selectedPrescriptionId,
      payload: { items: payloadItems },
    });

    setMessage("Prescription dispensed successfully.");
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border gradient-border panel-shadow p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cyan-600/10 via-cyan-500/5 to-transparent" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <Badge className="rounded-full border-0 bg-cyan-600/10 px-3 py-1 text-cyan-700">
              Pharmacy Workspace
            </Badge>

            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10">
                <Pill className="h-7 w-7 text-primary" />
              </div>

              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Pharmacy Queue
                </h1>
                <p className="text-muted-foreground">
                  Review prescriptions, dispense medicines, and track dispense history
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

      {message ? (
        <div className="rounded-[1.4rem] border border-cyan-500/20 bg-cyan-500/8 px-4 py-4 text-sm text-cyan-300">
          {message}
        </div>
      ) : null}

      <section className="grid gap-6 md:grid-cols-3">
        <Card className="rounded-[1.6rem] gradient-border panel-shadow">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Queue</p>
              <p className="mt-2 text-2xl font-bold">{totalQueue}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <ClipboardList className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.6rem] gradient-border panel-shadow">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Prescribed</p>
              <p className="mt-2 text-2xl font-bold">{totalPrescribed}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Pill className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.6rem] gradient-border panel-shadow">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Partial</p>
              <p className="mt-2 text-2xl font-bold">{totalPartial}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <PackageCheck className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="rounded-[1.8rem] gradient-border panel-shadow">
          <CardHeader>
            <CardTitle>Prescription Queue</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="h-5 w-40 rounded bg-white/10" />
                  <div className="mt-3 h-4 w-56 rounded bg-white/10" />
                </div>
              ))
            ) : queue.length === 0 ? (
              <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-muted-foreground">
                No prescriptions are currently waiting in pharmacy queue.
              </div>
            ) : (
              <>
                <div className="grid gap-3 lg:grid-cols-[1fr_180px]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={queueSearch}
                      onChange={(event) => setQueueSearch(event.target.value)}
                      className="h-11 rounded-xl pl-10"
                      placeholder="Search patient, prescription, branch, or medicine"
                    />
                  </div>
                  <select
                    value={queueStatus}
                    onChange={(event) => setQueueStatus(event.target.value)}
                    className="h-11 rounded-xl border bg-background px-3 text-sm"
                  >
                    <option value="OPEN">All open</option>
                    <option value="PRESCRIBED">Prescribed</option>
                    <option value="PARTIAL">Partial</option>
                  </select>
                </div>

                {filteredQueue.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-muted-foreground">
                    No prescriptions match the current filter.
                  </div>
                ) : (
                  <div className="max-h-[620px] space-y-3 overflow-auto pr-1">
                    {filteredQueue.map((item) => {
                      const active = selectedPrescriptionId === item.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedPrescriptionId(item.id)}
                          className={cn(
                            "w-full rounded-[1.2rem] border p-4 text-left transition-all",
                            active
                              ? "border-cyan-400/40 bg-cyan-500/10"
                              : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]",
                          )}
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <p className="truncate font-semibold">
                                {item.prescriptionNumber}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {patientName(item.patient)}
                              </p>
                              <p className="mt-2 text-xs text-muted-foreground">
                                Prescribed: {formatDate(item.prescribedAt)}
                              </p>
                            </div>

                            <Badge
                              className={`rounded-full border px-3 py-1 ${statusTone(
                                item.statusCode,
                              )}`}
                            >
                              {item.statusCode}
                            </Badge>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[1.8rem] gradient-border panel-shadow">
          <CardHeader>
            <CardTitle>Prescription Details</CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            {!prescription ? (
              <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-muted-foreground">
                Select a prescription from the queue.
              </div>
            ) : detailLoading ? (
              <div className="text-sm text-muted-foreground">
                Loading prescription details...
              </div>
            ) : (
              <>
                <div className="rounded-[1.3rem] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold">{prescription.prescriptionNumber}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {patientName(prescription.patient)}
                      </p>
                    </div>

                    <Badge
                      className={`rounded-full border px-3 py-1 ${statusTone(
                        prescription.statusCode,
                      )}`}
                    >
                      {prescription.statusCode}
                    </Badge>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-xs text-muted-foreground">Patient Number</p>
                      <p className="mt-1 text-sm font-medium">
                        {prescription.patient?.patientNumber || "-"}
                      </p>
                    </div>

                    <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-xs text-muted-foreground">Prescriber</p>
                      <p className="mt-1 text-sm font-medium">
                        {staffName(prescription.prescribedBy)}
                      </p>
                    </div>

                    <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-xs text-muted-foreground">Prescribed At</p>
                      <p className="mt-1 text-sm font-medium">
                        {formatDate(prescription.prescribedAt)}
                      </p>
                    </div>

                    <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-xs text-muted-foreground">Dispensed At</p>
                      <p className="mt-1 text-sm font-medium">
                        {formatDate(prescription.dispensedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[1rem] border border-white/10 bg-black/10 p-3">
                    <p className="text-xs text-muted-foreground">Notes</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm font-medium">
                      {prescription.notes || "—"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold">Prescription Items</p>

                  {items.length === 0 ? (
                    <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-muted-foreground">
                      No prescription items found.
                    </div>
                  ) : (
                    items.map((item: PharmacyPrescriptionItem) => {
                      const alreadyDispensed = dispensedByItemId.get(item.id) ?? 0;
                      const remaining = Math.max(0, item.quantity - alreadyDispensed);
                      const canDispense = remaining > 0;

                      return (
                      <div
                        key={item.id}
                        className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="font-semibold">
                              {item.medicineNameSnapshot ||
                                item.medicine?.name ||
                                `Medicine #${item.medicineId}`}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {[item.dosage, item.route, item.frequency, item.duration]
                                .filter(Boolean)
                                .join(" / ") || "-"}
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground">
                              Prescribed: {item.quantity} / Dispensed: {alreadyDispensed} /
                              Remaining: {remaining}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Instructions: {item.instructions || "-"}
                            </p>
                          </div>

                          <div className="w-full max-w-[190px]">
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                              Dispense now
                            </label>
                            <Input
                              type="number"
                              min={0}
                              max={remaining}
                              value={dispenseQuantities[item.id] ?? 0}
                              disabled={!canDispense}
                              onChange={(event) => {
                                const next = Math.max(
                                  0,
                                  Math.min(
                                    remaining,
                                    Number(event.target.value || 0),
                                  ),
                                );
                                setDispenseQuantities((current) => ({
                                  ...current,
                                  [item.id]: next,
                                }));
                              }}
                              className="h-11 rounded-xl"
                            />
                          </div>

                          <Badge
                            className={`rounded-full border px-3 py-1 ${statusTone(
                              item.statusCode,
                            )}`}
                          >
                            {item.statusCode || "PRESCRIBED"}
                          </Badge>
                        </div>
                      </div>
                      );
                    })
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    className="h-12 rounded-2xl"
                    onClick={handleDispense}
                    disabled={
                      dispensePrescriptionMutation.isPending ||
                      (prescription.statusCode || "").toUpperCase() === "DISPENSED"
                    }
                  >
                    {dispensePrescriptionMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <PackageCheck className="mr-2 h-4 w-4" />
                    )}
                    {(prescription.statusCode || "").toUpperCase() === "DISPENSED"
                      ? "Already Dispensed"
                      : "Dispense Prescription"}
                  </Button>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold">Dispense History</p>

                  {dispenses.length === 0 ? (
                    <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-muted-foreground">
                      No dispense history yet.
                    </div>
                  ) : (
                    dispenses.map((dispense: PharmacyDispenseRecord) => (
                      <div
                        key={dispense.id}
                        className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="font-semibold">{dispense.dispenseNumber}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Dispensed by: {staffName(dispense.dispensedBy)}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Dispensed at: {formatDate(dispense.dispensedAt)}
                            </p>
                          </div>

                          <Badge
                            className={`rounded-full border px-3 py-1 ${statusTone(
                              dispense.statusCode,
                            )}`}
                          >
                            {dispense.statusCode}
                          </Badge>
                        </div>

                        <div className="mt-3 space-y-3">
                          {(dispense.items ?? []).map(
                            (dispenseItem: PharmacyDispenseItem) => (
                            <div
                              key={dispenseItem.id}
                              className="rounded-[1rem] border border-white/10 bg-black/10 p-3"
                            >
                              <p className="font-medium">
                                {dispenseItem.medicine?.name || "Medicine"}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                Dispensed: {dispenseItem.quantityDispensed} / Prescribed:{" "}
                                {dispenseItem.quantityPrescribed}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                Unit Price: {dispenseItem.unitPrice} • Line Total:{" "}
                                {dispenseItem.lineTotal}
                              </p>
                            </div>
                            ),
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
