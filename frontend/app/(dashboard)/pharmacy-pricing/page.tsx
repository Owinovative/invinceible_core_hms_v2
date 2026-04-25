"use client";

import * as React from "react";
import {
  BadgeDollarSign,
  CheckCircle2,
  Loader2,
  PackagePlus,
  Pill,
  Save,
  Search,
  Warehouse,
} from "lucide-react";

import { useScope } from "@/providers/scope-provider";
import { useBranchPharmacyStock } from "@/hooks/use-branch-pharmacy-stock";
import { useCreateBranchMedicineStock } from "@/hooks/use-create-branch-medicine-stock";
import { useCreatePharmacyMedicine } from "@/hooks/use-create-pharmacy-medicine";
import { usePharmacyMedicines } from "@/hooks/use-pharmacy-medicines";
import { useUpdateBranchMedicineStock } from "@/hooks/use-update-branch-medicine-stock";
import type { BranchMedicineStockItem } from "@/services/pharmacy-stock-service";
import type { PharmacyMedicine } from "@/services/pharmacy-service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { appSelectClass } from "@/lib/select-class";

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function medicineLabel(medicine?: PharmacyMedicine | null) {
  if (!medicine) return "Unknown medicine";
  return [medicine.name, medicine.strength, medicine.dosageForm]
    .filter(Boolean)
    .join(" / ");
}

function numberOrUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : undefined;
}

export default function PharmacyPricingPage() {
  const {
    facilityId,
    facilityName,
    selectedBranchId,
    selectedBranchName,
    availableBranches,
    canSwitchBranches,
    setSelectedBranchId,
  } = useScope();

  const { data: medicinesData = [], isLoading: medicinesLoading } =
    usePharmacyMedicines();
  const { data: stockData = [], isLoading: stockLoading } =
    useBranchPharmacyStock(selectedBranchId);
  const createMedicineMutation = useCreatePharmacyMedicine();
  const createStockMutation = useCreateBranchMedicineStock();
  const updateStockMutation = useUpdateBranchMedicineStock(selectedBranchId);

  const medicines = Array.isArray(medicinesData) ? medicinesData : [];
  const branchStock = Array.isArray(stockData) ? stockData : [];

  const [message, setMessage] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  const [medicineCode, setMedicineCode] = React.useState("");
  const [medicineName, setMedicineName] = React.useState("");
  const [dosageForm, setDosageForm] = React.useState("");
  const [strength, setStrength] = React.useState("");
  const [manufacturer, setManufacturer] = React.useState("");
  const [defaultUnitPrice, setDefaultUnitPrice] = React.useState("");

  const [selectedMedicineId, setSelectedMedicineId] = React.useState("");
  const [initialStock, setInitialStock] = React.useState("");
  const [branchReorderLevel, setBranchReorderLevel] = React.useState("");
  const [branchUnitPrice, setBranchUnitPrice] = React.useState("");

  const [editingStockId, setEditingStockId] = React.useState<number | null>(
    null,
  );
  const [editUnitPrice, setEditUnitPrice] = React.useState("");
  const [editReorderLevel, setEditReorderLevel] = React.useState("");
  const [editStockQuantity, setEditStockQuantity] = React.useState("");

  const stockMedicineIds = new Set(branchStock.map((item) => item.medicineId));
  const unmappedMedicines = medicines.filter(
    (medicine) => !stockMedicineIds.has(medicine.id),
  );

  const filteredStock = branchStock.filter((item) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;

    return [
      item.medicine?.name,
      item.medicine?.code,
      item.medicine?.dosageForm,
      item.medicine?.strength,
      item.branch?.name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  const missingPriceCount = branchStock.filter(
    (item) => item.unitPrice <= 0,
  ).length;
  const totalStockValue = branchStock.reduce(
    (sum, item) => sum + item.stockQuantity * item.unitPrice,
    0,
  );
  const activeCount = branchStock.filter((item) => item.isActive).length;

  const activeEditStock =
    branchStock.find((item) => item.id === editingStockId) ?? null;

  const handleCreateMedicine = async () => {
    setMessage(null);

    if (!medicineCode.trim() || !medicineName.trim()) {
      setMessage("Medicine code and name are required.");
      return;
    }

    try {
      await createMedicineMutation.mutateAsync({
        code: medicineCode.trim(),
        name: medicineName.trim(),
        dosageForm: dosageForm.trim() || undefined,
        strength: strength.trim() || undefined,
        manufacturer: manufacturer.trim() || undefined,
        unitPrice: numberOrUndefined(defaultUnitPrice),
        isActive: true,
      });

      setMedicineCode("");
      setMedicineName("");
      setDosageForm("");
      setStrength("");
      setManufacturer("");
      setDefaultUnitPrice("");
      setMessage("Medicine master item created.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to create medicine.",
      );
    }
  };

  const handleCreateBranchStock = async () => {
    setMessage(null);

    if (!facilityId || !selectedBranchId) {
      setMessage("Select a facility branch before creating branch pricing.");
      return;
    }

    if (!selectedMedicineId) {
      setMessage("Select a medicine to add to this branch.");
      return;
    }

    try {
      await createStockMutation.mutateAsync({
        facilityId,
        branchId: selectedBranchId,
        medicineId: Number(selectedMedicineId),
        stockQuantity: numberOrUndefined(initialStock) ?? 0,
        reorderLevel: numberOrUndefined(branchReorderLevel) ?? 0,
        unitPrice: numberOrUndefined(branchUnitPrice) ?? 0,
        isActive: true,
      });

      setSelectedMedicineId("");
      setInitialStock("");
      setBranchReorderLevel("");
      setBranchUnitPrice("");
      setMessage("Branch medicine price and stock created.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to create branch medicine price.",
      );
    }
  };

  const handleStartEdit = (stock: BranchMedicineStockItem) => {
    setEditingStockId(stock.id);
    setEditUnitPrice(String(stock.unitPrice ?? 0));
    setEditReorderLevel(String(stock.reorderLevel ?? 0));
    setEditStockQuantity(String(stock.stockQuantity ?? 0));
    setMessage(null);
  };

  const handleSaveEdit = async () => {
    if (!activeEditStock) return;
    setMessage(null);

    try {
      await updateStockMutation.mutateAsync({
        stockId: activeEditStock.id,
        payload: {
          unitPrice: Number(editUnitPrice || 0),
          reorderLevel: Number(editReorderLevel || 0),
          stockQuantity: Number(editStockQuantity || 0),
        },
      });

      setEditingStockId(null);
      setMessage("Branch price and stock controls updated.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to update branch medicine price.",
      );
    }
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[1.4rem] border gradient-border p-6 panel-shadow md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-500/16 via-cyan-500/8 to-transparent" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge className="mb-4 rounded-full border-0 bg-emerald-500/10 px-3 py-1 text-emerald-700 dark:text-emerald-300">
              Medicine master and branch pricing
            </Badge>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-background/80">
                <Pill className="h-7 w-7 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Pharmacy Pricing
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Common medicine catalogue, branch-specific stock, and branch
                  selling prices wired to dispensing.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[420px]">
            <div className="rounded-xl border bg-background/70 p-4">
              <p className="text-xs uppercase text-muted-foreground">Facility</p>
              <p className="mt-2 text-sm font-semibold">
                {facilityName || "No facility"}
              </p>
            </div>
            <div className="rounded-xl border bg-background/70 p-4">
              <p className="text-xs uppercase text-muted-foreground">Branch</p>
              {canSwitchBranches ? (
                <select
                  value={selectedBranchId ? String(selectedBranchId) : ""}
                  onChange={(event) =>
                    setSelectedBranchId(
                      event.target.value ? Number(event.target.value) : undefined,
                    )
                  }
                  className="mt-2 h-10 w-full rounded-xl border bg-background px-3 text-sm"
                >
                  <option value="">Select branch</option>
                  {availableBranches.map((branch) => (
                    <option key={branch.id} value={String(branch.id)}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="mt-2 text-sm font-semibold">
                  {selectedBranchName || "No branch"}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {message ? (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-700 dark:text-cyan-200">
          {message}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-[1.2rem] gradient-border panel-shadow">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Medicine Master</p>
              <p className="mt-2 text-2xl font-bold">{medicines.length}</p>
            </div>
            <Pill className="h-7 w-7 text-emerald-500" />
          </CardContent>
        </Card>
        <Card className="rounded-[1.2rem] gradient-border panel-shadow">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Branch Items</p>
              <p className="mt-2 text-2xl font-bold">{branchStock.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {activeCount} active
              </p>
            </div>
            <Warehouse className="h-7 w-7 text-cyan-500" />
          </CardContent>
        </Card>
        <Card className="rounded-[1.2rem] gradient-border panel-shadow">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Stock Value</p>
              <p className="mt-2 text-xl font-bold">
                {formatMoney(totalStockValue)}
              </p>
            </div>
            <BadgeDollarSign className="h-7 w-7 text-amber-500" />
          </CardContent>
        </Card>
        <Card className="rounded-[1.2rem] gradient-border panel-shadow">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Price Gaps</p>
              <p className="mt-2 text-2xl font-bold">{missingPriceCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {unmappedMedicines.length} not in branch
              </p>
            </div>
            <CheckCircle2 className="h-7 w-7 text-rose-500" />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-5">
          <Card className="rounded-[1.2rem] gradient-border panel-shadow">
            <CardHeader>
              <CardTitle>Create Medicine Master</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Code</label>
                  <Input
                    value={medicineCode}
                    onChange={(event) => setMedicineCode(event.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Name</label>
                  <Input
                    value={medicineName}
                    onChange={(event) => setMedicineName(event.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Dosage Form
                  </label>
                  <Input
                    value={dosageForm}
                    onChange={(event) => setDosageForm(event.target.value)}
                    className="h-12 rounded-xl"
                    placeholder="Tablet, syrup, injection"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Strength
                  </label>
                  <Input
                    value={strength}
                    onChange={(event) => setStrength(event.target.value)}
                    className="h-12 rounded-xl"
                    placeholder="500mg, 5mg/ml"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Manufacturer
                </label>
                <Input
                  value={manufacturer}
                  onChange={(event) => setManufacturer(event.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Default Price
                </label>
                <Input
                  type="number"
                  value={defaultUnitPrice}
                  onChange={(event) => setDefaultUnitPrice(event.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
              <Button
                type="button"
                onClick={handleCreateMedicine}
                disabled={createMedicineMutation.isPending}
                className="h-12 rounded-xl"
              >
                {createMedicineMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PackagePlus className="mr-2 h-4 w-4" />
                )}
                Save Medicine
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-[1.2rem] gradient-border panel-shadow">
            <CardHeader>
              <CardTitle>Add Branch Price</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Medicine
                </label>
                <select
                  value={selectedMedicineId}
                  onChange={(event) => setSelectedMedicineId(event.target.value)}
                  className={appSelectClass}
                  disabled={!selectedBranchId}
                >
                  <option value="">Select medicine</option>
                  {unmappedMedicines.map((medicine) => (
                    <option key={medicine.id} value={String(medicine.id)}>
                      {medicineLabel(medicine)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Initial Stock
                  </label>
                  <Input
                    type="number"
                    value={initialStock}
                    onChange={(event) => setInitialStock(event.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Reorder Level
                  </label>
                  <Input
                    type="number"
                    value={branchReorderLevel}
                    onChange={(event) =>
                      setBranchReorderLevel(event.target.value)
                    }
                    className="h-12 rounded-xl"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Branch Price
                  </label>
                  <Input
                    type="number"
                    value={branchUnitPrice}
                    onChange={(event) => setBranchUnitPrice(event.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>
              <Button
                type="button"
                onClick={handleCreateBranchStock}
                disabled={createStockMutation.isPending || !selectedBranchId}
                className="h-12 rounded-xl"
              >
                {createStockMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Branch Price
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-[1.2rem] gradient-border panel-shadow">
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle>Branch Price Register</CardTitle>
              <div className="relative w-full lg:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-11 rounded-xl pl-9"
                  placeholder="Search medicines"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {medicinesLoading || stockLoading ? (
              <div className="text-sm text-muted-foreground">
                Loading pharmacy pricing...
              </div>
            ) : !selectedBranchId ? (
              <div className="rounded-xl border border-dashed bg-background/65 p-4 text-sm text-muted-foreground">
                Select a branch to manage prices.
              </div>
            ) : filteredStock.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-background/65 p-4 text-sm text-muted-foreground">
                No branch price records found.
              </div>
            ) : (
              filteredStock.map((stock) => (
                <div
                  key={stock.id}
                  className="rounded-xl border bg-background/65 p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="rounded-full">
                          {stock.medicine?.code || `MED-${stock.medicineId}`}
                        </Badge>
                        {stock.unitPrice <= 0 ? (
                          <Badge className="rounded-full border-0 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                            Missing price
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-3 font-semibold">
                        {medicineLabel(stock.medicine)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Stock {stock.stockQuantity} / Reorder {stock.reorderLevel}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Branch price {formatMoney(stock.unitPrice)} / Value{" "}
                        {formatMoney(stock.unitPrice * stock.stockQuantity)}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => handleStartEdit(stock)}
                    >
                      Edit
                    </Button>
                  </div>

                  {editingStockId === stock.id ? (
                    <div className="mt-4 grid gap-3 border-t pt-4 md:grid-cols-3">
                      <div>
                        <label className="mb-2 block text-xs font-medium">
                          Stock
                        </label>
                        <Input
                          type="number"
                          value={editStockQuantity}
                          onChange={(event) =>
                            setEditStockQuantity(event.target.value)
                          }
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-medium">
                          Reorder
                        </label>
                        <Input
                          type="number"
                          value={editReorderLevel}
                          onChange={(event) =>
                            setEditReorderLevel(event.target.value)
                          }
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-medium">
                          Price
                        </label>
                        <Input
                          type="number"
                          value={editUnitPrice}
                          onChange={(event) =>
                            setEditUnitPrice(event.target.value)
                          }
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="flex gap-3 md:col-span-3">
                        <Button
                          type="button"
                          className="rounded-xl"
                          onClick={handleSaveEdit}
                          disabled={updateStockMutation.isPending}
                        >
                          {updateStockMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="mr-2 h-4 w-4" />
                          )}
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => setEditingStockId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
