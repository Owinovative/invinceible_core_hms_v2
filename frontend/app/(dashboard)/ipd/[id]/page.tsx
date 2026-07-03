"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  AlertTriangle,
  BadgeDollarSign,
  BedDouble,
  Bot,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Download,
  FileText,
  Loader2,
  LogOut,
  Pill,
  Plus,
  RefreshCw,
  Sparkles,
  Stethoscope,
  Syringe,
  TestTube2,
  Thermometer,
  UserRound,
} from "lucide-react";

import { useAdmission } from "@/hooks/use-admission";
import { useDischargeAdmission } from "@/hooks/use-discharge-admission";
import { useIpdClinicalDashboard } from "@/hooks/use-ipd-clinical-dashboard";
import { useCreateIpdProgressNote } from "@/hooks/use-create-ipd-progress-note";
import { useCreateTreatmentEntry } from "@/hooks/use-create-treatment-entry";
import { useAdministerTreatment } from "@/hooks/use-administer-treatment";
import { useTransferAdmissionBed } from "@/hooks/use-transfer-admission-bed";
import { useCreateIpdVital } from "@/hooks/use-create-ipd-vital";
import { useCreateIpdDoctorReview } from "@/hooks/use-create-ipd-doctor-review";
import { useCreateIpdDischargeSummary } from "@/hooks/use-create-ipd-discharge-summary";
import { useWards } from "@/hooks/use-wards";
import { useBeds } from "@/hooks/use-beds";
import { useAuth } from "@/providers/auth-provider";
import { useCreateAdmissionLabOrder } from "@/hooks/use-create-admission-lab-order";
import { useLabTests } from "@/hooks/use-lab-tests";
import { useBranchPharmacyStock } from "@/hooks/use-branch-pharmacy-stock";
import { useMedicineStockAlternatives } from "@/hooks/use-medicine-stock-alternatives";
import { usePostAdmissionBedCharge } from "@/hooks/use-post-admission-bed-charge";
import { useCreateClinicalAiDraft } from "@/hooks/use-ai-assistant";
import {
  downloadAdmissionDischargeSummaryPdf,
  downloadAdmissionMedicalSummaryPdf,
  downloadAdmissionTreatmentChartPdf,
} from "@/services/ipd-clinical-service";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { appSelectClass } from "@/lib/select-class";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function patientName(
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

function staffName(
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

function statusTone(status?: string | null) {
  switch ((status || "").toUpperCase()) {
    case "ADMITTED":
      return "border-cyan-500/20 bg-cyan-500/10 text-cyan-300";
    case "DISCHARGED":
      return "border-emerald-500/20 bg-success/10 text-emerald-300";
    case "ADMINISTERED":
      return "border-emerald-500/20 bg-success/10 text-emerald-300";
    case "PLANNED":
      return "border-amber-500/20 bg-amber-500/10 text-amber-300";
    case "RESULTED":
      return "border-emerald-500/20 bg-success/10 text-emerald-300";
    case "PENDING":
      return "border-amber-500/20 bg-amber-500/10 text-amber-300";
    default:
      return "border-white/10 bg-card/[0.04] text-muted-foreground";
  }
}

export default function IpdDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const { user } = useAuth();
  const currentStaffId = user?.staffId ? Number(user.staffId) : undefined;

  const { data, isLoading } = useAdmission(id);
  const { data: clinicalData, isLoading: clinicalLoading } =
    useIpdClinicalDashboard(id);
  const { data: wardsData } = useWards();
  const { data: bedsData } = useBeds();

  const dischargeMutation = useDischargeAdmission();
  const createProgressNoteMutation = useCreateIpdProgressNote();
  const createTreatmentEntryMutation = useCreateTreatmentEntry();
  const administerTreatmentMutation = useAdministerTreatment(id);
  const transferAdmissionBedMutation = useTransferAdmissionBed();
  const createIpdVitalMutation = useCreateIpdVital();
  const createIpdDoctorReviewMutation = useCreateIpdDoctorReview();
  const createIpdDischargeSummaryMutation = useCreateIpdDischargeSummary();
  const { data: labTestsData } = useLabTests();
  const admissionBranchId = data?.branchId ?? undefined;
  const { data: treatmentBranchStockData, isLoading: treatmentStockLoading } =
    useBranchPharmacyStock(admissionBranchId, { pageSize: 100 });
  const createAdmissionLabOrderMutation = useCreateAdmissionLabOrder();
  const postAdmissionBedChargeMutation = usePostAdmissionBedCharge(id);
  const createClinicalAiDraftMutation = useCreateClinicalAiDraft();

  const [message, setMessage] = React.useState<string | null>(null);
  const [downloadingDocument, setDownloadingDocument] = React.useState<
    string | null
  >(null);

  const doctorReviews = Array.isArray(clinicalData?.doctorReviews)
    ? clinicalData.doctorReviews
    : [];
  const vitalRecords = Array.isArray(clinicalData?.vitalRecords)
    ? clinicalData.vitalRecords
    : [];
  const progressNotes = Array.isArray(clinicalData?.progressNotes)
    ? clinicalData.progressNotes
    : [];
  const treatmentChart = Array.isArray(clinicalData?.treatmentChart)
    ? clinicalData.treatmentChart
    : [];
  const labOrders = Array.isArray(clinicalData?.labOrders)
    ? clinicalData.labOrders
    : [];
  const dischargeSummary = clinicalData?.dischargeSummary ?? null;

  const wards = React.useMemo(
    () => (Array.isArray(wardsData) ? wardsData : []),
    [wardsData],
  );
  const beds = React.useMemo(
    () => (Array.isArray(bedsData) ? bedsData : []),
    [bedsData],
  );
  const labTests = React.useMemo(
    () => (Array.isArray(labTestsData) ? labTestsData : []),
    [labTestsData],
  );
  const [labTestSearch, setLabTestSearch] = React.useState("");
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
  }, [labTests, labTestSearch]);

  const totalProgressNotes = progressNotes.length;
  const totalTreatments = treatmentChart.length;
  const totalVitals = vitalRecords.length;
  const totalDoctorReviews = doctorReviews.length;

  const pendingTreatments = treatmentChart.filter(
    (item) => (item.statusCode || "PLANNED").toUpperCase() !== "ADMINISTERED",
  ).length;
  const dueTreatments = treatmentChart.filter((item) => {
    if ((item.statusCode || "PLANNED").toUpperCase() === "ADMINISTERED") {
      return false;
    }

    if (!item.scheduledAt) return false;

    const scheduled = new Date(item.scheduledAt);
    return !Number.isNaN(scheduled.getTime()) && scheduled <= new Date();
  }).length;

  const [noteType, setNoteType] = React.useState("");
  const [noteText, setNoteText] = React.useState("");

  const [treatmentType, setTreatmentType] = React.useState("");
  const [treatmentName, setTreatmentName] = React.useState("");
  const [treatmentMedicineSearch, setTreatmentMedicineSearch] =
    React.useState("");
  const [selectedTreatmentMedicineId, setSelectedTreatmentMedicineId] =
    React.useState("");
  const [dosage, setDosage] = React.useState("");
  const [route, setRoute] = React.useState("");
  const [frequency, setFrequency] = React.useState("");
  const [scheduledAt, setScheduledAt] = React.useState("");
  const [treatmentNotes, setTreatmentNotes] = React.useState("");

  const [reviewDate, setReviewDate] = React.useState("");
  const [reviewChiefComplaint, setReviewChiefComplaint] = React.useState("");
  const [reviewSubjective, setReviewSubjective] = React.useState("");
  const [reviewObjective, setReviewObjective] = React.useState("");
  const [reviewAssessment, setReviewAssessment] = React.useState("");
  const [reviewPlan, setReviewPlan] = React.useState("");
  const [reviewNotes, setReviewNotes] = React.useState("");

  const [recordedAt, setRecordedAt] = React.useState("");
  const [temperatureC, setTemperatureC] = React.useState("");
  const [systolicBp, setSystolicBp] = React.useState("");
  const [diastolicBp, setDiastolicBp] = React.useState("");
  const [pulseRate, setPulseRate] = React.useState("");
  const [respiratoryRate, setRespiratoryRate] = React.useState("");
  const [oxygenSaturation, setOxygenSaturation] = React.useState("");
  const [weightKg, setWeightKg] = React.useState("");
  const [heightCm, setHeightCm] = React.useState("");
  const [painScore, setPainScore] = React.useState("");
  const [vitalNotes, setVitalNotes] = React.useState("");

  const [showTransferForm, setShowTransferForm] = React.useState(false);
  const [transferWardId, setTransferWardId] = React.useState("");
  const [transferBedId, setTransferBedId] = React.useState("");
  const [transferNotes, setTransferNotes] = React.useState("");

  const [dischargeDiagnosis, setDischargeDiagnosis] = React.useState("");
  const [hospitalCourse, setHospitalCourse] = React.useState("");
  const [conditionOnDischarge, setConditionOnDischarge] = React.useState("");
  const [dischargeMedications, setDischargeMedications] = React.useState("");
  const [followUpInstructions, setFollowUpInstructions] = React.useState("");

  const [labUrgency, setLabUrgency] = React.useState("ROUTINE");
  const [labClinicalNotes, setLabClinicalNotes] = React.useState("");
  const [selectedTestId, setSelectedTestId] = React.useState("");
  const [selectedTestInstructions, setSelectedTestInstructions] =
    React.useState("");
  const [labOrderItems, setLabOrderItems] = React.useState<
    { testId: number; testName: string; instructions?: string }[]
  >([]);
  const [bedChargeDate, setBedChargeDate] = React.useState(
    new Date().toISOString().slice(0, 10),
  );
  const [bedChargeQuantity, setBedChargeQuantity] = React.useState("1");
  const [bedChargeUnitPrice, setBedChargeUnitPrice] = React.useState("");
  const [bedChargeNotes, setBedChargeNotes] = React.useState("");
  const [medicalSummaryPrompt, setMedicalSummaryPrompt] = React.useState(
    "Create a concise inpatient medical summary for clinician review using the documented admission, progress notes, vitals, treatments, and lab results.",
  );
  const [medicalSummaryDraft, setMedicalSummaryDraft] = React.useState("");

  const treatmentBranchStockItems = React.useMemo(() => {
    const items = Array.isArray(treatmentBranchStockData)
      ? treatmentBranchStockData
      : (treatmentBranchStockData?.data ?? []);
    return items.filter((item) => item.isActive !== false && item.medicine);
  }, [treatmentBranchStockData]);

  const selectedTreatmentMedicineIdNumber = selectedTreatmentMedicineId
    ? Number(selectedTreatmentMedicineId)
    : undefined;

  const selectedTreatmentStockItem = selectedTreatmentMedicineIdNumber
    ? treatmentBranchStockItems.find(
        (item) => item.medicineId === selectedTreatmentMedicineIdNumber,
      )
    : undefined;

  const selectedTreatmentStockStatus:
    | "IN_STOCK"
    | "LOW_STOCK"
    | "OUT_OF_STOCK"
    | null = selectedTreatmentStockItem
    ? selectedTreatmentStockItem.stockQuantity <= 0
      ? "OUT_OF_STOCK"
      : selectedTreatmentStockItem.stockQuantity <=
          selectedTreatmentStockItem.reorderLevel
        ? "LOW_STOCK"
        : "IN_STOCK"
    : selectedTreatmentMedicineIdNumber && !treatmentStockLoading
      ? "OUT_OF_STOCK"
      : null;

  const {
    data: treatmentAlternativesData,
    isLoading: treatmentAlternativesLoading,
  } = useMedicineStockAlternatives(
    admissionBranchId,
    selectedTreatmentMedicineIdNumber,
  );

  const treatmentAlternatives = React.useMemo(
    () => treatmentAlternativesData?.alternatives ?? [],
    [treatmentAlternativesData],
  );

  const filteredTreatmentStockItems = React.useMemo(() => {
    const query = treatmentMedicineSearch.trim().toLowerCase();
    const matches = treatmentBranchStockItems.filter((item) => {
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
    });

    return matches
      .sort((left, right) => right.stockQuantity - left.stockQuantity)
      .slice(0, 140);
  }, [treatmentBranchStockItems, treatmentMedicineSearch]);

  React.useEffect(() => {
    if (!dischargeSummary) return;
    setDischargeDiagnosis(dischargeSummary.dischargeDiagnosis || "");
    setHospitalCourse(dischargeSummary.hospitalCourse || "");
    setConditionOnDischarge(dischargeSummary.conditionOnDischarge || "");
    setDischargeMedications(dischargeSummary.dischargeMedications || "");
    setFollowUpInstructions(dischargeSummary.followUpInstructions || "");
  }, [dischargeSummary]);

  const availableTransferBeds = React.useMemo(() => {
    return beds.filter((bed) => {
      const wardMatch = transferWardId
        ? String(bed.wardId) === transferWardId
        : false;
      const isAvailable =
        (bed.statusCode || "AVAILABLE").toUpperCase() === "AVAILABLE";
      const isActive = bed.isActive !== false;
      return wardMatch && isAvailable && isActive;
    });
  }, [beds, transferWardId]);

  React.useEffect(() => {
    if (!data || !showTransferForm) return;

    if (!transferWardId) {
      setTransferBedId("");
      return;
    }

    if (availableTransferBeds.length === 0) {
      setTransferBedId("");
      return;
    }

    const stillValid = availableTransferBeds.some(
      (bed) => String(bed.id) === transferBedId,
    );

    if (!stillValid) {
      setTransferBedId(String(availableTransferBeds[0].id));
    }
  }, [
    data,
    showTransferForm,
    transferWardId,
    availableTransferBeds,
    transferBedId,
  ]);

  const handleGenerateMedicalSummary = async () => {
    if (!data) return;

    setMessage(null);

    const latestVital = vitalRecords[0] ?? null;
    const latestReview = doctorReviews[0] ?? null;
    const patient = data.patient as typeof data.patient & {
      dateOfBirth?: string | null;
    };
    const consultation = data.consultation as
      | {
          chiefComplaint?: string | null;
          historyOfPresenting?: string | null;
          examinationFindings?: string | null;
          diagnosis?: string | null;
          treatmentPlan?: string | null;
        }
      | null
      | undefined;
    const labContext = labOrders.slice(0, 8).map((order) => ({
      orderNumber: order.orderNumber,
      urgency: order.urgency,
      status: order.status,
      clinicalNotes: order.clinicalNotes,
      tests: (order.items ?? []).map((item) => ({
        testName: item.test?.testName,
        status: item.status,
        result: item.results?.[0]?.resultValue,
        remarks: item.results?.[0]?.remarks,
      })),
    }));

    const result = await createClinicalAiDraftMutation.mutateAsync({
      task: "DISCHARGE_SUMMARY",
      audience: "doctor preparing an inpatient medical summary",
      prompt: medicalSummaryPrompt,
      context: {
        patient: {
          name: patientName(patient),
          patientNumber: patient?.patientNumber,
          gender: patient?.gender,
          dateOfBirth: patient?.dateOfBirth,
        },
        admission: {
          admissionNumber: data.admissionNumber,
          statusCode: data.statusCode,
          admittedAt: data.admittedAt,
          admissionReason: data.admissionReason,
          ward: data.ward?.name,
          bed: data.bed?.bedNumber,
        },
        consultation: consultation
          ? {
              chiefComplaint: consultation.chiefComplaint,
              historyOfPresenting: consultation.historyOfPresenting,
              examinationFindings: consultation.examinationFindings,
              diagnosis: consultation.diagnosis,
              treatmentPlan: consultation.treatmentPlan,
            }
          : null,
        latestReview,
        latestVital,
        progressNotes: progressNotes.slice(0, 8).map((note) => ({
          type: note.noteType,
          text: note.noteText,
          recordedAt: note.createdAt,
          recordedBy: staffName(note.recordedBy),
        })),
        treatments: treatmentChart.slice(0, 12).map((item) => ({
          treatmentType: item.treatmentType,
          treatmentName: item.treatmentName,
          dosage: item.dosage,
          route: item.route,
          frequency: item.frequency,
          statusCode: item.statusCode,
          scheduledAt: item.scheduledAt,
          administeredAt: item.administeredAt,
        })),
        labs: labContext,
      },
    });

    setMedicalSummaryDraft(result.output);
  };

  const handleSaveDischargeSummary = async () => {
    if (!data) return;

    if (
      !dischargeDiagnosis.trim() ||
      !hospitalCourse.trim() ||
      !conditionOnDischarge.trim()
    ) {
      setMessage(
        "Please complete discharge diagnosis, hospital course, and condition on discharge.",
      );
      return;
    }

    if (!currentStaffId) {
      setMessage("Your account is not linked to a staff profile yet.");
      return;
    }

    setMessage(null);

    await createIpdDischargeSummaryMutation.mutateAsync({
      admissionId: data.id,
      dischargeDiagnosis: dischargeDiagnosis.trim(),
      hospitalCourse: hospitalCourse.trim(),
      conditionOnDischarge: conditionOnDischarge.trim(),
      dischargeMedications: dischargeMedications || undefined,
      followUpInstructions: followUpInstructions || undefined,
      dischargedByStaffId: currentStaffId,
    });

    setMessage("Discharge summary saved successfully.");
  };

  const handleDischarge = async () => {
    if (!data) return;

    if (
      !dischargeDiagnosis.trim() ||
      !hospitalCourse.trim() ||
      !conditionOnDischarge.trim()
    ) {
      setMessage(
        "Complete the discharge summary first: diagnosis, hospital course, and condition on discharge.",
      );
      return;
    }

    if (!currentStaffId) {
      setMessage("Your account is not linked to a staff profile yet.");
      return;
    }

    setMessage(null);

    await createIpdDischargeSummaryMutation.mutateAsync({
      admissionId: data.id,
      dischargeDiagnosis: dischargeDiagnosis.trim(),
      hospitalCourse: hospitalCourse.trim(),
      conditionOnDischarge: conditionOnDischarge.trim(),
      dischargeMedications: dischargeMedications || undefined,
      followUpInstructions: followUpInstructions || undefined,
      dischargedByStaffId: currentStaffId,
    });

    await dischargeMutation.mutateAsync(data.id);
    setMessage(`Admission ${data.admissionNumber} discharged successfully.`);
  };

  const handleCreateProgressNote = async () => {
    if (!currentStaffId) {
      setMessage("Your account is not linked to a staff profile yet.");
      return;
    }

    if (!data) return;

    if (!noteText.trim()) {
      setMessage("Please enter the progress note text.");
      return;
    }

    setMessage(null);

    await createProgressNoteMutation.mutateAsync({
      admissionId: data.id,
      recordedByStaffId: currentStaffId,
      noteType: noteType || undefined,
      noteText: noteText.trim(),
    });

    setNoteType("");
    setNoteText("");
    setMessage("Progress note added successfully.");
  };

  const handleCreateTreatmentEntry = async () => {
    if (!currentStaffId) {
      setMessage("Your account is not linked to a staff profile yet.");
      return;
    }

    if (!data) return;

    const selectedTreatmentName =
      selectedTreatmentStockItem?.medicine?.name?.trim() || treatmentName.trim();

    if (!selectedTreatmentName) {
      setMessage("Please enter the treatment name.");
      return;
    }

    if (selectedTreatmentStockStatus === "OUT_OF_STOCK") {
      setMessage(
        "Selected treatment medicine is out of stock in this branch. Choose an in-stock option or restock before charting it.",
      );
      return;
    }

    setMessage(null);

    await createTreatmentEntryMutation.mutateAsync({
      admissionId: data.id,
      orderedByStaffId: currentStaffId,
      treatmentType: treatmentType || undefined,
      treatmentName: selectedTreatmentName,
      dosage: dosage || undefined,
      route: route || undefined,
      frequency: frequency || undefined,
      scheduledAt: scheduledAt || undefined,
      notes: treatmentNotes || undefined,
      statusCode: "PLANNED",
    });

    setTreatmentType("");
    setTreatmentName("");
    setTreatmentMedicineSearch("");
    setSelectedTreatmentMedicineId("");
    setDosage("");
    setRoute("");
    setFrequency("");
    setScheduledAt("");
    setTreatmentNotes("");
    setMessage("Treatment entry created successfully.");
  };

  const handleAdministerTreatment = async (entryId: number) => {
    if (!currentStaffId) {
      setMessage("Your account is not linked to a staff profile yet.");
      return;
    }

    setMessage(null);

    await administerTreatmentMutation.mutateAsync({
      entryId,
      administeredByStaffId: currentStaffId,
    });

    setMessage("Treatment marked as administered.");
  };

  const handleTransferBed = async () => {
    if (!data) return;

    if ((data.statusCode || "").toUpperCase() !== "ADMITTED") {
      setMessage("Only active admitted patients can be transferred.");
      return;
    }

    if (!transferWardId) {
      setMessage("Please select a transfer ward.");
      return;
    }

    setMessage(null);

    await transferAdmissionBedMutation.mutateAsync({
      id: data.id,
      payload: {
        wardId: Number(transferWardId),
        bedId: transferBedId ? Number(transferBedId) : undefined,
        notes: transferNotes || undefined,
      },
    });

    setTransferNotes("");
    setShowTransferForm(false);
    setMessage("Patient bed/ward transferred successfully.");
  };

  const handleCreateVital = async () => {
    if (!currentStaffId) {
      setMessage("Your account is not linked to a staff profile yet.");
      return;
    }

    if (!data) return;

    setMessage(null);

    const heightValue = Number(heightCm || 0);
    const weightValue = Number(weightKg || 0);
    const bmiValue =
      heightValue > 0 && weightValue > 0
        ? Number(
            (weightValue / ((heightValue / 100) * (heightValue / 100))).toFixed(
              2,
            ),
          )
        : undefined;

    await createIpdVitalMutation.mutateAsync({
      admissionId: data.id,
      recordedByStaffId: currentStaffId,
      recordedAt: recordedAt || undefined,
      temperatureC: temperatureC ? Number(temperatureC) : undefined,
      systolicBp: systolicBp ? Number(systolicBp) : undefined,
      diastolicBp: diastolicBp ? Number(diastolicBp) : undefined,
      pulseRate: pulseRate ? Number(pulseRate) : undefined,
      respiratoryRate: respiratoryRate ? Number(respiratoryRate) : undefined,
      oxygenSaturation: oxygenSaturation ? Number(oxygenSaturation) : undefined,
      weightKg: weightKg ? Number(weightKg) : undefined,
      heightCm: heightCm ? Number(heightCm) : undefined,
      bmi: bmiValue,
      painScore: painScore ? Number(painScore) : undefined,
      notes: vitalNotes || undefined,
    });

    setRecordedAt("");
    setTemperatureC("");
    setSystolicBp("");
    setDiastolicBp("");
    setPulseRate("");
    setRespiratoryRate("");
    setOxygenSaturation("");
    setWeightKg("");
    setHeightCm("");
    setPainScore("");
    setVitalNotes("");
    setMessage("Vital record added successfully.");
  };

  const handleCreateDoctorReview = async () => {
    if (!currentStaffId) {
      setMessage("Your account is not linked to a staff profile yet.");
      return;
    }

    if (!data) return;

    if (!reviewAssessment.trim() && !reviewPlan.trim()) {
      setMessage("Please enter at least assessment or plan.");
      return;
    }

    setMessage(null);

    await createIpdDoctorReviewMutation.mutateAsync({
      admissionId: data.id,
      reviewedByStaffId: currentStaffId,
      reviewDate: reviewDate || undefined,
      chiefComplaint: reviewChiefComplaint || undefined,
      subjective: reviewSubjective || undefined,
      objective: reviewObjective || undefined,
      assessment: reviewAssessment || undefined,
      plan: reviewPlan || undefined,
      reviewNotes: reviewNotes || undefined,
    });

    setReviewDate("");
    setReviewChiefComplaint("");
    setReviewSubjective("");
    setReviewObjective("");
    setReviewAssessment("");
    setReviewPlan("");
    setReviewNotes("");
    setMessage("Doctor review saved successfully.");
  };
  const handleAddLabOrderItem = () => {
    if (!selectedTestId) {
      setMessage("Please select a lab test.");
      return;
    }

    const testId = Number(selectedTestId);
    const selectedTest = labTests.find((item) => item.id === testId);

    if (!selectedTest) {
      setMessage("Selected lab test was not found.");
      return;
    }

    const alreadyAdded = labOrderItems.some((item) => item.testId === testId);
    if (alreadyAdded) {
      setMessage("This lab test has already been added.");
      return;
    }

    setLabOrderItems((prev) => [
      ...prev,
      {
        testId,
        testName: selectedTest.testName,
        instructions: selectedTestInstructions.trim() || undefined,
      },
    ]);

    setSelectedTestId("");
    setSelectedTestInstructions("");
    setMessage(null);
  };

  const handleRemoveLabOrderItem = (testId: number) => {
    setLabOrderItems((prev) => prev.filter((item) => item.testId !== testId));
  };

  const handleCreateAdmissionLabOrder = async () => {
    if (!data) return;

    if (!currentStaffId) {
      setMessage("Your account is not linked to a staff profile yet.");
      return;
    }

    if (labOrderItems.length === 0) {
      setMessage("Please add at least one lab test.");
      return;
    }

    setMessage(null);

    await createAdmissionLabOrderMutation.mutateAsync({
      patientId: data.patientId,
      admissionId: data.id,
      requestedByStaffId: currentStaffId,
      urgency: labUrgency || "ROUTINE",
      clinicalNotes: labClinicalNotes.trim() || undefined,
      items: labOrderItems.map((item) => ({
        testId: item.testId,
        instructions: item.instructions,
      })),
    });

    setLabUrgency("ROUTINE");
    setLabClinicalNotes("");
    setSelectedTestId("");
    setSelectedTestInstructions("");
    setLabOrderItems([]);
    setMessage("Admission lab order created successfully.");
  };

  const handlePostBedCharge = async () => {
    if (!data) return;

    setMessage(null);

    await postAdmissionBedChargeMutation.mutateAsync({
      chargedDate: bedChargeDate || undefined,
      quantity: bedChargeQuantity ? Number(bedChargeQuantity) : 1,
      unitPrice: bedChargeUnitPrice ? Number(bedChargeUnitPrice) : undefined,
      notes: bedChargeNotes.trim() || undefined,
    });

    setBedChargeUnitPrice("");
    setBedChargeNotes("");
    setMessage("Bed charge posted to the patient invoice.");
  };

  const handleDownloadDocument = async (
    documentType: "medical" | "discharge" | "chart",
  ) => {
    if (!data) return;

    setMessage(null);
    setDownloadingDocument(documentType);

    try {
      if (documentType === "medical") {
        await downloadAdmissionMedicalSummaryPdf(data.id, data.admissionNumber);
      } else if (documentType === "discharge") {
        await downloadAdmissionDischargeSummaryPdf(
          data.id,
          data.admissionNumber,
        );
      } else {
        await downloadAdmissionTreatmentChartPdf(data.id, data.admissionNumber);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to download the clinical document.",
      );
    } finally {
      setDownloadingDocument(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border surface-spotlight shadow-md p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-blue-600/10 via-cyan-500/5 to-transparent" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge className="rounded-full border-0 bg-primary/10 px-3 py-1 text-module">
              IPD Workspace
            </Badge>

            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10">
                <BedDouble className="h-7 w-7 text-primary" />
              </div>

              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Admission Details
                </h1>
                <p className="text-muted-foreground">
                  Inpatient notes, vitals, doctor reviews, lab results,
                  treatment chart, transfer workflow, and discharge workflow
                </p>
              </div>
            </div>
          </div>

          <Link href="/ipd">
            <Button type="button" variant="outline" className="rounded-2xl">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to IPD
            </Button>
          </Link>
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
            Loading admission details...
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
            <Card className="rounded-[1.6rem] surface-spotlight shadow-md">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Doctor Reviews
                  </p>
                  <p className="mt-2 text-2xl font-bold">
                    {totalDoctorReviews}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <Stethoscope className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.6rem] surface-spotlight shadow-md">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">Vitals</p>
                  <p className="mt-2 text-2xl font-bold">{totalVitals}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <Thermometer className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.6rem] surface-spotlight shadow-md">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Progress Notes
                  </p>
                  <p className="mt-2 text-2xl font-bold">
                    {totalProgressNotes}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <ClipboardList className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.6rem] surface-spotlight shadow-md">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">Treatments</p>
                  <p className="mt-2 text-2xl font-bold">{totalTreatments}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <Syringe className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.6rem] surface-spotlight shadow-md">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">Due Treatment</p>
                  <p className="mt-2 text-2xl font-bold">{dueTreatments}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {pendingTreatments} pending total
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <Clock3 className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle>Patient Snapshot</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="rounded-[1.3rem] border border-white/10 bg-card/[0.03] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                      <UserRound className="h-5 w-5 text-primary" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-lg font-bold">
                        {patientName(data.patient)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {data.patient?.patientNumber || "No patient number"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <div className="mt-2">
                      <Badge
                        className={`rounded-full border px-3 py-1 ${statusTone(data.statusCode)}`}
                      >
                        {data.statusCode}
                      </Badge>
                    </div>
                  </div>

                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Gender</p>
                    <p className="mt-1 text-sm font-medium">
                      {data.patient?.gender || "—"}
                    </p>
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
                    <p className="text-xs text-muted-foreground">
                      Consultation
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {data.consultation?.consultationNumber || "—"}
                    </p>
                  </div>

                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Ward</p>
                    <p className="mt-1 text-sm font-medium">
                      {data.ward?.name || "—"}
                    </p>
                  </div>

                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Bed</p>
                    <p className="mt-1 text-sm font-medium">
                      {data.bed?.bedNumber || "Not assigned"}
                    </p>
                  </div>

                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Admitted At</p>
                    <p className="mt-1 text-sm font-medium">
                      {formatDate(data.admittedAt)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle>Admission Information</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">
                      Admission Number
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {data.admissionNumber}
                    </p>
                  </div>

                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">
                      Admission Source
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {data.admissionSource || "—"}
                    </p>
                  </div>

                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">
                      Expected Discharge
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {formatDate(data.expectedDischargeAt)}
                    </p>
                  </div>
                </div>

                <div className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4">
                  <p className="text-xs text-muted-foreground">
                    Admission Reason
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm font-medium">
                    {data.admissionReason || "—"}
                  </p>
                </div>

                <div className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4">
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm font-medium">
                    {data.notes || "—"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-primary" />
                  Doctor Review
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Review Date
                    </label>
                    <Input
                      type="datetime-local"
                      value={reviewDate}
                      onChange={(e) => setReviewDate(e.target.value)}
                      className="h-12 rounded-2xl"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Chief Complaint
                    </label>
                    <Input
                      value={reviewChiefComplaint}
                      onChange={(e) => setReviewChiefComplaint(e.target.value)}
                      className="h-12 rounded-2xl"
                      placeholder="Current inpatient complaint"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Subjective
                  </label>
                  <Textarea
                    value={reviewSubjective}
                    onChange={(e) => setReviewSubjective(e.target.value)}
                    className="min-h-[100px] rounded-2xl"
                    placeholder="Patient symptoms and complaints"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Objective
                  </label>
                  <Textarea
                    value={reviewObjective}
                    onChange={(e) => setReviewObjective(e.target.value)}
                    className="min-h-[100px] rounded-2xl"
                    placeholder="Examination findings and observations"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Assessment
                  </label>
                  <Textarea
                    value={reviewAssessment}
                    onChange={(e) => setReviewAssessment(e.target.value)}
                    className="min-h-[100px] rounded-2xl"
                    placeholder="Clinical assessment"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Plan</label>
                  <Textarea
                    value={reviewPlan}
                    onChange={(e) => setReviewPlan(e.target.value)}
                    className="min-h-[100px] rounded-2xl"
                    placeholder="Treatment plan and next steps"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Additional Review Notes
                  </label>
                  <Textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="min-h-[100px] rounded-2xl"
                    placeholder="Extra doctor review notes"
                  />
                </div>

                <Button
                  type="button"
                  className="h-12 rounded-2xl"
                  onClick={handleCreateDoctorReview}
                  disabled={createIpdDoctorReviewMutation.isPending}
                >
                  {createIpdDoctorReviewMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Save Doctor Review
                </Button>

                <div className="space-y-4 pt-2">
                  {clinicalLoading ? (
                    <div className="text-sm text-muted-foreground">
                      Loading doctor reviews...
                    </div>
                  ) : doctorReviews.length === 0 ? (
                    <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-card/[0.02] p-5 text-sm text-muted-foreground">
                      No doctor reviews recorded yet.
                    </div>
                  ) : (
                    doctorReviews.map((review) => (
                      <div
                        key={review.id}
                        className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4"
                      >
                        <p className="font-semibold">Doctor Review</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          By: {staffName(review.reviewedBy)} •{" "}
                          {formatDate(review.reviewDate || review.createdAt)}
                        </p>

                        <div className="mt-4 grid gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Chief Complaint
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm">
                              {review.chiefComplaint || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Subjective
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm">
                              {review.subjective || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Objective
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm">
                              {review.objective || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Assessment
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm">
                              {review.assessment || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Plan
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm">
                              {review.plan || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Notes
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm">
                              {review.reviewNotes || "—"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Thermometer className="h-5 w-5 text-primary" />
                  IPD Vitals
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Recorded At
                    </label>
                    <Input
                      type="datetime-local"
                      value={recordedAt}
                      onChange={(e) => setRecordedAt(e.target.value)}
                      className="h-12 rounded-2xl"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Temperature °C
                    </label>
                    <Input
                      type="number"
                      value={temperatureC}
                      onChange={(e) => setTemperatureC(e.target.value)}
                      className="h-12 rounded-2xl"
                      placeholder="36.8"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Systolic BP
                    </label>
                    <Input
                      type="number"
                      value={systolicBp}
                      onChange={(e) => setSystolicBp(e.target.value)}
                      className="h-12 rounded-2xl"
                      placeholder="120"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Diastolic BP
                    </label>
                    <Input
                      type="number"
                      value={diastolicBp}
                      onChange={(e) => setDiastolicBp(e.target.value)}
                      className="h-12 rounded-2xl"
                      placeholder="80"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Pulse Rate
                    </label>
                    <Input
                      type="number"
                      value={pulseRate}
                      onChange={(e) => setPulseRate(e.target.value)}
                      className="h-12 rounded-2xl"
                      placeholder="72"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Respiratory Rate
                    </label>
                    <Input
                      type="number"
                      value={respiratoryRate}
                      onChange={(e) => setRespiratoryRate(e.target.value)}
                      className="h-12 rounded-2xl"
                      placeholder="18"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Oxygen Saturation
                    </label>
                    <Input
                      type="number"
                      value={oxygenSaturation}
                      onChange={(e) => setOxygenSaturation(e.target.value)}
                      className="h-12 rounded-2xl"
                      placeholder="98"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Pain Score
                    </label>
                    <Input
                      type="number"
                      value={painScore}
                      onChange={(e) => setPainScore(e.target.value)}
                      className="h-12 rounded-2xl"
                      placeholder="2"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Weight (kg)
                    </label>
                    <Input
                      type="number"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      className="h-12 rounded-2xl"
                      placeholder="70"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Height (cm)
                    </label>
                    <Input
                      type="number"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                      className="h-12 rounded-2xl"
                      placeholder="170"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Vital Notes
                  </label>
                  <Textarea
                    value={vitalNotes}
                    onChange={(e) => setVitalNotes(e.target.value)}
                    className="min-h-[100px] rounded-2xl"
                    placeholder="Extra vital notes"
                  />
                </div>

                <Button
                  type="button"
                  className="h-12 rounded-2xl"
                  onClick={handleCreateVital}
                  disabled={createIpdVitalMutation.isPending}
                >
                  {createIpdVitalMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Save Vital Record
                </Button>

                <div className="space-y-4 pt-2">
                  {clinicalLoading ? (
                    <div className="text-sm text-muted-foreground">
                      Loading vitals...
                    </div>
                  ) : vitalRecords.length === 0 ? (
                    <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-card/[0.02] p-5 text-sm text-muted-foreground">
                      No vitals recorded yet.
                    </div>
                  ) : (
                    vitalRecords.map((vital) => (
                      <div
                        key={vital.id}
                        className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4"
                      >
                        <p className="font-semibold">Vital Record</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          By: {staffName(vital.recordedBy)} •{" "}
                          {formatDate(vital.recordedAt || vital.createdAt)}
                        </p>

                        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                            <p className="text-xs text-muted-foreground">
                              Temperature °C
                            </p>
                            <p className="mt-1 text-sm font-medium">
                              {vital.temperatureC ?? "—"}
                            </p>
                          </div>
                          <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                            <p className="text-xs text-muted-foreground">
                              Blood Pressure
                            </p>
                            <p className="mt-1 text-sm font-medium">
                              {vital.systolicBp || vital.diastolicBp
                                ? `${vital.systolicBp ?? "—"}/${vital.diastolicBp ?? "—"}`
                                : "—"}
                            </p>
                          </div>
                          <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                            <p className="text-xs text-muted-foreground">
                              Pulse Rate
                            </p>
                            <p className="mt-1 text-sm font-medium">
                              {vital.pulseRate ?? "—"}
                            </p>
                          </div>
                          <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                            <p className="text-xs text-muted-foreground">
                              Respiratory Rate
                            </p>
                            <p className="mt-1 text-sm font-medium">
                              {vital.respiratoryRate ?? "—"}
                            </p>
                          </div>
                          <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                            <p className="text-xs text-muted-foreground">
                              Oxygen Saturation
                            </p>
                            <p className="mt-1 text-sm font-medium">
                              {vital.oxygenSaturation ?? "—"}
                            </p>
                          </div>
                          <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                            <p className="text-xs text-muted-foreground">
                              Weight (kg)
                            </p>
                            <p className="mt-1 text-sm font-medium">
                              {vital.weightKg ?? "—"}
                            </p>
                          </div>
                          <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                            <p className="text-xs text-muted-foreground">
                              Height (cm)
                            </p>
                            <p className="mt-1 text-sm font-medium">
                              {vital.heightCm ?? "—"}
                            </p>
                          </div>
                          <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                            <p className="text-xs text-muted-foreground">
                              BMI / Pain
                            </p>
                            <p className="mt-1 text-sm font-medium">
                              BMI: {vital.bmi ?? "—"} • Pain:{" "}
                              {vital.painScore ?? "—"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 rounded-[1rem] border border-white/10 bg-black/10 p-3">
                          <p className="text-xs text-muted-foreground">Notes</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm font-medium">
                            {vital.notes || "—"}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  Add Progress Note
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Note Type
                  </label>
                  <Input
                    value={noteType}
                    onChange={(e) => setNoteType(e.target.value)}
                    className="h-12 rounded-2xl"
                    placeholder="Doctor review / Nursing note / Observation"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Note Text
                  </label>
                  <Textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="min-h-[140px] rounded-2xl"
                    placeholder="Write the clinical progress note here"
                  />
                </div>

                <Button
                  type="button"
                  className="h-12 rounded-2xl"
                  onClick={handleCreateProgressNote}
                  disabled={createProgressNoteMutation.isPending}
                >
                  {createProgressNoteMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Save Progress Note
                </Button>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle>Progress Notes History</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {clinicalLoading ? (
                  <div className="text-sm text-muted-foreground">
                    Loading progress notes...
                  </div>
                ) : progressNotes.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-card/[0.02] p-5 text-sm text-muted-foreground">
                    No progress notes recorded yet.
                  </div>
                ) : (
                  progressNotes.map((note) => (
                    <div
                      key={note.id}
                      className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4"
                    >
                      <div>
                        <p className="font-semibold">
                          {note.noteType || "Progress Note"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          By: {staffName(note.recordedBy)} •{" "}
                          {formatDate(note.createdAt)}
                        </p>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                        {note.noteText}
                      </p>
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
                  <Syringe className="h-5 w-5 text-primary" />
                  Add Treatment Entry
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Treatment Type
                    </label>
                    <Input
                      value={treatmentType}
                      onChange={(e) => setTreatmentType(e.target.value)}
                      className="h-12 rounded-2xl"
                      placeholder="Medication / Procedure / IV Fluid"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Treatment Name
                    </label>
                    <div className="space-y-2">
                      <Input
                        value={treatmentMedicineSearch}
                        onChange={(e) =>
                          setTreatmentMedicineSearch(e.target.value)
                        }
                        className="h-12 rounded-2xl"
                        placeholder="Search branch medicine stock"
                      />
                      <select
                        value={selectedTreatmentMedicineId}
                        onChange={(event) => {
                          const selectedId = event.target.value;
                          const selectedItem = treatmentBranchStockItems.find(
                            (item) => String(item.medicineId) === selectedId,
                          );
                          setSelectedTreatmentMedicineId(selectedId);
                          setTreatmentName(
                            selectedItem?.medicine?.name ?? treatmentName,
                          );
                        }}
                        className={appSelectClass}
                      >
                        <option value="">
                          {treatmentStockLoading
                            ? "Loading branch stock..."
                            : "Select stocked medicine or type below"}
                        </option>
                        {filteredTreatmentStockItems.map((item) => (
                          <option
                            key={item.id}
                            value={String(item.medicineId)}
                          >
                            {[
                              item.medicine?.name,
                              item.medicine?.strength,
                              item.medicine?.dosageForm,
                            ]
                              .filter(Boolean)
                              .join(" ")}{" "}
                            -{" "}
                            {item.stockQuantity > 0
                              ? `${item.stockQuantity} in stock`
                              : "out of stock"}
                          </option>
                        ))}
                      </select>
                      <Input
                        value={treatmentName}
                        onChange={(e) => {
                          setTreatmentName(e.target.value);
                          if (!e.target.value.trim()) {
                            setSelectedTreatmentMedicineId("");
                          }
                        }}
                        className="h-12 rounded-2xl"
                        placeholder="Free-text treatment if not a stocked medicine"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Dosage
                    </label>
                    <Input
                      value={dosage}
                      onChange={(e) => setDosage(e.target.value)}
                      className="h-12 rounded-2xl"
                      placeholder="1g"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Route
                    </label>
                    <Input
                      value={route}
                      onChange={(e) => setRoute(e.target.value)}
                      className="h-12 rounded-2xl"
                      placeholder="IV / Oral / IM"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Frequency
                    </label>
                    <Input
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value)}
                      className="h-12 rounded-2xl"
                      placeholder="8 hourly"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Scheduled At
                    </label>
                    <Input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="h-12 rounded-2xl"
                    />
                  </div>
                </div>

                {selectedTreatmentStockItem ? (
                  <div
                    className={`rounded-2xl border p-4 text-sm ${
                      selectedTreatmentStockStatus === "OUT_OF_STOCK"
                        ? "border-destructive/30 bg-destructive-soft text-rose-900"
                        : selectedTreatmentStockStatus === "LOW_STOCK"
                          ? "border-warning/35 bg-warning-soft text-warning"
                          : "border-success/30 bg-success-soft text-success"
                    }`}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="font-semibold">
                          {selectedTreatmentStockItem.medicine?.name}
                        </p>
                        <p className="mt-1">
                          Current stock:{" "}
                          <strong>{selectedTreatmentStockItem.stockQuantity}</strong>{" "}
                          / reorder level:{" "}
                          <strong>{selectedTreatmentStockItem.reorderLevel}</strong>
                        </p>
                        <p className="mt-1">
                          Unit price: KES{" "}
                          {Number(selectedTreatmentStockItem.unitPrice || 0).toLocaleString()}
                        </p>
                      </div>
                      <Badge
                        className={
                          selectedTreatmentStockStatus === "OUT_OF_STOCK"
                            ? "border-0 bg-rose-600 text-white"
                            : selectedTreatmentStockStatus === "LOW_STOCK"
                              ? "border-0 bg-amber-500 text-white"
                              : "border-0 bg-success text-white"
                        }
                      >
                        {selectedTreatmentStockStatus?.replace(/_/g, " ")}
                      </Badge>
                    </div>

                    {selectedTreatmentStockStatus === "OUT_OF_STOCK" ? (
                      <div className="mt-4 rounded-xl border border-destructive/30/70 bg-card/80 p-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                          <div>
                            <p className="font-semibold">AI stock assistant</p>
                            <p className="mt-1 text-xs leading-5">
                              The system can suggest stocked catalogue matches.
                              Clinician must confirm dose, indication, allergy,
                              and guideline fit before using any alternative.
                            </p>
                          </div>
                        </div>

                        {treatmentAlternativesLoading ? (
                          <div className="mt-3 flex items-center gap-2 text-xs">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Checking stocked alternatives...
                          </div>
                        ) : treatmentAlternatives.length > 0 ? (
                          <div className="mt-3 grid gap-2 md:grid-cols-2">
                            {treatmentAlternatives.slice(0, 4).map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  setSelectedTreatmentMedicineId(
                                    String(item.medicineId),
                                  );
                                  setTreatmentName(item.medicine?.name ?? "");
                                  setTreatmentMedicineSearch(
                                    item.medicine?.name ?? "",
                                  );
                                  setMessage(
                                    "Stocked alternative selected. Confirm the clinical fit before saving the treatment entry.",
                                  );
                                }}
                                className="rounded-xl border border-border bg-card p-3 text-left text-xs transition hover:border-border-strong"
                              >
                                <div className="flex items-start gap-2">
                                  <Pill className="mt-0.5 h-4 w-4 shrink-0 text-module" />
                                  <div>
                                    <p className="font-semibold">
                                      {item.medicine?.name}
                                    </p>
                                    <p className="mt-1 text-muted-foreground">
                                      {item.stockQuantity} in stock /{" "}
                                      {item.medicine?.strength || "strength not set"}
                                    </p>
                                    <p className="mt-1 text-muted-foreground">
                                      {item.reasons.join(", ")}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 text-xs">
                            No safe stocked suggestion is available from the
                            current branch catalogue.
                          </p>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Notes
                  </label>
                  <Textarea
                    value={treatmentNotes}
                    onChange={(e) => setTreatmentNotes(e.target.value)}
                    className="min-h-[120px] rounded-2xl"
                    placeholder="Extra treatment instructions"
                  />
                </div>

                <Button
                  type="button"
                  className="h-12 rounded-2xl"
                  onClick={handleCreateTreatmentEntry}
                  disabled={
                    createTreatmentEntryMutation.isPending ||
                    selectedTreatmentStockStatus === "OUT_OF_STOCK"
                  }
                >
                  {createTreatmentEntryMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Add Treatment Entry
                </Button>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle>Treatment Chart</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {clinicalLoading ? (
                  <div className="text-sm text-muted-foreground">
                    Loading treatment chart...
                  </div>
                ) : treatmentChart.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-card/[0.02] p-5 text-sm text-muted-foreground">
                    No treatment chart entries yet.
                  </div>
                ) : (
                  treatmentChart.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <p className="font-semibold">{entry.treatmentName}</p>
                          <p className="text-sm text-muted-foreground">
                            {[
                              entry.treatmentType,
                              entry.dosage,
                              entry.route,
                              entry.frequency,
                            ]
                              .filter(Boolean)
                              .join(" / ") || "-"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Ordered by: {staffName(entry.orderedBy)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Scheduled: {formatDate(entry.scheduledAt)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Administered by: {staffName(entry.administeredBy)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Administered at: {formatDate(entry.administeredAt)}
                          </p>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Badge
                            className={`rounded-full border px-3 py-1 ${statusTone(entry.statusCode)}`}
                          >
                            {entry.statusCode || "PLANNED"}
                          </Badge>

                          {(entry.statusCode || "").toUpperCase() !==
                          "ADMINISTERED" ? (
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-2xl"
                              onClick={() =>
                                handleAdministerTreatment(entry.id)
                              }
                              disabled={administerTreatmentMutation.isPending}
                            >
                              {administerTreatmentMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                              )}
                              Mark Administered
                            </Button>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-3 rounded-[1rem] border border-white/10 bg-black/10 p-3">
                        <p className="text-xs text-muted-foreground">Notes</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm font-medium">
                          {entry.notes || "—"}
                        </p>
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
                  <TestTube2 className="h-5 w-5 text-primary" />
                  Order IPD Lab Test
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Urgency
                    </label>
                    <select
                      value={labUrgency}
                      onChange={(e) => setLabUrgency(e.target.value)}
                      className={appSelectClass}
                    >
                      <option value="ROUTINE">ROUTINE</option>
                      <option value="URGENT">URGENT</option>
                      <option value="STAT">STAT</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Search Lab Test
                    </label>
                    <Input
                      value={labTestSearch}
                      onChange={(e) => setLabTestSearch(e.target.value)}
                      className="mb-2 h-12 rounded-2xl"
                      placeholder="Search lab service name, category, or specimen"
                    />
                    <select
                      value={selectedTestId}
                      onChange={(e) => setSelectedTestId(e.target.value)}
                      className={appSelectClass}
                    >
                      <option value="">Select lab test</option>
                      {filteredLabTests
                        .filter((test) => test.isActive !== false)
                        .map((test) => (
                          <option key={test.id} value={String(test.id)}>
                            {test.testName}
                            {test.category ? ` - ${test.category}` : ""}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Test Instructions
                  </label>
                  <Input
                    value={selectedTestInstructions}
                    onChange={(e) =>
                      setSelectedTestInstructions(e.target.value)
                    }
                    className="h-12 rounded-2xl"
                    placeholder="Fasting sample / morning sample / etc"
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="h-12 rounded-2xl"
                  onClick={handleAddLabOrderItem}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Test
                </Button>

                <div className="space-y-3">
                  {labOrderItems.length === 0 ? (
                    <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-card/[0.02] p-4 text-sm text-muted-foreground">
                      No lab tests added yet.
                    </div>
                  ) : (
                    labOrderItems.map((item) => (
                      <div
                        key={item.testId}
                        className="flex flex-col gap-3 rounded-[1rem] border border-white/10 bg-card/[0.03] p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="font-medium">{item.testName}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.instructions || "No instructions"}
                          </p>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-2xl"
                          onClick={() => handleRemoveLabOrderItem(item.testId)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Clinical Notes
                  </label>
                  <Textarea
                    value={labClinicalNotes}
                    onChange={(e) => setLabClinicalNotes(e.target.value)}
                    className="min-h-[120px] rounded-2xl"
                    placeholder="Why these tests are being requested"
                  />
                </div>

                <Button
                  type="button"
                  className="h-12 rounded-2xl"
                  onClick={handleCreateAdmissionLabOrder}
                  disabled={createAdmissionLabOrderMutation.isPending}
                >
                  {createAdmissionLabOrderMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Create Lab Order
                </Button>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube2 className="h-5 w-5 text-primary" />
                  IPD Lab Orders & Results
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {clinicalLoading ? (
                  <div className="text-sm text-muted-foreground">
                    Loading lab orders...
                  </div>
                ) : labOrders.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-card/[0.02] p-5 text-sm text-muted-foreground">
                    No IPD lab orders found for this admission yet.
                  </div>
                ) : (
                  labOrders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-[1.3rem] border border-white/10 bg-card/[0.03] p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <p className="font-semibold">{order.orderNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            Requested by: {staffName(order.requestedBy)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Created: {formatDate(order.createdAt)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Urgency: {order.urgency || "—"}
                          </p>
                        </div>

                        <Badge
                          className={`rounded-full border px-3 py-1 ${statusTone(order.status)}`}
                        >
                          {order.status || "REQUESTED"}
                        </Badge>
                      </div>

                      <div className="mt-4 rounded-[1rem] border border-white/10 bg-black/10 p-3">
                        <p className="text-xs text-muted-foreground">
                          Clinical Notes
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm font-medium">
                          {order.clinicalNotes || "—"}
                        </p>
                      </div>

                      <div className="mt-4 space-y-3">
                        {(order.items ?? []).length === 0 ? (
                          <div className="rounded-[1rem] border border-dashed border-white/10 bg-card/[0.02] p-3 text-sm text-muted-foreground">
                            No test items in this order.
                          </div>
                        ) : (
                          order.items?.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-4"
                            >
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="space-y-2">
                                  <p className="font-medium">
                                    {item.test?.testName ||
                                      `Test #${item.testId}`}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Category: {item.test?.category || "—"} •
                                    Specimen: {item.test?.specimenType || "—"}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Instructions: {item.instructions || "—"}
                                  </p>
                                </div>

                                <Badge
                                  className={`rounded-full border px-3 py-1 ${statusTone(item.status)}`}
                                >
                                  {item.status || "PENDING"}
                                </Badge>
                              </div>

                              <div className="mt-3 space-y-3">
                                {(item.results ?? []).length === 0 ? (
                                  <div className="rounded-[1rem] border border-dashed border-white/10 bg-card/[0.02] p-3 text-sm text-muted-foreground">
                                    No result recorded yet.
                                  </div>
                                ) : (
                                  item.results?.map((result) => (
                                    <div
                                      key={result.id}
                                      className="rounded-[1rem] border border-white/10 bg-black/10 p-3"
                                    >
                                      <p className="text-xs text-muted-foreground">
                                        Result Value
                                      </p>
                                      <p className="mt-1 whitespace-pre-wrap text-sm font-medium">
                                        {result.resultValue}
                                      </p>

                                      <p className="mt-3 text-xs text-muted-foreground">
                                        Remarks
                                      </p>
                                      <p className="mt-1 whitespace-pre-wrap text-sm font-medium">
                                        {result.remarks || "—"}
                                      </p>

                                      <p className="mt-3 text-xs text-muted-foreground">
                                        Recorded At
                                      </p>
                                      <p className="mt-1 text-sm font-medium">
                                        {formatDate(result.recordedAt)}
                                      </p>
                                    </div>
                                  ))
                                )}
                              </div>
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
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Medical Summary and Clinical Documents
                    </CardTitle>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                      Generate a clinician-reviewed AI draft, refine it inside
                      the page, then download official letterhead PDFs for the
                      admission.
                    </p>
                  </div>
                  <Badge className="w-fit rounded-full border-0 bg-success/10 text-success">
                    AI-assisted drafting
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-5">
                <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
                  <div className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4">
                    <div className="mb-4 flex items-center gap-2">
                      <Bot className="h-5 w-5 text-cyan-400" />
                      <p className="font-semibold">AI medical summary draft</p>
                    </div>

                    <Textarea
                      value={medicalSummaryPrompt}
                      onChange={(event) =>
                        setMedicalSummaryPrompt(event.target.value)
                      }
                      className="min-h-[120px] rounded-xl"
                      placeholder="Tell the AI what kind of medical summary to prepare"
                    />

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Button
                        type="button"
                        className="h-11 rounded-lg"
                        onClick={handleGenerateMedicalSummary}
                        disabled={createClinicalAiDraftMutation.isPending}
                      >
                        {createClinicalAiDraftMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="mr-2 h-4 w-4" />
                        )}
                        Generate draft
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 rounded-lg"
                        onClick={() => handleDownloadDocument("medical")}
                        disabled={Boolean(downloadingDocument)}
                      >
                        {downloadingDocument === "medical" ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="mr-2 h-4 w-4" />
                        )}
                        Medical PDF
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-[1.2rem] border border-border-strong/15 bg-cyan-500/[0.04] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="font-semibold">Editable summary output</p>
                      {medicalSummaryDraft ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => setHospitalCourse(medicalSummaryDraft)}
                        >
                          Use as course
                        </Button>
                      ) : null}
                    </div>
                    <Textarea
                      value={medicalSummaryDraft}
                      onChange={(event) =>
                        setMedicalSummaryDraft(event.target.value)
                      }
                      className="min-h-[250px] rounded-xl font-mono text-xs leading-6"
                      placeholder="The AI draft appears here and remains editable before use."
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 justify-start rounded-lg"
                    onClick={() => handleDownloadDocument("medical")}
                    disabled={Boolean(downloadingDocument)}
                  >
                    {downloadingDocument === "medical" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Medical Summary PDF
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 justify-start rounded-lg"
                    onClick={() => handleDownloadDocument("discharge")}
                    disabled={Boolean(downloadingDocument)}
                  >
                    {downloadingDocument === "discharge" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Discharge Summary PDF
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 justify-start rounded-lg"
                    onClick={() => handleDownloadDocument("chart")}
                    disabled={Boolean(downloadingDocument)}
                  >
                    {downloadingDocument === "chart" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Inpatient Chart PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BadgeDollarSign className="h-5 w-5 text-primary" />
                  IPD Bed Charge
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4">
                  <p className="text-sm font-medium">
                    {data.ward?.name || "Current ward"}
                    {data.bed?.bedNumber ? ` / Bed ${data.bed.bedNumber}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Admission bed-day charges are auto-posted on admission and
                    transfer. Use this control to post a missed day or override
                    the tariff for a specific day.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Charge Date
                    </label>
                    <Input
                      type="date"
                      value={bedChargeDate}
                      onChange={(event) => setBedChargeDate(event.target.value)}
                      className="h-12 rounded-2xl"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Days
                    </label>
                    <Input
                      type="number"
                      value={bedChargeQuantity}
                      onChange={(event) =>
                        setBedChargeQuantity(event.target.value)
                      }
                      className="h-12 rounded-2xl"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Override Price
                    </label>
                    <Input
                      type="number"
                      value={bedChargeUnitPrice}
                      onChange={(event) =>
                        setBedChargeUnitPrice(event.target.value)
                      }
                      className="h-12 rounded-2xl"
                      placeholder="Leave empty for tariff"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Notes
                  </label>
                  <Textarea
                    value={bedChargeNotes}
                    onChange={(event) => setBedChargeNotes(event.target.value)}
                    className="min-h-[90px] rounded-2xl"
                    placeholder="Reason for manual bed charge"
                  />
                </div>

                <Button
                  type="button"
                  className="h-12 rounded-2xl"
                  onClick={handlePostBedCharge}
                  disabled={postAdmissionBedChargeMutation.isPending}
                >
                  {postAdmissionBedChargeMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <BadgeDollarSign className="mr-2 h-4 w-4" />
                  )}
                  Post Bed Charge
                </Button>
              </CardContent>
            </Card>
          </section>

          {(data.statusCode || "").toUpperCase() === "ADMITTED" ? (
            <section>
              <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-primary" />
                    Bed / Ward Transfer
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Transfer patient</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Move this patient to another ward or another available
                        bed.
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => {
                        setShowTransferForm((prev) => !prev);
                        setTransferWardId(
                          data.wardId ? String(data.wardId) : "",
                        );
                        setTransferBedId("");
                      }}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {showTransferForm ? "Hide Transfer Form" : "Transfer Bed"}
                    </Button>
                  </div>

                  {showTransferForm ? (
                    <div className="grid gap-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium">
                            Transfer Ward
                          </label>
                          <select
                            value={transferWardId}
                            onChange={(e) => {
                              setTransferWardId(e.target.value);
                              setTransferBedId("");
                            }}
                            className={appSelectClass}
                          >
                            <option value="">Select ward</option>
                            {wards
                              .filter((ward) => ward.isActive !== false)
                              .map((ward) => (
                                <option key={ward.id} value={String(ward.id)}>
                                  {ward.name}
                                  {ward.wardType ? ` - ${ward.wardType}` : ""}
                                </option>
                              ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium">
                            Transfer Bed
                          </label>
                          <select
                            value={transferBedId}
                            onChange={(e) => setTransferBedId(e.target.value)}
                            disabled={!transferWardId}
                            className="flex h-12 w-full rounded-2xl border border-white/10 bg-background px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="">
                              {transferWardId
                                ? "Select available bed (optional)"
                                : "Select ward first"}
                            </option>
                            {availableTransferBeds.map((bed) => (
                              <option key={bed.id} value={String(bed.id)}>
                                {bed.bedNumber}
                                {bed.bedLabel ? ` - ${bed.bedLabel}` : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium">
                          Transfer Note
                        </label>
                        <Textarea
                          value={transferNotes}
                          onChange={(e) => setTransferNotes(e.target.value)}
                          className="min-h-[100px] rounded-2xl"
                          placeholder="Reason for transfer or handover note"
                        />
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <Button
                          type="button"
                          className="h-12 rounded-2xl"
                          onClick={handleTransferBed}
                          disabled={transferAdmissionBedMutation.isPending}
                        >
                          {transferAdmissionBedMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-2 h-4 w-4" />
                          )}
                          Confirm Transfer
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          className="h-12 rounded-2xl"
                          onClick={() => setShowTransferForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </section>
          ) : null}

          <section>
            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle>Discharge Summary</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {dischargeSummary ? (
                  <div className="rounded-[1.2rem] border border-emerald-500/20 bg-success/10 p-4">
                    <p className="text-sm font-medium text-emerald-300">
                      Existing discharge summary found
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      By: {staffName(dischargeSummary.dischargedBy)} •{" "}
                      {formatDate(dischargeSummary.dischargeDate)}
                    </p>
                  </div>
                ) : null}

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Discharge Diagnosis
                  </label>
                  <Textarea
                    value={dischargeDiagnosis}
                    onChange={(e) => setDischargeDiagnosis(e.target.value)}
                    className="min-h-[100px] rounded-2xl"
                    placeholder="Final diagnosis at discharge"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Hospital Course
                  </label>
                  <Textarea
                    value={hospitalCourse}
                    onChange={(e) => setHospitalCourse(e.target.value)}
                    className="min-h-[120px] rounded-2xl"
                    placeholder="Summary of admission progress and treatment"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Condition on Discharge
                  </label>
                  <Textarea
                    value={conditionOnDischarge}
                    onChange={(e) => setConditionOnDischarge(e.target.value)}
                    className="min-h-[100px] rounded-2xl"
                    placeholder="Stable / improved / referred / etc"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Discharge Medications
                  </label>
                  <Textarea
                    value={dischargeMedications}
                    onChange={(e) => setDischargeMedications(e.target.value)}
                    className="min-h-[100px] rounded-2xl"
                    placeholder="Medicines patient should continue after discharge"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Follow-up Instructions
                  </label>
                  <Textarea
                    value={followUpInstructions}
                    onChange={(e) => setFollowUpInstructions(e.target.value)}
                    className="min-h-[100px] rounded-2xl"
                    placeholder="Review date, warning signs, clinic follow-up"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    className="h-12 rounded-2xl"
                    onClick={handleSaveDischargeSummary}
                    disabled={createIpdDischargeSummaryMutation.isPending}
                  >
                    {createIpdDischargeSummaryMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Save Discharge Summary
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 rounded-2xl"
                    onClick={handleDischarge}
                    disabled={
                      dischargeMutation.isPending ||
                      data.statusCode === "DISCHARGED"
                    }
                  >
                    {dischargeMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="mr-2 h-4 w-4" />
                    )}
                    {data.statusCode === "DISCHARGED"
                      ? "Already Discharged"
                      : "Discharge Patient"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
