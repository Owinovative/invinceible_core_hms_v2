"use client";

import * as React from "react";
import { Loader2, Plus } from "lucide-react";

import { useAddInvoiceItem } from "@/hooks/use-add-invoice-item";
import { useBillingServices } from "@/hooks/use-billing-services";
import { useBranchPharmacyStock } from "@/hooks/use-branch-pharmacy-stock";
import { useLabTests } from "@/hooks/use-lab-tests";
import { useServiceTariffs } from "@/hooks/use-service-tariffs";
import type { ServiceTariffRecord } from "@/services/billing-service";
import { appSelectClass } from "@/lib/select-class";

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
    maximumFractionDigits: 2,
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
  const { data: branchStockData = [] } = useBranchPharmacyStock(
    branchId ?? undefined,
    { pageSize: 100 },
  );

  const billingServices = React.useMemo(
    () => (Array.isArray(billingServicesData) ? billingServicesData : []),
    [billingServicesData],
  );
  const labTests = React.useMemo(
    () => (Array.isArray(labTestsData) ? labTestsData : []),
    [labTestsData],
  );
  const tariffs = React.useMemo(
    () =>
      Array.isArray(tariffsData)
        ? tariffsData
        : (tariffsData?.data ?? []),
    [tariffsData],
  );
  const branchStock = React.useMemo(
    () =>
      Array.isArray(branchStockData)
        ? branchStockData
        : (branchStockData?.data ?? []),
    [branchStockData],
  );

  const [chargeType, setChargeType] = React.useState<ChargeType>("SERVICE");
  const [selectedId, setSelectedId] = React.useState("");
  const [itemSearch, setItemSearch] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [quantity, setQuantity] = React.useState("1");
  const [unitPrice, setUnitPrice] = React.useState("");
  const [discountPercent, setDiscountPercent] = React.useState("0");
  const [chargedAt, setChargedAt] = React.useState(todayKey());
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    setSelectedId("");
    setItemSearch("");
    setDescription("");
    setQuantity("1");
    setUnitPrice("");
    setDiscountPercent("0");
    setNotes("");
  }, [chargeType]);

  const normalizedSearch = itemSearch.trim().toLowerCase();
  const filteredBillingServices = React.useMemo(() => {
    if (!normalizedSearch) return billingServices.slice(0, 120);

    return billingServices
      .filter((service) =>
        [service.name, service.code, service.category]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch),
      )
      .slice(0, 120);
  }, [billingServices, normalizedSearch]);

  const filteredLabTests = React.useMemo(() => {
    if (!normalizedSearch) return labTests.slice(0, 120);

    return labTests
      .filter((test) =>
        [test.testName, test.category, test.specimenType]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch),
      )
      .slice(0, 120);
  }, [labTests, normalizedSearch]);

  const filteredBranchStock = React.useMemo(() => {
    if (!normalizedSearch) return branchStock.slice(0, 120);

    return branchStock
      .filter((stock) =>
        [
          stock.medicine?.name,
          stock.medicine?.code,
          stock.medicine?.dosageForm,
          stock.medicine?.strength,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch),
      )
      .slice(0, 120);
  }, [branchStock, normalizedSearch]);

  const handleSelectItem = (value: string) => {
    setSelectedId(value);

    if (chargeType === "SERVICE") {
      const service = billingServices.find((item) => String(item.id) === value);
      if (!service) return;

      const tariffPrice = resolveTariffPrice(
        tariffs,
        branchId,
        (tariff) =>
          tariff.billingServiceId === service.id ||
          tariff.code === service.code,
      );

      setDescription(service.name);
      setUnitPrice(String(tariffPrice ?? service.defaultPrice ?? 0));
    }

    if (chargeType === "LAB_TEST") {
      const test = labTests.find((item) => String(item.id) === value);
      if (!test) return;

      const tariffPrice = resolveTariffPrice(
        tariffs,
        branchId,
        (tariff) =>
          tariff.labTestId === test.id || tariff.code === `LAB_TEST_${test.id}`,
      );

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
    if (!invoiceId) {
      onMessage?.("Open or select an invoice before adding a line.");
      return;
    }

    if (chargeType !== "MANUAL" && !selectedId) {
      onMessage?.("Choose the billable item before adding the line.");
      return;
    }

    if (!description.trim()) {
      onMessage?.("Enter a description before adding the line.");
      return;
    }

    const updatedInvoice = await addInvoiceItemMutation.mutateAsync({
      invoiceId,
      payload: {
        chargeType,
        billingServiceId:
          chargeType === "SERVICE" ? Number(selectedId) : undefined,
        labTestId: chargeType === "LAB_TEST" ? Number(selectedId) : undefined,
        branchMedicineStockId:
          chargeType === "MEDICINE" ? Number(selectedId) : undefined,
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
    onMessage?.("Invoice line added successfully.");
    onAdded?.(updatedInvoice.id);
  };

  return (
    <div className="space-y-4 rounded-[1.2rem] border border-emerald-500/20 bg-emerald-500/8 p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold">Add Invoice Line</p>
          <p className="text-sm text-muted-foreground">
            Pick the charge type, item, date, quantity, and branch price.
          </p>
        </div>
        {chargeType === "MEDICINE" && !branchId ? (
          <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            Select a branch invoice to load branch stock prices.
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.75fr_1.15fr_0.7fr]">
        <div>
          <label className="mb-2 block text-sm font-medium">Charge Type</label>
          <select
            value={chargeType}
            onChange={(event) =>
              setChargeType(event.target.value as ChargeType)
            }
            className={appSelectClass}
          >
            <option value="SERVICE">Service</option>
            <option value="LAB_TEST">Lab Test</option>
            <option value="MEDICINE">Medicine</option>
            <option value="MANUAL">Manual</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Search Item
          </label>
          {chargeType === "MANUAL" ? (
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="h-12 rounded-2xl"
              placeholder="Manual charge description"
            />
          ) : (
            <div className="space-y-2">
              <Input
                value={itemSearch}
                onChange={(event) => setItemSearch(event.target.value)}
                className="h-12 rounded-2xl"
                placeholder={
                  chargeType === "MEDICINE"
                    ? "Search drug name, code, form, or strength"
                    : chargeType === "LAB_TEST"
                      ? "Search lab service name, code, specimen, or category"
                      : "Search service name, code, or category"
                }
                disabled={chargeType === "MEDICINE" && !branchId}
              />
              <select
                value={selectedId}
                onChange={(event) => handleSelectItem(event.target.value)}
                className={appSelectClass}
                disabled={chargeType === "MEDICINE" && !branchId}
              >
                <option value="">Choose item</option>
                {chargeType === "SERVICE"
                  ? filteredBillingServices.map((service) => (
                      <option key={service.id} value={String(service.id)}>
                        {service.name} / {formatMoney(service.defaultPrice)}
                      </option>
                    ))
                  : null}
                {chargeType === "LAB_TEST"
                  ? filteredLabTests.map((test) => (
                      <option key={test.id} value={String(test.id)}>
                        {test.testName}
                      </option>
                    ))
                  : null}
                {chargeType === "MEDICINE"
                  ? filteredBranchStock.map((stock) => (
                      <option key={stock.id} value={String(stock.id)}>
                        {stock.medicine?.name ??
                          `Medicine #${stock.medicineId}`}{" "}
                        / Stock {stock.stockQuantity} /{" "}
                        {formatMoney(stock.unitPrice)}
                      </option>
                    ))
                  : null}
              </select>
              <p className="text-xs text-muted-foreground">
                Showing the first 120 matching records. Search narrows the full
                catalog before selection.
              </p>
            </div>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Charge Date</label>
          <Input
            type="date"
            value={chargedAt}
            onChange={(event) => setChargedAt(event.target.value)}
            className="h-12 rounded-2xl"
          />
        </div>
      </div>

      {chargeType !== "MANUAL" ? (
        <div>
          <label className="mb-2 block text-sm font-medium">Description</label>
          <Input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="h-12 rounded-2xl"
          />
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-medium">Quantity</label>
          <Input
            type="number"
            min="1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className="h-12 rounded-2xl"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Unit Price</label>
          <Input
            type="number"
            value={unitPrice}
            onChange={(event) => setUnitPrice(event.target.value)}
            className="h-12 rounded-2xl"
            placeholder="Resolved from tariff or branch stock"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Discount %</label>
          <Input
            type="number"
            min="0"
            max="100"
            value={discountPercent}
            onChange={(event) => setDiscountPercent(event.target.value)}
            className="h-12 rounded-2xl"
            placeholder="0"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Notes</label>
        <Textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="min-h-[88px] rounded-2xl"
        />
      </div>

      <Button
        type="button"
        className="h-12 rounded-2xl"
        onClick={handleAddLine}
        disabled={addInvoiceItemMutation.isPending}
      >
        {addInvoiceItemMutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Plus className="mr-2 h-4 w-4" />
        )}
        Add Line
      </Button>
    </div>
  );
}
