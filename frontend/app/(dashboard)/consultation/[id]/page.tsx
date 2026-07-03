"use client";


import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  BedDouble,
  CheckCircle2,
  ClipboardList,
  Download,
  FlaskConical,
  Loader2,
  Paperclip,
  Pill,
  Plus,
  Save,
  Stethoscope,
  X,
} from "lucide-react";


import { useConsultationWorkspace } from "@/hooks/use-consultation-workspace";
import { useUpdateConsultation } from "@/hooks/use-update-consultation";
import { useCompleteConsultation } from "@/hooks/use-complete-consultation";
import { useScope } from "@/providers/scope-provider";
import { useAuth } from "@/providers/auth-provider";
import type {
  PrescriptionItemSummary,
  PrescriptionRecord,
} from "@/services/prescription-service";


import { useLabTests } from "@/hooks/use-lab-tests";
import { useCreateLabOrder } from "@/hooks/use-create-lab-order";


import { useBranchMedicineSearch } from "@/hooks/use-branch-medicine-search";
import { useMedicineStockAlternatives } from "@/hooks/use-medicine-stock-alternatives";
import { useCreatePrescription } from "@/hooks/use-create-prescription";
import { useDirectMedicineAdministration } from "@/hooks/use-direct-medicine-administration";


import { useWards } from "@/hooks/use-wards";
import { useBeds } from "@/hooks/use-beds";
import { useCreateAdmission } from "@/hooks/use-create-admission";


import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { ClinicalAiAssistant } from "@/components/ai/clinical-ai-assistant";
import { searchDiagnoses } from "@/lib/diagnosis-catalog";
import { downloadConsultationMedicalReportPdf } from "@/services/report-service";


function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

type DraftPrescriptionItem = {
  medicineId: number;
  medicineName: string;
  medicineCode?: string | null;
  strength?: string | null;
  dosageForm?: string | null;
  stockQuantity: number;
  reorderLevel: number;
  stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  dosage?: string;
  route?: string;
  frequency?: string;
  duration?: string;
  quantity: number;
  instructions?: string;
  acceptedAlternativeForMedicineId?: number;
};


export default function ConsultationDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();


  const { selectedBranchId } = useScope();
  const { user } = useAuth();


  const { data: workspace, isLoading } = useConsultationWorkspace(id);
  const data = workspace?.consultation;
  const patientId = data?.patientId;
  const appointmentId = data?.appointmentId;


  const triageData = workspace?.latestTriage ?? null;
  const historyData = workspace?.recentConsultations ?? [];
  const historyLoading = isLoading;


  const updateMutation = useUpdateConsultation();
  const completeMutation = useCompleteConsultation();


  const { data: wardsData, isLoading: wardsLoading } = useWards();
  const { data: bedsData, isLoading: bedsLoading } = useBeds();
  const createAdmissionMutation = useCreateAdmission();


  const branchIdForStock = data?.branchId ?? selectedBranchId;
  const [medicineSearch, setMedicineSearch] = React.useState("");
  const { data: branchStockData, isLoading: stockLoading } =
    useBranchMedicineSearch(branchIdForStock, medicineSearch);


  const createPrescriptionMutation = useCreatePrescription();
  const directMedicineAdministrationMutation = useDirectMedicineAdministration();
  const consultationPrescriptions =
    workspace?.consultationPrescriptions ?? [];
  const patientPrescriptions = workspace?.patientPrescriptions ?? [];
  const patientPrescriptionsLoading = isLoading;


  const { data: labTestsData, isLoading: labTestsLoading } = useLabTests();
  const createLabOrderMutation = useCreateLabOrder();
  const labOrdersLoading = isLoading;

  const consultationNumber = data?.consultationNumber;

  const consultationLabOrders = React.useMemo(() => {
    return Array.isArray(workspace?.labOrders) ? workspace.labOrders : [];
  }, [workspace?.labOrders]);


  const latestConsultationLabOrder =
    consultationLabOrders.length > 0 ? consultationLabOrders[0] : null;


  const latestLabResultsList = React.useMemo(
    () =>
      latestConsultationLabOrder?.items?.flatMap(
        (item: { results?: Array<Record<string, any>> }) => item.results ?? [],
      ) ?? [],
    [latestConsultationLabOrder],
  );


  const existingAdmission = React.useMemo(() => {
    return workspace?.activeAdmission ?? null;
  }, [workspace?.activeAdmission]);


  const wards = React.useMemo(
    () => (Array.isArray(wardsData) ? wardsData : []),
    [wardsData],
  );


  const beds = React.useMemo(
    () => (Array.isArray(bedsData) ? bedsData : []),
    [bedsData],
  );


  const [chiefComplaint, setChiefComplaint] = React.useState("");
  const [historyOfPresenting, setHistoryOfPresenting] = React.useState("");
  const [examinationFindings, setExaminationFindings] = React.useState("");
  const [diagnosis, setDiagnosis] = React.useState("");
  const [diagnosisSearch, setDiagnosisSearch] = React.useState("");
  const [treatmentPlan, setTreatmentPlan] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);
  const [reportDownloading, setReportDownloading] = React.useState(false);
  const diagnosisMatches = React.useMemo(
    () => searchDiagnoses(diagnosisSearch),
    [diagnosisSearch],
  );


  const [prescriptionNotes, setPrescriptionNotes] = React.useState("");
  const [selectedPrescriptionId, setSelectedPrescriptionId] = React.useState<number | null>(null);


  const [selectedWardId, setSelectedWardId] = React.useState("");
  const [selectedBedId, setSelectedBedId] = React.useState("");
  const [admissionReason, setAdmissionReason] = React.useState("");
  const [admissionSource, setAdmissionSource] = React.useState("CONSULTATION");
  const [expectedDischargeAt, setExpectedDischargeAt] = React.useState("");
  const [admissionNotes, setAdmissionNotes] = React.useState("");


  const [selectedMedicineId, setSelectedMedicineId] = React.useState("");
  const [itemDosage, setItemDosage] = React.useState("");
  const [itemRoute, setItemRoute] = React.useState("");
  const [itemFrequency, setItemFrequency] = React.useState("");
  const [itemDuration, setItemDuration] = React.useState("");
  const [itemQuantity, setItemQuantity] = React.useState("1");
  const [itemInstructions, setItemInstructions] = React.useState("");
  const [acceptedAlternativeForMedicineId, setAcceptedAlternativeForMedicineId] =
    React.useState<number | null>(null);
  const [draftPrescriptionItems, setDraftPrescriptionItems] = React.useState<
    DraftPrescriptionItem[]
  >([]);
  const [allowOutOfStockPrescribing, setAllowOutOfStockPrescribing] =
    React.useState(false);
  const [directAdministrationMode, setDirectAdministrationMode] =
    React.useState<"DIRECT_DISPENSE" | "INJECTION">("DIRECT_DISPENSE");


  const [selectedTestId, setSelectedTestId] = React.useState("");
  const [labTestSearch, setLabTestSearch] = React.useState("");
  const [labUrgency, setLabUrgency] = React.useState("ROUTINE");
  const [labClinicalNotes, setLabClinicalNotes] = React.useState("");
  const [labInstruction, setLabInstruction] = React.useState("");
  const [selectedLabItems, setSelectedLabItems] = React.useState<
    Array<{ testId: number; testName: string; instructions?: string }>
  >([]);


  React.useEffect(() => {
    if (!data) return;
    setChiefComplaint(data.chiefComplaint ?? "");
    setHistoryOfPresenting(data.historyOfPresenting ?? "");
    setExaminationFindings(data.examinationFindings ?? "");
    setDiagnosis(data.diagnosis ?? "");
    setTreatmentPlan(data.treatmentPlan ?? "");
    setNotes(data.notes ?? "");
  }, [data]);


  const patientHistory = React.useMemo(() => {
    const all = Array.isArray(historyData) ? historyData : [];
    return all.filter((item) => item.id !== data?.id);
  }, [historyData, data?.id]);


  const consultationPrescriptionList = React.useMemo<PrescriptionRecord[]>(
    () => (Array.isArray(consultationPrescriptions) ? consultationPrescriptions : []),
    [consultationPrescriptions],
  );


  const activePrescription =
    consultationPrescriptionList.find((item) => item.id === selectedPrescriptionId) ??
    consultationPrescriptionList[0] ??
    null;

  const aiEncounterContext = React.useMemo(
    () => ({
      encounter: {
        consultationNumber: data?.consultationNumber,
        statusCode: data?.statusCode,
        chiefComplaint: chiefComplaint || data?.chiefComplaint,
        historyOfPresenting:
          historyOfPresenting || data?.historyOfPresenting,
        examinationFindings:
          examinationFindings || data?.examinationFindings,
        diagnosis: diagnosis || data?.diagnosis,
        treatmentPlan: treatmentPlan || data?.treatmentPlan,
        notes: notes || data?.notes,
      },
      patient: {
        gender: data?.patient?.gender,
      },
      triage: triageData
        ? {
            priority: triageData.triagePriority,
            chiefComplaint: triageData.chiefComplaint,
            arrivalType: triageData.arrivalType,
            temperatureC: triageData.temperatureC,
            systolicBp: triageData.systolicBp,
            diastolicBp: triageData.diastolicBp,
            pulseRate: triageData.pulseRate,
            respiratoryRate: triageData.respiratoryRate,
            oxygenSaturation: triageData.oxygenSaturation,
            painScore: triageData.painScore,
            notes: triageData.notes,
          }
        : undefined,
      latestLabOrder: latestConsultationLabOrder
        ? {
            orderNumber: latestConsultationLabOrder.orderNumber,
            urgency: latestConsultationLabOrder.urgency,
            status: latestConsultationLabOrder.status,
            clinicalNotes: latestConsultationLabOrder.clinicalNotes,
            tests: latestConsultationLabOrder.items?.map((item: any) => ({
              testName: item.test?.testName,
              status: item.status,
              instructions: item.instructions,
            })),
          }
        : undefined,
      latestLabResults: latestLabResultsList.map((item: any) => ({
        resultValue: item.resultValue,
        remarks: item.remarks,
        recordedAt: item.recordedAt,
      })),
      prescriptions: consultationPrescriptionList.map((prescription) => ({
        prescriptionNumber: prescription.prescriptionNumber,
        statusCode: prescription.statusCode,
        notes: prescription.notes,
        items: prescription.items?.map((item) => ({
          medicine: item.medicineNameSnapshot || item.medicine?.name,
          dosage: item.dosage,
          route: item.route,
          frequency: item.frequency,
          duration: item.duration,
          quantity: item.quantity,
          instructions: item.instructions,
          stockStatusAtPrescribing: item.stockStatusAtPrescribing,
          statusCode: item.statusCode,
        })),
      })),
      recentHistory: patientHistory.slice(0, 3).map((item) => ({
        consultationNumber: item.consultationNumber,
        chiefComplaint: item.chiefComplaint,
        diagnosis: item.diagnosis,
        treatmentPlan: item.treatmentPlan,
        statusCode: item.statusCode,
      })),
    }),
    [
      chiefComplaint,
      consultationPrescriptionList,
      data,
      diagnosis,
      examinationFindings,
      historyOfPresenting,
      latestConsultationLabOrder,
      latestLabResultsList,
      notes,
      patientHistory,
      treatmentPlan,
      triageData,
    ],
  );


  const patientPrescriptionHistory = React.useMemo(() => {
    const all = Array.isArray(patientPrescriptions) ? patientPrescriptions : [];
    return all.filter(
      (item) => !consultationPrescriptionList.some((x) => x.id === item.id),
    );
  }, [patientPrescriptions, consultationPrescriptionList]);


  const branchStockItems = React.useMemo(() => {
    const items = Array.isArray(branchStockData) ? branchStockData : [];
    return items.filter(
      (item) => item.isActive && item.medicine?.isActive !== false,
    );
  }, [branchStockData]);

  const selectedMedicineIdNumber = selectedMedicineId
    ? Number(selectedMedicineId)
    : null;

  const selectedStockItem = React.useMemo(() => {
    if (!selectedMedicineIdNumber) return null;

    return (
      branchStockItems.find(
        (item) => item.medicineId === selectedMedicineIdNumber,
      ) ?? null
    );
  }, [branchStockItems, selectedMedicineIdNumber]);

  const selectedStockStatus = React.useMemo(() => {
    if (!selectedMedicineIdNumber) return null;
    const stockQuantity = Number(selectedStockItem?.stockQuantity ?? 0);
    const reorderLevel = Number(selectedStockItem?.reorderLevel ?? 0);

    if (stockQuantity <= 0) return "OUT_OF_STOCK";
    if (reorderLevel > 0 && stockQuantity <= reorderLevel) return "LOW_STOCK";
    return "IN_STOCK";
  }, [selectedMedicineIdNumber, selectedStockItem]);

  const {
    data: medicineAlternativesData,
    isLoading: alternativesLoading,
  } = useMedicineStockAlternatives(branchIdForStock, selectedMedicineIdNumber);

  const medicineAlternatives =
    medicineAlternativesData?.alternatives ?? [];

  const filteredStockItems = React.useMemo(() => {
    const query = medicineSearch.trim().toLowerCase();
    if (!query) return branchStockItems.slice(0, 140);

    return branchStockItems
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
  }, [branchStockItems, medicineSearch]);


  const labTests = React.useMemo(
    () => (Array.isArray(labTestsData) ? labTestsData : []),
    [labTestsData],
  );


  const filteredLabTests = React.useMemo(() => {
    const query = labTestSearch.trim().toLowerCase();
    if (!query) return labTests.slice(0, 120);

    return labTests
      .filter((test) =>
        [test.testName, test.category, test.specimenType]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 120);
  }, [labTestSearch, labTests]);


  const availableWardOptions = React.useMemo(() => {
    return wards
      .filter((ward) => ward.isActive !== false)
      .map((ward) => {
        const freeBeds = beds.filter((bed) => {
          const sameWard = bed.wardId === ward.id;
          const isAvailable =
            (bed.statusCode || "AVAILABLE").toUpperCase() === "AVAILABLE";
          const isActive = bed.isActive !== false;
          return sameWard && isAvailable && isActive;
        }).length;


        return {
          ...ward,
          freeBeds,
        };
      });
  }, [wards, beds]);


  const availableBedOptions = React.useMemo(() => {
    return beds.filter((bed) => {
      const wardMatch = selectedWardId ? String(bed.wardId) === selectedWardId : false;
      const isAvailable =
        (bed.statusCode || "AVAILABLE").toUpperCase() === "AVAILABLE";
      const isActive = bed.isActive !== false;


      return wardMatch && isAvailable && isActive;
    });
  }, [beds, selectedWardId]);


  React.useEffect(() => {
    if (!selectedPrescriptionId && consultationPrescriptionList.length > 0) {
      setSelectedPrescriptionId(consultationPrescriptionList[0].id);
    }
  }, [consultationPrescriptionList, selectedPrescriptionId]);


  React.useEffect(() => {
    if (!selectedWardId) {
      setSelectedBedId("");
      return;
    }


    if (availableBedOptions.length === 0) {
      setSelectedBedId("");
      return;
    }


    const currentStillValid = availableBedOptions.some(
      (bed) => String(bed.id) === selectedBedId,
    );


    if (!currentStillValid) {
      setSelectedBedId(String(availableBedOptions[0].id));
    }
  }, [selectedWardId, availableBedOptions, selectedBedId]);


  const handleSave = async () => {
    if (!data) return;
    setMessage(null);


    await updateMutation.mutateAsync({
      id: data.id,
      payload: {
        chiefComplaint: chiefComplaint || undefined,
        historyOfPresenting: historyOfPresenting || undefined,
        examinationFindings: examinationFindings || undefined,
        diagnosis: diagnosis || undefined,
        treatmentPlan: treatmentPlan || undefined,
        notes: notes || undefined,
        statusCode: "IN_PROGRESS",
      },
    });


    setMessage("Consultation saved.");
  };


  const handleComplete = async () => {
    if (!data) return;
    setMessage(null);
    await completeMutation.mutateAsync(data.id);
    setMessage("Consultation completed successfully.");
  };


  const resetPrescriptionItemForm = () => {
    setSelectedMedicineId("");
    setItemDosage("");
    setItemRoute("");
    setItemFrequency("");
    setItemDuration("");
    setItemQuantity("1");
    setItemInstructions("");
    setAcceptedAlternativeForMedicineId(null);
    setAllowOutOfStockPrescribing(false);
  };


  const handleCreatePrescription = async () => {
    if (!data) return;
    setMessage(null);

    if (!user?.staffId) {
      setMessage("Current staff ID is missing. Prescription cannot be sent.");
      return;
    }

    if (draftPrescriptionItems.length === 0) {
      setMessage("Add at least one structured medicine item before sending to pharmacy.");
      return;
    }

    const created = await createPrescriptionMutation.mutateAsync({
      consultationId: data.id,
      patientId: data.patientId,
      prescribedByStaffId: Number(user.staffId),
      notes: prescriptionNotes || undefined,
      items: draftPrescriptionItems.map((item) => ({
        medicineId: item.medicineId,
        dosage: item.dosage || undefined,
        route: item.route || undefined,
        frequency: item.frequency || undefined,
        duration: item.duration || undefined,
        quantity: item.quantity,
        instructions: item.instructions || undefined,
        acceptedAlternativeForMedicineId:
          item.acceptedAlternativeForMedicineId,
      })),
    });

    setSelectedPrescriptionId(created.id);
    setPrescriptionNotes("");
    setDraftPrescriptionItems([]);
    resetPrescriptionItemForm();
    setMessage(`Prescription ${created.prescriptionNumber} sent to pharmacy.`);
  };


  const handleAddPrescriptionItem = () => {
    if (!selectedMedicineId) {
      setMessage("Please select a medicine.");
      return;
    }

    if (!selectedStockItem || !selectedStockStatus) {
      setMessage("Branch stock details are still loading. Try again in a moment.");
      return;
    }

    if (
      selectedStockStatus === "OUT_OF_STOCK" &&
      !acceptedAlternativeForMedicineId &&
      !allowOutOfStockPrescribing
    ) {
      setMessage(
        "This medicine is out of stock. Choose a suggested in-stock alternative or explicitly allow out-of-stock prescribing.",
      );
      return;
    }

    const quantity = Math.max(1, Number(itemQuantity || 1));
    const medicineId = Number(selectedMedicineId);
    const duplicate = draftPrescriptionItems.some(
      (item) => item.medicineId === medicineId,
    );
    if (
      duplicate &&
      !window.confirm(
        "This medicine is already in the draft. Add another line anyway?",
      )
    ) {
      return;
    }


    setMessage(null);

    setDraftPrescriptionItems((current) => [
      ...current,
      {
        medicineId,
        medicineName:
          selectedStockItem.medicine?.name || `Medicine #${medicineId}`,
        medicineCode: selectedStockItem.medicine?.code,
        strength: selectedStockItem.medicine?.strength,
        dosageForm: selectedStockItem.medicine?.dosageForm,
        stockQuantity: Number(selectedStockItem.stockQuantity ?? 0),
        reorderLevel: Number(selectedStockItem.reorderLevel ?? 0),
        stockStatus: selectedStockStatus as DraftPrescriptionItem["stockStatus"],
        dosage: itemDosage || undefined,
        route: itemRoute || undefined,
        frequency: itemFrequency || undefined,
        duration: itemDuration || undefined,
        quantity,
        instructions: itemInstructions || undefined,
        acceptedAlternativeForMedicineId:
          acceptedAlternativeForMedicineId || undefined,
      },
    ]);

    resetPrescriptionItemForm();
    setMessage("Prescription item added to draft. Send it to pharmacy when complete.");
  };

  const handleDirectMedicineAdministration = async () => {
    if (!data) return;
    setMessage(null);

    if (!selectedMedicineIdNumber || !selectedStockItem) {
      setMessage("Select an in-stock medicine first.");
      return;
    }

    const quantity = Math.max(1, Number(itemQuantity || 1));
    if (Number(selectedStockItem.stockQuantity ?? 0) < quantity) {
      setMessage(
        "Insufficient branch stock for direct dispense or injection administration.",
      );
      return;
    }

    await directMedicineAdministrationMutation.mutateAsync({
      consultationId: data.id,
      patientId: data.patientId,
      medicineId: selectedMedicineIdNumber,
      quantity,
      mode: directAdministrationMode,
      dosage: itemDosage || undefined,
      route: itemRoute || undefined,
      frequency: itemFrequency || undefined,
      duration: itemDuration || undefined,
      instructions: itemInstructions || undefined,
      notes: prescriptionNotes || undefined,
    });

    resetPrescriptionItemForm();
    setMessage(
      directAdministrationMode === "INJECTION"
        ? "Medicine administered and stock deducted."
        : "Medicine directly dispensed and stock deducted.",
    );
  };


  const handleRemoveDraftPrescriptionItem = (index: number) => {
    setDraftPrescriptionItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  };


  const handleAddLabTest = () => {
    const test = labTests.find((item) => item.id === Number(selectedTestId));
    if (!test) return;


    const exists = selectedLabItems.some((item) => item.testId === test.id);
    if (exists) {
      setMessage("That lab test is already selected.");
      return;
    }


    setSelectedLabItems((prev) => [
      ...prev,
      {
        testId: test.id,
        testName: test.testName,
        instructions: labInstruction || undefined,
      },
    ]);


    setSelectedTestId("");
    setLabInstruction("");
  };


  const handleRemoveLabTest = (testId: number) => {
    setSelectedLabItems((prev) => prev.filter((item) => item.testId !== testId));
  };


  const handleCreateLabOrder = async () => {
    if (!data) return;


    if (selectedLabItems.length === 0) {
      setMessage("Please select at least one lab test.");
      return;
    }


    
    setMessage(null);


    await createLabOrderMutation.mutateAsync({
      patientId: data.patientId,
      appointmentId: data.appointmentId,
      encounterRef: data.consultationNumber,
      requestedByStaffId: data.doctorId,
      clinicalNotes: labClinicalNotes || undefined,
      urgency: labUrgency,
      items: selectedLabItems.map((item) => ({
        testId: item.testId,
        instructions: item.instructions,
      })),
    });


    setSelectedLabItems([]);
    setLabClinicalNotes("");
    setLabInstruction("");
    setLabUrgency("ROUTINE");
    setMessage("Lab order created successfully.");
  };

  const handleAdmitToIpd = async () => {
  if (!data) return;
  if (createAdmissionMutation.isPending) return;

  if (existingAdmission) {
    setMessage("This consultation already has an active admission.");
    return;
  }

  if (!selectedWardId) {
    setMessage("Please select a ward.");
    return;
  }

  const year = new Date().getFullYear();
  const admissionNumber = `ADM-${year}-${data.id}-${Date.now().toString().slice(-4)}`;

  setMessage(null);

  const createdAdmission = await createAdmissionMutation.mutateAsync({
    admissionNumber,
    patientId: data.patientId,
    appointmentId: data.appointmentId || undefined,
    consultationId: data.id,
    admittedByStaffId: user?.staffId ? Number(user.staffId) : data.doctorId || undefined,
    wardId: Number(selectedWardId),
    bedId: selectedBedId ? Number(selectedBedId) : undefined,
    admissionReason: admissionReason || diagnosis || chiefComplaint || undefined,
    admissionSource: admissionSource || "CONSULTATION",
    expectedDischargeAt: expectedDischargeAt || undefined,
    notes: admissionNotes || undefined,
  });

  router.push(`/ipd/${createdAdmission.id}`);
};

  const handleDownloadMedicalReport = async () => {
    if (!data) return;

    setReportDownloading(true);
    setMessage(null);

    try {
      await downloadConsultationMedicalReportPdf(
        data.id,
        data.consultationNumber,
      );
      setMessage("Medical report PDF downloaded.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to download medical report PDF.",
      );
    } finally {
      setReportDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border surface-spotlight shadow-md p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cyan-600/10 via-cyan-500/5 to-transparent" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <Badge className="rounded-full border-0 bg-cyan-600/10 px-3 py-1 text-cyan-300">
              Consultation Workspace
            </Badge>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10">
                <Stethoscope className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Consultation
                </h1>
                <p className="text-muted-foreground">
                  Full doctor workspace for this patient encounter
                </p>
              </div>
            </div>
          </div>


          {data ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Consultation No
                </p>
                <p className="mt-2 text-sm font-semibold">{data.consultationNumber}</p>
              </div>
              <div className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Status
                </p>
                <p className="mt-2 text-sm font-semibold">
                  {data.statusCode || "IN_PROGRESS"}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-full min-h-[76px] rounded-[1.2rem] justify-start border-white/10 bg-card/[0.03]"
                onClick={handleDownloadMedicalReport}
                disabled={reportDownloading}
              >
                {reportDownloading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download medical PDF
              </Button>
            </div>
          ) : null}
        </div>
      </section>


      {message ? (
        <div className="rounded-[1.4rem] border border-cyan-500/20 bg-cyan-500/8 px-4 py-4 text-sm text-cyan-300">
          {message}
        </div>
      ) : null}


      {isLoading || !data ? (
        <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Loading consultation...
          </CardContent>
        </Card>
      ) : (
        <>
          <ClinicalAiAssistant
            title="Encounter AI Drafting"
            subtitle="Use the current consultation, triage, lab, prescription, and recent history context to draft text for clinician review."
            defaultTask="SOAP_NOTE"
            defaultPrompt="Draft a concise SOAP note using only the documented encounter context. Mark missing information as not documented."
            context={aiEncounterContext}
            compact
          />

          <section className="space-y-6">
            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle>Patient Snapshot</CardTitle>
              </CardHeader>


              <CardContent className="space-y-4">
                <div className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4">
                  <p className="text-lg font-bold">
                    {[data.patient?.firstName, data.patient?.middleName, data.patient?.lastName]
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {data.patient?.patientNumber || "No patient number"}
                  </p>
                </div>


                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Gender</p>
                    <p className="mt-1 text-sm font-medium">{data.patient?.gender || "—"}</p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="mt-1 text-sm font-medium">
                      {data.patient?.phonePrimary || "—"}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Appointment</p>
                    <p className="mt-1 text-sm font-medium">
                      {data.appointment?.appointmentNumber || "—"}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Priority</p>
                    <p className="mt-1 text-sm font-medium">
                      {triageData?.triagePriority || data.appointment?.triagePriority || "NORMAL"}
                    </p>
                  </div>
                </div>


                <div className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4">
                  <p className="text-xs text-muted-foreground">Chief Complaint</p>
                  <p className="mt-1 text-sm font-medium">
                    {triageData?.chiefComplaint || data.chiefComplaint || "—"}
                  </p>
                </div>


                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Arrival Type</p>
                    <p className="mt-1 text-sm font-medium">{triageData?.arrivalType || "—"}</p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Clinic</p>
                    <p className="mt-1 text-sm font-medium">{triageData?.clinic?.name || "—"}</p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Routed Doctor</p>
                    <p className="mt-1 text-sm font-medium">
                      {triageData?.routedDoctor
                        ? [triageData.routedDoctor.firstName, triageData.routedDoctor.lastName]
                            .filter(Boolean)
                            .join(" ")
                        : "—"}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Triage Status</p>
                    <p className="mt-1 text-sm font-medium">{triageData?.statusCode || "—"}</p>
                  </div>
                </div>


                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Temperature °C</p>
                    <p className="mt-1 text-sm font-medium">{triageData?.temperatureC ?? "—"}</p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Blood Pressure</p>
                    <p className="mt-1 text-sm font-medium">
                      {triageData?.systolicBp || triageData?.diastolicBp
                        ? `${triageData?.systolicBp ?? "—"}/${triageData?.diastolicBp ?? "—"}`
                        : "—"}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Pulse Rate</p>
                    <p className="mt-1 text-sm font-medium">{triageData?.pulseRate ?? "—"}</p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Respiratory Rate</p>
                    <p className="mt-1 text-sm font-medium">
                      {triageData?.respiratoryRate ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Oxygen Saturation</p>
                    <p className="mt-1 text-sm font-medium">
                      {triageData?.oxygenSaturation ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Weight (kg)</p>
                    <p className="mt-1 text-sm font-medium">{triageData?.weightKg ?? "—"}</p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Height (cm)</p>
                    <p className="mt-1 text-sm font-medium">{triageData?.heightCm ?? "—"}</p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">BMI</p>
                    <p className="mt-1 text-sm font-medium">{triageData?.bmi ?? "—"}</p>
                  </div>
                </div>


                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Pain Score</p>
                    <p className="mt-1 text-sm font-medium">{triageData?.painScore ?? "—"}</p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Triage Number</p>
                    <p className="mt-1 text-sm font-medium">{triageData?.triageNumber || "—"}</p>
                  </div>
                </div>


                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Triage Started</p>
                    <p className="mt-1 text-sm font-medium">
                      {triageData?.startedAt ? new Date(triageData.startedAt).toLocaleString() : "—"}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Triage Completed</p>
                    <p className="mt-1 text-sm font-medium">
                      {triageData?.completedAt
                        ? new Date(triageData.completedAt).toLocaleString()
                        : "—"}
                    </p>
                  </div>
                </div>


                <div className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4">
                  <p className="text-xs text-muted-foreground">Triage Notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm font-medium">
                    {triageData?.notes || "—"}
                  </p>
                </div>
              </CardContent>
            </Card>


            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle>Doctor Notes</CardTitle>
              </CardHeader>


              <CardContent className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium">Chief Complaint</label>
                  <Textarea
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    className="min-h-[90px] rounded-2xl"
                  />
                </div>


                <div>
                  <label className="mb-2 block text-sm font-medium">
                    History of Presenting Complaint
                  </label>
                  <Textarea
                    value={historyOfPresenting}
                    onChange={(e) => setHistoryOfPresenting(e.target.value)}
                    className="min-h-[110px] rounded-2xl"
                  />
                </div>


                <div>
                  <label className="mb-2 block text-sm font-medium">Examination Findings</label>
                  <Textarea
                    value={examinationFindings}
                    onChange={(e) => setExaminationFindings(e.target.value)}
                    className="min-h-[110px] rounded-2xl"
                  />
                </div>


                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Diagnosis</label>
                    <Input
                      value={diagnosisSearch}
                      onChange={(e) => setDiagnosisSearch(e.target.value)}
                      className="mb-2 h-11 rounded-2xl"
                      placeholder="Search diagnosis code or name"
                    />
                    {diagnosisSearch ? (
                      <div className="mb-2 max-h-44 overflow-y-auto rounded-2xl border border-white/10 bg-background">
                        {diagnosisMatches.map((item) => (
                          <button
                            key={item.code}
                            type="button"
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-primary/10"
                            onClick={() => {
                              const next = `${item.code} - ${item.label}`;
                              setDiagnosis((current) =>
                                current.trim()
                                  ? `${current.trim()}\n${next}`
                                  : next,
                              );
                              setDiagnosisSearch("");
                            }}
                          >
                            <span className="font-semibold">{item.code}</span>{" "}
                            {item.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <Textarea
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      className="min-h-[120px] rounded-2xl"
                    />
                  </div>


                  <div>
                    <label className="mb-2 block text-sm font-medium">Treatment Plan</label>
                    <Textarea
                      value={treatmentPlan}
                      onChange={(e) => setTreatmentPlan(e.target.value)}
                      className="min-h-[120px] rounded-2xl"
                    />
                  </div>
                </div>


                <div>
                  <label className="mb-2 block text-sm font-medium">Additional Notes</label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[110px] rounded-2xl"
                  />
                </div>


                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    className="h-12 rounded-2xl"
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Consultation
                  </Button>


                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 rounded-2xl"
                    onClick={handleComplete}
                    disabled={completeMutation.isPending}
                  >
                    {completeMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    Complete Consultation
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>


          <section>
            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BedDouble className="h-5 w-5 text-cyan-300" />
                  IPD Admission
                </CardTitle>
              </CardHeader>


              <CardContent className="space-y-5">
                {existingAdmission ? (
               <>
                <div className="rounded-[1.2rem] border border-emerald-500/20 bg-success/10 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <p className="text-base font-semibold text-emerald-300">
                        Patient already admitted to IPD
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Admission No: {existingAdmission.admissionNumber}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Ward: {existingAdmission.ward?.name || "—"} • Bed:{" "}
                        {existingAdmission.bed?.bedNumber || "Not assigned"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Admitted At: {formatDate(existingAdmission.admittedAt)}
                      </p>
                    </div>

                    <Badge className="w-fit rounded-full border border-emerald-500/20 bg-success/10 px-3 py-1 text-emerald-300">
                      ADMITTED
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link href={`/ipd/${existingAdmission.id}`}>
                    <Button type="button" className="h-12 rounded-2xl">
                      <BedDouble className="mr-2 h-4 w-4" />
                      Open IPD Admission
                    </Button>
                  </Link>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 rounded-2xl"
                    onClick={() =>
                      setMessage(
                        `Patient already has active admission ${existingAdmission.admissionNumber}.`,
                      )
                    }
                  >
                    View Admission Status
                  </Button>
                </div>
              </>

                ) : (
                  <>
                    <div className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4">
                      <p className="text-sm font-medium">Admission Decision</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Admit this patient directly from the consultation into inpatient care.
                      </p>
                    </div>


                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <div>
                        <label className="mb-2 block text-sm font-medium">Ward</label>
                        <select
                          value={selectedWardId}
                          onChange={(e) => {
                            setSelectedWardId(e.target.value);
                            setSelectedBedId("");
                          }}
                          className="flex h-12 w-full rounded-2xl border border-white/10 bg-background px-4 text-sm"
                        >
                          <option value="">Select ward</option>
                          {availableWardOptions.map((ward) => (
                            <option
                              key={ward.id}
                              value={String(ward.id)}
                              disabled={ward.freeBeds === 0}
                            >
                              {ward.name}
                              {ward.wardType ? ` - ${ward.wardType}` : ""}
                              {` — ${ward.freeBeds} bed${ward.freeBeds === 1 ? "" : "s"} available`}
                            </option>
                          ))}
                        </select>
                        {wardsLoading ? (
                          <p className="mt-2 text-xs text-muted-foreground">Loading wards...</p>
                        ) : null}
                      </div>


                      <div>
                        <label className="mb-2 block text-sm font-medium">Bed</label>
                        <select
                          value={selectedBedId}
                          onChange={(e) => setSelectedBedId(e.target.value)}
                          disabled={!selectedWardId}
                          className="flex h-12 w-full rounded-2xl border border-white/10 bg-background px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">
                            {selectedWardId ? "Select bed (optional)" : "Select ward first"}
                          </option>
                          {availableBedOptions.map((bed) => (
                            <option key={bed.id} value={String(bed.id)}>
                              {bed.bedNumber}
                              {bed.bedLabel ? ` - ${bed.bedLabel}` : ""}
                            </option>
                          ))}
                        </select>
                        {bedsLoading ? (
                          <p className="mt-2 text-xs text-muted-foreground">Loading beds...</p>
                        ) : !selectedWardId ? (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Choose a ward first to see available beds.
                          </p>
                        ) : availableBedOptions.length === 0 ? (
                          <p className="mt-2 text-xs text-amber-300">
                            No available beds found in the selected ward.
                          </p>
                        ) : null}
                      </div>


                      <div>
                        <label className="mb-2 block text-sm font-medium">Admission Source</label>
                        <select
                          value={admissionSource}
                          onChange={(e) => setAdmissionSource(e.target.value)}
                          className="flex h-12 w-full rounded-2xl border border-white/10 bg-background px-4 text-sm"
                        >
                          <option value="CONSULTATION">CONSULTATION</option>
                          <option value="ER">ER</option>
                          <option value="REFERRAL">REFERRAL</option>
                          <option value="WALK_IN">WALK_IN</option>
                        </select>
                      </div>
                    </div>


                    <div>
                      <label className="mb-2 block text-sm font-medium">Admission Reason</label>
                      <Textarea
                        value={admissionReason}
                        onChange={(e) => setAdmissionReason(e.target.value)}
                        className="min-h-[110px] rounded-2xl"
                        placeholder="Why the patient should be admitted"
                      />
                    </div>


                    <div className="grid gap-4 md:grid-cols-[260px_1fr]">
                      <div>
                        <label className="mb-2 block text-sm font-medium">
                          Expected Discharge Date
                        </label>
                        <Input
                          type="datetime-local"
                          value={expectedDischargeAt}
                          onChange={(e) => setExpectedDischargeAt(e.target.value)}
                          className="h-12 rounded-2xl"
                        />
                      </div>


                      <div>
                        <label className="mb-2 block text-sm font-medium">Admission Notes</label>
                        <Textarea
                          value={admissionNotes}
                          onChange={(e) => setAdmissionNotes(e.target.value)}
                          className="min-h-[110px] rounded-2xl"
                          placeholder="Extra inpatient instructions or notes"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      className="h-12 rounded-2xl"
                      onClick={handleAdmitToIpd}
                      disabled={createAdmissionMutation.isPending || !!existingAdmission}
                    >
                      {createAdmissionMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <BedDouble className="mr-2 h-4 w-4" />
                      )}
                      {existingAdmission ? "Already Admitted" : "Admit to IPD"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </section>


          <section>
            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pill className="h-5 w-5 text-cyan-300" />
                  Prescription Workspace
                </CardTitle>
              </CardHeader>


              <CardContent className="space-y-5">
                <div className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4">
                  <p className="text-sm font-medium">Current Consultation Prescription</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {activePrescription
                      ? `${activePrescription.prescriptionNumber} • ${activePrescription.statusCode}`
                      : "No prescription created for this consultation yet."}
                  </p>
                </div>


                <div>
                  <label className="mb-2 block text-sm font-medium">Prescription Notes</label>
                  <Textarea
                    value={prescriptionNotes}
                    onChange={(e) => setPrescriptionNotes(e.target.value)}
                    className="min-h-[90px] rounded-2xl"
                    placeholder="General prescription notes"
                  />
                </div>

                {(
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Search Medicine from Branch Stock
                      </label>
                      <Input
                        value={medicineSearch}
                        onChange={(e) => setMedicineSearch(e.target.value)}
                        className="mb-2 h-12 rounded-2xl"
                        placeholder="Search drug name, code, form, or strength"
                      />
                      <select
                        value={selectedMedicineId}
                        onChange={(e) => {
                          setSelectedMedicineId(e.target.value);
                          setAcceptedAlternativeForMedicineId(null);
                          setAllowOutOfStockPrescribing(false);
                        }}
                        className="flex h-12 w-full rounded-2xl border border-white/10 bg-background px-4 text-sm"
                      >
                        <option value="">Select medicine</option>
                        {filteredStockItems.map((item) => (
                          <option key={item.id} value={String(item.medicineId)}>
                            {item.medicine?.name}
                            {item.medicine?.strength ? ` - ${item.medicine.strength}` : ""} (
                            {item.stockQuantity > 0
                              ? `${item.stockQuantity} in stock`
                              : "out of stock"}
                            )
                          </option>
                        ))}
                      </select>
                      {stockLoading ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Loading branch stock...
                        </p>
                      ) : null}
                    </div>

                    {selectedMedicineIdNumber ? (
                      <div
                        className={`rounded-[1.2rem] border p-4 ${
                          selectedStockStatus === "OUT_OF_STOCK"
                            ? "border-rose-500/20 bg-destructive/10"
                            : selectedStockStatus === "LOW_STOCK"
                              ? "border-amber-500/20 bg-amber-500/10"
                              : "border-emerald-500/20 bg-success/10"
                        }`}
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-sm font-semibold">
                              {selectedStockItem?.medicine?.name ||
                                "Selected medicine"}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Stock: {selectedStockItem?.stockQuantity ?? 0} / Reorder:{" "}
                              {selectedStockItem?.reorderLevel ?? 0} / Unit price:{" "}
                              {selectedStockItem?.unitPrice ?? 0}
                            </p>
                            <p className="mt-2 text-xs text-muted-foreground">
                              Stock assistant checks this branch only. Final substitution
                              remains a clinician decision.
                            </p>
                          </div>
                          <Badge
                            className={`w-fit rounded-full border px-3 py-1 ${
                              selectedStockStatus === "OUT_OF_STOCK"
                                ? "border-rose-500/20 bg-destructive/10 text-rose-300"
                                : selectedStockStatus === "LOW_STOCK"
                                  ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
                                  : "border-emerald-500/20 bg-success/10 text-emerald-300"
                            }`}
                          >
                            {selectedStockStatus}
                          </Badge>
                        </div>

                        {selectedStockStatus === "OUT_OF_STOCK" ? (
                          <div className="mt-4 rounded-[1rem] border border-white/10 bg-black/10 p-3">
                            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                              <AlertTriangle className="h-4 w-4 text-amber-300" />
                              AI stock assistant
                            </div>
                            {alternativesLoading ? (
                              <p className="text-sm text-muted-foreground">
                                Checking in-stock alternatives...
                              </p>
                            ) : medicineAlternatives.length ? (
                              <div className="grid gap-2 md:grid-cols-2">
                                {medicineAlternatives.slice(0, 4).map((item) => (
                                  <button
                                    key={item.id}
                                    type="button"
                                    className="rounded-xl border border-white/10 bg-card/[0.04] p-3 text-left transition hover:border-cyan-400/40 hover:bg-cyan-500/10"
                                    onClick={() => {
                                      setAcceptedAlternativeForMedicineId(
                                        selectedMedicineIdNumber,
                                      );
                                      setSelectedMedicineId(String(item.medicineId));
                                      setMedicineSearch(item.medicine?.name || "");
                                      setAllowOutOfStockPrescribing(false);
                                      setMessage(
                                        `Selected in-stock alternative: ${item.medicine?.name}. Confirm dose and indication before saving.`,
                                      );
                                    }}
                                  >
                                    <p className="text-sm font-semibold">
                                      {item.medicine?.name}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      {[
                                        item.medicine?.strength,
                                        item.medicine?.dosageForm,
                                      ]
                                        .filter(Boolean)
                                        .join(" / ") || "No form details"}
                                    </p>
                                    <p className="mt-2 text-xs text-emerald-300">
                                      {item.stockQuantity} in stock
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      {item.reasons.join(" | ")}
                                    </p>
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                No safe in-stock shortlist could be built from the
                                available catalogue fields.
                              </p>
                            )}
                          </div>
                        ) : null}
                        {selectedStockStatus === "OUT_OF_STOCK" ? (
                          <label className="mt-3 flex items-start gap-3 rounded-[1rem] border border-amber-500/20 bg-amber-500/10 p-3 text-sm">
                            <input
                              type="checkbox"
                              checked={allowOutOfStockPrescribing}
                              onChange={(event) =>
                                setAllowOutOfStockPrescribing(
                                  event.target.checked,
                                )
                              }
                              className="mt-1"
                            />
                            <span>
                              Continue with this out-of-stock medicine after
                              clinical review. Pharmacy will dispense only if
                              stock becomes available.
                            </span>
                          </label>
                        ) : null}
                      </div>
                    ) : null}


                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                      <div>
                        <label className="mb-2 block text-sm font-medium">Dosage</label>
                        <Input
                          value={itemDosage}
                          onChange={(e) => setItemDosage(e.target.value)}
                          className="h-12 rounded-2xl"
                          placeholder="1 tablet"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium">Route</label>
                        <Input
                          value={itemRoute}
                          onChange={(e) => setItemRoute(e.target.value)}
                          className="h-12 rounded-2xl"
                          placeholder="Oral"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium">Frequency</label>
                        <Input
                          value={itemFrequency}
                          onChange={(e) => setItemFrequency(e.target.value)}
                          className="h-12 rounded-2xl"
                          placeholder="Three times daily"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium">Duration</label>
                        <Input
                          value={itemDuration}
                          onChange={(e) => setItemDuration(e.target.value)}
                          className="h-12 rounded-2xl"
                          placeholder="5 days"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium">Quantity</label>
                        <Input
                          type="number"
                          value={itemQuantity}
                          onChange={(e) => setItemQuantity(e.target.value)}
                          className="h-12 rounded-2xl"
                          placeholder="1"
                        />
                      </div>
                    </div>


                    <div>
                      <label className="mb-2 block text-sm font-medium">Instructions</label>
                      <Textarea
                        value={itemInstructions}
                        onChange={(e) => setItemInstructions(e.target.value)}
                        className="min-h-[100px] rounded-2xl"
                        placeholder="Take after meals"
                      />
                    </div>


                    <Button
                      type="button"
                      className="h-12 rounded-2xl"
                      onClick={handleAddPrescriptionItem}
                      disabled={!selectedMedicineId}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add to Prescription Draft
                    </Button>

                    <div className="rounded-[1.2rem] border border-cyan-500/20 bg-cyan-500/8 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                          <p className="text-sm font-semibold">
                            Doctor-room stock action
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Use this only when medicine is given or dispensed in
                            the consultation room. Stock is deducted immediately.
                          </p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
                          <select
                            value={directAdministrationMode}
                            onChange={(event) =>
                              setDirectAdministrationMode(
                                event.target.value as "DIRECT_DISPENSE" | "INJECTION",
                              )
                            }
                            className="h-11 rounded-xl border border-white/10 bg-background px-3 text-sm"
                          >
                            <option value="DIRECT_DISPENSE">Direct dispense</option>
                            <option value="INJECTION">Injection/administer</option>
                          </select>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-11 rounded-xl"
                            onClick={handleDirectMedicineAdministration}
                            disabled={
                              directMedicineAdministrationMutation.isPending ||
                              !selectedMedicineIdNumber ||
                              selectedStockStatus === "OUT_OF_STOCK"
                            }
                          >
                            {directMedicineAdministrationMutation.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Pill className="mr-2 h-4 w-4" />
                            )}
                            Deduct stock now
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">Draft medicine items</p>
                          <p className="text-sm text-muted-foreground">
                            Stock is checked now. Stock reduces only when pharmacy dispenses.
                          </p>
                        </div>
                        <Badge className="rounded-full border-0 bg-cyan-600/10 px-3 py-1 text-cyan-300">
                          {draftPrescriptionItems.length} item(s)
                        </Badge>
                      </div>
                      {draftPrescriptionItems.length === 0 ? (
                        <div className="rounded-[1rem] border border-dashed border-white/10 bg-card/[0.02] p-4 text-sm text-muted-foreground">
                          Search and add at least one medicine before sending to pharmacy.
                        </div>
                      ) : (
                        <div className="max-h-[280px] overflow-auto">
                          <table className="w-full min-w-[780px] text-left text-sm">
                            <thead className="sticky top-0 bg-background text-xs uppercase text-muted-foreground">
                              <tr>
                                <th className="px-3 py-2">Medicine</th>
                                <th className="px-3 py-2">Dose / route / frequency</th>
                                <th className="px-3 py-2">Duration</th>
                                <th className="px-3 py-2">Qty</th>
                                <th className="px-3 py-2">Stock</th>
                                <th className="px-3 py-2">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {draftPrescriptionItems.map((item, index) => (
                                <tr
                                  key={`${item.medicineId}-${index}`}
                                  className="border-t border-white/10"
                                >
                                  <td className="px-3 py-2">
                                    <p className="font-medium">{item.medicineName}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {[item.strength, item.dosageForm, item.medicineCode]
                                        .filter(Boolean)
                                        .join(" / ") || "Catalog medicine"}
                                    </p>
                                  </td>
                                  <td className="px-3 py-2 text-muted-foreground">
                                    {[item.dosage, item.route, item.frequency]
                                      .filter(Boolean)
                                      .join(" / ") || "-"}
                                  </td>
                                  <td className="px-3 py-2 text-muted-foreground">
                                    {item.duration || "-"}
                                  </td>
                                  <td className="px-3 py-2">{item.quantity}</td>
                                  <td className="px-3 py-2">
                                    <Badge className="rounded-full border border-white/10 bg-card/[0.04] text-xs">
                                      {item.stockStatus} - {item.stockQuantity}
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="h-9 rounded-xl"
                                      onClick={() =>
                                        handleRemoveDraftPrescriptionItem(index)
                                      }
                                    >
                                      Remove
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <Button
                      type="button"
                      className="h-12 rounded-2xl"
                      onClick={handleCreatePrescription}
                      disabled={
                        createPrescriptionMutation.isPending ||
                        draftPrescriptionItems.length === 0
                      }
                    >
                      {createPrescriptionMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="mr-2 h-4 w-4" />
                      )}
                      Send Prescription to Pharmacy
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </section>


          <section>
            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle>Current Consultation Prescriptions</CardTitle>
              </CardHeader>


              <CardContent className="space-y-4">
                {consultationPrescriptionList.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-card/[0.02] p-5 text-sm text-muted-foreground">
                    No prescriptions created for this consultation yet.
                  </div>
                ) : (
                  consultationPrescriptionList.map((prescription) => (
                    <div
                      key={prescription.id}
                      className={`rounded-[1.2rem] border p-4 transition-all ${
                        activePrescription?.id === prescription.id
                          ? "border-cyan-500/30 bg-cyan-500/[0.06]"
                          : "border-white/10 bg-card/[0.03]"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{prescription.prescriptionNumber}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {prescription.statusCode} • {formatDate(prescription.prescribedAt)}
                          </p>
                        </div>


                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-2xl"
                          onClick={() => setSelectedPrescriptionId(prescription.id)}
                        >
                          View
                        </Button>
                      </div>


                      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {(prescription.items ?? []).length === 0 ? (
                          <div className="rounded-[1rem] border border-dashed border-white/10 bg-card/[0.02] p-3 text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
                            No items yet.
                          </div>
                        ) : (
                          prescription.items?.map((item: PrescriptionItemSummary) => (
                            <div
                              key={item.id}
                              className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3"
                            >
                              <p className="font-medium">
                                {item.medicineNameSnapshot ||
                                  item.medicine?.name ||
                                  `Medicine #${item.medicineId}`}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {[
                                  item.medicine?.strength,
                                  item.dosage,
                                  item.route,
                                  item.frequency,
                                  item.duration,
                                ]
                                  .filter(Boolean)
                                  .join(" / ") || "-"}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                Qty: {item.quantity} / {item.statusCode}
                                {item.stockStatusAtPrescribing
                                  ? ` / ${item.stockStatusAtPrescribing}`
                                  : ""}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {item.instructions || "No instructions"}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </section>


          <section>
            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FlaskConical className="h-5 w-5 text-cyan-300" />
                  Create Lab Order
                </CardTitle>
              </CardHeader>


              <CardContent className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">Search Test</label>
                  <Input
                    value={labTestSearch}
                    onChange={(e) => setLabTestSearch(e.target.value)}
                    className="mb-2 h-12 rounded-2xl"
                    placeholder="Search lab service name, specimen, or category"
                  />
                  <select
                    value={selectedTestId}
                    onChange={(e) => setSelectedTestId(e.target.value)}
                    className="flex h-12 w-full rounded-2xl border border-white/10 bg-background px-4 text-sm"
                  >
                    <option value="">Select lab test</option>
                    {filteredLabTests.map((test) => (
                      <option key={test.id} value={String(test.id)}>
                        {test.testName}
                      </option>
                    ))}
                  </select>
                  {labTestsLoading ? (
                    <p className="mt-2 text-xs text-muted-foreground">Loading tests...</p>
                  ) : null}
                </div>


                <div>
                  <label className="mb-2 block text-sm font-medium">Item Instruction</label>
                  <Input
                    value={labInstruction}
                    onChange={(e) => setLabInstruction(e.target.value)}
                    className="h-12 rounded-2xl"
                    placeholder="Special instructions for this test"
                  />
                </div>


                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl"
                  onClick={handleAddLabTest}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Test
                </Button>


                <div className="space-y-3">
                  {selectedLabItems.length === 0 ? (
                    <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-card/[0.02] p-4 text-sm text-muted-foreground">
                      No tests selected yet.
                    </div>
                  ) : (
                    selectedLabItems.map((item) => (
                      <div
                        key={item.testId}
                        className="flex items-center justify-between gap-3 rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-3"
                      >
                        <div>
                          <p className="font-medium">{item.testName}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.instructions || "No item instruction"}
                          </p>
                        </div>


                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="rounded-xl"
                          onClick={() => handleRemoveLabTest(item.testId)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>


                <div>
                  <label className="mb-2 block text-sm font-medium">Urgency</label>
                  <select
                    value={labUrgency}
                    onChange={(e) => setLabUrgency(e.target.value)}
                    className="flex h-12 w-full rounded-2xl border border-white/10 bg-background px-4 text-sm"
                  >
                    <option value="ROUTINE">ROUTINE</option>
                    <option value="URGENT">URGENT</option>
                    <option value="STAT">STAT</option>
                  </select>
                </div>


                <div>
                  <label className="mb-2 block text-sm font-medium">Clinical Notes</label>
                  <Textarea
                    value={labClinicalNotes}
                    onChange={(e) => setLabClinicalNotes(e.target.value)}
                    className="min-h-[110px] rounded-2xl"
                    placeholder="Clinical context for the lab"
                  />
                </div>


                <Button
                  type="button"
                  className="h-12 rounded-2xl"
                  onClick={handleCreateLabOrder}
                  disabled={createLabOrderMutation.isPending}
                >
                  {createLabOrderMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FlaskConical className="mr-2 h-4 w-4" />
                  )}
                  Create Lab Order
                </Button>
              </CardContent>
            </Card>
          </section>


          <section>
            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FlaskConical className="h-5 w-5 text-cyan-300" />
                  Consultation Lab Results
                </CardTitle>
                <Badge className="rounded-full border-0 bg-cyan-600/10 px-3 py-1 text-cyan-300">
                  {labOrdersLoading
                    ? "Loading..."
                    : `${consultationLabOrders.length} order${
                        consultationLabOrders.length === 1 ? "" : "s"
                      }`}
                </Badge>
              </CardHeader>


              <CardContent className="space-y-4">
                {labOrdersLoading ? (
                  <div className="text-sm text-muted-foreground">Loading lab orders...</div>
                ) : consultationLabOrders.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-card/[0.02] p-5 text-sm text-muted-foreground">
                    No lab orders found for this consultation yet.
                  </div>
                ) : (
                  consultationLabOrders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-[1.3rem] border border-white/10 bg-card/[0.03] p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <p className="font-semibold">{order.orderNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            Status: {order.status || "REQUESTED"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Urgency: {order.urgency || "ROUTINE"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Created: {formatDate(order.createdAt)}
                          </p>
                        </div>


                        <div className="min-w-[260px] rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                          <p className="text-xs text-muted-foreground">Clinical Notes</p>
                          <p className="mt-1 text-sm font-medium">
                            {order.clinicalNotes || "—"}
                          </p>
                        </div>
                      </div>


                      <div className="mt-4 space-y-3">
                        {(order.items ?? []).length === 0 ? (
                          <div className="rounded-[1rem] border border-dashed border-white/10 bg-card/[0.02] p-3 text-sm text-muted-foreground">
                            No test items in this order.
                          </div>
                        ) : (
                          order.items?.map((item: any) => {
                            const itemResult =
                              item.results?.[0] ??
                              latestLabResultsList.find(
                                (result: any) => result.orderItemId === item.id,
                              ) ??
                              null;
                            const attachmentUrl =
                              itemResult?.attachmentDataUrl || "";
                            const isPdfAttachment =
                              attachmentUrl.startsWith(
                                "data:application/pdf",
                              ) ||
                              itemResult?.attachmentMimeType ===
                                "application/pdf";
                            const isImageAttachment =
                              attachmentUrl.startsWith("data:image/") ||
                              itemResult?.attachmentMimeType?.startsWith(
                                "image/",
                              );


                            return (
                              <div
                                key={item.id}
                                className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-4"
                              >
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                  <div className="space-y-2">
                                    <p className="font-medium">
                                      {item.test?.testName || `Test #${item.testId}`}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      Item Status: {item.status}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      Instructions: {item.instructions || "—"}
                                    </p>
                                  </div>


                                  <Badge
                                    className={`rounded-full border px-3 py-1 ${
                                      item.status === "RESULTED"
                                        ? "border-emerald-500/20 bg-success/10 text-emerald-300"
                                        : "border-amber-500/20 bg-amber-500/10 text-amber-300"
                                    }`}
                                  >
                                    {item.status === "RESULTED" ? "Resulted" : "Pending"}
                                  </Badge>
                                </div>


                                <div className="mt-4 rounded-[1rem] border border-white/10 bg-black/10 p-3">
                                  <p className="text-xs text-muted-foreground">Result Value</p>
                                  <p className="mt-1 whitespace-pre-wrap text-sm font-medium">
                                    {itemResult?.resultValue || "No result recorded yet."}
                                  </p>


                                  <p className="mt-3 text-xs text-muted-foreground">Remarks</p>
                                  <p className="mt-1 whitespace-pre-wrap text-sm font-medium">
                                    {itemResult?.remarks || "—"}
                                  </p>


                                  <p className="mt-3 text-xs text-muted-foreground">
                                    Recorded At
                                  </p>
                                  <p className="mt-1 text-sm font-medium">
                                    {itemResult?.recordedAt
                                      ? formatDate(itemResult.recordedAt)
                                      : "—"}
                                  </p>

                                  {attachmentUrl ? (
                                    <div className="mt-4 rounded-[1rem] border border-cyan-500/20 bg-cyan-500/5 p-3">
                                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-sm font-semibold">
                                          Attached lab file
                                        </p>
                                        <a
                                          href={attachmentUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 underline underline-offset-4"
                                        >
                                          <Paperclip className="h-4 w-4" />
                                          Open full view
                                        </a>
                                      </div>
                                      {isPdfAttachment ? (
                                        <iframe
                                          src={attachmentUrl}
                                          title={
                                            itemResult?.attachmentFileName ||
                                            "Lab result PDF"
                                          }
                                          className="h-[420px] w-full rounded-xl border border-white/10 bg-card"
                                        />
                                      ) : null}
                                      {isImageAttachment ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={attachmentUrl}
                                          alt={
                                            itemResult?.attachmentFileName ||
                                            "Lab result"
                                          }
                                          className="max-h-[520px] w-full rounded-xl border border-white/10 object-contain"
                                        />
                                      ) : null}
                                      {!isPdfAttachment && !isImageAttachment ? (
                                        <p className="text-sm text-muted-foreground">
                                          This file type opens in a new tab.
                                        </p>
                                      ) : null}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </section>


          <section>
            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-cyan-300" />
                  Past Patient Consultations
                </CardTitle>
                <Badge className="rounded-full border-0 bg-cyan-600/10 px-3 py-1 text-cyan-300">
                  {historyLoading ? "Loading..." : `${patientHistory.length} previous`}
                </Badge>
              </CardHeader>


              <CardContent className="space-y-4">
                {historyLoading ? (
                  <div className="text-sm text-muted-foreground">
                    Loading patient history...
                  </div>
                ) : patientHistory.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-card/[0.02] p-5 text-sm text-muted-foreground">
                    No previous consultations found for this patient.
                  </div>
                ) : (
                  patientHistory.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-[1.3rem] border border-white/10 bg-card/[0.03] p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <p className="font-semibold">{item.consultationNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            Date: {formatDate(item.completedAt || item.appointment?.appointmentDate)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Doctor:{" "}
                            {[item.doctor?.firstName, item.doctor?.lastName]
                              .filter(Boolean)
                              .join(" ") || "—"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Complaint: {item.chiefComplaint || "—"}
                          </p>
                        </div>


                        <div className="min-w-[220px] rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                          <p className="text-xs text-muted-foreground">Diagnosis</p>
                          <p className="mt-1 text-sm font-medium">{item.diagnosis || "—"}</p>
                          <p className="mt-3 text-xs text-muted-foreground">Treatment Plan</p>
                          <p className="mt-1 text-sm font-medium">
                            {item.treatmentPlan || "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </section>


          <section>
            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Pill className="h-5 w-5 text-cyan-300" />
                  Past Patient Prescriptions
                </CardTitle>
                <Badge className="rounded-full border-0 bg-cyan-600/10 px-3 py-1 text-cyan-300">
                  {patientPrescriptionsLoading
                    ? "Loading..."
                    : `${patientPrescriptionHistory.length} previous`}
                </Badge>
              </CardHeader>


              <CardContent className="space-y-4">
                {patientPrescriptionsLoading ? (
                  <div className="text-sm text-muted-foreground">
                    Loading prescription history...
                  </div>
                ) : patientPrescriptionHistory.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-card/[0.02] p-5 text-sm text-muted-foreground">
                    No previous prescriptions found for this patient.
                  </div>
                ) : (
                  patientPrescriptionHistory.map((prescription) => (
                    <div
                      key={prescription.id}
                      className="rounded-[1.3rem] border border-white/10 bg-card/[0.03] p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <p className="font-semibold">{prescription.prescriptionNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            Date: {formatDate(prescription.prescribedAt)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Prescriber:{" "}
                            {[prescription.prescribedBy?.firstName, prescription.prescribedBy?.lastName]
                              .filter(Boolean)
                              .join(" ") || "—"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Status: {prescription.statusCode}
                          </p>
                        </div>


                        <div className="min-w-[260px] space-y-2 rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                          {(prescription.items ?? []).length === 0 ? (
                            <p className="text-sm text-muted-foreground">No items</p>
                          ) : (
                            prescription.items?.map((item: PrescriptionItemSummary) => (
                              <div key={item.id}>
                                <p className="text-sm font-medium">
                                  {item.medicine?.name || `Medicine #${item.medicineId}`}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {[item.medicine?.strength, item.dosage, item.frequency, item.duration]
                                    .filter(Boolean)
                                    .join(" • ") || "—"}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
