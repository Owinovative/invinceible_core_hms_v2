export function formatIpdDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

export function ipdPatientName(
  patient?: {
    firstName?: string;
    middleName?: string | null;
    lastName?: string;
  } | null,
) {
  if (!patient) return "Unknown patient";
  return [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(" ");
}

export function ipdStaffName(
  staff?: {
    firstName?: string;
    lastName?: string;
    staffCode?: string;
  } | null,
) {
  if (!staff) return "—";
  const name = [staff.firstName, staff.lastName].filter(Boolean).join(" ");
  return name || staff.staffCode || "—";
}

export function ipdStatusTone(status?: string | null) {
  switch ((status || "").toUpperCase()) {
    case "ADMITTED":
      return "border-cyan-500/20 bg-cyan-500/10 text-cyan-300";
    case "DISCHARGED":
    case "ADMINISTERED":
    case "RESULTED":
      return "border-emerald-500/20 bg-success/10 text-emerald-300";
    case "PLANNED":
    case "PENDING":
      return "border-amber-500/20 bg-amber-500/10 text-amber-300";
    default:
      return "border-white/10 bg-card/[0.04] text-muted-foreground";
  }
}

type LabTestOption = {
  testName?: string | null;
  category?: string | null;
  specimenType?: string | null;
};

export function filterIpdLabTests<T extends LabTestOption>(
  tests: T[],
  search: string,
) {
  const query = search.trim().toLowerCase();
  if (!query) return tests.slice(0, 120);

  return tests
    .filter((test) =>
      [test.testName, test.category, test.specimenType]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    )
    .slice(0, 120);
}

type TreatmentStockItem = {
  medicineId: number;
  stockQuantity: number;
  reorderLevel: number;
  isActive?: boolean | null;
  medicine?: {
    code?: string | null;
    name?: string | null;
    dosageForm?: string | null;
    strength?: string | null;
    manufacturer?: string | null;
  } | null;
};

export function activeTreatmentStock<T extends TreatmentStockItem>(items: T[]) {
  return items.filter((item) => item.isActive !== false && item.medicine);
}

export function treatmentStockStatus(
  item: TreatmentStockItem | undefined,
  medicineSelected: boolean,
  loading: boolean,
): "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | null {
  if (!item) return medicineSelected && !loading ? "OUT_OF_STOCK" : null;
  if (item.stockQuantity <= 0) return "OUT_OF_STOCK";
  if (item.stockQuantity <= item.reorderLevel) return "LOW_STOCK";
  return "IN_STOCK";
}

export function filterTreatmentStock<T extends TreatmentStockItem>(
  items: T[],
  search: string,
) {
  const query = search.trim().toLowerCase();
  return items
    .filter((item) => {
      if (!query) return true;
      const medicine = item.medicine;
      return [
        medicine?.code,
        medicine?.name,
        medicine?.dosageForm,
        medicine?.strength,
        medicine?.manufacturer,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    })
    .sort((left, right) => right.stockQuantity - left.stockQuantity)
    .slice(0, 140);
}

type TransferBed = {
  wardId: number;
  statusCode?: string | null;
  isActive?: boolean | null;
};

export function availableIpdTransferBeds<T extends TransferBed>(
  beds: T[],
  wardId: string,
) {
  if (!wardId) return [];
  return beds.filter(
    (bed) =>
      String(bed.wardId) === wardId &&
      (bed.statusCode || "AVAILABLE").toUpperCase() === "AVAILABLE" &&
      bed.isActive !== false,
  );
}
