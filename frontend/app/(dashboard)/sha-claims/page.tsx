"use client";

import * as React from "react";
import {
  AlertCircle,
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  FileCheck2,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  X,
  XCircle,
  Zap,
  Eye,
  PlusCircle,
  ArrowUpRight,
} from "lucide-react";
import { useCreateShaClaim } from "@/hooks/use-create-sha-claim";
import { useInvoices } from "@/hooks/use-invoices";
import { usePatients } from "@/hooks/use-patients";
import { useShaClaimSummary } from "@/hooks/use-sha-claim-summary";
import { useShaClaims } from "@/hooks/use-sha-claims";
import { useUpdateShaClaim } from "@/hooks/use-update-sha-claim";
import { useCheckShaEligibility } from "@/hooks/use-sha-eligibility";
import { searchDiagnoses } from "@/lib/diagnosis-catalog";
import { downloadShaClaimPdf } from "@/services/sha-claim-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EligibilityResult } from "@/services/dha-service";

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function relativeTime(iso?: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function patientName(p?: { firstName?: string | null; middleName?: string | null; lastName?: string | null } | null) {
  return [p?.firstName, p?.middleName, p?.lastName].filter(Boolean).join(" ") || "—";
}

function readImageAsDataUrl(file?: File | null): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file) { resolve(""); return; }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ─── Claim status config ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string; border: string }> = {
  DRAFT:     { label: "Draft",     dot: "bg-gray-400",    bg: "bg-gray-500/10",    text: "text-gray-400",    border: "border-gray-500/20" },
  VALIDATED: { label: "Validated", dot: "bg-blue-400",    bg: "bg-blue-500/10",    text: "text-blue-400",    border: "border-blue-500/20" },
  SUBMITTED: { label: "Submitted", dot: "bg-cyan-400",    bg: "bg-cyan-500/10",    text: "text-cyan-400",    border: "border-cyan-500/20" },
  ACCEPTED:  { label: "Accepted",  dot: "bg-emerald-400", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  APPROVED:  { label: "Approved",  dot: "bg-emerald-400", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  PAID:      { label: "Paid",      dot: "bg-green-400",   bg: "bg-green-500/10",   text: "text-green-400",   border: "border-green-500/20" },
  REJECTED:  { label: "Rejected",  dot: "bg-red-400",     bg: "bg-red-500/10",     text: "text-red-400",     border: "border-red-500/20" },
  CANCELLED: { label: "Cancelled", dot: "bg-gray-500",    bg: "bg-gray-600/10",    text: "text-gray-500",    border: "border-gray-500/20" },
  PENDING:   { label: "Pending",   dot: "bg-amber-400",   bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/20" },
};

function ClaimStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, dot: "bg-muted-foreground", bg: "bg-muted/10", text: "text-muted-foreground", border: "border-border" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", cfg.bg, cfg.text, cfg.border)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// ─── Workflow pipeline banner ─────────────────────────────────────────────────

const WORKFLOW_STEPS = [
  { id: "reception", label: "Reception" },
  { id: "eligibility", label: "Eligibility" },
  { id: "encounter", label: "Encounter" },
  { id: "diagnosis", label: "Diagnosis" },
  { id: "claim", label: "Generate Claim" },
  { id: "validate", label: "Validate" },
  { id: "submit", label: "Submit to SHA" },
  { id: "status", label: "Track Status" },
  { id: "payment", label: "Reconcile" },
];

function WorkflowBanner({ currentStep }: { currentStep: string }) {
  const currentIdx = WORKFLOW_STEPS.findIndex((s) => s.id === currentStep);
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {WORKFLOW_STEPS.map((step, i) => (
        <React.Fragment key={step.id}>
          <div className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all",
            i < currentIdx
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : i === currentIdx
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-white/[0.03] text-muted-foreground border border-white/10"
          )}>
            {i < currentIdx && <CheckCircle2 className="h-3 w-3" />}
            {step.label}
          </div>
          {i < WORKFLOW_STEPS.length - 1 && (
            <ChevronRight className={cn("h-3 w-3 shrink-0", i < currentIdx ? "text-emerald-400" : "text-muted-foreground/40")} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Detail drawer ────────────────────────────────────────────────────────────

type ClaimRecord = {
  id: number;
  claimNumber: string;
  statusCode: string;
  fidCode?: string | null;
  memberNumber?: string | null;
  diagnosisCode?: string | null;
  diagnosisText?: string | null;
  servicePeriodStart?: string | null;
  servicePeriodEnd?: string | null;
  claimedAmount: number;
  approvedAmount: number;
  paidAmount: number;
  rejectedAmount: number;
  rejectionReason?: string | null;
  notes?: string | null;
  createdAt?: string;
  submittedAt?: string | null;
  approvedAt?: string | null;
  paidAt?: string | null;
  patient?: { id: number; patientNumber?: string | null; firstName?: string | null; middleName?: string | null; lastName?: string | null; phonePrimary?: string | null } | null;
  facility?: { name?: string; shaFidCode?: string | null } | null;
  invoice?: { invoiceNumber?: string; totalAmount?: number } | null;
};

function ClaimDetailDrawer({
  claim,
  onClose,
  onStatusChange,
  onAmountSave,
  isUpdating,
}: {
  claim: ClaimRecord;
  onClose: () => void;
  onStatusChange: (id: number, status: string) => void;
  onAmountSave: (id: number, amounts: Record<string, number>) => void;
  isUpdating: boolean;
}) {
  const [claimedAmt, setClaimedAmt] = React.useState(String(claim.claimedAmount || 0));
  const [approvedAmt, setApprovedAmt] = React.useState(String(claim.approvedAmount || 0));
  const [paidAmt, setPaidAmt] = React.useState(String(claim.paidAmount || 0));
  const [rejectedAmt, setRejectedAmt] = React.useState(String(claim.rejectedAmount || 0));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-background/95 px-6 py-4 backdrop-blur-sm">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg">{claim.claimNumber}</h3>
              <ClaimStatusBadge status={claim.statusCode} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {patientName(claim.patient)} · {claim.patient?.patientNumber}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Timeline */}
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Created", value: formatDate(claim.createdAt), sub: relativeTime(claim.createdAt) },
              { label: "Submitted", value: claim.submittedAt ? formatDate(claim.submittedAt) : "Not yet", sub: "" },
              { label: "Paid", value: claim.paidAt ? formatDate(claim.paidAt) : "Awaiting", sub: "" },
            ].map(({ label, value, sub }) => (
              <div key={label} className="rounded-xl border border-border/50 bg-white/[0.02] p-3">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
                <p className="mt-1 text-sm font-semibold">{value}</p>
                {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
              </div>
            ))}
          </div>

          {/* Claim info */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/50 bg-white/[0.02] p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">FID Code</p>
              <p className="mt-1 font-mono text-sm">{claim.fidCode ?? claim.facility?.shaFidCode ?? "—"}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-white/[0.02] p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">SHA Member No.</p>
              <p className="mt-1 font-mono text-sm">{claim.memberNumber ?? "—"}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-white/[0.02] p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Diagnosis</p>
              <p className="mt-1 text-sm font-semibold">{claim.diagnosisCode ?? "—"}</p>
              {claim.diagnosisText && <p className="text-xs text-muted-foreground">{claim.diagnosisText}</p>}
            </div>
            <div className="rounded-xl border border-border/50 bg-white/[0.02] p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Service Period</p>
              <p className="mt-1 text-sm">
                {claim.servicePeriodStart && claim.servicePeriodEnd
                  ? `${formatDate(claim.servicePeriodStart)} → ${formatDate(claim.servicePeriodEnd)}`
                  : "—"}
              </p>
            </div>
            {claim.invoice && (
              <div className="sm:col-span-2 rounded-xl border border-border/50 bg-white/[0.02] p-3">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Linked Invoice</p>
                <p className="mt-1 text-sm font-semibold">{claim.invoice.invoiceNumber} · {formatMoney(claim.invoice.totalAmount)}</p>
              </div>
            )}
          </div>

          {/* Financial reconciliation */}
          <div>
            <p className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" /> Financial Reconciliation
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Claimed (KES)", value: claimedAmt, setter: setClaimedAmt, color: "text-foreground" },
                { label: "Approved (KES)", value: approvedAmt, setter: setApprovedAmt, color: "text-emerald-400" },
                { label: "Paid (KES)", value: paidAmt, setter: setPaidAmt, color: "text-green-400" },
                { label: "Rejected (KES)", value: rejectedAmt, setter: setRejectedAmt, color: "text-red-400" },
              ].map(({ label, value, setter, color }) => (
                <div key={label}>
                  <label className={cn("mb-1 block text-xs font-medium", color)}>{label}</label>
                  <Input
                    type="number"
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    className="h-10 rounded-xl font-mono text-sm"
                  />
                </div>
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              disabled={isUpdating}
              onClick={() => onAmountSave(claim.id, {
                claimedAmount: Number(claimedAmt),
                approvedAmount: Number(approvedAmt),
                paidAmount: Number(paidAmt),
                rejectedAmount: Number(rejectedAmt),
              })}
              className="mt-3 rounded-xl gap-2"
            >
              {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="h-3.5 w-3.5" />}
              Save Amounts
            </Button>
          </div>

          {/* Rejection reason */}
          {claim.rejectionReason && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/8 p-4">
              <p className="text-sm font-semibold text-red-400 mb-1 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Rejection Reason
              </p>
              <p className="text-sm text-red-300">{claim.rejectionReason}</p>
            </div>
          )}

          {/* Notes */}
          {claim.notes && (
            <div className="rounded-xl border border-border/50 bg-white/[0.02] p-4">
              <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
              <p className="text-sm">{claim.notes}</p>
            </div>
          )}

          {/* Status change + Download */}
          <div className="flex flex-wrap items-center gap-3 border-t border-border/50 pt-4">
            <div className="flex-1 min-w-[160px]">
              <label className="mb-1 block text-xs text-muted-foreground">Change Status</label>
              <select
                value={claim.statusCode}
                onChange={(e) => onStatusChange(claim.id, e.target.value)}
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                {Object.keys(STATUS_CONFIG).map((s) => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl gap-2 self-end"
              onClick={() => downloadShaClaimPdf(claim.id, claim.claimNumber)}
            >
              <Download className="h-3.5 w-3.5" />
              Download PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Inline eligibility panel for claim creation ──────────────────────────────

function InlineEligibilityCheck({ onVerified }: { onVerified: (r: EligibilityResult) => void }) {
  const [identifier, setIdentifier] = React.useState("");
  const mutation = useCheckShaEligibility();

  const verify = () => {
    if (!identifier.trim()) return;
    const isNationalId = /^\d{5,8}$/.test(identifier.trim());
    mutation.mutate(
      isNationalId ? { nationalId: identifier.trim() } : { memberNumber: identifier.trim() },
      { onSuccess: (r) => { if (r.status === "ELIGIBLE") onVerified(r); } }
    );
  };

  const r = mutation.data;

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
        <Shield className="h-3.5 w-3.5" /> Verify SHA Eligibility Before Submitting
      </p>
      <div className="flex gap-2">
        <Input
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && verify()}
          placeholder="SHA number or National ID"
          className="h-9 rounded-xl font-mono text-sm flex-1"
        />
        <Button type="button" size="sm" onClick={verify} disabled={mutation.isPending || !identifier.trim()}
          className="h-9 rounded-xl shrink-0">
          {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
        </Button>
      </div>
      {r && (
        <div className={cn("rounded-xl px-3 py-2 text-sm font-medium flex items-center gap-2",
          r.status === "ELIGIBLE" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
        )}>
          {r.status === "ELIGIBLE" ? <ShieldCheck className="h-4 w-4 shrink-0" /> : <ShieldAlert className="h-4 w-4 shrink-0" />}
          <div>
            <span>{r.memberName ?? "—"} — {r.status.replace("_", " ")}</span>
            {r.memberNumber && <span className="ml-2 font-mono text-xs opacity-70">({r.memberNumber})</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ShaClaimsPage() {
  const { data: claimsData = [] } = useShaClaims();
  const { data: summary } = useShaClaimSummary();
  const { data: patientsData = [] } = usePatients();
  const { data: invoicesData = [] } = useInvoices();
  const createMutation = useCreateShaClaim();
  const updateMutation = useUpdateShaClaim();

  const patients = Array.isArray(patientsData) ? patientsData : [];
  const invoices = Array.isArray(invoicesData) ? invoicesData : [];
  const claims = (Array.isArray(claimsData) ? claimsData : []) as ClaimRecord[];

  // ── Form state ─────────────────────────────────────────────────────────────
  const [patientQuery, setPatientQuery] = React.useState("");
  const [selectedPatientId, setSelectedPatientId] = React.useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState("");
  const [memberNumber, setMemberNumber] = React.useState("");
  const [diagnosisQuery, setDiagnosisQuery] = React.useState("");
  const [diagnosisCode, setDiagnosisCode] = React.useState("");
  const [diagnosisText, setDiagnosisText] = React.useState("");
  const [claimedAmount, setClaimedAmount] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [patientSignatureUrl, setPatientSignatureUrl] = React.useState("");
  const [facilitySignatureUrl, setFacilitySignatureUrl] = React.useState("");
  const [rubberStampUrl, setRubberStampUrl] = React.useState("");
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // ── List state ─────────────────────────────────────────────────────────────
  const [searchClaims, setSearchClaims] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [detailClaim, setDetailClaim] = React.useState<ClaimRecord | null>(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const patientMatches = React.useMemo(() => {
    const q = patientQuery.trim().toLowerCase();
    if (!q) return patients.slice(0, 12);
    return patients.filter((p) =>
      [p.patientNumber, p.firstName, p.middleName, p.lastName, p.phonePrimary]
        .filter(Boolean).join(" ").toLowerCase().includes(q)
    ).slice(0, 12);
  }, [patientQuery, patients]);

  const selectedPatient = patients.find((p) => String(p.id) === selectedPatientId);
  const patientInvoices = invoices.filter((inv) => String(inv.patientId) === selectedPatientId);
  const selectedInvoice = invoices.find((inv) => String(inv.id) === selectedInvoiceId);
  const diagnosisMatches = searchDiagnoses(diagnosisQuery);

  const filteredClaims = React.useMemo(() => {
    let list = claims;
    if (statusFilter !== "ALL") list = list.filter((c) => c.statusCode === statusFilter);
    if (searchClaims.trim()) {
      const q = searchClaims.trim().toLowerCase();
      list = list.filter((c) =>
        [c.claimNumber, patientName(c.patient), c.patient?.patientNumber, c.diagnosisCode, c.memberNumber]
          .filter(Boolean).join(" ").toLowerCase().includes(q)
      );
    }
    return list;
  }, [claims, statusFilter, searchClaims]);

  // Status count breakdown
  const statusCounts = React.useMemo(() =>
    claims.reduce((acc, c) => { acc[c.statusCode] = (acc[c.statusCode] ?? 0) + 1; return acc; }, {} as Record<string, number>),
    [claims]
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleCreateClaim = async () => {
    const patient = selectedPatient as typeof patients[0] & { facilityId: number; branchId?: number };
    if (!patient?.facilityId) {
      setMessage({ type: "error", text: "Choose a patient before creating a claim." });
      return;
    }
    try {
      const created = await createMutation.mutateAsync({
        facilityId: (selectedInvoice as any)?.facilityId ?? patient.facilityId,
        branchId: (selectedInvoice as any)?.branchId ?? (patient as any)?.branchId ?? undefined,
        patientId: patient.id,
        invoiceId: selectedInvoice?.id,
        memberNumber: memberNumber.trim() || undefined,
        diagnosisCode: diagnosisCode || undefined,
        diagnosisText: diagnosisText || undefined,
        claimedAmount: claimedAmount ? Number(claimedAmount) : (selectedInvoice as any)?.totalAmount,
        notes: notes.trim() || undefined,
        patientSignatureUrl: patientSignatureUrl || undefined,
        facilitySignatureUrl: facilitySignatureUrl || undefined,
        rubberStampUrl: rubberStampUrl || undefined,
      });
      setMessage({ type: "success", text: `SHA Claim ${created.claimNumber} created successfully.` });
      setSelectedInvoiceId(""); setClaimedAmount(""); setNotes("");
      setPatientSignatureUrl(""); setFacilitySignatureUrl(""); setRubberStampUrl("");
      setDiagnosisCode(""); setDiagnosisText(""); setDiagnosisQuery(""); setMemberNumber("");
    } catch (e: any) {
      setMessage({ type: "error", text: e?.message ?? "Failed to create claim." });
    }
  };

  const handleStatusChange = async (id: number, statusCode: string) => {
    await updateMutation.mutateAsync({ id, payload: { statusCode } });
    if (detailClaim?.id === id) {
      setDetailClaim((c) => c ? { ...c, statusCode } : null);
    }
  };

  const handleAmountSave = async (id: number, amounts: Record<string, number>) => {
    await updateMutation.mutateAsync({ id, payload: amounts });
    setMessage({ type: "success", text: "Claim amounts updated." });
  };

  const handleEligibilityVerified = (result: EligibilityResult) => {
    if (result.memberNumber) setMemberNumber(result.memberNumber);
  };

  return (
    <div className="space-y-6 pb-12">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-[2rem] border surface-spotlight shadow-md p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-blue-800/10 via-indigo-700/5 to-transparent" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-blue-400/10 blur-3xl" />

        <div className="relative space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Badge className="rounded-full border-0 bg-primary/10 px-3 py-1 text-xs font-semibold">
                Social Health Authority — Kenya
              </Badge>
              <h1 className="mt-3 text-3xl font-bold tracking-tight">SHA Claims Management</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Generate · Validate · Submit · Track · Reconcile — Full SHA/DHA claim lifecycle
              </p>
            </div>
            <a href="/templates/claim-form-shif.docx" download>
              <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                <Download className="h-4 w-4" /> SHIF Template
              </Button>
            </a>
          </div>

          {/* Workflow pipeline */}
          <WorkflowBanner currentStep="claim" />
        </div>
      </section>

      {/* ── Notification banner ─────────────────────────────────────────────── */}
      {message && (
        <div className={cn(
          "flex items-center justify-between rounded-2xl border px-5 py-4",
          message.type === "success"
            ? "border-emerald-500/25 bg-emerald-500/8 text-emerald-300"
            : "border-red-500/25 bg-red-500/8 text-red-300"
        )}>
          <div className="flex items-center gap-2 text-sm">
            {message.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
            {message.text}
          </div>
          <button type="button" onClick={() => setMessage(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Summary KPIs ─────────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
        {[
          { label: "Total Claims", value: String(summary?.count ?? 0), accent: false },
          { label: "Claimed", value: formatMoney(summary?.claimedAmount), accent: false },
          { label: "Covered", value: formatMoney(summary?.coveredAmount), accent: false },
          { label: "Approved", value: formatMoney(summary?.approvedAmount), accent: true },
          { label: "Paid", value: formatMoney(summary?.paidAmount), accent: true },
          { label: "Rejected", value: formatMoney(summary?.rejectedAmount), accent: false },
          { label: "Outstanding", value: formatMoney(summary?.outstandingAmount), accent: false },
        ].map(({ label, value, accent }) => (
          <div key={label} className={cn(
            "rounded-2xl border p-4",
            accent ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/10 bg-white/[0.03]"
          )}>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className={cn("mt-1.5 text-lg font-bold", accent ? "text-emerald-400" : "text-foreground")}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Main 2-col layout ────────────────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[400px_1fr]">

        {/* Left: Create new claim */}
        <Card className="relative overflow-hidden rounded-[1.8rem] surface-spotlight shadow-md">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-indigo-500" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PlusCircle className="h-5 w-5 text-primary" /> New SHA Claim
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Eligibility check */}
            <InlineEligibilityCheck onVerified={handleEligibilityVerified} />

            {/* Patient search */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Patient *</label>
              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={patientQuery}
                  onChange={(e) => setPatientQuery(e.target.value)}
                  className="h-10 rounded-2xl pl-10 text-sm"
                  placeholder="Search by name or patient number"
                />
              </div>
              <select
                value={selectedPatientId}
                onChange={(e) => { setSelectedPatientId(e.target.value); setSelectedInvoiceId(""); }}
                className="h-10 w-full rounded-2xl border border-input bg-background px-3 text-sm"
              >
                <option value="">— Choose patient —</option>
                {patientMatches.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.patientNumber} / {patientName(p)}
                  </option>
                ))}
              </select>
            </div>

            {/* Invoice */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Linked Invoice</label>
              <select
                value={selectedInvoiceId}
                onChange={(e) => {
                  const inv = invoices.find((i) => String(i.id) === e.target.value);
                  setSelectedInvoiceId(e.target.value);
                  if (inv) setClaimedAmount(String((inv as any).totalAmount || 0));
                }}
                disabled={!selectedPatientId}
                className="h-10 w-full rounded-2xl border border-input bg-background px-3 text-sm disabled:opacity-50"
              >
                <option value="">— Optional —</option>
                {patientInvoices.map((inv) => (
                  <option key={inv.id} value={String(inv.id)}>
                    {(inv as any).invoiceNumber} / {formatMoney((inv as any).totalAmount)}
                  </option>
                ))}
              </select>
            </div>

            {/* Member no + amount */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5 text-primary" /> SHA Member No.
                </label>
                <Input
                  value={memberNumber}
                  onChange={(e) => setMemberNumber(e.target.value)}
                  className="h-10 rounded-2xl font-mono text-sm"
                  placeholder="SHA-XXXXXXXX"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Claimed Amount (KES)</label>
                <Input
                  type="number"
                  value={claimedAmount}
                  onChange={(e) => setClaimedAmount(e.target.value)}
                  className="h-10 rounded-2xl font-mono text-sm"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Diagnosis */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Diagnosis (ICD-11)</label>
              <Input
                value={diagnosisQuery}
                onChange={(e) => setDiagnosisQuery(e.target.value)}
                className="h-10 rounded-2xl text-sm"
                placeholder="Type diagnosis or code…"
              />
              {diagnosisQuery && diagnosisMatches.length > 0 && (
                <div className="mt-1 max-h-44 overflow-y-auto rounded-2xl border border-border bg-background shadow-lg">
                  {diagnosisMatches.map((d) => (
                    <button
                      key={d.code}
                      type="button"
                      className="block w-full px-4 py-2.5 text-left text-sm hover:bg-accent transition-colors"
                      onClick={() => {
                        setDiagnosisCode(d.code);
                        setDiagnosisText(d.label);
                        setDiagnosisQuery(`${d.code} — ${d.label}`);
                      }}
                    >
                      <span className="font-mono font-semibold text-primary">{d.code}</span>
                      <span className="text-muted-foreground ml-2">{d.label}</span>
                    </button>
                  ))}
                </div>
              )}
              {diagnosisCode && (
                <p className="mt-1 text-xs text-muted-foreground font-mono">Selected: {diagnosisCode}</p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Notes / Authorization Ref</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px] rounded-2xl text-sm"
                placeholder="Authorization codes, pre-approval references, remarks…"
              />
            </div>

            {/* Signatures */}
            <div className="grid gap-3 sm:grid-cols-3">
              {([
                ["Patient Signature", patientSignatureUrl, setPatientSignatureUrl],
                ["Facility Signature", facilitySignatureUrl, setFacilitySignatureUrl],
                ["Rubber Stamp", rubberStampUrl, setRubberStampUrl],
              ] as [string, string, React.Dispatch<React.SetStateAction<string>>][]).map(([label, value, setter]) => (
                <label key={label} className="space-y-1 text-xs">
                  <span className="font-medium text-muted-foreground">{label}</span>
                  <Input
                    type="file"
                    accept="image/*"
                    className="h-9 rounded-xl text-xs"
                    onChange={async (e) => {
                      const url = await readImageAsDataUrl(e.target.files?.[0]);
                      setter(url);
                    }}
                  />
                  {value && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={value} alt="" className="h-12 w-full rounded-xl border border-border object-contain" />
                  )}
                </label>
              ))}
            </div>

            <Button
              type="button"
              className="h-12 w-full rounded-2xl gap-2"
              onClick={handleCreateClaim}
              disabled={createMutation.isPending || !selectedPatientId}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileCheck2 className="h-4 w-4" />
              )}
              Generate SHA Claim
            </Button>
          </CardContent>
        </Card>

        {/* Right: Claims tracker */}
        <Card className="relative overflow-hidden rounded-[1.8rem] surface-spotlight shadow-md">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5 text-amber-400" /> Claim Tracker
                <span className="text-xs font-normal text-muted-foreground">({filteredClaims.length} claims)</span>
              </CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchClaims}
                    onChange={(e) => setSearchClaims(e.target.value)}
                    placeholder="Search claims…"
                    className="h-9 w-44 rounded-xl pl-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Status filter tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 mt-2">
              {[
                { id: "ALL", label: `All (${claims.length})` },
                ...Object.keys(STATUS_CONFIG)
                  .filter((s) => (statusCounts[s] ?? 0) > 0)
                  .map((s) => ({ id: s, label: `${STATUS_CONFIG[s].label} (${statusCounts[s]})` })),
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={cn(
                    "shrink-0 rounded-xl px-3 py-1.5 text-[11px] font-medium transition-all",
                    statusFilter === tab.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-white/[0.03] text-muted-foreground border border-white/10 hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent>
            {filteredClaims.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10">
                  <FileCheck2 className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">No claims found</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {searchClaims || statusFilter !== "ALL"
                      ? "Try adjusting your filters."
                      : "Create your first SHA claim using the form on the left."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
                {filteredClaims.map((claim) => {
                  const cfg = STATUS_CONFIG[claim.statusCode] ?? STATUS_CONFIG["DRAFT"];
                  return (
                    <div
                      key={claim.id}
                      className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-background/40 px-4 py-3 transition-all hover:border-primary/30 hover:bg-background/60"
                    >
                      {/* Status dot */}
                      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", cfg.dot)} />

                      {/* Core info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-semibold">{claim.claimNumber}</span>
                          <ClaimStatusBadge status={claim.statusCode} />
                          {claim.fidCode && (
                            <span className="text-[10px] text-muted-foreground font-mono border border-border/40 rounded px-1.5 py-0.5 bg-background/60">
                              FID: {claim.fidCode}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span>{patientName(claim.patient)}</span>
                          {claim.diagnosisCode && (
                            <span className="font-mono">{claim.diagnosisCode}</span>
                          )}
                          <span>{relativeTime(claim.createdAt)}</span>
                        </div>
                      </div>

                      {/* Amounts */}
                      <div className="hidden md:flex flex-col items-end gap-0.5 shrink-0 min-w-[100px]">
                        <span className="text-sm font-semibold">{formatMoney(claim.claimedAmount)}</span>
                        {claim.paidAmount > 0 && (
                          <span className="text-xs text-emerald-400">{formatMoney(claim.paidAmount)} paid</span>
                        )}
                        {claim.rejectedAmount > 0 && (
                          <span className="text-xs text-red-400">{formatMoney(claim.rejectedAmount)} rejected</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {claim.statusCode === "DRAFT" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-xl gap-1.5 text-xs"
                            onClick={() => handleStatusChange(claim.id, "SUBMITTED")}
                            disabled={updateMutation.isPending}
                          >
                            <Send className="h-3 w-3" /> Submit
                          </Button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDetailClaim(claim)}
                          className="rounded-xl border border-border/50 p-2 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                          title="View details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadShaClaimPdf(claim.id, claim.claimNumber)}
                          className="rounded-xl border border-border/50 p-2 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                          title="Download PDF"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Detail drawer ──────────────────────────────────────────────────── */}
      {detailClaim && (
        <ClaimDetailDrawer
          claim={detailClaim}
          onClose={() => setDetailClaim(null)}
          onStatusChange={handleStatusChange}
          onAmountSave={handleAmountSave}
          isUpdating={updateMutation.isPending}
        />
      )}
    </div>
  );
}
