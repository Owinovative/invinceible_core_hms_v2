"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Phone,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Users,
  X,
  XCircle,
  BadgeCheck,
  Calendar,
  CreditCard,
} from "lucide-react";
import { usePatients } from "@/hooks/use-patients";
import { useCreatePatient } from "@/hooks/use-create-patient";
import { useCreateTriage } from "@/hooks/use-create-triage";
import { useCheckShaEligibility } from "@/hooks/use-sha-eligibility";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/providers/auth-provider";
import { useScope } from "@/providers/scope-provider";
import { cn } from "@/lib/utils";
import type { EligibilityResult } from "@/services/dha-service";

// ─── Types ───────────────────────────────────────────────────────────────────

type PatientItem = {
  id: number;
  patientNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  gender?: string | null;
  dateOfBirth?: string | null;
  phonePrimary?: string | null;
  email?: string | null;
  facilityId: number;
  shaStatus?: string | null;
  shaMemberNumber?: string | null;
  shaEligibilityUpdatedAt?: string | null;
  createdAt?: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function patientFullName(p: PatientItem) {
  return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ");
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatRelativeTime(iso?: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function EligibilityStatusBadge({ status }: { status?: string | null }) {
  if (!status) return null;
  const map: Record<string, { label: string; class: string }> = {
    ELIGIBLE: {
      label: "SHA Eligible",
      class: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    },
    NOT_ELIGIBLE: {
      label: "Not Eligible",
      class: "bg-red-500/15 text-red-400 border-red-500/30",
    },
    NOT_FOUND: {
      label: "Not Found",
      class: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    },
    ACTIVE: {
      label: "Active",
      class: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    },
    INACTIVE: {
      label: "Inactive",
      class: "bg-red-500/15 text-red-400 border-red-500/30",
    },
  };
  const cfg = map[status] ?? {
    label: status,
    class: "bg-muted/20 text-muted-foreground border-border",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
        cfg.class,
      )}
    >
      {cfg.label}
    </span>
  );
}

// ─── SHA Eligibility Panel ───────────────────────────────────────────────────

function ShaEligibilityPanel({
  prefilledMemberNumber,
  onAttach,
}: {
  prefilledMemberNumber?: string;
  onAttach?: (result: EligibilityResult) => void;
}) {
  const [identifierType, setIdentifierType] = React.useState<
    "member" | "nationalId"
  >("member");
  const [memberNumber, setMemberNumber] = React.useState(
    prefilledMemberNumber ?? "",
  );
  const [nationalId, setNationalId] = React.useState("");
  const [serviceDate] = React.useState(new Date().toISOString().split("T")[0]);

  const eligibilityMutation = useCheckShaEligibility();
  const result = eligibilityMutation.data;

  const handleVerify = () => {
    if (identifierType === "member" && memberNumber.trim()) {
      eligibilityMutation.mutate({
        memberNumber: memberNumber.trim(),
        serviceDate,
      });
    } else if (identifierType === "nationalId" && nationalId.trim()) {
      eligibilityMutation.mutate({
        nationalId: nationalId.trim(),
        serviceDate,
      });
    }
  };

  const statusConfig = React.useMemo(() => {
    if (!result) return null;
    if (result.status === "ELIGIBLE")
      return {
        icon: <ShieldCheck className="h-5 w-5 text-emerald-400" />,
        color: "border-emerald-500/30 bg-emerald-500/8",
        headerColor: "text-emerald-400",
        label: "Eligible",
      };
    if (result.status === "NOT_ELIGIBLE")
      return {
        icon: <ShieldAlert className="h-5 w-5 text-red-400" />,
        color: "border-red-500/30 bg-red-500/8",
        headerColor: "text-red-400",
        label: "Not Eligible",
      };
    if (result.status === "NOT_FOUND")
      return {
        icon: <AlertCircle className="h-5 w-5 text-amber-400" />,
        color: "border-amber-500/30 bg-amber-500/8",
        headerColor: "text-amber-400",
        label: "Not Found",
      };
    return {
      icon: <AlertCircle className="h-5 w-5 text-red-400" />,
      color: "border-red-500/30 bg-red-500/8",
      headerColor: "text-red-400",
      label: "Error",
    };
  }, [result]);

  return (
    <div className="space-y-4">
      {/* Identifier Type Toggle */}
      <div className="flex rounded-2xl border border-white/10 bg-white/[0.03] p-1">
        {[
          { id: "member" as const, label: "SHA / Member No." },
          { id: "nationalId" as const, label: "National ID" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setIdentifierType(tab.id)}
            className={cn(
              "flex-1 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200",
              identifierType === tab.id
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="relative">
        <Shield className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        {identifierType === "member" ? (
          <Input
            value={memberNumber}
            onChange={(e) => setMemberNumber(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            placeholder="e.g. SHA-12345678 or member number"
            className="h-12 rounded-2xl pl-10 font-mono text-sm"
          />
        ) : (
          <Input
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            placeholder="e.g. 12345678"
            className="h-12 rounded-2xl pl-10 font-mono text-sm"
          />
        )}
      </div>

      <Button
        type="button"
        onClick={handleVerify}
        disabled={
          eligibilityMutation.isPending ||
          (identifierType === "member"
            ? !memberNumber.trim()
            : !nationalId.trim())
        }
        className="h-11 w-full rounded-2xl gap-2"
      >
        {eligibilityMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
        {eligibilityMutation.isPending
          ? "Verifying with DHA…"
          : "Verify SHA Eligibility"}
      </Button>

      {/* Error */}
      {eligibilityMutation.isError && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/8 p-4">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-sm text-red-300">
            {eligibilityMutation.error?.message ??
              "Verification failed. Check DHA connection."}
          </p>
        </div>
      )}

      {/* Result */}
      {result && statusConfig && (
        <div
          className={cn("rounded-2xl border p-5 space-y-4", statusConfig.color)}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {statusConfig.icon}
              <span
                className={cn("font-bold text-base", statusConfig.headerColor)}
              >
                {result.memberName ?? "—"} — {statusConfig.label}
              </span>
            </div>
            <EligibilityStatusBadge status={result.status} />
          </div>

          {/* Core info grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/8 bg-black/10 p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Member Number
              </p>
              <p className="mt-1 font-mono text-sm font-semibold">
                {result.memberNumber ?? "—"}
              </p>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/10 p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Scheme
              </p>
              <p className="mt-1 text-sm font-semibold">
                {result.scheme ?? "—"}
              </p>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/10 p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Membership Status
              </p>
              <div className="mt-1">
                <EligibilityStatusBadge status={result.membershipStatus} />
              </div>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/10 p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Coverage
              </p>
              <p className="mt-1 text-sm font-semibold">
                {result.coverageStart && result.coverageEnd
                  ? `${formatDate(result.coverageStart)} → ${formatDate(result.coverageEnd)}`
                  : "—"}
              </p>
            </div>
          </div>

          {/* Dependants */}
          {result.dependants && result.dependants.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                Dependants ({result.dependants.length})
              </p>
              <div className="space-y-2">
                {result.dependants.map((dep, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl border border-white/8 bg-black/10 px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{dep.name}</span>
                    <span className="text-muted-foreground">
                      {dep.relationship}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Benefits */}
          {result.benefits && result.benefits.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                Benefits
              </p>
              <div className="space-y-2">
                {result.benefits.slice(0, 5).map((b, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl border border-white/8 bg-black/10 px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{b.category}</span>
                    {b.balance != null && (
                      <span className="font-mono text-xs text-muted-foreground">
                        Balance: KES {b.balance.toLocaleString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamp + External Ref */}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-white/8 pt-3">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {result.responseTimestamp
                ? `Response: ${new Date(result.responseTimestamp).toLocaleTimeString("en-KE")}`
                : "Response received"}
            </span>
            {result.externalRef && (
              <span className="font-mono">Ref: {result.externalRef}</span>
            )}
          </div>

          {/* Attach to visit action */}
          {onAttach && result.status === "ELIGIBLE" && (
            <Button
              type="button"
              onClick={() => onAttach(result)}
              className="w-full h-10 rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <BadgeCheck className="h-4 w-4" />
              Attach Verified Member to Visit
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PatientsPage() {
  const { user } = useAuth();
  const { data, isLoading } = usePatients();
  const { facilityId, facilityName, selectedBranchId, selectedBranchName } =
    useScope();

  const createPatientMutation = useCreatePatient();
  const createTriageMutation = useCreateTriage();

  const patients = React.useMemo(
    () => (Array.isArray(data) ? (data as PatientItem[]) : []),
    [data],
  );

  // ── Search & selection ─────────────────────────────────────────────────────
  const [search, setSearch] = React.useState("");
  const [selectedPatientId, setSelectedPatientId] = React.useState<
    number | null
  >(null);

  // ── Visit details ──────────────────────────────────────────────────────────
  const [chiefComplaint, setChiefComplaint] = React.useState("");
  const [arrivalType, setArrivalType] = React.useState("WALK_IN");
  const [triagePriority, setTriagePriority] = React.useState("NORMAL");
  const [triageNotes, setTriageNotes] = React.useState("");

  // ── New patient registration ───────────────────────────────────────────────
  const [firstName, setFirstName] = React.useState("");
  const [middleName, setMiddleName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [gender, setGender] = React.useState("");
  const [phonePrimary, setPhonePrimary] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [nationalId, setNationalId] = React.useState("");
  const [shaMemberNumber, setShaMemberNumber] = React.useState("");
  const [dateOfBirth, setDateOfBirth] = React.useState("");

  // ── SHA eligibility state attached to current visit ───────────────────────
  const [attachedEligibility, setAttachedEligibility] =
    React.useState<EligibilityResult | null>(null);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = React.useState<"search" | "register">(
    "search",
  );
  const [successMessage, setSuccessMessage] = React.useState<string | null>(
    null,
  );
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [showEligibility, setShowEligibility] = React.useState(false);

  const registrationBlockedReason = !facilityId
    ? "No local HMS facility is assigned to this account."
    : !firstName.trim()
      ? "Enter the patient's first name."
      : !lastName.trim()
        ? "Enter the patient's last name."
        : null;

  const filteredPatients = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients.slice(0, 15);
    return patients
      .filter((p) =>
        [
          p.patientNumber,
          p.firstName,
          p.middleName,
          p.lastName,
          p.phonePrimary,
          p.email,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 15);
  }, [patients, search]);

  const selectedPatient = React.useMemo(
    () => patients.find((p) => p.id === selectedPatientId) ?? null,
    [patients, selectedPatientId],
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSelectPatient = (id: number) => {
    setSelectedPatientId(id);
    setAttachedEligibility(null);
    setShowEligibility(false);
  };

  const handleSendExistingToTriage = async () => {
    if (!facilityId || !selectedPatient) {
      setActionError(
        !facilityId
          ? "Assign a local HMS facility to this account before creating clinical records."
          : "Select a patient before sending them to triage.",
      );
      return;
    }
    setSuccessMessage(null);
    setActionError(null);
    try {
      const triage = await createTriageMutation.mutateAsync({
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
        `✓ ${patientFullName(selectedPatient)} sent to triage. Number: ${triage.triageNumber}`,
      );
      setChiefComplaint("");
      setTriageNotes("");
      setArrivalType("WALK_IN");
      setTriagePriority("NORMAL");
      setAttachedEligibility(null);
      setShowEligibility(false);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Could not send the patient to triage.",
      );
    }
  };

  const handleRegisterAndSendToTriage = async () => {
    if (registrationBlockedReason || !facilityId) {
      setActionError(
        registrationBlockedReason ??
          "Assign a local HMS facility to this account before registering patients.",
      );
      return;
    }
    setSuccessMessage(null);
    setActionError(null);

    try {
      const created = await createPatientMutation.mutateAsync({
        firstName: firstName.trim(),
        middleName: middleName.trim() || undefined,
        lastName: lastName.trim(),
        gender: gender.trim() || undefined,
        dateOfBirth: dateOfBirth.trim() || undefined,
        phonePrimary: phonePrimary.trim() || undefined,
        email: email.trim() || undefined,
        nationalIdNumber: nationalId.trim() || undefined,
        shaMemberNumber: shaMemberNumber.trim() || undefined,
        facilityId,
        isActive: true,
        isDeceased: false,
      });

      try {
        const triage = await createTriageMutation.mutateAsync({
          patientId: created.id,
          facilityId,
          branchId: selectedBranchId ?? undefined,
          arrivalType,
          chiefComplaint: chiefComplaint.trim() || "General review",
          triagePriority,
          statusCode: "WAITING_TRIAGE",
          notes: triageNotes.trim() || undefined,
        });
        setSuccessMessage(
          `✓ Patient ${created.patientNumber} registered & sent to triage. No: ${triage.triageNumber}`,
        );
      } catch (error) {
        setActionError(
          `Patient ${created.patientNumber} was registered, but could not be sent to triage. Find the patient in the search tab and try Send to Triage again. ${
            error instanceof Error ? error.message : ""
          }`.trim(),
        );
        setActiveTab("search");
        return;
      }

      setFirstName("");
      setMiddleName("");
      setLastName("");
      setGender("");
      setPhonePrimary("");
      setEmail("");
      setNationalId("");
      setShaMemberNumber("");
      setDateOfBirth("");
      setChiefComplaint("");
      setTriageNotes("");
      setArrivalType("WALK_IN");
      setTriagePriority("NORMAL");
      setAttachedEligibility(null);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Patient registration failed.",
      );
    }
  };

  const shaEligibilityIsKnown =
    selectedPatient?.shaStatus === "ELIGIBLE" ||
    attachedEligibility?.status === "ELIGIBLE";

  return (
    <div className="space-y-6 pb-12">
      {/* ── Header banner ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-[2rem] border surface-spotlight shadow-md p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-blue-600/10 via-cyan-500/5 to-transparent" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

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
                  Reception &amp; Patient Intake
                </h1>
                <p className="text-muted-foreground mt-1">
                  Search patients · Verify SHA eligibility · Register new visits
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[520px]">
            <StatPill label="Facility" value={facilityName || "No facility"} />
            <StatPill
              label="Branch"
              value={selectedBranchName || "No branch"}
            />
            <StatPill
              label="Patients on record"
              value={String(patients.length)}
            />
            <StatPill
              label="Search results"
              value={String(filteredPatients.length)}
            />
          </div>
        </div>
      </section>

      {/* ── Success banner ─────────────────────────────────────────────────── */}
      {successMessage && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-500/25 bg-emerald-500/8 px-5 py-4">
          <div className="flex items-center gap-3 text-sm text-emerald-300">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            {successMessage}
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-red-500/30 bg-red-500/8 px-5 py-4">
          <div className="flex items-start gap-3 text-sm text-red-300">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            aria-label="Dismiss error"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Main workspace ──────────────────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        {/* Left: Patient search / registration */}
        <div className="space-y-4">
          {/* Tab bar */}
          <div className="flex rounded-2xl border border-white/10 bg-white/[0.03] p-1 gap-1">
            {[
              {
                id: "search" as const,
                icon: Search,
                label: "Find Returning Patient",
              },
              {
                id: "register" as const,
                icon: UserPlus,
                label: "Register New Patient",
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Search tab ─────────────────────────────────────────────────── */}
          {activeTab === "search" && (
            <Card className="relative overflow-hidden rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle className="text-base">
                  Search Returning Patient
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Patient number, name, or phone…"
                    className="h-12 rounded-2xl pl-10"
                  />
                </div>

                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="animate-pulse rounded-2xl border border-white/8 bg-white/[0.03] p-4"
                      >
                        <div className="h-4 w-40 rounded bg-white/10" />
                        <div className="mt-2 h-3 w-56 rounded bg-white/10" />
                      </div>
                    ))
                  ) : filteredPatients.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-sm text-muted-foreground">
                      No patient found. Switch to &ldquo;Register New
                      Patient&rdquo; to create one.
                    </div>
                  ) : (
                    filteredPatients.map((patient) => {
                      const isSelected = selectedPatientId === patient.id;
                      return (
                        <button
                          key={patient.id}
                          type="button"
                          onClick={() => handleSelectPatient(patient.id)}
                          className={cn(
                            "w-full rounded-2xl border p-4 text-left transition-all duration-200",
                            isSelected
                              ? "border-cyan-400/40 bg-cyan-500/10 shadow-sm"
                              : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold">
                                {patientFullName(patient)}
                              </p>
                              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                                {patient.patientNumber}
                              </p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                {patient.phonePrimary && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {patient.phonePrimary}
                                  </span>
                                )}
                                {patient.gender && (
                                  <span>{patient.gender}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                              {isSelected && (
                                <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                              )}
                              {patient.shaStatus && (
                                <EligibilityStatusBadge
                                  status={patient.shaStatus}
                                />
                              )}
                              {patient.shaMemberNumber && (
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  {patient.shaMemberNumber}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Register tab ───────────────────────────────────────────────── */}
          {activeTab === "register" && (
            <Card className="relative overflow-hidden rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle className="text-base">
                  Register New Patient
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Name */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      First Name *
                    </label>
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="h-11 rounded-2xl"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Middle Name
                    </label>
                    <Input
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                      className="h-11 rounded-2xl"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Last Name *
                    </label>
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="h-11 rounded-2xl"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                {/* Demographics */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Gender
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Select…</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
                      <Calendar className="h-3.5 w-3.5 text-primary" /> Date of
                      Birth
                    </label>
                    <Input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="h-11 rounded-2xl"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Phone
                    </label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={phonePrimary}
                        onChange={(e) => setPhonePrimary(e.target.value)}
                        className="h-11 rounded-2xl pl-10"
                        placeholder="07xxxxxxxx"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Email
                    </label>
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 rounded-2xl"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                {/* SHA identity */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-primary" /> National
                      ID
                    </label>
                    <Input
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                      className="h-11 rounded-2xl font-mono"
                      placeholder="e.g. 12345678"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-primary" /> SHA
                      Member Number
                    </label>
                    <Input
                      value={shaMemberNumber}
                      onChange={(e) => setShaMemberNumber(e.target.value)}
                      className="h-11 rounded-2xl font-mono"
                      placeholder="SHA-XXXXXXXX"
                    />
                  </div>
                </div>

                {/* Chief complaint */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Chief Complaint
                  </label>
                  <Textarea
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    className="min-h-[90px] rounded-2xl"
                    placeholder="Presenting complaint…"
                  />
                </div>

                {/* Visit params */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Arrival Type
                    </label>
                    <select
                      value={arrivalType}
                      onChange={(e) => setArrivalType(e.target.value)}
                      className="h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm"
                    >
                      <option value="WALK_IN">Walk In</option>
                      <option value="REFERRAL">Referral</option>
                      <option value="EMERGENCY">Emergency</option>
                      <option value="APPOINTMENT">Appointment</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Priority
                    </label>
                    <select
                      value={triagePriority}
                      onChange={(e) => setTriagePriority(e.target.value)}
                      className="h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm"
                    >
                      <option value="NORMAL">Normal</option>
                      <option value="URGENT">Urgent</option>
                      <option value="EMERGENCY">Emergency</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Branch
                    </label>
                    <Input
                      value={selectedBranchName || "No branch"}
                      disabled
                      className="h-11 rounded-2xl opacity-70"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleRegisterAndSendToTriage}
                  disabled={
                    !facilityId ||
                    !firstName.trim() ||
                    !lastName.trim() ||
                    createPatientMutation.isPending ||
                    createTriageMutation.isPending
                  }
                  title={
                    registrationBlockedReason ??
                    "Register patient and create a triage visit"
                  }
                  className="h-12 w-full rounded-2xl gap-2"
                >
                  {createPatientMutation.isPending ||
                  createTriageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  Register &amp; Send to Triage
                </Button>

                {!facilityId ? (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/8 p-4 text-sm text-amber-200">
                    <div className="flex items-start gap-3">
                      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
                      <div className="space-y-1">
                        <p className="font-semibold">
                          No local HMS facility is assigned
                        </p>
                        {user?.roleCode === "SUPER_ADMIN" ? (
                          <p className="text-amber-200/80">
                            Assign this account a Home Facility in{" "}
                            <Link
                              href="/platform/users"
                              className="font-semibold underline underline-offset-2"
                            >
                              Platform Control → Users
                            </Link>
                            , then sign out and sign in again. This is separate
                            from DHA facility onboarding.
                          </p>
                        ) : (
                          <p className="text-amber-200/80">
                            Ask a Super Administrator to assign this account a
                            Home Facility and branch, then sign out and sign in
                            again. This is separate from DHA facility
                            onboarding.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : registrationBlockedReason ? (
                  <p className="text-sm text-muted-foreground">
                    {registrationBlockedReason}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Selected patient + SHA eligibility panel */}
        <div className="space-y-4">
          {/* Selected patient card */}
          {selectedPatient && activeTab === "search" ? (
            <Card className="relative overflow-hidden rounded-[1.8rem] surface-spotlight shadow-md">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-600" />
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  Selected Patient
                  {shaEligibilityIsKnown && (
                    <span className="flex items-center gap-1 text-xs font-normal text-emerald-400">
                      <ShieldCheck className="h-4 w-4" /> SHA Verified
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Patient summary */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-lg font-bold">
                    {patientFullName(selectedPatient)}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {selectedPatient.patientNumber}
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Phone: </span>
                      {selectedPatient.phonePrimary || "—"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Gender: </span>
                      {selectedPatient.gender || "—"}
                    </div>
                    {selectedPatient.shaMemberNumber && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">SHA No: </span>
                        <span className="font-mono">
                          {selectedPatient.shaMemberNumber}
                        </span>
                      </div>
                    )}
                    {selectedPatient.shaEligibilityUpdatedAt && (
                      <div className="col-span-2 text-xs text-muted-foreground">
                        Last verified{" "}
                        {formatRelativeTime(
                          selectedPatient.shaEligibilityUpdatedAt,
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* SHA eligibility toggle */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowEligibility((v) => !v)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-medium transition-all duration-200",
                      showEligibility
                        ? "border-primary/40 bg-primary/8 text-primary"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      {showEligibility
                        ? "Hide SHA Eligibility"
                        : "Verify SHA Eligibility"}
                    </span>
                    {attachedEligibility?.status === "ELIGIBLE" && (
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    )}
                  </button>
                </div>

                {showEligibility && (
                  <ShaEligibilityPanel
                    prefilledMemberNumber={
                      selectedPatient.shaMemberNumber ?? ""
                    }
                    onAttach={(result) => {
                      setAttachedEligibility(result);
                    }}
                  />
                )}

                {/* Visit form */}
                <div className="space-y-3 border-t border-white/10 pt-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Visit Details
                  </p>
                  <Textarea
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    placeholder="Chief complaint / reason for visit"
                    className="min-h-[80px] rounded-2xl"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select
                      value={arrivalType}
                      onChange={(e) => setArrivalType(e.target.value)}
                      className="h-11 rounded-2xl border border-input bg-background px-3 text-sm"
                    >
                      <option value="WALK_IN">Walk In</option>
                      <option value="REFERRAL">Referral</option>
                      <option value="EMERGENCY">Emergency</option>
                      <option value="APPOINTMENT">Appointment</option>
                    </select>
                    <select
                      value={triagePriority}
                      onChange={(e) => setTriagePriority(e.target.value)}
                      className="h-11 rounded-2xl border border-input bg-background px-3 text-sm"
                    >
                      <option value="NORMAL">Normal Priority</option>
                      <option value="URGENT">Urgent</option>
                      <option value="EMERGENCY">Emergency</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>
                  <Button
                    type="button"
                    onClick={handleSendExistingToTriage}
                    disabled={
                      !selectedPatient ||
                      !facilityId ||
                      createTriageMutation.isPending
                    }
                    className="h-12 w-full rounded-2xl gap-2"
                  >
                    {createTriageMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send to Triage
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : activeTab === "search" ? (
            /* No patient selected placeholder */
            <Card className="relative overflow-hidden rounded-[1.8rem] surface-spotlight shadow-md">
              <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">No patient selected</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Search and click a patient to view their record and send
                    them to triage.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Standalone eligibility check (visible when on register tab or no patient) */}
          {(activeTab === "register" || !selectedPatient) && (
            <Card className="relative overflow-hidden rounded-[1.8rem] surface-spotlight shadow-md">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-5 w-5 text-primary" />
                  SHA Eligibility Verification
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ShaEligibilityPanel
                  onAttach={(result) => {
                    setAttachedEligibility(result);
                    // Auto-populate registration fields from eligibility result
                    if (result.memberNumber)
                      setShaMemberNumber(result.memberNumber);
                    if (result.memberName && !firstName.trim()) {
                      const parts = result.memberName.trim().split(/\s+/);
                      if (parts.length === 1) {
                        setFirstName(parts[0]);
                      } else if (parts.length >= 2) {
                        setFirstName(parts[0]);
                        setLastName(parts[parts.length - 1]);
                        if (parts.length > 2)
                          setMiddleName(parts.slice(1, -1).join(" "));
                      }
                    }
                    if (result.nationalId && !nationalId.trim())
                      setNationalId(result.nationalId);
                    if (result.gender && !gender.trim())
                      setGender(result.gender.toUpperCase());
                    if (result.dateOfBirth && !dateOfBirth.trim())
                      setDateOfBirth(result.dateOfBirth);
                    if (result.phoneNumber && !phonePrimary.trim())
                      setPhonePrimary(result.phoneNumber);
                  }}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
