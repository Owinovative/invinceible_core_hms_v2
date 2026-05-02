"use client";

import * as React from "react";
import { Download, FileCheck2, Loader2, Search } from "lucide-react";
import { useCreateShaClaim } from "@/hooks/use-create-sha-claim";
import { useInvoices } from "@/hooks/use-invoices";
import { usePatients } from "@/hooks/use-patients";
import { useShaClaimSummary } from "@/hooks/use-sha-claim-summary";
import { useShaClaims } from "@/hooks/use-sha-claims";
import { useUpdateShaClaim } from "@/hooks/use-update-sha-claim";
import { searchDiagnoses } from "@/lib/diagnosis-catalog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { appSelectClass } from "@/lib/select-class";

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function patientName(patient?: {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
} | null) {
  return [patient?.firstName, patient?.middleName, patient?.lastName]
    .filter(Boolean)
    .join(" ");
}

export default function ShaClaimsPage() {
  const { data: claimsData = [] } = useShaClaims();
  const { data: summary } = useShaClaimSummary();
  const { data: patientsData = [] } = usePatients();
  const { data: invoicesData = [] } = useInvoices();
  const createMutation = useCreateShaClaim();
  const updateMutation = useUpdateShaClaim();

  const patients = Array.isArray(patientsData) ? patientsData : [];
  const invoices = Array.isArray(invoicesData) ? invoicesData : [];
  const claims = Array.isArray(claimsData) ? claimsData : [];

  const [patientQuery, setPatientQuery] = React.useState("");
  const [selectedPatientId, setSelectedPatientId] = React.useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState("");
  const [memberNumber, setMemberNumber] = React.useState("");
  const [diagnosisQuery, setDiagnosisQuery] = React.useState("");
  const [diagnosisCode, setDiagnosisCode] = React.useState("");
  const [diagnosisText, setDiagnosisText] = React.useState("");
  const [claimedAmount, setClaimedAmount] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);

  const patientMatches = React.useMemo(() => {
    const query = patientQuery.trim().toLowerCase();
    if (!query) return patients.slice(0, 12);
    return patients
      .filter((patient) =>
        [
          patient.patientNumber,
          patient.firstName,
          patient.middleName,
          patient.lastName,
          patient.phonePrimary,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 12);
  }, [patientQuery, patients]);

  const selectedPatient = patients.find(
    (patient) => String(patient.id) === selectedPatientId,
  );
  const patientInvoices = invoices.filter(
    (invoice) => String(invoice.patientId) === selectedPatientId,
  );
  const selectedInvoice = invoices.find(
    (invoice) => String(invoice.id) === selectedInvoiceId,
  );
  const diagnosisMatches = searchDiagnoses(diagnosisQuery);

  const handleCreateClaim = async () => {
    const patient = selectedPatient;
    if (!patient?.facilityId) {
      setMessage("Choose a patient with a facility before creating a SHA claim.");
      return;
    }

    const created = await createMutation.mutateAsync({
      facilityId: selectedInvoice?.facilityId ?? patient.facilityId,
      branchId: selectedInvoice?.branchId ?? patient.branchId ?? undefined,
      patientId: patient.id,
      invoiceId: selectedInvoice?.id,
      memberNumber: memberNumber.trim() || undefined,
      diagnosisCode: diagnosisCode || undefined,
      diagnosisText: diagnosisText || undefined,
      claimedAmount: claimedAmount
        ? Number(claimedAmount)
        : selectedInvoice?.totalAmount,
      notes: notes.trim() || undefined,
    });

    setMessage(`SHA claim ${created.claimNumber} created.`);
    setSelectedInvoiceId("");
    setClaimedAmount("");
    setNotes("");
  };

  const updateClaimStatus = async (id: number, statusCode: string) => {
    await updateMutation.mutateAsync({ id, payload: { statusCode } });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Badge className="rounded-md bg-sky-100 text-sky-800">
            Social Health Authority
          </Badge>
          <h1 className="mt-3 text-3xl font-bold text-[#07345f]">
            SHA claims
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Create claims from patient invoices, track paid and rejected
            amounts, and keep the official SHIF claim template available for
            download.
          </p>
        </div>
        <Button asChild className="rounded-md bg-[#075a9b] text-white">
          <a href="/templates/claim-form-shif.docx" download>
            <Download className="mr-2 h-4 w-4" />
            Download SHIF template
          </a>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        {[
          ["Claims", summary?.count ?? 0],
          ["Claimed", formatMoney(summary?.claimedAmount)],
          ["Approved", formatMoney(summary?.approvedAmount)],
          ["Paid", formatMoney(summary?.paidAmount)],
          ["Rejected", formatMoney(summary?.rejectedAmount)],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-md border bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {label}
            </p>
            <p className="mt-2 text-xl font-bold text-[#07345f]">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-md border-sky-100 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#07345f]">
              <FileCheck2 className="h-5 w-5" />
              New SHA Claim
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Search patient
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  value={patientQuery}
                  onChange={(event) => setPatientQuery(event.target.value)}
                  className="h-11 rounded-md pl-9"
                  placeholder="Name, patient number, or phone"
                />
              </div>
              <select
                value={selectedPatientId}
                onChange={(event) => {
                  setSelectedPatientId(event.target.value);
                  setSelectedInvoiceId("");
                }}
                className={appSelectClass}
              >
                <option value="">Choose patient</option>
                {patientMatches.map((patient) => (
                  <option key={patient.id} value={String(patient.id)}>
                    {patient.patientNumber} / {patientName(patient)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Linked invoice
              </label>
              <select
                value={selectedInvoiceId}
                onChange={(event) => {
                  const invoice = invoices.find(
                    (item) => String(item.id) === event.target.value,
                  );
                  setSelectedInvoiceId(event.target.value);
                  setClaimedAmount(
                    invoice ? String(invoice.totalAmount || 0) : "",
                  );
                }}
                className={appSelectClass}
                disabled={!selectedPatientId}
              >
                <option value="">Optional invoice</option>
                {patientInvoices.map((invoice) => (
                  <option key={invoice.id} value={String(invoice.id)}>
                    {invoice.invoiceNumber} / {formatMoney(invoice.totalAmount)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  SHA member number
                </label>
                <Input
                  value={memberNumber}
                  onChange={(event) => setMemberNumber(event.target.value)}
                  className="h-11 rounded-md"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Claimed amount
                </label>
                <Input
                  type="number"
                  value={claimedAmount}
                  onChange={(event) => setClaimedAmount(event.target.value)}
                  className="h-11 rounded-md"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Diagnosis search
              </label>
              <Input
                value={diagnosisQuery}
                onChange={(event) => setDiagnosisQuery(event.target.value)}
                className="h-11 rounded-md"
                placeholder="Type one letter or code"
              />
              {diagnosisQuery ? (
                <div className="mt-2 max-h-52 overflow-y-auto rounded-md border bg-white">
                  {diagnosisMatches.map((diagnosis) => (
                    <button
                      key={diagnosis.code}
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-sky-50"
                      onClick={() => {
                        setDiagnosisCode(diagnosis.code);
                        setDiagnosisText(diagnosis.label);
                        setDiagnosisQuery(
                          `${diagnosis.code} - ${diagnosis.label}`,
                        );
                      }}
                    >
                      <b>{diagnosis.code}</b> {diagnosis.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-[92px] rounded-md"
              placeholder="Claim notes, authorization references, or rejection follow-up"
            />

            {message ? (
              <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
                {message}
              </p>
            ) : null}

            <Button
              className="h-11 rounded-md bg-[#075a9b] text-white"
              onClick={handleCreateClaim}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Create claim
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-md border-sky-100 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#07345f]">Claim tracker</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[620px] overflow-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead className="sticky top-0 bg-[#eef7ff] text-left">
                  <tr>
                    <th className="px-3 py-3">Claim</th>
                    <th className="px-3 py-3">Patient</th>
                    <th className="px-3 py-3">Diagnosis</th>
                    <th className="px-3 py-3 text-right">Claimed</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map((claim) => (
                    <tr key={claim.id} className="border-t">
                      <td className="px-3 py-3 font-semibold">
                        {claim.claimNumber}
                        <p className="text-xs font-normal text-slate-500">
                          FID {claim.fidCode || claim.facility?.shaFidCode || "-"}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        {patientName(claim.patient)}
                        <p className="text-xs text-slate-500">
                          {claim.patient?.patientNumber}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        {claim.diagnosisCode || "-"}
                        <p className="text-xs text-slate-500">
                          {claim.diagnosisText || ""}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold">
                        {formatMoney(claim.claimedAmount)}
                      </td>
                      <td className="px-3 py-3">
                        <Badge className="rounded-md bg-sky-100 text-sky-800">
                          {claim.statusCode}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        <select
                          value={claim.statusCode}
                          onChange={(event) =>
                            void updateClaimStatus(claim.id, event.target.value)
                          }
                          className="h-9 rounded-md border px-2"
                        >
                          {[
                            "DRAFT",
                            "SUBMITTED",
                            "APPROVED",
                            "PAID",
                            "REJECTED",
                            "CANCELLED",
                          ].map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
