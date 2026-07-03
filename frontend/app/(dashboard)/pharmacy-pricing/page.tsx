"use client";

import * as React from "react";
import {
  BadgeDollarSign,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  PackagePlus,
  Pill,
  Save,
  Search,
  Upload,
  Warehouse,
} from "lucide-react";

import { useScope } from "@/providers/scope-provider";
import { useBranchPharmacyStock } from "@/hooks/use-branch-pharmacy-stock";
import { useCreateBranchMedicineStock } from "@/hooks/use-create-branch-medicine-stock";
import { useCreatePharmacyMedicine } from "@/hooks/use-create-pharmacy-medicine";
import { useImportBranchMedicinePricing } from "@/hooks/use-import-branch-medicine-pricing";
import { usePharmacyMedicines } from "@/hooks/use-pharmacy-medicines";
import { useRestockBranchMedicine } from "@/hooks/use-restock-branch-medicine";
import { useUpdateBranchMedicineStock } from "@/hooks/use-update-branch-medicine-stock";
import {
  getBranchMedicinePricingTemplate,
  type BranchMedicineStockItem,
} from "@/services/pharmacy-stock-service";
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
    useBranchPharmacyStock(selectedBranchId, { pageSize: 100 });
  const createMedicineMutation = useCreatePharmacyMedicine();
  const createStockMutation = useCreateBranchMedicineStock();
  const importPricingMutation = useImportBranchMedicinePricing();
  const updateStockMutation = useUpdateBranchMedicineStock(selectedBranchId);
  const restockMutation = useRestockBranchMedicine();

  const medicines = Array.isArray(medicinesData) ? medicinesData : [];
  const branchStock = Array.isArray(stockData) ? stockData : (stockData?.data ?? []);

  const [message, setMessage] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [medicinePickerSearch, setMedicinePickerSearch] = React.useState("");
  const [isDownloadingTemplate, setIsDownloadingTemplate] =
    React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [medicineCode, setMedicineCode] = React.useState("");
  const [medicineName, setMedicineName] = React.useState("");
  const [dosageForm, setDosageForm] = React.useState("");
  const [strength, setStrength] = React.useState("");
  const [manufacturer, setManufacturer] = React.useState("");
  const [defaultUnitPrice, setDefaultUnitPrice] = React.useState("");

  const [selectedMedicineId, setSelectedMedicineId] = React.useState("");
  const [initialStock, setInitialStock] = React.useState("");
  const [branchReorderLevel, setBranchReorderLevel] = React.useState("");
  const [branchBuyingPrice, setBranchBuyingPrice] = React.useState("");
  const [branchUnitPrice, setBranchUnitPrice] = React.useState("");

  const [editingStockId, setEditingStockId] = React.useState<number | null>(
    null,
  );
  const [editBuyingPrice, setEditBuyingPrice] = React.useState("");
  const [editUnitPrice, setEditUnitPrice] = React.useState("");
  const [editReorderLevel, setEditReorderLevel] = React.useState("");
  const [editStockQuantity, setEditStockQuantity] = React.useState("");
  const [reorderSearch, setReorderSearch] = React.useState("");
  const [selectedReorderStockId, setSelectedReorderStockId] = React.useState("");
  const [reorderQuantity, setReorderQuantity] = React.useState("");
  const [reorderBuyingPrice, setReorderBuyingPrice] = React.useState("");
  const [reorderUnitPrice, setReorderUnitPrice] = React.useState("");

  const stockMedicineIds = new Set(branchStock.map((item) => item.medicineId));
  const unmappedMedicines = medicines.filter(
    (medicine) => !stockMedicineIds.has(medicine.id),
  );

  const filteredUnmappedMedicines = React.useMemo(() => {
    const query = medicinePickerSearch.trim().toLowerCase();
    if (!query) return unmappedMedicines.slice(0, 120);

    return unmappedMedicines
      .filter((medicine) =>
        [
          medicine.name,
          medicine.code,
          medicine.dosageForm,
          medicine.strength,
          medicine.manufacturer,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 120);
  }, [medicinePickerSearch, unmappedMedicines]);

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

  const filteredReorderStock = React.useMemo(() => {
    const query = reorderSearch.trim().toLowerCase();
    const source = branchStock.filter((item) => item.isActive !== false);
    if (!query) return source.slice(0, 120);

    return source
      .filter((item) =>
        [
          item.medicine?.name,
          item.medicine?.code,
          item.medicine?.dosageForm,
          item.medicine?.strength,
          item.branch?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 120);
  }, [branchStock, reorderSearch]);

  const missingPriceCount = branchStock.filter(
    (item) => item.unitPrice <= 0,
  ).length;
  const missingBuyingCount = branchStock.filter(
    (item) => item.buyingPrice <= 0,
  ).length;
  const totalStockValue = branchStock.reduce(
    (sum, item) => sum + item.stockQuantity * item.unitPrice,
    0,
  );
  const totalCostValue = branchStock.reduce(
    (sum, item) => sum + item.stockQuantity * item.buyingPrice,
    0,
  );
  const estimatedMargin = totalStockValue - totalCostValue;
  const activeCount = branchStock.filter((item) => item.isActive).length;

  const activeEditStock =
    branchStock.find((item) => item.id === editingStockId) ?? null;
  const activeReorderStock =
    branchStock.find((item) => String(item.id) === selectedReorderStockId) ??
    null;

  React.useEffect(() => {
    if (!activeReorderStock) {
      setReorderBuyingPrice("");
      setReorderUnitPrice("");
      return;
    }

    setReorderBuyingPrice(String(activeReorderStock.buyingPrice ?? 0));
    setReorderUnitPrice(String(activeReorderStock.unitPrice ?? 0));
  }, [activeReorderStock?.id]);

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
        buyingPrice: numberOrUndefined(branchBuyingPrice) ?? 0,
        unitPrice: numberOrUndefined(branchUnitPrice) ?? 0,
        isActive: true,
      });

      setSelectedMedicineId("");
      setInitialStock("");
      setBranchReorderLevel("");
      setBranchBuyingPrice("");
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
    setEditBuyingPrice(String(stock.buyingPrice ?? 0));
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
          buyingPrice: Number(editBuyingPrice || 0),
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

  const handleRestock = async () => {
    setMessage(null);

    if (!activeReorderStock) {
      setMessage("Search and select the drug to reorder.");
      return;
    }

    const quantity = Number(reorderQuantity || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setMessage("Enter a valid reordered quantity.");
      return;
    }

    try {
      await restockMutation.mutateAsync({
        stockId: activeReorderStock.id,
        payload: {
          quantityToAdd: quantity,
          buyingPrice: numberOrUndefined(reorderBuyingPrice),
          unitPrice: numberOrUndefined(reorderUnitPrice),
        },
      });

      setSelectedReorderStockId("");
      setReorderSearch("");
      setReorderQuantity("");
      setReorderBuyingPrice("");
      setReorderUnitPrice("");
      setMessage("Drug reorder received and branch stock updated.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to update reorder.",
      );
    }
  };

  const handleDownloadTemplate = async () => {
    setMessage(null);

    if (!selectedBranchId) {
      setMessage("Select a branch before downloading the pricing template.");
      return;
    }

    try {
      setIsDownloadingTemplate(true);
      const template = await getBranchMedicinePricingTemplate(selectedBranchId);
      const blob = new Blob([`\uFEFF${template.csvText}`], {
        type: "text/csv;charset=utf-8",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = template.fileName;
      link.click();
      window.URL.revokeObjectURL(url);
      setMessage(
        `Template ready for ${template.branch.name}. ${template.rowCount} master medicines included.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to download branch pricing template.",
      );
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleImportTemplate = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setMessage(null);

    if (!selectedBranchId) {
      setMessage("Select a branch before importing pharmacy pricing.");
      event.target.value = "";
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const csvText = await file.text();
      const result = await importPricingMutation.mutateAsync({
        branchId: selectedBranchId,
        csvText,
      });
      setMessage(
        `Imported ${result.processed} rows: ${result.created} branch prices created, ${result.updated} updated, ${result.masterCreated ?? 0} new master drugs added, ${result.skipped} skipped.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to import branch pharmacy pricing.",
      );
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[1.4rem] border surface-spotlight p-6 shadow-md md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-500/16 via-cyan-500/8 to-transparent" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge className="mb-4 rounded-full border-0 bg-success/10 px-3 py-1 text-success">
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
              <p className="text-xs uppercase text-muted-foreground">
                Facility
              </p>
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
                      event.target.value
                        ? Number(event.target.value)
                        : undefined,
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
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-module">
          {message}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-[1.2rem] surface-spotlight shadow-md">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Medicine Master</p>
              <p className="mt-2 text-2xl font-bold">{medicines.length}</p>
            </div>
            <Pill className="h-7 w-7 text-emerald-500" />
          </CardContent>
        </Card>
        <Card className="rounded-[1.2rem] surface-spotlight shadow-md">
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
        <Card className="rounded-[1.2rem] surface-spotlight shadow-md">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Stock Value</p>
              <p className="mt-2 text-xl font-bold">
                {formatMoney(totalStockValue)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Margin {formatMoney(estimatedMargin)}
              </p>
            </div>
            <BadgeDollarSign className="h-7 w-7 text-amber-500" />
          </CardContent>
        </Card>
        <Card className="rounded-[1.2rem] surface-spotlight shadow-md">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Price Gaps</p>
              <p className="mt-2 text-2xl font-bold">{missingPriceCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {missingBuyingCount} missing buying cost
              </p>
            </div>
            <CheckCircle2 className="h-7 w-7 text-destructive" />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-5">
          <Card className="rounded-[1.2rem] surface-spotlight shadow-md">
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

          <Card className="rounded-[1.2rem] surface-spotlight shadow-md">
            <CardHeader>
              <CardTitle>Excel Branch Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border bg-background/65 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">Download, price, upload</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      The file includes every master drug. The branch fills
                      stock, reorder level, buying price, and selling price.
                    </p>
                  </div>
                </div>
              </div>
              <input
                ref={fileInputRef}
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
                  disabled={!selectedBranchId || isDownloadingTemplate}
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
                  onClick={() => fileInputRef.current?.click()}
                  disabled={
                    !selectedBranchId || importPricingMutation.isPending
                  }
                  className="h-12 rounded-xl"
                >
                  {importPricingMutation.isPending ? (
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
              <CardTitle>Drug Reorder</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Search Drug
                </label>
                <Input
                  value={reorderSearch}
                  onChange={(event) => setReorderSearch(event.target.value)}
                  className="mb-2 h-12 rounded-xl"
                  placeholder="Search medicine name, code, strength, or form"
                  disabled={!selectedBranchId}
                />
                <select
                  value={selectedReorderStockId}
                  onChange={(event) =>
                    setSelectedReorderStockId(event.target.value)
                  }
                  className={appSelectClass}
                  disabled={!selectedBranchId}
                >
                  <option value="">Select branch stock item</option>
                  {filteredReorderStock.map((stock) => (
                    <option key={stock.id} value={String(stock.id)}>
                      {medicineLabel(stock.medicine)}
                    </option>
                  ))}
                </select>
              </div>

              {activeReorderStock ? (
                <div className="grid gap-3 rounded-xl border bg-background/65 p-4 text-sm md:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">
                      Current Stock
                    </p>
                    <p className="mt-1 font-bold">
                      {activeReorderStock.stockQuantity}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">
                      Reorder Level
                    </p>
                    <p className="mt-1 font-bold">
                      {activeReorderStock.reorderLevel}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">
                      Unit
                    </p>
                    <p className="mt-1 font-bold">
                      {[
                        activeReorderStock.medicine?.dosageForm,
                        activeReorderStock.medicine?.strength,
                      ]
                        .filter(Boolean)
                        .join(" / ") || "Unit"}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Reordered Amount
                  </label>
                  <Input
                    type="number"
                    value={reorderQuantity}
                    onChange={(event) => setReorderQuantity(event.target.value)}
                    className="h-12 rounded-xl"
                    disabled={!activeReorderStock}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Buying Price
                  </label>
                  <Input
                    type="number"
                    value={reorderBuyingPrice}
                    onChange={(event) =>
                      setReorderBuyingPrice(event.target.value)
                    }
                    className="h-12 rounded-xl"
                    disabled={!activeReorderStock}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Selling Price
                  </label>
                  <Input
                    type="number"
                    value={reorderUnitPrice}
                    onChange={(event) =>
                      setReorderUnitPrice(event.target.value)
                    }
                    className="h-12 rounded-xl"
                    disabled={!activeReorderStock}
                  />
                </div>
              </div>

              <Button
                type="button"
                onClick={handleRestock}
                disabled={
                  restockMutation.isPending ||
                  !selectedBranchId ||
                  !activeReorderStock
                }
                className="h-12 rounded-xl"
              >
                {restockMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PackagePlus className="mr-2 h-4 w-4" />
                )}
                Receive Reorder
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-[1.2rem] surface-spotlight shadow-md">
            <CardHeader>
              <CardTitle>Add Branch Price</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Medicine
                </label>
                <Input
                  value={medicinePickerSearch}
                  onChange={(event) =>
                    setMedicinePickerSearch(event.target.value)
                  }
                  className="mb-2 h-12 rounded-xl"
                  placeholder="Search drug name, code, form, or strength"
                  disabled={!selectedBranchId}
                />
                <select
                  value={selectedMedicineId}
                  onChange={(event) =>
                    setSelectedMedicineId(event.target.value)
                  }
                  className={appSelectClass}
                  disabled={!selectedBranchId}
                >
                  <option value="">Select medicine</option>
                  {filteredUnmappedMedicines.map((medicine) => (
                    <option key={medicine.id} value={String(medicine.id)}>
                      {medicineLabel(medicine)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
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
                    Buying Price
                  </label>
                  <Input
                    type="number"
                    value={branchBuyingPrice}
                    onChange={(event) =>
                      setBranchBuyingPrice(event.target.value)
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

        <Card className="rounded-[1.2rem] surface-spotlight shadow-md">
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
              <div className="max-h-[620px] overflow-auto rounded-xl border bg-background/65">
                <table className="w-full min-w-[1040px] text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-muted text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Code</th>
                      <th className="px-4 py-3 font-semibold">Medicine</th>
                      <th className="px-4 py-3 font-semibold">Stock</th>
                      <th className="px-4 py-3 font-semibold">Reorder</th>
                      <th className="px-4 py-3 font-semibold">Buying</th>
                      <th className="px-4 py-3 font-semibold">Selling</th>
                      <th className="px-4 py-3 font-semibold">Margin</th>
                      <th className="px-4 py-3 font-semibold">Value</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStock.map((stock) => {
                      const isEditing = editingStockId === stock.id;
                      const margin = stock.unitPrice - stock.buyingPrice;

                      return (
                        <tr
                          key={stock.id}
                          className="border-t align-top transition hover:bg-muted/35"
                        >
                          <td className="px-4 py-4">
                            <Badge variant="outline" className="rounded-full">
                              {stock.medicine?.code ||
                                `MED-${stock.medicineId}`}
                            </Badge>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-semibold">
                              {medicineLabel(stock.medicine)}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {stock.medicine?.manufacturer ||
                                "No manufacturer"}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            {isEditing ? (
                              <Input
                                type="number"
                                value={editStockQuantity}
                                onChange={(event) =>
                                  setEditStockQuantity(event.target.value)
                                }
                                className="h-10 min-w-24 rounded-xl"
                              />
                            ) : (
                              stock.stockQuantity
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {isEditing ? (
                              <Input
                                type="number"
                                value={editReorderLevel}
                                onChange={(event) =>
                                  setEditReorderLevel(event.target.value)
                                }
                                className="h-10 min-w-24 rounded-xl"
                              />
                            ) : (
                              stock.reorderLevel
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {isEditing ? (
                              <Input
                                type="number"
                                value={editBuyingPrice}
                                onChange={(event) =>
                                  setEditBuyingPrice(event.target.value)
                                }
                                className="h-10 min-w-28 rounded-xl"
                              />
                            ) : (
                              formatMoney(stock.buyingPrice)
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {isEditing ? (
                              <Input
                                type="number"
                                value={editUnitPrice}
                                onChange={(event) =>
                                  setEditUnitPrice(event.target.value)
                                }
                                className="h-10 min-w-28 rounded-xl"
                              />
                            ) : (
                              formatMoney(stock.unitPrice)
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={
                                margin >= 0
                                  ? "font-semibold text-success"
                                  : "font-semibold text-destructive"
                              }
                            >
                              {formatMoney(margin)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            {formatMoney(stock.unitPrice * stock.stockQuantity)}
                          </td>
                          <td className="px-4 py-4">
                            {stock.unitPrice <= 0 ? (
                              <Badge className="rounded-full border-0 bg-amber-500/10 text-warning">
                                Missing price
                              </Badge>
                            ) : stock.stockQuantity <= stock.reorderLevel ? (
                              <Badge className="rounded-full border-0 bg-destructive/10 text-destructive">
                                Reorder
                              </Badge>
                            ) : (
                              <Badge className="rounded-full border-0 bg-success/10 text-success">
                                Ready
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {isEditing ? (
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  size="sm"
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
                                  size="sm"
                                  variant="outline"
                                  className="rounded-xl"
                                  onClick={() => setEditingStockId(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="rounded-xl"
                                onClick={() => handleStartEdit(stock)}
                              >
                                Edit
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
