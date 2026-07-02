"use client";

import * as React from "react";
import Link from "next/link";
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  Loader2,
  Pill,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/providers/auth-provider";
import { useScope } from "@/providers/scope-provider";
import { useDebouncedValue } from "@/hooks/use-branch-medicine-search";
import {
  addOtcSaleItem,
  completeOtcSale,
  createOtcSale,
  downloadOtcReceiptPdf,
  recordOtcSalePayment,
  removeOtcSaleItem,
  searchOtcMedicines,
  updateOtcSaleItem,
  type InsuranceClaimStatus,
  type OtcMedicineSearchItem,
  type OtcPaymentMethod,
  type OtcSale,
  type OtcSalePaymentInput,
} from "@/services/otc-sales-service";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const OTC_ROLES = new Set([
  "SUPER_ADMIN",
  "ADMIN",
  "FACILITY_ADMIN",
  "BRANCH_ADMIN",
  "PHARMACIST",
  "PHARMACY_MANAGER",
  "CASHIER",
  "BILLING_OFFICER",
]);

const PAYMENT_METHODS: Array<{ value: OtcPaymentMethod; label: string }> = [
  { value: "CASH", label: "Cash" },
  { value: "MPESA_MANUAL", label: "M-Pesa Manual" },
  { value: "MPESA_STK", label: "M-Pesa STK" },
  { value: "CARD", label: "Card" },
  { value: "BANK", label: "Bank" },
  { value: "INSURANCE", label: "Insurance" },
];

const CLAIM_STATUSES: InsuranceClaimStatus[] = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "PARTIALLY_APPROVED",
  "REJECTED",
  "PAID",
  "CANCELLED",
];

type PaymentDraft = OtcSalePaymentInput & { localId: string };

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function extractError(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return "The OTC sale request failed. Please retry.";
}

function stockTone(status: string) {
  switch (status) {
    case "IN_STOCK":
      return "bg-success-soft text-success ring-emerald-200";
    case "LOW_STOCK":
      return "bg-warning-soft text-warning ring-amber-200";
    default:
      return "bg-destructive-soft text-destructive ring-rose-200";
  }
}

function paymentStatusTone(status?: string | null) {
  switch ((status || "").toUpperCase()) {
    case "PAID":
      return "bg-success-soft text-success ring-emerald-200";
    case "PENDING_INSURANCE":
      return "bg-warning-soft text-warning ring-amber-200";
    case "PARTIALLY_PAID":
      return "bg-blue-50 text-module ring-blue-200";
    default:
      return "bg-muted text-muted-foreground ring-slate-200";
  }
}

function saleCanShowReceipt(sale?: OtcSale | null) {
  if (!sale) return false;
  return ["PAID", "PENDING_INSURANCE", "PARTIALLY_PAID"].includes(
    sale.paymentStatus,
  );
}

function localPaymentId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `payment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function newPaymentDraft(method: OtcPaymentMethod = "CASH"): PaymentDraft {
  return {
    localId: localPaymentId(),
    paymentMethod: method,
    amount: 0,
    insuranceClaimStatus: method === "INSURANCE" ? "DRAFT" : undefined,
  };
}

export default function OtcSalesPage() {
  const { user } = useAuth();
  const {
    facilityName,
    selectedBranchId,
    selectedBranchName,
    availableBranches,
    canSwitchBranches,
    setSelectedBranchId,
  } = useScope();

  const [sale, setSale] = React.useState<OtcSale | null>(null);
  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [searchText, setSearchText] = React.useState("");
  const debouncedSearch = useDebouncedValue(searchText, 250);
  const [selectedMedicine, setSelectedMedicine] =
    React.useState<OtcMedicineSearchItem | null>(null);
  const [quantity, setQuantity] = React.useState(1);
  const [unitPrice, setUnitPrice] = React.useState(0);
  const [paymentRows, setPaymentRows] = React.useState<PaymentDraft[]>([
    newPaymentDraft("CASH"),
  ]);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const roleCode = user?.roleCode ?? "";
  const isAllowed = OTC_ROLES.has(roleCode);
  const branchRequired = !selectedBranchId;
  const queryEnabled =
    isAllowed && Boolean(selectedBranchId) && debouncedSearch.trim().length >= 2;

  const medicineQuery = useQuery({
    queryKey: ["otc-medicine-search", selectedBranchId, debouncedSearch],
    queryFn: () =>
      searchOtcMedicines({
        query: debouncedSearch,
        branchId: selectedBranchId,
        pageSize: 12,
      }),
    enabled: queryEnabled,
    staleTime: 15_000,
    placeholderData: (previousData) => previousData,
  });

  React.useEffect(() => {
    if (selectedMedicine) {
      setUnitPrice(selectedMedicine.unitPrice);
      setQuantity(1);
    }
  }, [selectedMedicine]);

  React.useEffect(() => {
    if (!sale) {
      const total = selectedMedicine
        ? Math.max(1, quantity) * Number(unitPrice || 0)
        : 0;
      setPaymentRows((rows) =>
        rows.length === 1 && rows[0].paymentMethod === "CASH"
          ? [{ ...rows[0], amount: total }]
          : rows,
      );
    }
  }, [quantity, sale, selectedMedicine, unitPrice]);

  const lineTotal = React.useMemo(
    () => Math.max(0, Number(quantity || 0)) * Number(unitPrice || 0),
    [quantity, unitPrice],
  );
  const optimisticSubtotal = React.useMemo(
    () =>
      sale?.items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0) ??
      0,
    [sale],
  );
  const totalDue = sale?.totalAmount ?? optimisticSubtotal;
  const paymentPreview = React.useMemo(() => {
    const counted = paymentRows.reduce((sum, row) => {
      if (row.paymentMethod === "INSURANCE") {
        return ["APPROVED", "PARTIALLY_APPROVED", "PAID"].includes(
          row.insuranceClaimStatus || "",
        )
          ? sum + Number(row.insuranceCoveredAmount || row.amount || 0)
          : sum;
      }
      return sum + Number(row.amount || 0);
    }, 0);
    return {
      amount: counted,
      balance: Math.max(totalDue - counted, 0),
    };
  }, [paymentRows, totalDue]);

  const mutate = async <T,>(label: string, action: () => Promise<T>) => {
    setBusy(label);
    setError(null);
    setMessage(null);
    try {
      return await action();
    } catch (err) {
      setError(extractError(err));
      throw err;
    } finally {
      setBusy(null);
    }
  };

  const ensureSale = async () => {
    if (sale) return sale;
    if (!selectedBranchId) throw new Error("Select a branch before selling.");

    const created = await createOtcSale({
      branchId: selectedBranchId,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setSale(created);
    return created;
  };

  const handleAddItem = async () => {
    if (!selectedMedicine) {
      setError("Select a medicine first.");
      return;
    }
    if (selectedMedicine.stockStatus === "OUT_OF_STOCK") {
      setError("This medicine is out of stock.");
      return;
    }
    if (quantity < 1 || quantity > selectedMedicine.currentStock) {
      setError("Quantity must be positive and cannot exceed current stock.");
      return;
    }

    await mutate("item", async () => {
      const currentSale = await ensureSale();
      const updated = await addOtcSaleItem(currentSale.id, {
        medicineId: selectedMedicine.medicineId,
        quantity,
        unitPrice,
      });
      setSale(updated);
      setSelectedMedicine(null);
      setSearchText("");
      setQuantity(1);
      setUnitPrice(0);
      setMessage("Medicine added to OTC sale.");
    });
  };

  const handleUpdateItem = async (
    itemId: number,
    nextQuantity: number,
    unit: number,
  ) => {
    if (!sale) return;
    await mutate(`item-${itemId}`, async () => {
      const updated = await updateOtcSaleItem(sale.id, itemId, {
        quantity: nextQuantity,
        unitPrice: unit,
      });
      setSale(updated);
    });
  };

  const handleRemoveItem = async (itemId: number) => {
    if (!sale) return;
    await mutate(`remove-${itemId}`, async () => {
      const updated = await removeOtcSaleItem(sale.id, itemId);
      setSale(updated);
      setMessage("Item removed.");
    });
  };

  const handleRecordPayment = async () => {
    if (!sale) {
      setError("Add at least one medicine before payment.");
      return null;
    }
    if (sale.items.length === 0) {
      setError("Add at least one medicine before payment.");
      return null;
    }

    const payload = paymentRows
      .map(({ localId: _localId, ...row }) => row)
      .filter((row) => {
        if (row.paymentMethod === "INSURANCE") {
          return row.insuranceProviderName || row.insuranceMemberNumber;
        }
        return Number(row.amount || 0) > 0;
      });

    if (payload.length === 0) {
      setError("Enter at least one valid payment line.");
      return null;
    }

    return mutate("payment", async () => {
      const updated = await recordOtcSalePayment(sale.id, payload);
      setSale(updated);
      setMessage("Payment recorded. Complete the sale once fully paid.");
      return updated;
    });
  };

  const handleComplete = async () => {
    if (!sale) return;
    await mutate("complete", async () => {
      const updated = await completeOtcSale(sale.id);
      setSale(updated);
      setMessage("OTC sale completed. Stock has been deducted.");
    });
  };

  const handlePayAndComplete = async () => {
    const paidSale = await handleRecordPayment();
    if (!paidSale) return;
    if (paidSale.paymentStatus !== "PAID") {
      setMessage(
        paidSale.paymentStatus === "PENDING_INSURANCE"
          ? "Insurance is pending. Stock will not deduct until coverage and co-pay are fully approved."
          : "Payment recorded. Complete once balance is cleared.",
      );
      return;
    }
    await mutate("complete", async () => {
      const completed = await completeOtcSale(paidSale.id);
      setSale(completed);
      setMessage("Payment accepted and stock deducted.");
    });
  };

  const resetSale = () => {
    setSale(null);
    setCustomerName("");
    setCustomerPhone("");
    setNotes("");
    setSearchText("");
    setSelectedMedicine(null);
    setPaymentRows([newPaymentDraft("CASH")]);
    setMessage(null);
    setError(null);
  };

  const updatePaymentRow = (
    localId: string,
    patch: Partial<OtcSalePaymentInput>,
  ) => {
    setPaymentRows((rows) =>
      rows.map((row) =>
        row.localId === localId
          ? {
              ...row,
              ...patch,
              insuranceClaimStatus:
                patch.paymentMethod === "INSURANCE" &&
                !row.insuranceClaimStatus
                  ? "DRAFT"
                  : patch.insuranceClaimStatus ?? row.insuranceClaimStatus,
            }
          : row,
      ),
    );
  };

  if (!isAllowed) {
    return (
      <div className="rounded-2xl border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">OTC Drug Sales</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your role does not have access to over-the-counter sale operations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <Badge className="bg-cyan-50 text-module">Pharmacy POS</Badge>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50">
                <Pill className="h-6 w-6 text-module" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                  Over Counter Drug Sale
                </h1>
                <p className="text-sm text-muted-foreground">
                  Search medicine, build cart, record payment, complete sale,
                  and deduct stock on one page.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:w-[700px]">
            <div className="rounded-xl border bg-surface-2 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Facility
              </p>
              <p className="mt-1 truncate text-sm font-semibold">
                {facilityName || "No facility"}
              </p>
            </div>
            <div className="rounded-xl border bg-surface-2 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Branch
              </p>
              {canSwitchBranches && availableBranches.length > 0 ? (
                <select
                  value={selectedBranchId ?? ""}
                  onChange={(event) =>
                    setSelectedBranchId(
                      event.target.value ? Number(event.target.value) : undefined,
                    )
                  }
                  className="mt-1 h-8 w-full rounded-lg border bg-card px-2 text-sm"
                >
                  <option value="">Select branch</option>
                  {availableBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="mt-1 truncate text-sm font-semibold">
                  {selectedBranchName || "No branch"}
                </p>
              )}
            </div>
            <div className="rounded-xl border bg-surface-2 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Sale
              </p>
              <p className="mt-1 truncate text-sm font-semibold">
                {sale?.saleNumber || "New sale"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {branchRequired ? (
        <div className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
          Select a branch before searching stock or creating an OTC sale.
        </div>
      ) : null}
      {message ? (
        <div className="rounded-xl border border-success/25 bg-success-soft px-4 py-3 text-sm text-success">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-destructive/25 bg-destructive-soft px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(320px,0.9fr)_minmax(420px,1.2fr)_minmax(330px,0.85fr)]">
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Search and add drug</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Customer name
                </label>
                <Input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  disabled={Boolean(sale)}
                  placeholder="Optional walk-in name"
                  className="h-10"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Customer phone
                </label>
                <Input
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  disabled={Boolean(sale)}
                  placeholder="Optional phone"
                  className="h-10"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Medicine search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-subtle" />
                <Input
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  disabled={branchRequired}
                  placeholder="Search by name, code, form, or strength"
                  className="h-10 pl-9"
                />
              </div>
            </div>

            <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {medicineQuery.isFetching ? (
                <div className="flex items-center gap-2 rounded-xl border bg-surface-2 p-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching medicines...
                </div>
              ) : null}
              {queryEnabled &&
              !medicineQuery.isFetching &&
              (medicineQuery.data?.data.length ?? 0) === 0 ? (
                <div className="rounded-xl border bg-surface-2 p-3 text-sm text-muted-foreground">
                  No matching branch stock found.
                </div>
              ) : null}
              {(medicineQuery.data?.data ?? []).map((medicine) => (
                <button
                  type="button"
                  key={medicine.branchStockId}
                  onClick={() => setSelectedMedicine(medicine)}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition hover:border-border-strong hover:bg-cyan-50/40",
                    selectedMedicine?.branchStockId === medicine.branchStockId &&
                      "border-cyan-400 bg-cyan-50",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{medicine.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[medicine.code, medicine.dosageForm, medicine.strength]
                          .filter(Boolean)
                          .join(" / ") || "No medicine details"}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
                        stockTone(medicine.stockStatus),
                      )}
                    >
                      {medicine.stockStatus.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-lg bg-card p-2">
                      <p className="text-muted-foreground">Stock</p>
                      <p className="font-semibold">{medicine.currentStock}</p>
                    </div>
                    <div className="rounded-lg bg-card p-2">
                      <p className="text-muted-foreground">Price</p>
                      <p className="font-semibold">
                        {formatMoney(medicine.unitPrice)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-card p-2">
                      <p className="text-muted-foreground">Reorder</p>
                      <p className="font-semibold">{medicine.reorderLevel}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="rounded-xl border bg-surface-2 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Selected drug
              </p>
              {selectedMedicine ? (
                <div className="mt-2 space-y-3">
                  <div>
                    <p className="font-semibold">{selectedMedicine.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedMedicine.currentStock} units available
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">
                        Quantity
                      </label>
                      <Input
                        type="number"
                        min={1}
                        max={selectedMedicine.currentStock}
                        value={quantity}
                        onChange={(event) =>
                          setQuantity(Number(event.target.value || 1))
                        }
                        className="h-10"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">
                        Unit price
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={unitPrice}
                        onChange={(event) =>
                          setUnitPrice(Number(event.target.value || 0))
                        }
                        className="h-10"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">
                        Line total
                      </label>
                      <div className="flex h-10 items-center rounded-lg border bg-card px-3 text-sm font-semibold">
                        {formatMoney(lineTotal)}
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddItem}
                    disabled={Boolean(busy) || selectedMedicine.currentStock <= 0}
                    className="h-10 w-full"
                  >
                    {busy === "item" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Add to sale
                  </Button>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Search and select a medicine to add it to the cart.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Sale cart</CardTitle>
              <Badge
                className={cn(
                  "ring-1",
                  paymentStatusTone(sale?.paymentStatus || "UNPAID"),
                )}
              >
                {sale?.paymentStatus?.replace(/_/g, " ") || "UNPAID"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {sale?.items.length ? (
              <div className="overflow-hidden rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-surface-2 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Medicine</th>
                      <th className="px-3 py-2">Qty</th>
                      <th className="px-3 py-2">Unit</th>
                      <th className="px-3 py-2">Total</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {sale.items.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-3 py-2">
                          <p className="font-medium">
                            {item.medicineNameSnapshot}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {[item.dosageFormSnapshot, item.strengthSnapshot]
                              .filter(Boolean)
                              .join(" / ") || "No form"}
                          </p>
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            disabled={sale.status === "PAID"}
                            onBlur={(event) =>
                              handleUpdateItem(
                                item.id,
                                Number(event.target.value || item.quantity),
                                item.unitPrice,
                              )
                            }
                            onChange={(event) => {
                              const next = Number(event.target.value || 1);
                              setSale((current) =>
                                current
                                  ? {
                                      ...current,
                                      items: current.items.map((line) =>
                                        line.id === item.id
                                          ? {
                                              ...line,
                                              quantity: next,
                                              lineTotal: next * line.unitPrice,
                                            }
                                          : line,
                                      ),
                                    }
                                  : current,
                              );
                            }}
                            className="h-8 w-20"
                          />
                        </td>
                        <td className="px-3 py-2">
                          {formatMoney(item.unitPrice)}
                        </td>
                        <td className="px-3 py-2 font-semibold">
                          {formatMoney(item.lineTotal)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={sale.status === "PAID" || Boolean(busy)}
                            onClick={() => handleRemoveItem(item.id)}
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed bg-surface-2 p-6 text-center text-sm text-muted-foreground">
                No drugs in the sale yet.
              </div>
            )}

            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={Boolean(sale)}
              placeholder="Optional sale notes"
              className="min-h-20"
            />

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border bg-surface-2 p-3">
                <p className="text-xs text-muted-foreground">Subtotal</p>
                <p className="text-lg font-bold">
                  {formatMoney(sale?.subtotal ?? optimisticSubtotal)}
                </p>
              </div>
              <div className="rounded-xl border bg-surface-2 p-3">
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="text-lg font-bold">
                  {formatMoney(sale?.paidAmount ?? 0)}
                </p>
              </div>
              <div className="rounded-xl border bg-surface-2 p-3">
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className="text-lg font-bold">
                  {formatMoney(sale?.balanceAmount ?? totalDue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Payment and completion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border bg-cyan-50 p-3">
                <p className="text-xs text-module">Total due</p>
                <p className="text-xl font-bold text-foreground">
                  {formatMoney(totalDue)}
                </p>
              </div>
              <div className="rounded-xl border bg-surface-2 p-3">
                <p className="text-xs text-muted-foreground">Payment preview</p>
                <p className="text-xl font-bold">
                  {formatMoney(paymentPreview.amount)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Balance {formatMoney(paymentPreview.balance)}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {paymentRows.map((row, index) => (
                <div key={row.localId} className="rounded-xl border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">Payment {index + 1}</p>
                    {paymentRows.length > 1 ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          setPaymentRows((rows) =>
                            rows.filter((item) => item.localId !== row.localId),
                          )
                        }
                        aria-label="Remove payment line"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    ) : null}
                  </div>

                  <div className="mt-3 grid gap-3">
                    <select
                      value={row.paymentMethod}
                      onChange={(event) =>
                        updatePaymentRow(row.localId, {
                          paymentMethod: event.target.value as OtcPaymentMethod,
                          insuranceClaimStatus:
                            event.target.value === "INSURANCE"
                              ? "DRAFT"
                              : undefined,
                        })
                      }
                      className="h-10 rounded-lg border bg-card px-3 text-sm"
                    >
                      {PAYMENT_METHODS.map((method) => (
                        <option key={method.value} value={method.value}>
                          {method.label}
                        </option>
                      ))}
                    </select>

                    {row.paymentMethod === "INSURANCE" ? (
                      <div className="grid gap-3">
                        <Input
                          placeholder="Insurance provider"
                          value={row.insuranceProviderName ?? ""}
                          onChange={(event) =>
                            updatePaymentRow(row.localId, {
                              insuranceProviderName: event.target.value,
                            })
                          }
                          className="h-10"
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Input
                            placeholder="Scheme name"
                            value={row.insuranceSchemeName ?? ""}
                            onChange={(event) =>
                              updatePaymentRow(row.localId, {
                                insuranceSchemeName: event.target.value,
                              })
                            }
                            className="h-10"
                          />
                          <Input
                            placeholder="Member number"
                            value={row.insuranceMemberNumber ?? ""}
                            onChange={(event) =>
                              updatePaymentRow(row.localId, {
                                insuranceMemberNumber: event.target.value,
                              })
                            }
                            className="h-10"
                          />
                          <Input
                            placeholder="Authorization/reference"
                            value={
                              row.authorizationNumber ??
                              row.insuranceClaimReference ??
                              ""
                            }
                            onChange={(event) =>
                              updatePaymentRow(row.localId, {
                                authorizationNumber: event.target.value,
                                insuranceClaimReference: event.target.value,
                              })
                            }
                            className="h-10"
                          />
                          <select
                            value={row.insuranceClaimStatus ?? "DRAFT"}
                            onChange={(event) =>
                              updatePaymentRow(row.localId, {
                                insuranceClaimStatus:
                                  event.target.value as InsuranceClaimStatus,
                              })
                            }
                            className="h-10 rounded-lg border bg-card px-3 text-sm"
                          >
                            {CLAIM_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status.replace(/_/g, " ")}
                              </option>
                            ))}
                          </select>
                          <Input
                            type="number"
                            min={0}
                            placeholder="Covered amount"
                            value={row.insuranceCoveredAmount ?? ""}
                            onChange={(event) =>
                              updatePaymentRow(row.localId, {
                                insuranceCoveredAmount: Number(
                                  event.target.value || 0,
                                ),
                                amount: Number(event.target.value || 0),
                              })
                            }
                            className="h-10"
                          />
                          <Input
                            type="number"
                            min={0}
                            placeholder="Patient co-pay"
                            value={row.patientCoPayAmount ?? ""}
                            onChange={(event) =>
                              updatePaymentRow(row.localId, {
                                patientCoPayAmount: Number(
                                  event.target.value || 0,
                                ),
                              })
                            }
                            className="h-10"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input
                          type="number"
                          min={0}
                          placeholder="Amount"
                          value={row.amount ?? ""}
                          onChange={(event) =>
                            updatePaymentRow(row.localId, {
                              amount: Number(event.target.value || 0),
                            })
                          }
                          className="h-10"
                        />
                        {row.paymentMethod !== "CASH" ? (
                          <Input
                            placeholder={
                              row.paymentMethod === "MPESA_STK"
                                ? "Phone number"
                                : "Transaction/reference"
                            }
                            value={
                              row.paymentMethod === "MPESA_STK"
                                ? row.phoneNumber ?? ""
                                : row.transactionRef ?? row.mpesaReceiptNumber ?? ""
                            }
                            onChange={(event) =>
                              updatePaymentRow(row.localId, {
                                phoneNumber:
                                  row.paymentMethod === "MPESA_STK"
                                    ? event.target.value
                                    : row.phoneNumber,
                                transactionRef:
                                  row.paymentMethod !== "MPESA_STK"
                                    ? event.target.value
                                    : row.transactionRef,
                                mpesaReceiptNumber:
                                  row.paymentMethod === "MPESA_MANUAL"
                                    ? event.target.value
                                    : row.mpesaReceiptNumber,
                              })
                            }
                            className="h-10"
                          />
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setPaymentRows((rows) => [...rows, newPaymentDraft("CASH")])
                }
              >
                <Plus className="h-4 w-4" />
                Add payment line
              </Button>
              <Button
                type="button"
                onClick={handleRecordPayment}
                disabled={!sale || Boolean(busy) || sale.status === "PAID"}
              >
                {busy === "payment" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                Record payment
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleComplete}
                disabled={
                  !sale ||
                  Boolean(busy) ||
                  sale.status === "PAID" ||
                  sale.paymentStatus !== "PAID"
                }
              >
                <CheckCircle2 className="h-4 w-4" />
                Complete sale
              </Button>
              <Button
                type="button"
                onClick={handlePayAndComplete}
                disabled={!sale || Boolean(busy) || sale.status === "PAID"}
              >
                {busy === "complete" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Banknote className="h-4 w-4" />
                )}
                Pay and complete
              </Button>
            </div>

            <div className="rounded-xl border bg-surface-2 p-3">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-module" />
                <div className="text-xs text-muted-foreground">
                  Backend decides final payment state. Stock deducts only after
                  the backend confirms the sale is fully paid and completed.
                </div>
              </div>
            </div>

            <div className="rounded-xl border p-3">
              <p className="text-sm font-semibold">Receipt actions</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Receipt PDFs are server-generated. Pending insurance receipts
                remain marked as pending.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Button
                  variant="outline"
                  disabled={!saleCanShowReceipt(sale) || Boolean(busy)}
                  onClick={() =>
                    sale && downloadOtcReceiptPdf(sale.id, sale.saleNumber)
                  }
                >
                  <Printer className="h-4 w-4" />
                  Download receipt
                </Button>
                <Button
                  variant="outline"
                  disabled={!saleCanShowReceipt(sale)}
                  asChild={Boolean(saleCanShowReceipt(sale))}
                >
                  {saleCanShowReceipt(sale) && sale ? (
                    <Link href={`/print/otc-receipt/${sale.id}`}>
                      <Printer className="h-4 w-4" />
                      Open print route
                    </Link>
                  ) : (
                    <span>
                      <Printer className="h-4 w-4" />
                      Open print route
                    </span>
                  )}
                </Button>
              </div>
            </div>

            <Button type="button" variant="outline" onClick={resetSale}>
              <RefreshCw className="h-4 w-4" />
              New sale / reset
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
