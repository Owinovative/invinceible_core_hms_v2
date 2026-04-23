"use client";


import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  BedDouble,
  CheckCircle2,
  ClipboardList,
  FlaskConical,
  Loader2,
  Pill,
  Plus,
  Save,
  Stethoscope,
  X,
} from "lucide-react";


import { useConsultation } from "@/hooks/use-consultation";
import { usePatientConsultations } from "@/hooks/use-patient-consultations";
import { useUpdateConsultation } from "@/hooks/use-update-consultation";
import { useCompleteConsultation } from "@/hooks/use-complete-consultation";
import { useTriageByAppointment } from "@/hooks/use-triage-by-appointment";
import { useScope } from "@/providers/scope-provider";
import { useAuth } from "@/providers/auth-provider";
import type { PrescriptionItemSummary } from "@/services/prescription-service";


import { useLabTests } from "@/hooks/use-lab-tests";
import { useCreateLabOrder } from "@/hooks/use-create-lab-order";
import { useLabOrders } from "@/hooks/use-lab-orders";
import { useLabResults } from "@/hooks/use-lab-results";


import { useBranchPharmacyStock } from "@/hooks/use-branch-pharmacy-stock";
import { useCreatePrescription } from "@/hooks/use-create-prescription";
import { useConsultationPrescriptions } from "@/hooks/use-consultation-prescriptions";
import { usePatientPrescriptions } from "@/hooks/use-patient-prescriptions";
import { useCreatePrescriptionItem } from "@/hooks/use-create-prescription-item";


import { useWards } from "@/hooks/use-wards";
import { useBeds } from "@/hooks/use-beds";
import { useCreateAdmission } from "@/hooks/use-create-admission";
import { useActiveAdmissions } from "@/hooks/use-active-admissions";


import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";


function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}


export default function ConsultationDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();


  const { selectedBranchId } = useScope();
  const { user } = useAuth();


  const { data, isLoading } = useConsultation(id);
  const patientId = data?.patientId;
  const appointmentId = data?.appointmentId;


  const { data: triageData } = useTriageByAppointment(appointmentId);
  const { data: historyData, isLoading: historyLoading } =
    usePatientConsultations(patientId);


  const updateMutation = useUpdateConsultation();
  const completeMutation = useCompleteConsultation();


  const { data: activeAdmissionsData } = useActiveAdmissions();
  const { data: wardsData, isLoading: wardsLoading } = useWards();
  const { data: bedsData, isLoading: bedsLoading } = useBeds();
  const createAdmissionMutation = useCreateAdmission();


  const branchIdForStock = data?.branchId ?? selectedBranchId;
  const { data: branchStockData, isLoading: stockLoading } =
    useBranchPharmacyStock(branchIdForStock);


  const createPrescriptionMutation = useCreatePrescription();
  const createPrescriptionItemMutation = useCreatePrescriptionItem();
  const { data: consultationPrescriptions } = useConsultationPrescriptions(id);
  const { data: patientPrescriptions, isLoading: patientPrescriptionsLoading } =
    usePatientPrescriptions(patientId);


  const { data: labTestsData, isLoading: labTestsLoading } = useLabTests();
  const createLabOrderMutation = useCreateLabOrder();
  const { data: allLabOrders, isLoading: labOrdersLoading } = useLabOrders();


  const consultationLabOrders = React.useMemo(() => {
    const orders = Array.isArray(allLabOrders) ? allLabOrders : [];
    return orders.filter((order) => {
      const sameAppointment =
        data?.appointmentId && order.appointmentId === data.appointmentId;


      const sameEncounterRef =
        data?.consultationNumber &&
        String((order as { encounterRef?: string | null }).encounterRef ?? "") ===
          data.consultationNumber;


      return Boolean(sameAppointment || sameEncounterRef);
    });
  }, [allLabOrders, data?.appointmentId, data?.consultationNumber]);


  const latestConsultationLabOrder =
    consultationLabOrders.length > 0 ? consultationLabOrders[0] : null;


  const { data: latestLabResults } = useLabResults(latestConsultationLabOrder?.id);


  const latestLabResultsList = React.useMemo(
    () => (Array.isArray(latestLabResults) ? latestLabResults : []),
    [latestLabResults],
  );


  const activeAdmissions = React.useMemo(
    () => (Array.isArray(activeAdmissionsData) ? activeAdmissionsData : []),
    [activeAdmissionsData],
  );


  const existingAdmission = React.useMemo(() => {
    return (
      activeAdmissions.find(
        (item) =>
          item.consultationId === data?.id &&
          (item.statusCode || "").toUpperCase() === "ADMITTED",
      ) ?? null
    );
  }, [activeAdmissions, data?.id]);


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
  const [treatmentPlan, setTreatmentPlan] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);


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
  const [itemFrequency, setItemFrequency] = React.useState("");
  const [itemDuration, setItemDuration] = React.useState("");
  const [itemQuantity, setItemQuantity] = React.useState("1");
  const [itemInstructions, setItemInstructions] = React.useState("");


  const [selectedTestId, setSelectedTestId] = React.useState("");
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


  const consultationPrescriptionList = React.useMemo(
    () => (Array.isArray(consultationPrescriptions) ? consultationPrescriptions : []),
    [consultationPrescriptions],
  );


  const activePrescription =
    consultationPrescriptionList.find((item) => item.id === selectedPrescriptionId) ??
    consultationPrescriptionList[0] ??
    null;


  const patientPrescriptionHistory = React.useMemo(() => {
    const all = Array.isArray(patientPrescriptions) ? patientPrescriptions : [];
    return all.filter(
      (item) => !consultationPrescriptionList.some((x) => x.id === item.id),
    );
  }, [patientPrescriptions, consultationPrescriptionList]);


  const availableStockItems = React.useMemo(() => {
    const items = Array.isArray(branchStockData) ? branchStockData : [];
    return items.filter(
      (item) => item.isActive && item.stockQuantity > 0 && item.medicine?.isActive !== false,
    );
  }, [branchStockData]);


  const labTests = React.useMemo(
    () => (Array.isArray(labTestsData) ? labTestsData : []),
    [labTestsData],
  );


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


  const handleCreatePrescription = async () => {
    if (!data) return;
    setMessage(null);

   if (!user?.staffId) {
    throw new Error("Current staff ID is missing");
  }

  const created = await createPrescriptionMutation.mutateAsync({
    consultationId: data.id,
    patientId: data.patientId,
    prescribedByStaffId: Number(user.staffId),
    notes: prescriptionNotes || undefined,
    items: [],
  });

    setSelectedPrescriptionId(created.id);
    setPrescriptionNotes("");
    setMessage(`Prescription ${created.prescriptionNumber} created successfully.`);
  };


  const handleAddPrescriptionItem = async () => {
    if (!activePrescription) {
      setMessage("Create a prescription first.");
      return;
    }


    if (!selectedMedicineId) {
      setMessage("Please select a medicine.");
      return;
    }


    setMessage(null);


    await createPrescriptionItemMutation.mutateAsync({
      prescriptionId: activePrescription.id,
      medicineId: Number(selectedMedicineId),
      dosage: itemDosage || undefined,
      frequency: itemFrequency || undefined,
      duration: itemDuration || undefined,
      quantity: itemQuantity ? Number(itemQuantity) : 1,
      instructions: itemInstructions || undefined,
      statusCode: "PRESCRIBED",
    });


    setSelectedMedicineId("");
    setItemDosage("");
    setItemFrequency("");
    setItemDuration("");
    setItemQuantity("1");
    setItemInstructions("");
    setMessage("Prescription item added successfully.");
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

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border gradient-border panel-shadow p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-violet-600/10 via-cyan-500/5 to-transparent" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <Badge className="rounded-full border-0 bg-violet-600/10 px-3 py-1 text-violet-300">
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
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Consultation No
                </p>
                <p className="mt-2 text-sm font-semibold">{data.consultationNumber}</p>
              </div>
              <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Status
                </p>
                <p className="mt-2 text-sm font-semibold">
                  {data.statusCode || "IN_PROGRESS"}
                </p>
              </div>
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
        <Card className="rounded-[1.8rem] gradient-border panel-shadow">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Loading consultation...
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="space-y-6">
            <Card className="rounded-[1.8rem] gradient-border panel-shadow">
              <CardHeader>
                <CardTitle>Patient Snapshot</CardTitle>
              </CardHeader>


              <CardContent className="space-y-4">
                <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4">
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
                  <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Gender</p>
                    <p className="mt-1 text-sm font-medium">{data.patient?.gender || "—"}</p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="mt-1 text-sm font-medium">
                      {data.patient?.phonePrimary || "—"}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Appointment</p>
                    <p className="mt-1 text-sm font-medium">
                      {data.appointment?.appointmentNumber || "—"}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Priority</p>
                    <p className="mt-1 text-sm font-medium">
                      {triageData?.triagePriority || data.appointment?.triagePriority || "NORMAL"}
                    </p>
                  </div>
                </div>


                <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs text-muted-foreground">Chief Complaint</p>
                  <p className="mt-1 text-sm font-medium">
                    {triageData?.chiefComplaint || data.chiefComplaint || "—"}
                  </p>
                </div>


                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Arrival Type</p>
                    <p className="mt-1 text-sm font-medium">{triageData?.arrivalType || "—"}</p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Clinic</p>
                    <p className="mt-1 text-sm font-medium">{triageData?.clinic?.name || "—"}</p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Routed Doctor</p>
                    <p className="mt-1 text-sm font-medium">
                      {triageData?.routedDoctor
                        ? [triageData.routedDoctor.firstName, triageData.routedDoctor.lastName]
                            .filter(Boolean)
                            .join(" ")
                        : "—"}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Triage Status</p>
                    <p className="mt-1 text-sm font-medium">{triageData?.statusCode || "—"}</p>
                  </div>
                </div>


                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Temperature °C</p>
                    <p className="mt-1 text-sm font-medium">{triageData?.temperatureC ?? "—"}</p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Blood Pressure</p>
                    <p className="mt-1 text-sm font-medium">
                      {triageData?.systolicBp || triageData?.diastolicBp
                        ? `${triageData?.systolicBp ?? "—"}/${triageData?.diastolicBp ?? "—"}`
                        : "—"}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Pulse Rate</p>
                    <p className="mt-1 text-sm font-medium">{triageData?.pulseRate ?? "—"}</p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Respiratory Rate</p>
                    <p className="mt-1 text-sm font-medium">
                      {triageData?.respiratoryRate ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Oxygen Saturation</p>
                    <p className="mt-1 text-sm font-medium">
                      {triageData?.oxygenSaturation ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Weight (kg)</p>
                    <p className="mt-1 text-sm font-medium">{triageData?.weightKg ?? "—"}</p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Height (cm)</p>
                    <p className="mt-1 text-sm font-medium">{triageData?.heightCm ?? "—"}</p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">BMI</p>
                    <p className="mt-1 text-sm font-medium">{triageData?.bmi ?? "—"}</p>
                  </div>
                </div>


                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Pain Score</p>
                    <p className="mt-1 text-sm font-medium">{triageData?.painScore ?? "—"}</p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Triage Number</p>
                    <p className="mt-1 text-sm font-medium">{triageData?.triageNumber || "—"}</p>
                  </div>
                </div>


                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Triage Started</p>
                    <p className="mt-1 text-sm font-medium">
                      {triageData?.startedAt ? new Date(triageData.startedAt).toLocaleString() : "—"}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Triage Completed</p>
                    <p className="mt-1 text-sm font-medium">
                      {triageData?.completedAt
                        ? new Date(triageData.completedAt).toLocaleString()
                        : "—"}
                    </p>
                  </div>
                </div>


                <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs text-muted-foreground">Triage Notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm font-medium">
                    {triageData?.notes || "—"}
                  </p>
                </div>
              </CardContent>
            </Card>


            <Card className="rounded-[1.8rem] gradient-border panel-shadow">
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
            <Card className="rounded-[1.8rem] gradient-border panel-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BedDouble className="h-5 w-5 text-cyan-300" />
                  IPD Admission
                </CardTitle>
              </CardHeader>


              <CardContent className="space-y-5">
                {existingAdmission ? (
               <>
                <div className="rounded-[1.2rem] border border-emerald-500/20 bg-emerald-500/10 p-5">
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

                    <Badge className="w-fit rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-300">
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
                    <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4">
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
            <Card className="rounded-[1.8rem] gradient-border panel-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pill className="h-5 w-5 text-cyan-300" />
                  Prescription Workspace
                </CardTitle>
              </CardHeader>


              <CardContent className="space-y-5">
                <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm font-medium">Current Consultation Prescription</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {activePrescription
                      ? `${activePrescription.prescriptionNumber} • ${activePrescription.statusCode}`
                      : "No prescription created for this consultation yet."}
                  </p>
                </div>


                {!activePrescription ? (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Prescription Notes</label>
                      <Textarea
                        value={prescriptionNotes}
                        onChange={(e) => setPrescriptionNotes(e.target.value)}
                        className="min-h-[110px] rounded-2xl"
                        placeholder="General prescription notes"
                      />
                    </div>


                    <Button
                      type="button"
                      className="h-12 rounded-2xl"
                      onClick={handleCreatePrescription}
                      disabled={createPrescriptionMutation.isPending}
                    >
                      {createPrescriptionMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="mr-2 h-4 w-4" />
                      )}
                      Create Prescription
                    </Button>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Select Medicine from Branch Stock
                      </label>
                      <select
                        value={selectedMedicineId}
                        onChange={(e) => setSelectedMedicineId(e.target.value)}
                        className="flex h-12 w-full rounded-2xl border border-white/10 bg-background px-4 text-sm"
                      >
                        <option value="">Select medicine</option>
                        {availableStockItems.map((item) => (
                          <option key={item.id} value={String(item.medicineId)}>
                            {item.medicine?.name}
                            {item.medicine?.strength ? ` - ${item.medicine.strength}` : ""} (
                            {item.stockQuantity} in stock)
                          </option>
                        ))}
                      </select>
                      {stockLoading ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Loading branch stock...
                        </p>
                      ) : null}
                    </div>


                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                      disabled={createPrescriptionItemMutation.isPending}
                    >
                      {createPrescriptionItemMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="mr-2 h-4 w-4" />
                      )}
                      Add Prescription Item
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </section>


          <section>
            <Card className="rounded-[1.8rem] gradient-border panel-shadow">
              <CardHeader>
                <CardTitle>Current Consultation Prescriptions</CardTitle>
              </CardHeader>


              <CardContent className="space-y-4">
                {consultationPrescriptionList.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-muted-foreground">
                    No prescriptions created for this consultation yet.
                  </div>
                ) : (
                  consultationPrescriptionList.map((prescription) => (
                    <div
                      key={prescription.id}
                      className={`rounded-[1.2rem] border p-4 transition-all ${
                        activePrescription?.id === prescription.id
                          ? "border-cyan-500/30 bg-cyan-500/[0.06]"
                          : "border-white/10 bg-white/[0.03]"
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
                          <div className="rounded-[1rem] border border-dashed border-white/10 bg-white/[0.02] p-3 text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
                            No items yet.
                          </div>
                        ) : (
                          prescription.items?.map((item: PrescriptionItemSummary) => (
                            <div
                              key={item.id}
                              className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3"
                            >
                              <p className="font-medium">
                                {item.medicine?.name || `Medicine #${item.medicineId}`}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {[item.medicine?.strength, item.dosage, item.frequency, item.duration]
                                  .filter(Boolean)
                                  .join(" • ") || "—"}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                Qty: {item.quantity} • {item.statusCode}
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
            <Card className="rounded-[1.8rem] gradient-border panel-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FlaskConical className="h-5 w-5 text-cyan-300" />
                  Create Lab Order
                </CardTitle>
              </CardHeader>


              <CardContent className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">Select Test</label>
                  <select
                    value={selectedTestId}
                    onChange={(e) => setSelectedTestId(e.target.value)}
                    className="flex h-12 w-full rounded-2xl border border-white/10 bg-background px-4 text-sm"
                  >
                    <option value="">Select lab test</option>
                    {labTests.map((test) => (
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
                    <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-muted-foreground">
                      No tests selected yet.
                    </div>
                  ) : (
                    selectedLabItems.map((item) => (
                      <div
                        key={item.testId}
                        className="flex items-center justify-between gap-3 rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-3"
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
            <Card className="rounded-[1.8rem] gradient-border panel-shadow">
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
                  <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-muted-foreground">
                    No lab orders found for this consultation yet.
                  </div>
                ) : (
                  consultationLabOrders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-[1.3rem] border border-white/10 bg-white/[0.03] p-4"
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


                        <div className="min-w-[260px] rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                          <p className="text-xs text-muted-foreground">Clinical Notes</p>
                          <p className="mt-1 text-sm font-medium">
                            {order.clinicalNotes || "—"}
                          </p>
                        </div>
                      </div>


                      <div className="mt-4 space-y-3">
                        {(order.items ?? []).length === 0 ? (
                          <div className="rounded-[1rem] border border-dashed border-white/10 bg-white/[0.02] p-3 text-sm text-muted-foreground">
                            No test items in this order.
                          </div>
                        ) : (
                          order.items?.map((item) => {
                            const itemResult =
                              latestLabResultsList.find(
                                (result) => result.orderItemId === item.id,
                              ) ??
                              item.results?.[0] ??
                              null;


                            return (
                              <div
                                key={item.id}
                                className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4"
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
                                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
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
            <Card className="rounded-[1.8rem] gradient-border panel-shadow">
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
                  <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-muted-foreground">
                    No previous consultations found for this patient.
                  </div>
                ) : (
                  patientHistory.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-[1.3rem] border border-white/10 bg-white/[0.03] p-4"
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


                        <div className="min-w-[220px] rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
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
            <Card className="rounded-[1.8rem] gradient-border panel-shadow">
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
                  <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-muted-foreground">
                    No previous prescriptions found for this patient.
                  </div>
                ) : (
                  patientPrescriptionHistory.map((prescription) => (
                    <div
                      key={prescription.id}
                      className="rounded-[1.3rem] border border-white/10 bg-white/[0.03] p-4"
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


                        <div className="min-w-[260px] space-y-2 rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
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
