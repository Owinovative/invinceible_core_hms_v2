type Identified = { id: number };

export function excludeCurrentConsultation<T extends Identified>(
  consultations: T[],
  currentId?: number,
) {
  return consultations.filter((item) => item.id !== currentId);
}

export function excludeCurrentPrescriptions<T extends Identified>(
  patientPrescriptions: T[],
  consultationPrescriptions: Identified[],
) {
  const currentIds = new Set(consultationPrescriptions.map((item) => item.id));
  return patientPrescriptions.filter((item) => !currentIds.has(item.id));
}

type MedicineStock = {
  medicineId: number;
  stockQuantity?: number | null;
  reorderLevel?: number | null;
  isActive?: boolean | null;
  medicine?: {
    isActive?: boolean | null;
    name?: string | null;
    code?: string | null;
    dosageForm?: string | null;
    strength?: string | null;
  } | null;
};

export function activeConsultationStock<T extends MedicineStock>(items: T[]) {
  return items.filter(
    (item) => item.isActive && item.medicine?.isActive !== false,
  );
}

export function consultationStockStatus(
  selectedMedicineId: number | null,
  item?: MedicineStock | null,
) {
  if (!selectedMedicineId) return null;
  const quantity = Number(item?.stockQuantity ?? 0);
  const reorderLevel = Number(item?.reorderLevel ?? 0);
  if (quantity <= 0) return "OUT_OF_STOCK" as const;
  if (reorderLevel > 0 && quantity <= reorderLevel) {
    return "LOW_STOCK" as const;
  }
  return "IN_STOCK" as const;
}

export function filterConsultationStock<T extends MedicineStock>(
  items: T[],
  search: string,
) {
  const query = search.trim().toLowerCase();
  if (!query) return items.slice(0, 140);
  return items
    .filter((item) =>
      [
        item.medicine?.name,
        item.medicine?.code,
        item.medicine?.dosageForm,
        item.medicine?.strength,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    )
    .slice(0, 140);
}

type LabTest = {
  testName?: string | null;
  category?: string | null;
  specimenType?: string | null;
};

export function filterConsultationLabTests<T extends LabTest>(
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

type Bed = {
  wardId: number;
  statusCode?: string | null;
  isActive?: boolean | null;
};

type Ward = Identified & { isActive?: boolean | null };

function isAvailableBed(bed: Bed) {
  return (
    (bed.statusCode || "AVAILABLE").toUpperCase() === "AVAILABLE" &&
    bed.isActive !== false
  );
}

export function consultationWardOptions<T extends Ward>(
  wards: T[],
  beds: Bed[],
) {
  return wards
    .filter((ward) => ward.isActive !== false)
    .map((ward) => ({
      ...ward,
      freeBeds: beds.filter(
        (bed) => bed.wardId === ward.id && isAvailableBed(bed),
      ).length,
    }));
}

export function consultationBedOptions<T extends Bed>(
  beds: T[],
  selectedWardId: string,
) {
  if (!selectedWardId) return [];
  return beds.filter(
    (bed) => String(bed.wardId) === selectedWardId && isAvailableBed(bed),
  );
}
