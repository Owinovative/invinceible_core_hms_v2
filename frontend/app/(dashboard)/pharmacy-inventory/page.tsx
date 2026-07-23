"use client";

import * as React from "react";
import {
  AlertTriangle,
  Download,
  Package,
  RotateCcw,
  Warehouse,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { appSelectClass } from "@/lib/select-class";
import {
  useCreateMedicineReturn,
  useCreatePharmacyLocation,
  useInventoryDashboard,
  useInventoryBatches,
  useMedicineReturns,
  usePharmacyLocations,
  useReceiveMedicineBatch,
  useReviewMedicineReturn,
  useStockMovements,
} from "@/hooks/use-pharmacy-inventory";
import { usePharmacyMedicines } from "@/hooks/use-pharmacy-medicines";
import { usePatients } from "@/hooks/use-patients";
import { useScope } from "@/providers/scope-provider";
import { exportStockMovements } from "@/services/pharmacy-inventory-service";

export default function PharmacyInventoryPage() {
  const { facilityId, selectedBranchId } = useScope();
  const dashboard = useInventoryDashboard();
  const locations = usePharmacyLocations();
  const batches = useInventoryBatches();
  const movements = useStockMovements();
  const returns = useMedicineReturns();
  const medicines = usePharmacyMedicines();
  const patients = usePatients();
  const createLocation = useCreatePharmacyLocation();
  const receiveBatch = useReceiveMedicineBatch();
  const createReturn = useCreateMedicineReturn();
  const reviewReturn = useReviewMedicineReturn();
  const [message, setMessage] = React.useState<string | null>(null);
  const [location, setLocation] = React.useState({
    code: "",
    name: "",
    locationType: "MAIN",
  });
  const [batch, setBatch] = React.useState({
    pharmacyLocationId: "",
    medicineId: "",
    batchNumber: "",
    expiresAt: "",
    quantity: "",
    supplierName: "",
  });
  const [medicineReturn, setMedicineReturn] = React.useState({
    pharmacyLocationId: "",
    patientId: "",
    medicineId: "",
    quantityReturned: "",
    conditionCode: "SEALED",
    returnReason: "",
  });
  const [returnReviews, setReturnReviews] = React.useState<
    Record<
      number,
      {
        inspectionNotes: string;
        items: Record<
          number,
          {
            dispositionCode: "RESTOCK" | "WASTE" | "QUARANTINE";
            medicineBatchId: string;
            dispositionReason: string;
          }
        >;
      }
    >
  >({});
  const medicineRows = medicines.data ?? [];
  const patientRows = Array.isArray(patients.data) ? patients.data : [];

  const saveLocation = async () => {
    if (!facilityId || !selectedBranchId) {
      setMessage("Select a facility and branch first.");
      return;
    }
    await createLocation.mutateAsync({
      facilityId,
      branchId: selectedBranchId,
      ...location,
    });
    setLocation({ code: "", name: "", locationType: "MAIN" });
    setMessage("Pharmacy location created.");
  };

  const saveBatch = async () => {
    await receiveBatch.mutateAsync({
      pharmacyLocationId: Number(batch.pharmacyLocationId),
      medicineId: Number(batch.medicineId),
      batchNumber: batch.batchNumber,
      expiresAt: batch.expiresAt,
      quantity: Number(batch.quantity),
      supplierName: batch.supplierName || undefined,
    });
    setBatch({
      pharmacyLocationId: "",
      medicineId: "",
      batchNumber: "",
      expiresAt: "",
      quantity: "",
      supplierName: "",
    });
    setMessage("Medicine batch received and stock balances updated.");
  };

  const saveReturn = async () => {
    await createReturn.mutateAsync({
      pharmacyLocationId: Number(medicineReturn.pharmacyLocationId),
      patientId: Number(medicineReturn.patientId),
      returnReason: medicineReturn.returnReason,
      items: [
        {
          medicineId: Number(medicineReturn.medicineId),
          quantityReturned: Number(medicineReturn.quantityReturned),
          conditionCode: medicineReturn.conditionCode,
        },
      ],
    });
    setMedicineReturn({
      pharmacyLocationId: "",
      patientId: "",
      medicineId: "",
      quantityReturned: "",
      conditionCode: "SEALED",
      returnReason: "",
    });
    setMessage("Return recorded for pharmacist inspection.");
  };

  const reviewFor = (returnId: number) =>
    returnReviews[returnId] ?? { inspectionNotes: "", items: {} };

  const updateReturnReview = (
    returnId: number,
    updater: (
      review: ReturnType<typeof reviewFor>,
    ) => ReturnType<typeof reviewFor>,
  ) => {
    setReturnReviews((current) => ({
      ...current,
      [returnId]: updater(
        current[returnId] ?? { inspectionNotes: "", items: {} },
      ),
    }));
  };

  const submitReturnReview = async (
    medicineReturnRecord: NonNullable<typeof returns.data>[number],
  ) => {
    const review = reviewFor(medicineReturnRecord.id);
    const decisions = medicineReturnRecord.items.map((item) => {
      const decision = review.items[item.id] ?? {
        dispositionCode: "QUARANTINE" as const,
        medicineBatchId: "",
        dispositionReason: "",
      };
      return {
        itemId: item.id,
        dispositionCode: decision.dispositionCode,
        medicineBatchId:
          decision.dispositionCode === "RESTOCK"
            ? Number(decision.medicineBatchId || item.medicineBatch?.id)
            : undefined,
        dispositionReason: decision.dispositionReason || undefined,
      };
    });
    if (
      decisions.some(
        (decision) =>
          decision.dispositionCode === "RESTOCK" &&
          !decision.medicineBatchId,
      )
    ) {
      setMessage("Select a valid active batch for every restocked item.");
      return;
    }
    await reviewReturn.mutateAsync({
      returnId: medicineReturnRecord.id,
      payload: {
        inspectionNotes:
          review.inspectionNotes.trim() || "Inspected by pharmacy staff",
        items: decisions,
      },
    });
    setReturnReviews((current) => {
      const next = { ...current };
      delete next[medicineReturnRecord.id];
      return next;
    });
    setMessage(`Return ${medicineReturnRecord.returnNumber} reviewed.`);
  };

  const downloadDrugAudit = async () => {
    const report = await exportStockMovements();
    const blob = new Blob([report.csvText], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = report.fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const summary = dashboard.data?.summary;
  const summaryCards: Array<{
    label: string;
    value: number;
    icon: LucideIcon;
  }> = [
    { label: "Locations", value: summary?.locations ?? 0, icon: Warehouse },
    {
      label: "Active batches",
      value: summary?.activeBatches ?? 0,
      icon: Package,
    },
    {
      label: "Near expiry",
      value: summary?.nearExpiryBatches ?? 0,
      icon: AlertTriangle,
    },
    {
      label: "Expired",
      value: summary?.expiredBatches ?? 0,
      icon: AlertTriangle,
    },
    {
      label: "Dead stock",
      value: summary?.deadStockItems ?? 0,
      icon: RotateCcw,
    },
  ];
  return (
    <div className="space-y-6">
      <section className="surface-spotlight rounded-[2rem] border p-6 shadow-md">
        <Badge className="bg-primary/10 text-primary">Inventory control</Badge>
        <h1 className="mt-4 text-3xl font-bold">Batches, Expiry and Returns</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Separate pharmacy locations, batch-level expiry controls, dead stock,
          and inspected patient returns.
        </p>
      </section>
      {message ? (
        <div className="border border-primary/20 bg-primary/10 p-4 text-sm">
          {message}
        </div>
      ) : null}
      <section className="grid gap-3 md:grid-cols-5">
        {summaryCards.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <Icon className="h-5 w-5 text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </section>
      <section className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Create pharmacy location</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Code e.g. IPD" value={location.code} onChange={(event) => setLocation({ ...location, code: event.target.value })} />
            <Input placeholder="Name e.g. Inpatient Pharmacy" value={location.name} onChange={(event) => setLocation({ ...location, name: event.target.value })} />
            <select className={appSelectClass} value={location.locationType} onChange={(event) => setLocation({ ...location, locationType: event.target.value })}>
              <option value="MAIN">Main</option><option value="IPD">Inpatient</option><option value="EMERGENCY">Emergency</option>
            </select>
            <Button onClick={saveLocation} disabled={createLocation.isPending}>Create location</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Receive medicine batch</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <select className={appSelectClass} value={batch.pharmacyLocationId} onChange={(event) => setBatch({ ...batch, pharmacyLocationId: event.target.value })}>
              <option value="">Select location</option>
              {(locations.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select className={appSelectClass} value={batch.medicineId} onChange={(event) => setBatch({ ...batch, medicineId: event.target.value })}>
              <option value="">Select medicine</option>
              {medicineRows.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <Input placeholder="Batch number" value={batch.batchNumber} onChange={(event) => setBatch({ ...batch, batchNumber: event.target.value })} />
            <Input type="date" value={batch.expiresAt} onChange={(event) => setBatch({ ...batch, expiresAt: event.target.value })} />
            <Input type="number" min="1" placeholder="Quantity" value={batch.quantity} onChange={(event) => setBatch({ ...batch, quantity: event.target.value })} />
            <Input placeholder="Supplier" value={batch.supplierName} onChange={(event) => setBatch({ ...batch, supplierName: event.target.value })} />
            <Button onClick={saveBatch} disabled={receiveBatch.isPending}>Receive batch</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Record patient return</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <select className={appSelectClass} value={medicineReturn.pharmacyLocationId} onChange={(event) => setMedicineReturn({ ...medicineReturn, pharmacyLocationId: event.target.value })}>
              <option value="">Select receiving pharmacy</option>
              {(locations.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select className={appSelectClass} value={medicineReturn.patientId} onChange={(event) => setMedicineReturn({ ...medicineReturn, patientId: event.target.value })}>
              <option value="">Select patient</option>
              {patientRows.map((item) => <option key={item.id} value={item.id}>{item.patientNumber} — {item.firstName} {item.lastName}</option>)}
            </select>
            <select className={appSelectClass} value={medicineReturn.medicineId} onChange={(event) => setMedicineReturn({ ...medicineReturn, medicineId: event.target.value })}>
              <option value="">Select medicine</option>
              {medicineRows.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <Input type="number" min="1" placeholder="Quantity returned" value={medicineReturn.quantityReturned} onChange={(event) => setMedicineReturn({ ...medicineReturn, quantityReturned: event.target.value })} />
            <select className={appSelectClass} value={medicineReturn.conditionCode} onChange={(event) => setMedicineReturn({ ...medicineReturn, conditionCode: event.target.value })}>
              <option value="SEALED">Sealed</option><option value="UNOPENED">Unopened</option><option value="DAMAGED">Damaged</option><option value="CONTAMINATED">Contaminated</option>
            </select>
            <Input placeholder="Reason for return" value={medicineReturn.returnReason} onChange={(event) => setMedicineReturn({ ...medicineReturn, returnReason: event.target.value })} />
            <Button onClick={saveReturn} disabled={createReturn.isPending}>Submit for inspection</Button>
          </CardContent>
        </Card>
      </section>
      <Card>
        <CardHeader><CardTitle>Medicine return inspection</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(returns.data ?? []).map((item) => (
            <div key={item.id} className="space-y-4 border border-border p-4">
              <div className="flex flex-wrap justify-between gap-3">
                <div><p className="font-semibold">{item.returnNumber}</p><p className="text-sm text-muted-foreground">{item.patient.firstName} {item.patient.lastName} · {item.pharmacyLocation.name}</p></div>
                <Badge>{item.statusCode}</Badge>
              </div>
              {item.statusCode === "PENDING_INSPECTION" ? (
                <div className="space-y-3 border-t border-border pt-3">
                  {item.items.map((returnItem) => {
                    const decision = reviewFor(item.id).items[returnItem.id] ?? {
                      dispositionCode: "QUARANTINE",
                      medicineBatchId: String(returnItem.medicineBatch?.id ?? ""),
                      dispositionReason: "",
                    };
                    const matchingBatches = (batches.data ?? []).filter(
                      (candidate) =>
                        candidate.medicine.id === returnItem.medicine.id &&
                        candidate.pharmacyLocation.id === item.pharmacyLocation.id,
                    );
                    return (
                      <div key={returnItem.id} className="grid gap-2 lg:grid-cols-4">
                        <div className="text-sm">
                          <p className="font-medium">{returnItem.medicine.name}</p>
                          <p className="text-muted-foreground">
                            {returnItem.quantityReturned} returned · {returnItem.conditionCode}
                          </p>
                        </div>
                        <select
                          className={appSelectClass}
                          value={decision.dispositionCode}
                          onChange={(event) =>
                            updateReturnReview(item.id, (review) => ({
                              ...review,
                              items: {
                                ...review.items,
                                [returnItem.id]: {
                                  ...decision,
                                  dispositionCode: event.target.value as
                                    | "RESTOCK"
                                    | "WASTE"
                                    | "QUARANTINE",
                                },
                              },
                            }))
                          }
                        >
                          <option value="QUARANTINE">Quarantine</option>
                          <option value="RESTOCK">Restock</option>
                          <option value="WASTE">Waste</option>
                        </select>
                        <select
                          className={appSelectClass}
                          value={decision.medicineBatchId}
                          disabled={decision.dispositionCode !== "RESTOCK"}
                          onChange={(event) =>
                            updateReturnReview(item.id, (review) => ({
                              ...review,
                              items: {
                                ...review.items,
                                [returnItem.id]: {
                                  ...decision,
                                  medicineBatchId: event.target.value,
                                },
                              },
                            }))
                          }
                        >
                          <option value="">Select restock batch</option>
                          {matchingBatches.map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {candidate.batchNumber} · exp {new Date(candidate.expiresAt).toLocaleDateString()}
                            </option>
                          ))}
                        </select>
                        <Input
                          placeholder="Disposition reason"
                          value={decision.dispositionReason}
                          onChange={(event) =>
                            updateReturnReview(item.id, (review) => ({
                              ...review,
                              items: {
                                ...review.items,
                                [returnItem.id]: {
                                  ...decision,
                                  dispositionReason: event.target.value,
                                },
                              },
                            }))
                          }
                        />
                      </div>
                    );
                  })}
                  <div className="flex flex-col gap-2 md:flex-row">
                    <Input
                      placeholder="Inspection notes"
                      value={reviewFor(item.id).inspectionNotes}
                      onChange={(event) =>
                        updateReturnReview(item.id, (review) => ({
                          ...review,
                          inspectionNotes: event.target.value,
                        }))
                      }
                    />
                    <Button
                      onClick={() => submitReturnReview(item)}
                      disabled={reviewReturn.isPending}
                    >
                      Complete inspection
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
          {(returns.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No medicine returns recorded.</p> : null}
        </CardContent>
      </Card>
      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Expiry and slow-stock detail</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            {[...(dashboard.data?.expired ?? []), ...(dashboard.data?.nearExpiry ?? [])].map((item) => (
              <div key={item.id} className="flex justify-between gap-3 border-b border-border pb-2">
                <span>{item.medicine.name} · {item.batchNumber}</span>
                <span>{item.quantityAvailable} units · {new Date(item.expiresAt).toLocaleDateString()}</span>
              </div>
            ))}
            {(dashboard.data?.deadStock ?? []).map((item) => (
              <div key={`dead-${item.id}`} className="flex justify-between gap-3 border-b border-border pb-2">
                <span>{item.medicine.name} · {item.pharmacyLocation.name}</span>
                <Badge>Dead stock · {item.stockQuantity}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Drug movement audit</CardTitle>
              <Button variant="outline" onClick={downloadDrugAudit}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(movements.data ?? []).slice(0, 50).map((movement) => (
              <div key={movement.id} className="grid gap-1 border-b border-border pb-3 md:grid-cols-[1fr_auto]">
                <div>
                  <p className="font-medium">{movement.medicine.name} · {movement.movementType}</p>
                  <p className="text-muted-foreground">
                    {movement.pharmacyLocation?.name ?? "Legacy unallocated"} · {movement.sourceType}
                  </p>
                </div>
                <div className="text-right">
                  <p>{movement.quantity} units</p>
                  <p className="text-muted-foreground">{movement.stockBefore} → {movement.stockAfter}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
