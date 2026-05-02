export type DiagnosisCatalogItem = {
  code: string;
  label: string;
};

export const DIAGNOSIS_CATALOG: DiagnosisCatalogItem[] = [
  { code: "A09", label: "Infectious gastroenteritis and colitis" },
  { code: "B50.9", label: "Plasmodium falciparum malaria, unspecified" },
  { code: "B54", label: "Unspecified malaria" },
  { code: "D50.9", label: "Iron deficiency anaemia, unspecified" },
  { code: "E11.9", label: "Type 2 diabetes mellitus without complications" },
  { code: "E86", label: "Volume depletion" },
  { code: "F32.9", label: "Depressive episode, unspecified" },
  { code: "G43.9", label: "Migraine, unspecified" },
  { code: "I10", label: "Essential primary hypertension" },
  { code: "I20.9", label: "Angina pectoris, unspecified" },
  { code: "I50.9", label: "Heart failure, unspecified" },
  { code: "J03.9", label: "Acute tonsillitis, unspecified" },
  { code: "J06.9", label: "Acute upper respiratory infection, unspecified" },
  { code: "J18.9", label: "Pneumonia, unspecified organism" },
  { code: "J45.9", label: "Asthma, unspecified" },
  { code: "K29.7", label: "Gastritis, unspecified" },
  { code: "K35.8", label: "Acute appendicitis, other and unspecified" },
  { code: "M54.5", label: "Low back pain" },
  { code: "N39.0", label: "Urinary tract infection, site not specified" },
  { code: "O80", label: "Single spontaneous delivery" },
  { code: "R10.4", label: "Other and unspecified abdominal pain" },
  { code: "R50.9", label: "Fever, unspecified" },
  { code: "R51", label: "Headache" },
  { code: "S01.9", label: "Open wound of head, part unspecified" },
  { code: "S52.5", label: "Fracture of lower end of radius" },
  { code: "T14.1", label: "Open wound of unspecified body region" },
  { code: "Z00.0", label: "General medical examination" },
  { code: "Z34.9", label: "Supervision of normal pregnancy, unspecified" },
];

export function searchDiagnoses(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return DIAGNOSIS_CATALOG.filter((item) =>
    `${item.code} ${item.label}`.toLowerCase().includes(normalized),
  ).slice(0, 12);
}
