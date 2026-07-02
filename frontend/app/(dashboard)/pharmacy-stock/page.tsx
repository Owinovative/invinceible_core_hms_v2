"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Package,
  Pill,
  RefreshCw,
  Search,
  Warehouse,
} from "lucide-react";

import { useScope } from "@/providers/scope-provider";
import { useBranchPharmacyStock } from "@/hooks/use-branch-pharmacy-stock";
import { useLowPharmacyStock } from "@/hooks/use-low-pharmacy-stock";
import { useRestockBranchMedicine } from "@/hooks/use-restock-branch-medicine";
import type { BranchMedicineStockItem } from "@/services/pharmacy-stock-service";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function stockTone(item: BranchMedicineStockItem) {
  if (item.stockQuantity <= 0) {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }

  if (item.stockQuantity <= item.reorderLevel) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  }

  return "border-emerald-500/20 bg-success/10 text-emerald-300";
}

function stockLabel(item: BranchMedicineStockItem) {
  if (item.stockQuantity <= 0) return "OUT OF STOCK";
  if (item.stockQuantity <= item.reorderLevel) return "LOW STOCK";
  return "IN STOCK";
}

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function PharmacyStockPage() {
  const { selectedBranchId, selectedBranchName, facilityName } = useScope();

  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const pageSize = 25;
  const deferredSearch = React.useDeferredValue(search);
  const { data, isLoading } = useBranchPharmacyStock(selectedBranchId, {
    page,
    pageSize,
    search: deferredSearch,
  });
  const { data: lowStockData } = useLowPharmacyStock();
  const restockMutation = useRestockBranchMedicine();

  const stocks = Array.isArray(data) ? data : (data?.data ?? []);
  const stockMeta = Array.isArray(data) ? undefined : data?.meta;
  const [message, setMessage] = React.useState<string | null>(null);

  const [activeStockId, setActiveStockId] = React.useState<number | null>(null);
  const [quantityToAdd, setQuantityToAdd] = React.useState("");
  const [reorderLevel, setReorderLevel] = React.useState("");
  const [unitPrice, setUnitPrice] = React.useState("");

  React.useEffect(() => {
    setPage(1);
  }, [deferredSearch, selectedBranchId]);

  const totalItems = stockMeta?.total ?? stocks.length;
  const lowStockCount = stocks.filter(
    (item) => item.stockQuantity > 0 && item.stockQuantity <= item.reorderLevel,
  ).length;
  const outOfStockCount = stocks.filter((item) => item.stockQuantity <= 0).length;
  const inStockCount = stocks.filter(
    (item) => item.stockQuantity > item.reorderLevel,
  ).length;
  const missingPriceCount = stocks.filter((item) => item.unitPrice <= 0).length;
  const totalStockValue = stocks.reduce(
    (sum, item) => sum + item.stockQuantity * item.unitPrice,
    0,
  );

  const activeStock =
    stocks.find((item) => item.id === activeStockId) ?? null;

  React.useEffect(() => {
    if (!activeStock) return;
    setReorderLevel(String(activeStock.reorderLevel ?? 0));
    setUnitPrice(String(activeStock.unitPrice ?? 0));
  }, [activeStockId]);

  const handleOpenRestock = (item: BranchMedicineStockItem) => {
    setActiveStockId(item.id);
    setQuantityToAdd("");
    setReorderLevel(String(item.reorderLevel ?? 0));
    setUnitPrice(String(item.unitPrice ?? 0));
    setMessage(null);
  };

  const handleRestock = async () => {
    if (!activeStock) return;

    const qty = Number(quantityToAdd);
    if (!qty || qty <= 0) {
      setMessage("Enter a valid quantity to add.");
      return;
    }

    setMessage(null);

    await restockMutation.mutateAsync({
      stockId: activeStock.id,
      payload: {
        quantityToAdd: qty,
        reorderLevel: reorderLevel ? Number(reorderLevel) : undefined,
        unitPrice: unitPrice ? Number(unitPrice) : undefined,
      },
    });

    setQuantityToAdd("");
    setActiveStockId(null);
    setMessage("Medicine stock restocked successfully.");
    setReorderLevel("");
    setUnitPrice("");
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border surface-spotlight shadow-md p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cyan-600/10 via-cyan-500/5 to-transparent" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <Badge className="rounded-full border-0 bg-cyan-600/10 px-3 py-1 text-module">
              Pharmacy Stock
            </Badge>

            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10">
                <Warehouse className="h-7 w-7 text-primary" />
              </div>

              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Branch Pharmacy Stock
                </h1>
                <p className="text-muted-foreground">
                  Control branch stock, reorder levels, and dispensing prices
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
            <div className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Facility
              </p>
              <p className="mt-2 text-sm font-semibold">{facilityName || "No facility"}</p>
            </div>

            <div className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4">
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

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
        <Card className="rounded-[1.6rem] surface-spotlight shadow-md">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Stock Items</p>
              <p className="mt-2 text-2xl font-bold">{totalItems}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Package className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.6rem] surface-spotlight shadow-md">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">In Stock</p>
              <p className="mt-2 text-2xl font-bold">{inStockCount}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.6rem] surface-spotlight shadow-md">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Low Stock</p>
              <p className="mt-2 text-2xl font-bold">{lowStockCount}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <AlertTriangle className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.6rem] surface-spotlight shadow-md">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Out of Stock</p>
              <p className="mt-2 text-2xl font-bold">{outOfStockCount}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Pill className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.6rem] surface-spotlight shadow-md">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Stock Value</p>
              <p className="mt-2 text-xl font-bold">
                {formatMoney(totalStockValue)}
              </p>
              {missingPriceCount > 0 ? (
                <p className="mt-1 text-xs text-warning">
                  {missingPriceCount} missing prices
                </p>
              ) : null}
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Pill className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle>Branch Stock List</CardTitle>
              <div className="relative w-full lg:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-11 rounded-xl pl-9"
                  placeholder="Search medicine, code, form"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading stock...</div>
            ) : stocks.length === 0 ? (
              <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-card/[0.02] p-5 text-sm text-muted-foreground">
                No branch medicine stock records matched.
              </div>
            ) : (
              <>
                {stocks.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <p className="font-semibold">
                          {item.medicine?.name || `Medicine #${item.medicineId}`}
                        </p>

                        <p className="text-sm text-muted-foreground">
                          {[item.medicine?.code, item.medicine?.dosageForm, item.medicine?.strength]
                            .filter(Boolean)
                            .join(" / ") || "-"}
                        </p>

                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                            <p className="text-xs text-muted-foreground">Stock Quantity</p>
                            <p className="mt-1 text-sm font-medium">{item.stockQuantity}</p>
                          </div>

                          <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                            <p className="text-xs text-muted-foreground">Reorder Level</p>
                            <p className="mt-1 text-sm font-medium">{item.reorderLevel}</p>
                          </div>

                          <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                            <p className="text-xs text-muted-foreground">Unit Price</p>
                            <p className="mt-1 text-sm font-medium">
                              {formatMoney(item.unitPrice)}
                            </p>
                            {item.unitPrice <= 0 ? (
                              <p className="mt-1 text-xs text-warning">
                                Fix before dispensing
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Badge className={`rounded-full border px-3 py-1 ${stockTone(item)}`}>
                          {stockLabel(item)}
                        </Badge>

                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-2xl"
                          onClick={() => handleOpenRestock(item)}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Restock
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {stockMeta ? (
                  <div className="flex flex-col gap-3 rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-3 text-sm md:flex-row md:items-center md:justify-between">
                    <span className="text-muted-foreground">
                      Page {stockMeta.page} of {stockMeta.totalPages} /
                      showing {stocks.length} of {stockMeta.total}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                        disabled={stockMeta.page <= 1 || isLoading}
                      >
                        Previous
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((current) => current + 1)}
                        disabled={!stockMeta.hasNextPage || isLoading}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
            <CardHeader>
              <CardTitle>Restock Medicine</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {!activeStock ? (
                <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-card/[0.02] p-5 text-sm text-muted-foreground">
                  Select a medicine stock item and click Restock.
                </div>
              ) : (
                <>
                  <div className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4">
                    <p className="font-semibold">
                      {activeStock.medicine?.name || `Medicine #${activeStock.medicineId}`}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Current stock: {activeStock.stockQuantity}
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">Quantity to Add</label>
                    <Input
                      type="number"
                      value={quantityToAdd}
                      onChange={(e) => setQuantityToAdd(e.target.value)}
                      className="h-12 rounded-2xl"
                      placeholder="50"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">Reorder Level</label>
                    <Input
                      type="number"
                      value={reorderLevel}
                      onChange={(e) => setReorderLevel(e.target.value)}
                      className="h-12 rounded-2xl"
                      placeholder="10"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">Unit Price</label>
                    <Input
                      type="number"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      className="h-12 rounded-2xl"
                      placeholder="25"
                    />
                  </div>

                  <Button
                    type="button"
                    className="h-12 rounded-2xl"
                    onClick={handleRestock}
                    disabled={restockMutation.isPending}
                  >
                    {restockMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Save Restock
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
            <CardHeader>
              <CardTitle>Low Stock Monitor</CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              {!(lowStockData?.lowStockItems?.length || lowStockData?.outOfStockItems?.length) ? (
                <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-card/[0.02] p-4 text-sm text-muted-foreground">
                  No low-stock alerts right now.
                </div>
              ) : (
                <>
                  {(lowStockData?.outOfStockItems ?? []).map((item) => (
                    <div
                      key={`out-${item.id}`}
                      className="rounded-[1rem] border border-red-500/20 bg-red-500/10 p-4"
                    >
                      <p className="font-medium text-red-300">{item.medicineName || "Unknown medicine"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Out of stock / Reorder level: {item.reorderLevel}
                      </p>
                    </div>
                  ))}

                  {(lowStockData?.lowStockItems ?? []).map((item) => (
                    <div
                      key={`low-${item.id}`}
                      className="rounded-[1rem] border border-amber-500/20 bg-amber-500/10 p-4"
                    >
                      <p className="font-medium text-amber-300">{item.medicineName || "Unknown medicine"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Stock: {item.stockQuantity} / Reorder level: {item.reorderLevel}
                      </p>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
