"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  Loader2,
  PlayCircle,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { useReadyForDoctorTriage } from "@/hooks/use-ready-for-doctor-triage";
import { useCreateConsultation } from "@/hooks/use-create-consultation";
import { useConsultations } from "@/hooks/use-consultations";
import { useStaff } from "@/hooks/use-staff";
import { useScope } from "@/providers/scope-provider";
import { useAuth } from "@/providers/auth-provider";
import type { TriageItem } from "@/services/triage-service";
import type { StaffItem } from "@/services/staff-service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function getPatientName(item: TriageItem) {
  const p = item.patient;
  if (!p) return "Unknown patient";
  return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ");
}

function getDoctorName(doctor?: StaffItem | null) {
  if (!doctor) return "";
  return [doctor.firstName, doctor.lastName].filter(Boolean).join(" ");
}

function priorityRank(priority?: string | null) {
  switch ((priority || "NORMAL").toUpperCase()) {
    case "CRITICAL":
      return 0;
    case "EMERGENCY":
      return 1;
    case "URGENT":
      return 2;
    default:
      return 3;
  }
}

function priorityTone(priority?: string | null) {
  switch ((priority || "NORMAL").toUpperCase()) {
    case "CRITICAL":
      return "bg-red-500/10 text-red-300 border-red-500/20";
    case "EMERGENCY":
      return "bg-orange-500/10 text-orange-300 border-orange-500/20";
    case "URGENT":
      return "bg-amber-500/10 text-amber-300 border-amber-500/20";
    default:
      return "bg-cyan-500/10 text-cyan-300 border-cyan-500/20";
  }
}

export default function DoctorQueuePage() {
  const { facilityName, selectedBranchName } = useScope();
  const { user } = useAuth();
  const { data: triageData, isLoading } = useReadyForDoctorTriage();
  const { data: consultationData } = useConsultations();
  const { data: staffData } = useStaff();
  const createConsultationMutation = useCreateConsultation();

  const triageItems = React.useMemo(
    () => (Array.isArray(triageData) ? triageData : []),
    [triageData],
  );
  const consultations = React.useMemo(
    () => (Array.isArray(consultationData) ? consultationData : []),
    [consultationData],
  );
  const staffItems = React.useMemo(
    () => (Array.isArray(staffData) ? (staffData as StaffItem[]) : []),
    [staffData],
  );

  const doctors = React.useMemo(
    () => staffItems.filter((item) => item.isClinician && item.isActive),
    [staffItems],
  );

  const [doctorFilter, setDoctorFilter] = React.useState("all");
  const [clinicFilter, setClinicFilter] = React.useState("all");
  const [priorityFilter, setPriorityFilter] = React.useState("all");
  const [myPatientsOnly, setMyPatientsOnly] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [createdConsultationId, setCreatedConsultationId] = React.useState<
    number | null
  >(null);

  const clinics = React.useMemo(() => {
    const map = new Map<number, string>();
    triageItems.forEach((item) => {
      if (item.clinic?.id) {
        map.set(item.clinic.id, item.clinic.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [triageItems]);

  const activeConsultations = React.useMemo(
    () =>
      consultations.filter((item) => {
        const inProgress = item.statusCode === "IN_PROGRESS";
        const myPatientsOk = myPatientsOnly
          ? String(item.doctorId ?? "") === String(user?.staffId ?? "")
          : true;
        return inProgress && myPatientsOk;
      }),
    [consultations, myPatientsOnly, user?.staffId],
  );

  const activeAppointmentIds = React.useMemo(
    () =>
      new Set(
        activeConsultations
          .map((item) => item.appointmentId)
          .filter((id): id is number => Boolean(id)),
      ),
    [activeConsultations],
  );

  const readyCases = React.useMemo(() => {
    const filtered = triageItems.filter((item) => {
      if (item.appointmentId && activeAppointmentIds.has(item.appointmentId)) {
        return false;
      }

      const doctorOk =
        doctorFilter === "all" ||
        String(item.routedDoctorId ?? "") === doctorFilter;

      const clinicOk =
        clinicFilter === "all" || String(item.clinicId ?? "") === clinicFilter;

      const priorityOk =
        priorityFilter === "all" ||
        String(item.triagePriority ?? "NORMAL").toUpperCase() ===
          priorityFilter;

      const myPatientsOk = myPatientsOnly
        ? String(item.routedDoctorId ?? "") === String(user?.staffId ?? "")
        : true;

      return doctorOk && clinicOk && priorityOk && myPatientsOk;
    });

    return [...filtered].sort((a, b) => {
      const pr =
        priorityRank(a.triagePriority) - priorityRank(b.triagePriority);
      if (pr !== 0) return pr;

      const aTime = new Date(a.completedAt ?? "").getTime() || 0;
      const bTime = new Date(b.completedAt ?? "").getTime() || 0;
      return aTime - bTime;
    });
  }, [
    triageItems,
    doctorFilter,
    clinicFilter,
    priorityFilter,
    myPatientsOnly,
    user?.staffId,
    activeAppointmentIds,
  ]);

  const selectedCase = React.useMemo(
    () =>
      readyCases.find((item) => item.id === selectedId) ??
      readyCases[0] ??
      null,
    [readyCases, selectedId],
  );

  React.useEffect(() => {
    if (!selectedId && readyCases.length > 0) {
      setSelectedId(readyCases[0].id);
    }
  }, [readyCases, selectedId]);

  React.useEffect(() => {
    setCreatedConsultationId(null);
    setMessage(null);
  }, [selectedCase?.id]);

  const handleStartConsultation = async () => {
    if (!selectedCase) return;

    if (!selectedCase.appointmentId) {
      setMessage("This triage case has no appointment yet.");
      return;
    }

    const doctorId = selectedCase.routedDoctorId;
    if (!doctorId) {
      setMessage(
        "This patient has not been routed to a doctor yet from triage.",
      );
      return;
    }

    setMessage(null);
    setCreatedConsultationId(null);

    const year = new Date().getFullYear();
    const consultationNumber = `CON-${year}-${selectedCase.id}-${Date.now()
      .toString()
      .slice(-4)}`;

    const created = await createConsultationMutation.mutateAsync({
      consultationNumber,
      appointmentId: selectedCase.appointmentId,
      patientId: selectedCase.patientId,
      doctorId,
      chiefComplaint: selectedCase.chiefComplaint || undefined,
      statusCode: "IN_PROGRESS",
    });

    setCreatedConsultationId(created.id);
    setMessage(
      `Consultation started successfully. Consultation No: ${created.consultationNumber}`,
    );
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border surface-spotlight shadow-md p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-blue-600/10 via-cyan-500/5 to-transparent" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <Badge className="rounded-full border-0 bg-cyan-600/10 px-3 py-1 text-module">
              Doctor Queue
            </Badge>

            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10">
                <Stethoscope className="h-7 w-7 text-primary" />
              </div>

              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Ready for Doctor
                </h1>
                <p className="text-muted-foreground">
                  Critical patients rise to the top, then earliest waiting time
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[560px]">
            <div className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Facility
              </p>
              <p className="mt-2 text-sm font-semibold">
                {facilityName || "No facility"}
              </p>
            </div>

            <div className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Branch
              </p>
              <p className="mt-2 text-sm font-semibold">
                {selectedBranchName || "No branch"}
              </p>
            </div>

            <div className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Ready Cases
              </p>
              <p className="mt-2 text-sm font-semibold">{readyCases.length}</p>
            </div>

            <div className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Started
              </p>
              <p className="mt-2 text-sm font-semibold">
                {activeConsultations.length}
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

      <section>
        <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="h-4 w-4" />
                Queue Filters
              </CardTitle>

              <div className="flex flex-wrap gap-2">
                <Badge className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-cyan-300">
                  Ready Cases: {readyCases.length}
                </Badge>

                {myPatientsOnly ? (
                  <Badge className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-cyan-300">
                    My Patients Only
                  </Badge>
                ) : (
                  <Badge className="rounded-full border border-white/10 bg-card/[0.04] px-3 py-1 text-muted-foreground">
                    All Visible Patients
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Filter by doctor
              </label>
              <select
                value={doctorFilter}
                onChange={(e) => setDoctorFilter(e.target.value)}
                className="flex h-12 w-full rounded-2xl border border-white/10 bg-background px-4 text-sm"
              >
                <option value="all">All doctors</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={String(doctor.id)}>
                    {getDoctorName(doctor)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Filter by clinic
              </label>
              <select
                value={clinicFilter}
                onChange={(e) => setClinicFilter(e.target.value)}
                className="flex h-12 w-full rounded-2xl border border-white/10 bg-background px-4 text-sm"
              >
                <option value="all">All clinics</option>
                {clinics.map((clinic) => (
                  <option key={clinic.id} value={String(clinic.id)}>
                    {clinic.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Filter by priority
              </label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="flex h-12 w-full rounded-2xl border border-white/10 bg-background px-4 text-sm"
              >
                <option value="all">All priorities</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="EMERGENCY">EMERGENCY</option>
                <option value="URGENT">URGENT</option>
                <option value="NORMAL">NORMAL</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Doctor scope
              </label>
              <button
                type="button"
                onClick={() => setMyPatientsOnly((prev) => !prev)}
                className={cn(
                  "flex h-12 w-full items-center justify-between rounded-2xl border px-4 text-sm transition-all",
                  myPatientsOnly
                    ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
                    : "border-white/10 bg-background text-foreground",
                )}
              >
                <span>
                  {myPatientsOnly
                    ? "Showing my patients only"
                    : "Showing all visible patients"}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-1 text-[10px] font-semibold",
                    myPatientsOnly
                      ? "bg-cyan-500/20 text-cyan-200"
                      : "bg-card/10 text-muted-foreground",
                  )}
                >
                  {myPatientsOnly ? "ON" : "OFF"}
                </span>
              </button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">
              Already Started Consultations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeConsultations.length === 0 ? (
              <div className="rounded-[1.3rem] border border-dashed border-white/10 bg-card/[0.02] p-4 text-sm text-muted-foreground">
                No active consultations are currently open.
              </div>
            ) : (
              activeConsultations.slice(0, 8).map((consultation) => (
                <div
                  key={consultation.id}
                  className="rounded-[1.2rem] border border-cyan-400/20 bg-cyan-500/8 p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-semibold">
                        {consultation.patient
                          ? [
                              consultation.patient.firstName,
                              consultation.patient.middleName,
                              consultation.patient.lastName,
                            ]
                              .filter(Boolean)
                              .join(" ")
                          : "Unknown patient"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {consultation.consultationNumber} /{" "}
                        {consultation.patient?.patientNumber ||
                          "No patient number"}
                      </p>
                    </div>
                    <Link href={`/consultation/${consultation.id}`}>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-2xl"
                      >
                        Open Active Notes
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="relative overflow-hidden rounded-[1.8rem] surface-spotlight shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Doctor Queue</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-[1.3rem] border border-white/10 bg-card/[0.03] p-4"
                >
                  <div className="h-5 w-40 rounded bg-card/10" />
                  <div className="mt-3 h-4 w-56 rounded bg-card/10" />
                </div>
              ))
            ) : readyCases.length === 0 ? (
              <div className="rounded-[1.3rem] border border-dashed border-white/10 bg-card/[0.02] p-5 text-sm text-muted-foreground">
                No patients are currently ready for doctor.
              </div>
            ) : (
              readyCases.map((item) => {
                const active = selectedCase?.id === item.id;
                const critical =
                  (item.triagePriority || "").toUpperCase() === "CRITICAL";

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={cn(
                      "w-full rounded-[1.3rem] border p-4 text-left transition-all",
                      active
                        ? "border-cyan-400/40 bg-cyan-500/10"
                        : "border-white/10 bg-card/[0.03] hover:bg-card/[0.05]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold">
                            {getPatientName(item)}
                          </p>
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                              priorityTone(item.triagePriority),
                            )}
                          >
                            {item.triagePriority || "NORMAL"}
                          </span>
                          {critical ? (
                            <AlertTriangle className="h-4 w-4 text-red-400" />
                          ) : null}
                        </div>

                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.patient?.patientNumber || item.triageNumber}
                        </p>

                        <p className="mt-2 text-sm text-muted-foreground">
                          {item.chiefComplaint || "No complaint captured"}
                        </p>

                        <p className="mt-2 text-xs text-cyan-300">
                          Clinic: {item.clinic?.name || "Not assigned"} •
                          Appointment: {item.appointmentId || "Pending"}
                        </p>
                      </div>

                      {active ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-cyan-400" />
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden rounded-[1.8rem] surface-spotlight shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserRound className="h-5 w-5 text-cyan-300" />
              Selected Case Summary
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            {!selectedCase ? (
              <div className="rounded-[1.3rem] border border-dashed border-white/10 bg-card/[0.02] p-5 text-sm text-muted-foreground">
                Select a patient from the doctor queue.
              </div>
            ) : (
              <>
                <div className="rounded-[1.3rem] border border-white/10 bg-card/[0.03] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                      <UserRound className="h-5 w-5 text-primary" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-lg font-bold">
                        {getPatientName(selectedCase)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCase.patient?.patientNumber ||
                          selectedCase.triageNumber}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                      <p className="text-xs text-muted-foreground">
                        Chief Complaint
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        {selectedCase.chiefComplaint || "—"}
                      </p>
                    </div>

                    <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                      <p className="text-xs text-muted-foreground">Priority</p>
                      <p className="mt-1 text-sm font-medium">
                        {selectedCase.triagePriority || "NORMAL"}
                      </p>
                    </div>

                    <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                      <p className="text-xs text-muted-foreground">Clinic</p>
                      <p className="mt-1 text-sm font-medium">
                        {selectedCase.clinic?.name || "Not assigned"}
                      </p>
                    </div>

                    <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                      <p className="text-xs text-muted-foreground">
                        Appointment ID
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        {selectedCase.appointmentId || "Pending"}
                      </p>
                    </div>

                    <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3 md:col-span-2">
                      <p className="text-xs text-muted-foreground">
                        Routed Doctor
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        {selectedCase.routedDoctor
                          ? [
                              selectedCase.routedDoctor.firstName,
                              selectedCase.routedDoctor.lastName,
                            ]
                              .filter(Boolean)
                              .join(" ")
                          : "Not assigned"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    className="h-12 rounded-2xl"
                    disabled={
                      !selectedCase || createConsultationMutation.isPending
                    }
                    onClick={handleStartConsultation}
                  >
                    {createConsultationMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <PlayCircle className="mr-2 h-4 w-4" />
                    )}
                    Start Consultation
                  </Button>

                  {createdConsultationId ? (
                    <Link href={`/consultation/${createdConsultationId}`}>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-12 rounded-2xl"
                      >
                        Open Consultation Page
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
