"use client";

import * as React from "react";
import {
  CheckCircle2,
  Search,
  Send,
  UserPlus,
  Users,
  Loader2,
  Phone,
  FileText,
} from "lucide-react";
import { usePatients } from "@/hooks/use-patients";
import { useCreatePatient } from "@/hooks/use-create-patient";
import { useCreateTriage } from "@/hooks/use-create-triage";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useScope } from "@/providers/scope-provider";
import { cn } from "@/lib/utils";

type PatientItem = {
  id: number;
  patientNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  gender?: string | null;
  phonePrimary?: string | null;
  email?: string | null;
  facilityId: number;
  createdAt?: string;
};

function getPatientFullName(patient: PatientItem) {
  return [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(" ");
}

function ReceptionSummaryCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </p>
      <p className="mt-2 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

export default function PatientsPage() {
  const { data, isLoading } = usePatients();
  const { facilityId, facilityName, selectedBranchId, selectedBranchName } =
    useScope();

  const createPatientMutation = useCreatePatient();
  const createTriageMutation = useCreateTriage();

  const patients = Array.isArray(data) ? (data as PatientItem[]) : [];

  const [search, setSearch] = React.useState("");
  const [selectedPatientId, setSelectedPatientId] = React.useState<number | null>(null);
  const [chiefComplaint, setChiefComplaint] = React.useState("");
  const [arrivalType, setArrivalType] = React.useState("WALK_IN");
  const [triagePriority, setTriagePriority] = React.useState("NORMAL");
  const [triageNotes, setTriageNotes] = React.useState("");

  const [firstName, setFirstName] = React.useState("");
  const [middleName, setMiddleName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [gender, setGender] = React.useState("");
  const [phonePrimary, setPhonePrimary] = React.useState("");
  const [email, setEmail] = React.useState("");

  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const filteredPatients = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients.slice(0, 12);

    return patients
      .filter((patient) => {
        const haystack = [
          patient.patientNumber,
          patient.firstName,
          patient.middleName,
          patient.lastName,
          patient.phonePrimary,
          patient.email,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      })
      .slice(0, 12);
  }, [patients, search]);

  const selectedPatient = React.useMemo(() => {
    return patients.find((patient) => patient.id === selectedPatientId) ?? null;
  }, [patients, selectedPatientId]);

  const handleCreatePatientAndSendToTriage = async () => {
    if (!facilityId) return;

    setSuccessMessage(null);

    const createdPatient = await createPatientMutation.mutateAsync({
      firstName: firstName.trim(),
      middleName: middleName.trim() || undefined,
      lastName: lastName.trim(),
      gender: gender.trim() || undefined,
      phonePrimary: phonePrimary.trim() || undefined,
      email: email.trim() || undefined,
      facilityId,
      isActive: true,
      isDeceased: false,
    });

    const createdTriage = await createTriageMutation.mutateAsync({
      patientId: createdPatient.id,
      facilityId,
      branchId: selectedBranchId ?? undefined,
      arrivalType,
      chiefComplaint: chiefComplaint.trim() || "General review",
      triagePriority,
      statusCode: "WAITING_TRIAGE",
      notes: triageNotes.trim() || undefined,
    });

    setSelectedPatientId(createdPatient.id);
    setSuccessMessage(
      `Patient ${createdPatient.patientNumber} sent to triage successfully. Triage No: ${createdTriage.triageNumber}`,
    );

    setFirstName("");
    setMiddleName("");
    setLastName("");
    setGender("");
    setPhonePrimary("");
    setEmail("");
    setChiefComplaint("");
    setTriageNotes("");
    setArrivalType("WALK_IN");
    setTriagePriority("NORMAL");
  };

  const handleSendExistingPatientToTriage = async () => {
    if (!facilityId || !selectedPatient) return;

    setSuccessMessage(null);

    const createdTriage = await createTriageMutation.mutateAsync({
      patientId: selectedPatient.id,
      facilityId,
      branchId: selectedBranchId ?? undefined,
      arrivalType,
      chiefComplaint: chiefComplaint.trim() || "General review",
      triagePriority,
      statusCode: "WAITING_TRIAGE",
      notes: triageNotes.trim() || undefined,
    });

    setSuccessMessage(
      `Returning patient ${selectedPatient.patientNumber} sent to triage successfully. Triage No: ${createdTriage.triageNumber}`,
    );

    setChiefComplaint("");
    setTriageNotes("");
    setArrivalType("WALK_IN");
    setTriagePriority("NORMAL");
  };

  const totalPatients = patients.length;
  const todayVisible = filteredPatients.length;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border surface-spotlight shadow-md p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-blue-600/10 via-cyan-500/5 to-transparent" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <Badge className="rounded-full border-0 bg-primary/10 px-3 py-1 text-module">
              Reception Desk
            </Badge>

            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10">
                <Users className="h-7 w-7 text-primary" />
              </div>

              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Reception & Patient Intake
                </h1>
                <p className="text-muted-foreground">
                  Search returning patients, register new ones, and send cases to triage
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[560px]">
            <ReceptionSummaryCard
              title="Facility"
              value={facilityName || "No facility"}
            />
            <ReceptionSummaryCard
              title="Branch"
              value={selectedBranchName || "No branch"}
            />
            <ReceptionSummaryCard
              title="Patients in Scope"
              value={String(totalPatients)}
            />
            <ReceptionSummaryCard
              title="Search Results"
              value={String(todayVisible)}
            />
          </div>
        </div>
      </section>

      {successMessage ? (
        <div className="rounded-[1.4rem] border border-emerald-500/20 bg-success/8 px-4 py-4 text-sm text-emerald-300">
          {successMessage}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="relative overflow-hidden rounded-[1.8rem] surface-spotlight shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Find Returning Patient</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by patient number, name, phone, or email"
                className="h-12 rounded-2xl pl-10"
              />
            </div>

            <div className="grid gap-3">
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
              ) : filteredPatients.length === 0 ? (
                <div className="rounded-[1.3rem] border border-white/10 bg-card/[0.03] p-5 text-sm text-muted-foreground">
                  No matching patient found. Use the registration form to create one.
                </div>
              ) : (
                filteredPatients.map((patient) => {
                  const isSelected = selectedPatientId === patient.id;

                  return (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => setSelectedPatientId(patient.id)}
                      className={cn(
                        "w-full rounded-[1.3rem] border p-4 text-left transition-all duration-200",
                        isSelected
                          ? "border-cyan-400/40 bg-cyan-500/10"
                          : "border-white/10 bg-card/[0.03] hover:bg-card/[0.05]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            {getPatientFullName(patient)}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {patient.patientNumber}
                          </p>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {patient.phonePrimary || "No phone"}{" "}
                            {patient.gender ? `• ${patient.gender}` : ""}
                          </p>
                        </div>

                        {isSelected ? (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-cyan-400" />
                        ) : null}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden rounded-[1.8rem] surface-spotlight shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Selected Patient / New Visit</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {selectedPatient ? (
              <div className="rounded-[1.3rem] border border-white/10 bg-card/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Returning Patient
                </p>
                <p className="mt-2 text-lg font-bold">
                  {getPatientFullName(selectedPatient)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedPatient.patientNumber}
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="mt-1 text-sm font-medium">
                      {selectedPatient.phonePrimary || "No phone"}
                    </p>
                  </div>

                  <div className="rounded-[1rem] border border-white/10 bg-card/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Gender</p>
                    <p className="mt-1 text-sm font-medium">
                      {selectedPatient.gender || "—"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[1.3rem] border border-dashed border-white/10 bg-card/[0.02] p-5 text-sm text-muted-foreground">
                No returning patient selected yet.
              </div>
            )}

            <div className="grid gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Chief Complaint</label>
                <Textarea
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="What brings the patient today?"
                  className="min-h-[96px] rounded-2xl"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Arrival Type</label>
                  <Input
                    value={arrivalType}
                    onChange={(e) => setArrivalType(e.target.value)}
                    className="h-12 rounded-2xl"
                    placeholder="WALK_IN"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Triage Priority</label>
                  <Input
                    value={triagePriority}
                    onChange={(e) => setTriagePriority(e.target.value)}
                    className="h-12 rounded-2xl"
                    placeholder="NORMAL"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Reception Notes</label>
                <Textarea
                  value={triageNotes}
                  onChange={(e) => setTriageNotes(e.target.value)}
                  placeholder="Optional intake notes"
                  className="min-h-[90px] rounded-2xl"
                />
              </div>

              <Button
                type="button"
                className="h-12 rounded-2xl"
                disabled={
                  !selectedPatient ||
                  !facilityId ||
                  createTriageMutation.isPending
                }
                onClick={handleSendExistingPatientToTriage}
              >
                {createTriageMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send Returning Patient to Triage
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="relative overflow-hidden rounded-[1.8rem] surface-spotlight shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Register New Patient & Send to Triage</CardTitle>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium">First Name</label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-12 rounded-2xl"
                  placeholder="John"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Middle Name</label>
                <Input
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  className="h-12 rounded-2xl"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Last Name</label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-12 rounded-2xl"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium">Gender</label>
                <Input
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="h-12 rounded-2xl"
                  placeholder="Male / Female"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Phone</label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={phonePrimary}
                    onChange={(e) => setPhonePrimary(e.target.value)}
                    className="h-12 rounded-2xl pl-10"
                    placeholder="07..."
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Email</label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-2xl"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Chief Complaint / Reason for Visit
              </label>
              <div className="relative">
                <FileText className="pointer-events-none absolute left-3 top-4 h-4 w-4 text-muted-foreground" />
                <Textarea
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  className="min-h-[110px] rounded-2xl pl-10"
                  placeholder="Describe the patient's presenting complaint"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium">Arrival Type</label>
                <Input
                  value={arrivalType}
                  onChange={(e) => setArrivalType(e.target.value)}
                  className="h-12 rounded-2xl"
                  placeholder="WALK_IN"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Triage Priority</label>
                <Input
                  value={triagePriority}
                  onChange={(e) => setTriagePriority(e.target.value)}
                  className="h-12 rounded-2xl"
                  placeholder="NORMAL"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Branch</label>
                <Input
                  value={selectedBranchName || "No branch"}
                  disabled
                  className="h-12 rounded-2xl opacity-80"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Reception Notes</label>
              <Textarea
                value={triageNotes}
                onChange={(e) => setTriageNotes(e.target.value)}
                className="min-h-[90px] rounded-2xl"
                placeholder="Optional intake notes"
              />
            </div>

            <Button
              type="button"
              className="h-12 rounded-2xl"
              disabled={
                !facilityId ||
                !firstName.trim() ||
                !lastName.trim() ||
                createPatientMutation.isPending ||
                createTriageMutation.isPending
              }
              onClick={handleCreatePatientAndSendToTriage}
            >
              {createPatientMutation.isPending || createTriageMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Register New Patient & Send to Triage
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
