"use client";

import * as React from "react";
import { Loader2, Plus } from "lucide-react";

import { useAddInvoiceItem } from "@/hooks/use-add-invoice-item";
import { useBillingServices } from "@/hooks/use-billing-services";
import { useBranchPharmacyStock } from "@/hooks/use-branch-pharmacy-stock";
import { useLabTests } from "@/hooks/use-lab-tests";
import { useServiceTariffs } from "@/hooks/use-service-tariffs";
import type { ServiceTariffRecord } from "@/services/billing-service";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ChargeType = "SERVICE" | "LAB_TEST" | "MEDICINE" | "MANUAL";

type AddInvoiceLinePanelProps = {
  invoiceId?: number | null;
  branchId?: number | null;
  currentStaffId?: number;
  onAdded?: (invoiceId: number) => void;
  onMessage?: (message: string) => void;
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function resolveTariffPrice(
  tariffs: ServiceTariffRecord[],
  branchId: number | null | undefined,
  matcher: (tariff: ServiceTariffRecord) => boolean,
) {
  const matches = tariffs
    .filter((tariff) => tariff.isActive && matcher(tariff))
    .sort((a, b) => {
      const score = (tariff: ServiceTariffRecord) =>
        tariff.branchId === branchId ? 2 : tariff.branchId ? 0 : 1;
      return score(b) - score(a);
    });

  return matches[0]?.unitPrice;
}

export function AddInvoiceLinePanel({
  invoiceId,
  branchId,
  currentStaffId,
  onAdded,
  onMessage,
}: AddInvoiceLinePanelProps) {
  const addInvoiceItemMutation = useAddInvoiceItem();
  const { data: billingServicesData = [] } = useBillingServices();
  const { data: labTestsData = [] } = useLabTests();
  const { data: tariffsData } = useServiceTariffs({ pageSize: 100 });

  const [chargeType, setChargeType] = React.useState<ChargeType>("SERVICE");
  const [selectedId, setSelectedId] = React.useState("");
  const [itemSearch, setItemSearch] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [quantity, setQuantity] = React.useState("1");
  const [unitPrice, setUnitPrice] = React.useState("");
  const [discountPercent, setDiscountPercent] = React.useState("0");
  const [chargedAt, setChargedAt] = React.useState(todayKey());
  const [notes, setNotes] = React.useState("");

  const normalizedSearch = itemSearch.trim().toLowerCase();
  const deferredItemSearch = React.useDeferredValue(normalizedSearch);

  const { data: branchStockData = [] } = useBranchPharmacyStock(
    branchId ?? undefined,
    { pageSize: 50, search: deferredItemSearch },
  );

  const billingServices = React.useMemo(() => (Array.isArray(billingServicesData) ? billingServicesData : []), [billingServicesData]);
  const labTests = React.useMemo(() => (Array.isArray(labTestsData) ? labTestsData : []), [labTestsData]);
  const tariffs = React.useMemo(() => Array.isArray(tariffsData) ? tariffsData : (tariffsData?.data ?? []), [tariffsData]);
  const branchStock = React.useMemo(() => Array.isArray(branchStockData) ? branchStockData : (branchStockData?.data ?? []), [branchStockData]);

  React.useEffect(() => {
    setSelectedId("");
    setItemSearch("");
    setDescription("");
    setQuantity("1");
    setUnitPrice("");
    setDiscountPercent("0");
    setNotes("");
  }, [chargeType]);

  const filteredBillingServices = React.useMemo(() => {
    if (!normalizedSearch) return billingServices.slice(0, 50);
    return billingServices.filter((s) => [s.name, s.code, s.category].join(" ").toLowerCase().includes(normalizedSearch)).slice(0, 50);
  }, [billingServices, normalizedSearch]);

  const filteredLabTests = React.useMemo(() => {
    if (!normalizedSearch) return labTests.slice(0, 50);
    return labTests.filter((t) => [t.testName, t.category, t.specimenType].join(" ").toLowerCase().includes(normalizedSearch)).slice(0, 50);
  }, [labTests, normalizedSearch]);

  const filteredBranchStock = React.useMemo(() => {
    if (!normalizedSearch) return branchStock.slice(0, 50);
    return branchStock.filter((s) => [s.medicine?.name, s.medicine?.code].join(" ").toLowerCase().includes(normalizedSearch)).slice(0, 50);
  }, [branchStock, normalizedSearch]);

  const handleSelectItem = (value: string) => {
    setSelectedId(value);

    if (chargeType === "SERVICE") {
      const service = billingServices.find((item) => String(item.id) === value);
      if (!service) return;
      const tariffPrice = resolveTariffPrice(tariffs, branchId, (t) => t.billingServiceId === service.id || t.code === service.code);
      setDescription(service.name);
      setUnitPrice(String(tariffPrice ?? service.defaultPrice ?? 0));
    }

    if (chargeType === "LAB_TEST") {
      const test = labTests.find((item) => String(item.id) === value);
      if (!test) return;
      const tariffPrice = resolveTariffPrice(tariffs, branchId, (t) => t.labTestId === test.id || t.code === `LAB_TEST_${test.id}`);
      setDescription(`Lab Test: ${test.testName}`);
      setUnitPrice(tariffPrice === undefined ? "" : String(tariffPrice));
    }

    if (chargeType === "MEDICINE") {
      const stock = branchStock.find((item) => String(item.id) === value);
      if (!stock) return;
      setDescription(`Medicine: ${stock.medicine?.name ?? "Medicine"}`);
      setUnitPrice(String(stock.unitPrice ?? 0));
    }
  };

  const handleAddLine = async () => {
    if (!invoiceId) { onMessage?.("Select an invoice first."); return; }
    if (chargeType !== "MANUAL" && !selectedId) { onMessage?.("Choose an item."); return; }
    if (!description.trim()) { onMessage?.("Enter a description."); return; }

    const updatedInvoice = await addInvoiceItemMutation.mutateAsync({
      invoiceId,
      payload: {
        chargeType,
        billingServiceId: chargeType === "SERVICE" ? Number(selectedId) : undefined,
        labTestId: chargeType === "LAB_TEST" ? Number(selectedId) : undefined,
        branchMedicineStockId: chargeType === "MEDICINE" ? Number(selectedId) : undefined,
        description: description.trim(),
        quantity: Number(quantity || 1),
        unitPrice: unitPrice.trim() ? Number(unitPrice) : undefined,
        discountPercent: Number(discountPercent || 0),
        chargedAt,
        notes: notes.trim() || undefined,
        updatedByStaffId: currentStaffId,
      },
    });

    setSelectedId("");
    setDescription("");
    setQuantity("1");
    setUnitPrice("");
    setDiscountPercent("0");
    setChargedAt(todayKey());
    setNotes("");
    onMessage?.("Line added.");
    onAdded?.(updatedInvoice.id);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface-2/50 p-5 mt-6 transition-all">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold text-foreground">Quick Add Item</p>
        {chargeType === "MEDICINE" && !branchId ? (
          <span className="text-[10px] font-bold uppercase text-amber-500 bg-warning-soft px-2 py-1 rounded-md">
            Branch required for stock
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 xl:grid-cols-[0.8fr_1.2fr_0.8fr]">
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-subtle">Type</label>
          <select
            value={chargeType}
            onChange={(e) => setChargeType(e.target.value as ChargeType)}
            className="h-10 w-full rounded-xl border-none bg-card px-3 text-sm shadow-sm focus:ring-2 focus:ring-cyan-500/20"
          >
            <option value="SERVICE">Service</option>
            <option value="LAB_TEST">Lab Test</option>
            <option value="MEDICINE">Medicine</option>
            <option value="MANUAL">Manual</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-subtle">Search</label>
          {chargeType === "MANUAL" ? (
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-10 rounded-xl border-none bg-card shadow-sm"
              placeholder="Description"
            />
          ) : (
            <div className="flex gap-2">
              <Input
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="h-10 w-1/3 rounded-xl border-none bg-card shadow-sm placeholder:text-xs"
                placeholder="Find..."
                disabled={chargeType === "MEDICINE" && !branchId}
              />
              <select
                value={selectedId}
                onChange={(e) => handleSelectItem(e.target.value)}
                className="h-10 flex-1 rounded-xl border-none bg-card px-3 text-xs shadow-sm focus:ring-2 focus:ring-cyan-500/20"
                disabled={chargeType === "MEDICINE" && !branchId}
              >
                <option value="">Select...</option>
                {chargeType === "SERVICE" && filteredBillingServices.map((s) => (
                  <option key={s.id} value={String(s.id)}>{s.name} - {formatMoney(s.defaultPrice)}</option>
                ))}
                {chargeType === "LAB_TEST" && filteredLabTests.map((t) => (
                  <option key={t.id} value={String(t.id)}>{t.testName}</option>
                ))}
                {chargeType === "MEDICINE" && filteredBranchStock.map((s) => (
                  <option key={s.id} value={String(s.id)}>{s.medicine?.name} ({s.stockQuantity}) - {formatMoney(s.unitPrice)}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-subtle">Date</label>
          <Input
            type="date"
            value={chargedAt}
            onChange={(e) => setChargedAt(e.target.value)}
            className="h-10 rounded-xl border-none bg-card shadow-sm"
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] items-end">
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-subtle">Qty</label>
          <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-10 rounded-xl border-none bg-card shadow-sm" />
        </div>
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-subtle">Price</label>
          <Input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="h-10 rounded-xl border-none bg-card shadow-sm" placeholder="Auto" />
        </div>
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-subtle">Disc %</label>
          <Input type="number" min="0" max="100" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} className="h-10 rounded-xl border-none bg-card shadow-sm" placeholder="0" />
        </div>
        <Button
          type="button"
          className="h-10 rounded-xl bg-slate-900 text-white hover:bg-slate-800 px-6 shadow-sm w-full md:w-auto"
          onClick={handleAddLine}
          disabled={addInvoiceItemMutation.isPending}
        >
          {addInvoiceItemMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Add Line
        </Button>
      </div>
    </div>
  );
}
