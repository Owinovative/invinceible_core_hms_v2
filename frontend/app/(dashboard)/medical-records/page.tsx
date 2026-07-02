"use client";

import * as React from "react";
import {
  Bot,
  FileSignature,
  Loader2,
  Printer,
  Sparkles,
} from "lucide-react";
import { useCreateClinicalAiDraft } from "@/hooks/use-ai-assistant";
import { useFacilities } from "@/hooks/use-facilities";
import { usePatients } from "@/hooks/use-patients";
import { useScope } from "@/providers/scope-provider";
import { useAuth } from "@/providers/auth-provider";
import { QrCodeImage } from "@/components/shared/qr-code-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function displayDate(value: string) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toLocaleDateString();
  return date.toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function MedicalRecordsPage() {
  const { user } = useAuth();
  const { facilityId, facilityName, selectedBranchName } = useScope();
  const { data: facilitiesData = [] } = useFacilities();
  const { data: patientsData = [] } = usePatients();
  const aiMutation = useCreateClinicalAiDraft();

  const facility = Array.isArray(facilitiesData)
    ? facilitiesData.find((item) => item.id === facilityId)
    : undefined;

  const [reportTitle, setReportTitle] = React.useState("Medical Report");
  const [documentType, setDocumentType] = React.useState<
    "medical" | "discharge"
  >("medical");
  const [patientSearch, setPatientSearch] = React.useState("");
  const [selectedPatientId, setSelectedPatientId] = React.useState("");
  const [patientName, setPatientName] = React.useState("");
  const [patientNumber, setPatientNumber] = React.useState("");
  const [reportDate, setReportDate] = React.useState(todayDate());
  const [clinicalNotes, setClinicalNotes] = React.useState("");
  const [impression, setImpression] = React.useState("");
  const [recommendation, setRecommendation] = React.useState("");
  const [aiInstruction, setAiInstruction] = React.useState(
    "Format these notes into a clear hospital medical report without adding undocumented facts.",
  );
  const [signatureName, setSignatureName] = React.useState(
    user?.fullName || user?.username || "",
  );
  const [designation, setDesignation] = React.useState("");
  const [signatureDataUrl, setSignatureDataUrl] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);
  const patients = Array.isArray(patientsData) ? patientsData : [];
  const filteredPatients = React.useMemo(() => {
    const query = patientSearch.trim().toLowerCase();
    if (!query) return patients.slice(0, 80);

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
      .slice(0, 80);
  }, [patientSearch, patients]);

  React.useEffect(() => {
    const patient = patients.find((item) => String(item.id) === selectedPatientId);
    if (!patient) return;

    setPatientName(
      [patient.firstName, patient.middleName, patient.lastName]
        .filter(Boolean)
        .join(" "),
    );
    setPatientNumber(patient.patientNumber || "");
  }, [patients, selectedPatientId]);

  const qrPayload = JSON.stringify({
    type: documentType === "discharge" ? "discharge-summary" : "medical-report",
    title: reportTitle,
    facility: facility?.name || facilityName,
    patient: { name: patientName, number: patientNumber },
    date: reportDate,
    clinicalNotes,
    impression,
    recommendation,
    signedBy: signatureName,
  });

  const handleSignatureUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setSignatureDataUrl(String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    setMessage(null);
    const result = await aiMutation.mutateAsync({
      task: "GENERAL_DRAFT",
      audience: "doctor preparing a formal medical report",
      prompt: aiInstruction,
      context: {
        patientName,
        patientNumber,
        reportTitle,
        clinicalNotes,
        impression,
        recommendation,
        facility: facility?.name || facilityName,
      },
    });

    setClinicalNotes(result.output);
    setMessage("AI draft placed into the report notes.");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <section className="border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <Badge className="rounded-md border-0 bg-accent text-module">
              Letterhead report builder
            </Badge>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-5xl">
              Medical Reports
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
              Write patient notes, format them with AI, add signer details, and
              preview a draft letterhead report. Official PDFs are generated
              from saved clinical records.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              className="rounded-md bg-primary text-white hover:bg-brand-strong"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4" />
              Preview print
            </Button>
          </div>
        </div>
      </section>

      {message ? (
        <div className="border border-success/25 bg-success-soft px-4 py-3 text-sm text-success">
          {message}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-5 border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-module" />
            <h2 className="text-xl font-bold">Report fields</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Document type
              </label>
              <select
                value={documentType}
                onChange={(event) => {
                  const value = event.target.value as "medical" | "discharge";
                  setDocumentType(value);
                  setReportTitle(
                    value === "discharge"
                      ? "Discharge Summary"
                      : "Medical Report",
                  );
                }}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="medical">Medical Report</option>
                <option value="discharge">Discharge Summary</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Report title
              </label>
              <Input
                value={reportTitle}
                onChange={(event) => setReportTitle(event.target.value)}
                className="h-11 rounded-md"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Report date
              </label>
              <Input
                type="date"
                value={reportDate}
                onChange={(event) => setReportDate(event.target.value)}
                className="h-11 rounded-md"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Search patient
              </label>
              <Input
                value={patientSearch}
                onChange={(event) => setPatientSearch(event.target.value)}
                className="h-11 rounded-md"
                placeholder="Search name, patient number, or phone"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Select patient
              </label>
              <select
                value={selectedPatientId}
                onChange={(event) => setSelectedPatientId(event.target.value)}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Choose patient</option>
                {filteredPatients.map((patient) => (
                  <option key={patient.id} value={String(patient.id)}>
                    {patient.patientNumber} /{" "}
                    {[patient.firstName, patient.middleName, patient.lastName]
                      .filter(Boolean)
                      .join(" ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Patient name
              </label>
              <Input
                value={patientName}
                onChange={(event) => setPatientName(event.target.value)}
                className="h-11 rounded-md"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Patient number
              </label>
              <Input
                value={patientNumber}
                onChange={(event) => setPatientNumber(event.target.value)}
                className="h-11 rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Medical notes
            </label>
            <Textarea
              value={clinicalNotes}
              onChange={(event) => setClinicalNotes(event.target.value)}
              className="min-h-44 rounded-md"
              placeholder="Enter clinical notes, history, findings, and relevant care details."
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Impression / diagnosis
            </label>
            <Textarea
              value={impression}
              onChange={(event) => setImpression(event.target.value)}
              className="min-h-28 rounded-md"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Recommendation / plan
            </label>
            <Textarea
              value={recommendation}
              onChange={(event) => setRecommendation(event.target.value)}
              className="min-h-28 rounded-md"
            />
          </div>

          <div className="border border-border bg-surface-2 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Bot className="h-5 w-5 text-module" />
              <p className="font-semibold">AI formatting</p>
            </div>
            <Textarea
              value={aiInstruction}
              onChange={(event) => setAiInstruction(event.target.value)}
              className="min-h-24 rounded-md bg-card"
            />
            <Button
              type="button"
              className="mt-3 rounded-md bg-primary text-white hover:bg-brand-strong"
              onClick={handleGenerate}
              disabled={aiMutation.isPending}
            >
              {aiMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Format with AI
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Signatory name
              </label>
              <Input
                value={signatureName}
                onChange={(event) => setSignatureName(event.target.value)}
                className="h-11 rounded-md"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Designation
              </label>
              <Input
                value={designation}
                onChange={(event) => setDesignation(event.target.value)}
                className="h-11 rounded-md"
                placeholder="Medical Officer, Consultant, Nurse..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold">
                Signature image
              </label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleSignatureUpload}
                className="h-11 rounded-md"
              />
            </div>
          </div>
        </div>

        <div id="medical-report-print-area">
          <article className="medical-report-paper">
            <header className="medical-report-letterhead">
              {facility?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={facility.logoUrl} alt="" />
              ) : (
                <div className="medical-report-logo">+</div>
              )}
              <div>
                <h2>{facility?.name || facilityName || "Hospital Facility"}</h2>
                <p>
                  {[facility?.address, facility?.town, facility?.county]
                    .filter(Boolean)
                    .join(", ") || selectedBranchName || "Official facility"}
                </p>
                <p>
                  {[facility?.phone, facility?.email].filter(Boolean).join(" / ")}
                </p>
              </div>
            </header>

            <section className="medical-report-title">
              <div>
                <h3>{reportTitle || "Medical Report"}</h3>
                <p>{displayDate(reportDate)}</p>
              </div>
              <QrCodeImage value={qrPayload} className="medical-report-qr" />
            </section>

            <section className="medical-report-patient">
              <div>
                <span>Patient</span>
                <b>{patientName || "Patient name"}</b>
              </div>
              <div>
                <span>Patient No.</span>
                <b>{patientNumber || "-"}</b>
              </div>
            </section>

            <section className="medical-report-body">
              <h4>Clinical Notes</h4>
              <p>{clinicalNotes || "Clinical notes will appear here."}</p>

              <h4>Impression</h4>
              <p>{impression || "Impression or diagnosis will appear here."}</p>

              <h4>Recommendation</h4>
              <p>{recommendation || "Recommendation or plan will appear here."}</p>
            </section>

            <footer className="medical-report-signature">
              <div>
                {signatureDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={signatureDataUrl} alt="" />
                ) : (
                  <span />
                )}
                <b>{signatureName || "Name of signer"}</b>
                <p>{designation || "Designation"}</p>
              </div>
              <small>
                This report is generated from Invinceible Core HMS and must be
                reviewed and signed by the responsible clinician.
              </small>
            </footer>
          </article>
        </div>
      </section>
    </div>
  );
}
