"use client";

import * as React from "react";
import {
  ClipboardList,
  Loader2,
  PackageCheck,
  Pill,
  Search,
  Activity,
  User,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock
} from "lucide-react";

import { useScope } from "@/providers/scope-provider";
import { usePharmacyQueue } from "@/hooks/use-pharmacy-queue";
import { usePrescriptionById } from "@/hooks/use-prescription-by-id";
import { useDispensePrescription } from "@/hooks/use-dispense-prescription";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  PharmacyDispenseItem,
  PharmacyDispenseRecord,
  PharmacyPrescriptionItem,
} from "@/services/pharmacy-service";

// --- Minimalist Formatters ---
function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) 
    ? "—" 
    : new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
}

function patientName(patient?: { firstName?: string; middleName?: string | null; lastName?: string } | null) {
  if (!patient) return "Unknown Patient";
  return [patient.firstName, patient.lastName].filter(Boolean).join(" ");
}

function staffName(staff?: { firstName?: string; lastName?: string; staffCode?: string } | null) {
  if (!staff) return "—";
  return [staff.firstName, staff.lastName].filter(Boolean).join(" ") || staff.staffCode || "—";
}

function statusTone(status?: string | null) {
  switch ((status || "").toUpperCase()) {
    case "DISPENSED": return "border-success/25 bg-success-soft text-success";
    case "PARTIALLY_DISPENSED": return "border-warning/30 bg-warning-soft text-warning";
    case "PRESCRIBED": return "border-border bg-cyan-50 text-module";
    default: return "border-border bg-surface-2 text-muted-foreground";
  }
}

export default function PharmacyPage() {
  const { data, isLoading } = usePharmacyQueue();
  const dispensePrescriptionMutation = useDispensePrescription();
  const queue = Array.isArray(data) ? data : [];

  const [message, setMessage] = React.useState<string | null>(null);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = React.useState<number | null>(null);
  const [queueSearch, setQueueSearch] = React.useState("");
  const [queueStatus, setQueueStatus] = React.useState("OPEN");
  const [dispenseQuantities, setDispenseQuantities] = React.useState<Record<number, number>>({});

  React.useEffect(() => {
    if (!selectedPrescriptionId && queue.length > 0) {
      setSelectedPrescriptionId(queue[0].id);
    }
  }, [queue, selectedPrescriptionId]);

  const filteredQueue = React.useMemo(() => {
    const query = queueSearch.trim().toLowerCase();
    return queue.filter((item) => {
      const status = (item.statusCode || "").toUpperCase();
      if (queueStatus === "PRESCRIBED" && status !== "PRESCRIBED") return false;
      if (queueStatus === "PARTIAL" && status !== "PARTIALLY_DISPENSED") return false;
      if (!query) return true;

      return [
        item.prescriptionNumber,
        item.patient?.patientNumber,
        patientName(item.patient),
        item.items?.map((line) => line.medicine?.name).join(" "),
      ].filter(Boolean).join(" ").toLowerCase().includes(query);
    });
  }, [queue, queueSearch, queueStatus]);

  const selectedQueueItem = filteredQueue.find((i) => i.id === selectedPrescriptionId) ?? queue.find((i) => i.id === selectedPrescriptionId) ?? null;
  const { data: prescriptionDetail, isLoading: detailLoading } = usePrescriptionById(selectedPrescriptionId);

  const prescription = prescriptionDetail ?? selectedQueueItem;
  const items: PharmacyPrescriptionItem[] = Array.isArray(prescription?.items) ? prescription.items : [];
  const dispenses: PharmacyDispenseRecord[] = Array.isArray(prescription?.dispenses) ? prescription.dispenses : [];

  const dispensedByItemId = React.useMemo(() => {
    const map = new Map<number, number>();
    dispenses.forEach((dispense) => {
      (dispense.items ?? []).forEach((item) => {
        map.set(item.prescriptionItemId, (map.get(item.prescriptionItemId) ?? 0) + item.quantityDispensed);
      });
    });
    return map;
  }, [dispenses]);

  React.useEffect(() => {
    if (!prescription?.id) return;
    const next: Record<number, number> = {};
    items.forEach((item) => {
      const dispensed = dispensedByItemId.get(item.id) ?? 0;
      const remaining = Math.max(0, item.quantity - dispensed);
      if (remaining > 0) next[item.id] = remaining;
    });
    setDispenseQuantities(next);
  }, [selectedPrescriptionId, items.length]);

  const totalQueue = queue.length;
  const totalPrescribed = queue.filter((i) => (i.statusCode || "").toUpperCase() === "PRESCRIBED").length;
  const totalPartial = queue.filter((i) => (i.statusCode || "").toUpperCase() === "PARTIALLY_DISPENSED").length;

  const handleDispense = async () => {
    if (!selectedPrescriptionId) return;
    setMessage(null);

    const payloadItems = items.map((item) => {
      const dispensed = dispensedByItemId.get(item.id) ?? 0;
      const remaining = Math.max(0, item.quantity - dispensed);
      const quantityDispensed = Math.min(Math.max(0, Number(dispenseQuantities[item.id] ?? 0)), remaining);

      return {
        prescriptionItemId: item.id,
        medicineId: item.medicineId,
        quantityDispensed,
        notes: item.instructions || undefined,
      };
    }).filter((item) => item.quantityDispensed > 0);

    if (payloadItems.length === 0) {
      setMessage("Enter a quantity to dispense.");
      return;
    }

    await dispensePrescriptionMutation.mutateAsync({
      id: selectedPrescriptionId,
      payload: { items: payloadItems },
    });

    setMessage("Dispensed successfully.");
  };

  return (
    <div className="flex flex-col gap-6 animate-enter pb-12">
      
      {/* --- PREMIUM KPI SUMMARY BAR --- */}
      <div className="flex items-end justify-between px-2">
        <div className="flex gap-10">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-subtle">Live Orders</p>
            <p className="text-3xl font-black tracking-tight text-foreground">{totalQueue}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-subtle">Unprocessed</p>
            <p className="text-3xl font-black tracking-tight text-module">{totalPrescribed}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-subtle">Partials</p>
            <p className="text-3xl font-black tracking-tight text-warning">{totalPartial}</p>
          </div>
        </div>
        
        {message && (
          <div className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-lg flex items-center gap-2 border border-white/10 animate-enter">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> {message}
          </div>
        )}
      </div>

      {/* --- VERTICALLY STACKED WORKSPACE --- */}
      <div className="flex flex-col gap-8">
        
        {/* UPPER PANEL: ARCHITECTURAL QUEUE MONITOR */}
        <div className="flex flex-col rounded-[2rem] bg-card/85 backdrop-blur-md shadow-md overflow-hidden max-h-[350px] shrink-0 border border-white/60">
          <div className="border-b border-border/50 p-4 bg-card/40 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
              <Input
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                className="h-10 rounded-xl border-none bg-muted/40 pl-9 text-sm focus-visible:bg-card transition-all shadow-inner placeholder:text-subtle"
                placeholder="Filter orders by patient, ID, medicine token..."
              />
            </div>
            <select
              value={queueStatus}
              onChange={(e) => setQueueStatus(e.target.value)}
              className="h-10 rounded-xl border-none bg-muted/40 px-3 text-xs font-bold text-muted-foreground focus:ring-2 focus:ring-cyan-500/20 w-full md:w-[180px] shadow-sm cursor-pointer"
            >
              <option value="OPEN">All Active Requests</option>
              <option value="PRESCRIBED">Awaiting Initial Fill</option>
              <option value="PARTIAL">Partially Dispensed</option>
            </select>
          </div>

          {/* Horizontally Fluid / Vertically Contained Stream Grid */}
          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 bg-card/20">
            {isLoading ? (
              <div className="col-span-full py-12 flex flex-col items-center text-subtle">
                <Loader2 className="h-5 w-5 animate-spin text-cyan-500 mb-2" />
                <p className="text-[10px] font-bold uppercase tracking-wider">Syncing queue registry...</p>
              </div>
            ) : filteredQueue.length === 0 ? (
              <div className="col-span-full py-12 flex flex-col items-center text-subtle">
                <AlertCircle className="h-5 w-5 opacity-40 mb-2" />
                <p className="text-xs font-medium">No pharmacy cards fall within this criteria.</p>
              </div>
            ) : filteredQueue.map((item) => {
              const active = selectedPrescriptionId === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedPrescriptionId(item.id);
                    setMessage(null);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-2xl transition-all border text-left",
                    active 
                      ? "bg-card border-border/80 shadow-md ring-1 ring-cyan-500/10 scale-[1.01]" 
                      : "bg-card/40 border-transparent hover:bg-card/80 hover:border-border"
                  )}
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-[10px] font-black text-subtle uppercase tracking-wide truncate">{item.prescriptionNumber}</p>
                    <p className={cn("truncate text-sm font-bold mt-0.5 transition-colors", active ? "text-foreground" : "text-muted-foreground")}>
                      {patientName(item.patient)}
                    </p>
                  </div>
                  <Badge className={cn("rounded-md text-[9px] font-black tracking-wider uppercase shadow-none border shrink-0", statusTone(item.statusCode))}>
                    {item.statusCode?.replace(/_/g, " ")}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>

        {/* LOWER PANEL: CORE MANAGEMENT DESK */}
        <div className="rounded-[2rem] bg-card/85 backdrop-blur-md shadow-md overflow-hidden bg-card/60 min-h-[450px] border border-white/60">
          {!prescription ? (
            <div className="flex flex-col items-center justify-center text-subtle py-32">
              <ClipboardList className="h-16 w-16 opacity-10 mb-4 text-foreground" />
              <p className="text-sm font-bold tracking-wide text-muted-foreground">Select an active file from the stream above</p>
            </div>
          ) : detailLoading ? (
            <div className="flex flex-col items-center justify-center text-subtle py-32">
              <Loader2 className="h-6 w-6 animate-spin mb-3 text-cyan-500" />
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Querying detailed allocation ledger...</p>
            </div>
          ) : (
            <div className="flex flex-col">
              
              {/* Dynamic Header Deck */}
              <div className="flex flex-col sm:flex-row justify-between items-start border-b border-border p-6 bg-card/30 gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-lg bg-cyan-100 text-module flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-foreground">{patientName(prescription.patient)}</h2>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-xs font-medium text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-subtle" /> ID: {prescription.patient?.patientNumber || "N/A"}</span>
                    <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-subtle" /> Dr: {staffName(prescription.prescribedBy)}</span>
                    <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-subtle" /> Issued: {formatDate(prescription.prescribedAt)}</span>
                  </div>
                </div>
                <Badge className={cn("text-xs font-black tracking-wider uppercase rounded-xl px-4 py-1.5 shadow-sm border", statusTone(prescription.statusCode))}>
                  {prescription.statusCode?.replace(/_/g, " ")}
                </Badge>
              </div>

              {/* Functional Dashboard Split Area */}
              <div className="p-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
                
                {/* ACTIVE DISPENSARY BLOCK */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-subtle">Prescription Treatment Protocol</h3>
                    <span className="text-[10px] font-bold text-subtle">{items.length} unique formulas</span>
                  </div>

                  <div className="space-y-3">
                    {items.map((item) => {
                      const alreadyDispensed = dispensedByItemId.get(item.id) ?? 0;
                      const remaining = Math.max(0, item.quantity - alreadyDispensed);
                      const canDispense = remaining > 0;

                      return (
                        <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl bg-card border border-border shadow-sm gap-4 group hover:border-border/80 transition-all">
                          <div className="min-w-0 flex-1">
                            <p className="text-base font-bold text-foreground truncate">
                              {item.medicineNameSnapshot || item.medicine?.name || "Specified Formulation"}
                            </p>
                            <p className="text-xs font-semibold text-module bg-cyan-50/50 inline-block px-2 py-0.5 rounded mt-1.5">
                              {[item.dosage, item.route, item.frequency, item.duration].filter(Boolean).join(" • ")}
                            </p>
                            {item.instructions && (
                              <p className="text-xs text-subtle mt-2 italic font-medium">
                                Dir: {item.instructions}
                              </p>
                            )}
                            
                            {/* Segmented Metric Blocks */}
                            <div className="flex gap-3 mt-3">
                              <span className="text-[10px] font-bold bg-surface-2 px-2 py-1 rounded text-muted-foreground">Ordered: {item.quantity}</span>
                              <span className="text-[10px] font-bold bg-success-soft px-2 py-1 rounded text-success">Filled: {alreadyDispensed}</span>
                              <span className={cn("text-[10px] font-bold px-2 py-1 rounded", remaining > 0 ? "bg-destructive-soft text-destructive" : "bg-muted text-subtle")}>Remaining: {remaining}</span>
                            </div>
                          </div>

                          {/* Allocation Controls Container */}
                          <div className="flex items-center gap-4 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-50">
                            <div className="w-[120px]">
                              <p className="text-[9px] font-bold uppercase tracking-wider text-subtle mb-1.5 text-center">Dispense Qty</p>
                              <Input
                                type="number"
                                min={0}
                                max={remaining}
                                value={dispenseQuantities[item.id] ?? 0}
                                disabled={!canDispense}
                                onChange={(e) => {
                                  const nextVal = Math.max(0, Math.min(remaining, Number(e.target.value || 0)));
                                  setDispenseQuantities((curr) => ({ ...curr, [item.id]: nextVal }));
                                }}
                                className="h-10 rounded-xl bg-surface-2/80 border-none text-center font-black text-foreground focus-visible:bg-muted shadow-inner"
                              />
                            </div>
                            <div className="text-right min-w-[80px]">
                              <Badge className={cn("shadow-none border text-[9px] font-black uppercase px-2 rounded-md", statusTone(item.statusCode))}>
                                {item.statusCode || "PRESCRIBED"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-4 border-t border-border">
                    <Button
                      onClick={handleDispense}
                      disabled={dispensePrescriptionMutation.isPending || (prescription.statusCode || "").toUpperCase() === "DISPENSED"}
                      className="h-12 w-full sm:w-auto rounded-xl px-10 font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-md transition-all active:scale-95"
                    >
                      {dispensePrescriptionMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageCheck className="mr-2 h-4 w-4" />}
                      {(prescription.statusCode || "").toUpperCase() === "DISPENSED" ? "Order Fully Dispensed" : "Commit Allocations"}
                    </Button>
                  </div>
                </div>

                {/* DISPENSATION HISTORY LEDGER */}
                <div className="space-y-4 lg:border-l lg:border-border lg:pl-8">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-subtle">Dispensation Logs</h3>
                    <Badge className="bg-muted text-muted-foreground shadow-none font-bold text-[10px]">{dispenses.length}</Badge>
                  </div>

                  <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                    {dispenses.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
                        <Pill className="h-8 w-8 mx-auto opacity-10 text-foreground mb-2" />
                        <p className="text-xs font-medium text-subtle italic">No entry logs recorded yet.</p>
                      </div>
                    ) : dispenses.map((dispense) => (
                      <div key={dispense.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3 hover:border-border transition-all">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs font-black text-foreground tracking-tight">{dispense.dispenseNumber}</p>
                            <p className="text-[10px] font-medium text-subtle mt-0.5">{formatDate(dispense.dispensedAt)}</p>
                          </div>
                          <Badge className={cn("text-[9px] font-black tracking-wider uppercase shadow-none px-2 py-0.5 rounded-md border", statusTone(dispense.statusCode))}>
                            {dispense.statusCode}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1.5 pt-2 border-t border-slate-50">
                          {(dispense.items ?? []).map((dItem) => (
                            <div key={dItem.id} className="text-xs flex justify-between items-start gap-2 text-muted-foreground">
                              <span className="truncate flex-1 font-semibold text-muted-foreground">{dItem.medicine?.name || "Item"}</span>
                              <span className="font-black text-success bg-success-soft border border-success/20 px-1.5 py-0.5 rounded text-[9px] whitespace-nowrap">
                                +{dItem.quantityDispensed} units
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}
        </div>

      </div>

    </div>
  );
}
