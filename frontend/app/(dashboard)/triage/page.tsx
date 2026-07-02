"use client";


import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  HeartPulse,
  Loader2,
  Play,
  Sparkles,
  Stethoscope,
  Thermometer,
} from "lucide-react";
import { useWaitingTriage } from "@/hooks/use-waiting-triage";
import { useStartTriage } from "@/hooks/use-start-triage";
import { useCompleteTriage } from "@/hooks/use-complete-triage";
import { useClinics } from "@/hooks/use-clinics";
import { useStaff } from "@/hooks/use-staff";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useScope } from "@/providers/scope-provider";
import { cn } from "@/lib/utils";
import type { TriageItem } from "@/services/triage-service";
import type { ClinicItem } from "@/services/clinic-service";
import type { StaffItem } from "@/services/staff-service";


function patientName(item: TriageItem) {
  const p = item.patient;
  if (!p) return "Unknown patient";
  return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ");
}


function TriageStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}


function getPriorityTone(priority: string) {
  switch (priority.toUpperCase()) {
    case "CRITICAL":
      return "border-red-500/20 bg-red-500/10 text-red-300";
    case "EMERGENCY":
      return "border-orange-500/20 bg-orange-500/10 text-orange-300";
    case "URGENT":
      return "border-amber-500/20 bg-amber-500/10 text-amber-300";
    default:
      return "border-cyan-500/20 bg-cyan-500/10 text-cyan-300";
  }
}


function suggestPriority(params: {
  oxygenSaturation?: number;
  painScore?: number;
  systolicBp?: number;
  diastolicBp?: number;
  pulseRate?: number;
  temperatureC?: number;
}) {
  const {
    oxygenSaturation,
    painScore,
    systolicBp,
    diastolicBp,
    pulseRate,
    temperatureC,
  } = params;


  if (
    (oxygenSaturation !== undefined && oxygenSaturation < 90) ||
    (systolicBp !== undefined && systolicBp < 80) ||
    (pulseRate !== undefined && pulseRate > 140)
  ) {
    return "CRITICAL";
  }


  if (
    (painScore !== undefined && painScore >= 8) ||
    (temperatureC !== undefined && temperatureC >= 39.5) ||
    (systolicBp !== undefined && systolicBp >= 180) ||
    (diastolicBp !== undefined && diastolicBp >= 120)
  ) {
    return "EMERGENCY";
  }


  if (
    (painScore !== undefined && painScore >= 5) ||
    (oxygenSaturation !== undefined && oxygenSaturation < 94) ||
    (pulseRate !== undefined && pulseRate > 110)
  ) {
    return "URGENT";
  }


  return "NORMAL";
}


export default function TriagePage() {
  const { facilityId, facilityName, selectedBranchId, selectedBranchName } = useScope();
  const { data, isLoading } = useWaitingTriage();
  const { data: clinicsData } = useClinics();
  const { data: staffData } = useStaff();


  const startTriageMutation = useStartTriage();
  const completeTriageMutation = useCompleteTriage();


  const queue = Array.isArray(data) ? data : [];
  const clinics = Array.isArray(clinicsData) ? (clinicsData as ClinicItem[]) : [];
  const staffItems = Array.isArray(staffData) ? (staffData as StaffItem[]) : [];


  const [selectedId, setSelectedId] = React.useState<number | null>(null);


  const selected = React.useMemo(
    () => queue.find((item) => item.id === selectedId) ?? queue[0] ?? null,
    [queue, selectedId],
  );


  React.useEffect(() => {
    if (!selectedId && queue.length > 0) {
      setSelectedId(queue[0].id);
    }
  }, [queue, selectedId]);


  const filteredClinics = React.useMemo(() => {
    return clinics.filter((clinic) => {
      if (facilityId && clinic.facilityId !== facilityId) return false;
      if (!selectedBranchId) return true;
      return !clinic.branchId || clinic.branchId === selectedBranchId;
    });
  }, [clinics, facilityId, selectedBranchId]);


  const doctors = React.useMemo(() => {
    return staffItems.filter((item) => {
      if (!item.isClinician || !item.isActive) return false;
      if (facilityId && item.facilityId !== facilityId) return false;
      if (!selectedBranchId) return true;
      return !item.branchId || item.branchId === selectedBranchId;
    });
  }, [staffItems, facilityId, selectedBranchId]);


  const [temperatureC, setTemperatureC] = React.useState("");
  const [systolicBp, setSystolicBp] = React.useState("");
  const [diastolicBp, setDiastolicBp] = React.useState("");
  const [pulseRate, setPulseRate] = React.useState("");
  const [respiratoryRate, setRespiratoryRate] = React.useState("");
  const [oxygenSaturation, setOxygenSaturation] = React.useState("");
  const [weightKg, setWeightKg] = React.useState("");
  const [heightCm, setHeightCm] = React.useState("");
  const [painScore, setPainScore] = React.useState("");
  const [triagePriority, setTriagePriority] = React.useState("NORMAL");
  const [notes, setNotes] = React.useState("");
  const [chiefComplaint, setChiefComplaint] = React.useState("");
  const [clinicId, setClinicId] = React.useState("");
  const [routedDoctorId, setRoutedDoctorId] = React.useState("");
  const [priorityTouched, setPriorityTouched] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);


  React.useEffect(() => {
    if (!selected) return;
    setTemperatureC(selected.temperatureC?.toString() ?? "");
    setSystolicBp(selected.systolicBp?.toString() ?? "");
    setDiastolicBp(selected.diastolicBp?.toString() ?? "");
    setPulseRate(selected.pulseRate?.toString() ?? "");
    setRespiratoryRate(selected.respiratoryRate?.toString() ?? "");
    setOxygenSaturation(selected.oxygenSaturation?.toString() ?? "");
    setWeightKg(selected.weightKg?.toString() ?? "");
    setHeightCm(selected.heightCm?.toString() ?? "");
    setPainScore(selected.painScore?.toString() ?? "");
    setTriagePriority(selected.triagePriority ?? "NORMAL");
    setNotes(selected.notes ?? "");
    setChiefComplaint(selected.chiefComplaint ?? "");
    setClinicId(selected.clinicId ? String(selected.clinicId) : "");
    setRoutedDoctorId(selected.routedDoctorId ? String(selected.routedDoctorId) : "");
    setPriorityTouched(false);
    setMessage(null);
  }, [selected]);


  const suggestedPriority = React.useMemo(() => {
    return suggestPriority({
      oxygenSaturation: oxygenSaturation ? Number(oxygenSaturation) : undefined,
      painScore: painScore ? Number(painScore) : undefined,
      systolicBp: systolicBp ? Number(systolicBp) : undefined,
      diastolicBp: diastolicBp ? Number(diastolicBp) : undefined,
      pulseRate: pulseRate ? Number(pulseRate) : undefined,
      temperatureC: temperatureC ? Number(temperatureC) : undefined,
    });
  }, [
    oxygenSaturation,
    painScore,
    systolicBp,
    diastolicBp,
    pulseRate,
    temperatureC,
  ]);


  React.useEffect(() => {
    if (!priorityTouched) {
      setTriagePriority(suggestedPriority);
    }
  }, [suggestedPriority, priorityTouched]);


  const handleStart = async () => {
    if (!selected) return;
    setMessage(null);
    await startTriageMutation.mutateAsync(selected.id);
  };


  const handleComplete = async () => {
    if (!selected) return;
    setMessage(null);


    const result = await completeTriageMutation.mutateAsync({
      id: selected.id,
      payload: {
        chiefComplaint: chiefComplaint || undefined,
        temperatureC: temperatureC ? Number(temperatureC) : undefined,
        systolicBp: systolicBp ? Number(systolicBp) : undefined,
        diastolicBp: diastolicBp ? Number(diastolicBp) : undefined,
        pulseRate: pulseRate ? Number(pulseRate) : undefined,
        respiratoryRate: respiratoryRate ? Number(respiratoryRate) : undefined,
        oxygenSaturation: oxygenSaturation ? Number(oxygenSaturation) : undefined,
        weightKg: weightKg ? Number(weightKg) : undefined,
        heightCm: heightCm ? Number(heightCm) : undefined,
        painScore: painScore ? Number(painScore) : undefined,
        triagePriority,
        notes: notes || undefined,
        clinicId: clinicId ? Number(clinicId) : undefined,
        routedDoctorId: routedDoctorId ? Number(routedDoctorId) : undefined,
        statusCode: "READY_FOR_DOCTOR",
      },
    });


    setMessage(
      `Triage completed. Patient sent to doctor queue.${result.appointmentId ? ` Appointment ID: ${result.appointmentId}` : ""}`,
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
              Triage Station
            </Badge>


            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10">
                <HeartPulse className="h-7 w-7 text-primary" />
              </div>


              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Triage Queue
                </h1>
                <p className="text-muted-foreground">
                  Assess patients, capture vitals, assign urgency, and route them forward
                </p>
              </div>
            </div>
          </div>


          <div className="grid gap-3 sm:grid-cols-3 xl:w-[560px]">
            <TriageStat label="Facility" value={facilityName || "No facility"} />
            <TriageStat label="Branch" value={selectedBranchName || "No branch"} />
            <TriageStat label="Waiting Cases" value={String(queue.length)} />
          </div>
        </div>
      </section>


      {message ? (
        <div className="rounded-[1.4rem] border border-cyan-500/20 bg-cyan-500/8 px-4 py-4 text-sm text-cyan-300">
          {message}
        </div>
      ) : null}


      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="relative overflow-hidden rounded-[1.8rem] surface-spotlight shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Waiting Patients</CardTitle>
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
            ) : queue.length === 0 ? (
              <div className="rounded-[1.3rem] border border-dashed border-white/10 bg-card/[0.02] p-5 text-sm text-muted-foreground">
                No patients are currently waiting for triage.
              </div>
            ) : (
              queue.map((item) => {
                const active = selected?.id === item.id;


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
                        <p className="truncate font-semibold">{patientName(item)}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.patient?.patientNumber || item.triageNumber}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {item.chiefComplaint || "No complaint recorded yet"}
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Triage Assessment</CardTitle>


            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl"
                disabled={!selected || startTriageMutation.isPending}
                onClick={handleStart}
              >
                {startTriageMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Start
              </Button>


              <Button
                type="button"
                className="rounded-2xl"
                disabled={!selected || completeTriageMutation.isPending}
                onClick={handleComplete}
              >
                {completeTriageMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Stethoscope className="mr-2 h-4 w-4" />
                )}
                Complete
              </Button>
            </div>
          </CardHeader>


          <CardContent className="space-y-5">
            {!selected ? (
              <div className="rounded-[1.3rem] border border-dashed border-white/10 bg-card/[0.02] p-5 text-sm text-muted-foreground">
                Select a patient from the waiting queue.
              </div>
            ) : (
              <>
                <div className="rounded-[1.3rem] border border-white/10 bg-card/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Current Patient
                  </p>
                  <p className="mt-2 text-lg font-bold">{patientName(selected)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selected.patient?.patientNumber || selected.triageNumber}
                  </p>
                </div>


                <div className="rounded-[1.3rem] border border-white/10 bg-card/[0.03] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-cyan-300" />
                      <p className="text-sm font-medium">System Suggested Priority</p>
                    </div>


                    <span
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-semibold",
                        getPriorityTone(suggestedPriority),
                      )}
                    >
                      {suggestedPriority}
                    </span>
                  </div>


                  <p className="mt-3 text-xs text-muted-foreground">
                    Suggested from pain score, oxygen saturation, temperature, pulse, and blood pressure.
                  </p>
                </div>


                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Chief Complaint
                  </label>
                  <Textarea
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    className="min-h-[90px] rounded-2xl"
                    placeholder="Describe presenting complaint"
                  />
                </div>


                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Temperature °C</label>
                    <div className="relative">
                      <Thermometer className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={temperatureC}
                        onChange={(e) => setTemperatureC(e.target.value)}
                        className="h-12 rounded-2xl pl-10"
                      />
                    </div>
                  </div>


                  <div>
                    <label className="mb-2 block text-sm font-medium">Systolic BP</label>
                    <Input
                      value={systolicBp}
                      onChange={(e) => setSystolicBp(e.target.value)}
                      className="h-12 rounded-2xl"
                    />
                  </div>


                  <div>
                    <label className="mb-2 block text-sm font-medium">Diastolic BP</label>
                    <Input
                      value={diastolicBp}
                      onChange={(e) => setDiastolicBp(e.target.value)}
                      className="h-12 rounded-2xl"
                    />
                  </div>


                  <div>
                    <label className="mb-2 block text-sm font-medium">Pulse Rate</label>
                    <Input
                      value={pulseRate}
                      onChange={(e) => setPulseRate(e.target.value)}
                      className="h-12 rounded-2xl"
                    />
                  </div>


                  <div>
                    <label className="mb-2 block text-sm font-medium">Respiratory Rate</label>
                    <Input
                      value={respiratoryRate}
                      onChange={(e) => setRespiratoryRate(e.target.value)}
                      className="h-12 rounded-2xl"
                    />
                  </div>


                  <div>
                    <label className="mb-2 block text-sm font-medium">Oxygen Saturation</label>
                    <Input
                      value={oxygenSaturation}
                      onChange={(e) => setOxygenSaturation(e.target.value)}
                      className="h-12 rounded-2xl"
                    />
                  </div>


                  <div>
                    <label className="mb-2 block text-sm font-medium">Weight (kg)</label>
                    <Input
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      className="h-12 rounded-2xl"
                    />
                  </div>


                  <div>
                    <label className="mb-2 block text-sm font-medium">Height (cm)</label>
                    <Input
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                      className="h-12 rounded-2xl"
                    />
                  </div>


                  <div>
                    <label className="mb-2 block text-sm font-medium">Pain Score (0-10)</label>
                    <Input
                      value={painScore}
                      onChange={(e) => setPainScore(e.target.value)}
                      className="h-12 rounded-2xl"
                    />
                  </div>
                </div>


                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Route to Clinic</label>
                    <select
                      value={clinicId}
                      onChange={(e) => setClinicId(e.target.value)}
                      className="flex h-12 w-full rounded-2xl border border-white/10 bg-background px-4 text-sm"
                    >
                      <option value="">Select clinic</option>
                      {filteredClinics.map((clinic) => (
                        <option key={clinic.id} value={clinic.id}>
                          {clinic.name}
                        </option>
                      ))}
                    </select>
                  </div>


                  <div>
                    <label className="mb-2 block text-sm font-medium">Route to Doctor</label>
                    <select
                      value={routedDoctorId}
                      onChange={(e) => setRoutedDoctorId(e.target.value)}
                      className="flex h-12 w-full rounded-2xl border border-white/10 bg-background px-4 text-sm"
                    >
                      <option value="">Select doctor</option>
                      {doctors.map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>
                          {[doctor.firstName, doctor.lastName].filter(Boolean).join(" ")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>


                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Final Triage Priority</label>
                    <select
                      value={triagePriority}
                      onChange={(e) => {
                        setPriorityTouched(true);
                        setTriagePriority(e.target.value);
                      }}
                      className="flex h-12 w-full rounded-2xl border border-white/10 bg-background px-4 text-sm"
                    >
                      <option value="NORMAL">NORMAL</option>
                      <option value="URGENT">URGENT</option>
                      <option value="EMERGENCY">EMERGENCY</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>


                  <div>
                    <label className="mb-2 block text-sm font-medium">Status</label>
                    <Input
                      value={selected.statusCode || "WAITING_TRIAGE"}
                      disabled
                      className="h-12 rounded-2xl opacity-80"
                    />
                  </div>
                </div>


                {triagePriority === "CRITICAL" ? (
                  <div className="rounded-[1.3rem] border border-red-500/20 bg-red-500/10 p-4 text-red-300">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      <p className="font-semibold">Critical priority selected</p>
                    </div>
                    <p className="mt-2 text-sm text-red-200/80">
                      This patient will appear at the top of the doctor queue.
                    </p>
                  </div>
                ) : null}


                <div>
                  <label className="mb-2 block text-sm font-medium">Triage Notes</label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[110px] rounded-2xl"
                    placeholder="Clinical notes from triage"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
