"use client";

import * as React from "react";
import { Ambulance, FileUp, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePatients } from "@/hooks/use-patients";
import {
  addDhaAttachment,
  createDhaEmergency,
  createDhaPreauthorization,
  type DhaPreauthorizationInput,
} from "@/services/dha-eclaims-service";

type Result = { type: "success" | "error"; message: string } | null;

function PatientSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { data = [] } = usePatients();
  const patients = Array.isArray(data) ? data : [];
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
      required
    >
      <option value="">Select a DHA-verified patient</option>
      {patients.map((patient) => (
        <option key={patient.id} value={patient.id}>
          {patient.patientNumber} — {patient.firstName} {patient.lastName}
        </option>
      ))}
    </select>
  );
}

function Feedback({ result }: { result: Result }) {
  if (!result) return null;
  return (
    <p
      role="status"
      className={
        result.type === "success"
          ? "text-sm text-emerald-500"
          : "text-sm text-red-500"
      }
    >
      {result.message}
    </p>
  );
}

export default function DhaEclaimsPage() {
  const [patientId, setPatientId] = React.useState("");
  const [consentId, setConsentId] = React.useState("");
  const [intervention, setIntervention] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<Result>(null);

  const [preauthType, setPreauthType] =
    React.useState<DhaPreauthorizationInput["preauthType"]>("NORMAL");
  const [startDate, setStartDate] = React.useState("");
  const [complaint, setComplaint] = React.useState("");
  const [indications, setIndications] = React.useState("");
  const [diagnosis, setDiagnosis] = React.useState("");
  const [itemCode, setItemCode] = React.useState("");
  const [unitPrice, setUnitPrice] = React.useState("");
  const [quantity, setQuantity] = React.useState("1");
  const [doctorNumber, setDoctorNumber] = React.useState("");

  const [arrival, setArrival] = React.useState<
    "AMBULANCE" | "WALK-IN" | "OTHER"
  >("AMBULANCE");
  const [broughtBy, setBroughtBy] = React.useState<
    "RELATIVE" | "UNKNOWN" | "SAMARITAN" | "PARAMEDICS"
  >("PARAMEDICS");
  const [reference, setReference] = React.useState("");
  const [emergencyOtp, setEmergencyOtp] = React.useState("");
  const [attachmentType, setAttachmentType] = React.useState("");
  const [attachment, setAttachment] = React.useState<File | null>(null);

  const run = async (
    key: string,
    action: () => Promise<unknown>,
    success: string,
  ) => {
    setBusy(key);
    setResult(null);
    try {
      await action();
      setResult({ type: "success", message: success });
    } catch (error) {
      setResult({
        type: "error",
        message: error instanceof Error ? error.message : "DHA request failed.",
      });
    } finally {
      setBusy(null);
    }
  };

  const commonReady =
    Number(patientId) > 0 &&
    Number(consentId) > 0 &&
    Boolean(intervention.trim());

  return (
    <div className="space-y-6 pb-12">
      <section className="rounded-[2rem] border surface-spotlight p-6 shadow-md">
        <h1 className="text-3xl font-bold tracking-tight">
          DHA eClaims workbench
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Submit preauthorizations, emergency cases, and supporting documents
          through the current typed DHA contracts. Patient, consent, facility,
          and permission scope are validated by the backend.
        </p>
      </section>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">
            Active beneficiary and visit
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <PatientSelect value={patientId} onChange={setPatientId} />
          <Input
            type="number"
            min="1"
            value={consentId}
            onChange={(event) => setConsentId(event.target.value)}
            placeholder="Consent authorization ID"
          />
          <Input
            value={intervention}
            onChange={(event) => setIntervention(event.target.value)}
            placeholder="DHA intervention code"
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-5 w-5 text-primary" /> Preauthorization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={preauthType}
                onChange={(event) =>
                  setPreauthType(
                    event.target
                      .value as DhaPreauthorizationInput["preauthType"],
                  )
                }
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
              >
                {[
                  "NORMAL",
                  "SURGICAL",
                  "ONCOLOGY",
                  "RENAL",
                  "OPTICAL",
                  "IMAGING",
                  "DENTAL",
                ].map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
              {preauthType !== "NORMAL" && (
                <Input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              )}
              <Input
                value={diagnosis}
                onChange={(event) => setDiagnosis(event.target.value)}
                placeholder="ICD diagnosis code"
              />
              <Input
                value={itemCode}
                onChange={(event) => setItemCode(event.target.value)}
                placeholder="Benefit item code"
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={unitPrice}
                onChange={(event) => setUnitPrice(event.target.value)}
                placeholder="Unit price"
              />
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                placeholder="Quantity"
              />
              <Input
                value={doctorNumber}
                onChange={(event) => setDoctorNumber(event.target.value)}
                placeholder="KMPDC registration number"
              />
            </div>
            <Input
              value={complaint}
              onChange={(event) => setComplaint(event.target.value)}
              placeholder="Chief complaint"
            />
            <Textarea
              value={indications}
              onChange={(event) => setIndications(event.target.value)}
              placeholder="Clinical indications"
            />
            <Button
              className="w-full rounded-xl"
              disabled={
                busy !== null ||
                !commonReady ||
                !diagnosis ||
                !itemCode ||
                !unitPrice ||
                !doctorNumber ||
                (preauthType !== "NORMAL" && !startDate)
              }
              onClick={() =>
                run(
                  "preauth",
                  () =>
                    createDhaPreauthorization({
                      patientId: Number(patientId),
                      consentAuthorizationId: Number(consentId),
                      interventionCode: intervention.trim(),
                      preauthType,
                      expectedServiceStartDate: startDate || undefined,
                      chiefComplaint: complaint || undefined,
                      clinicalIndications: indications || undefined,
                      diagnoses: [{ icdCode: diagnosis.trim() }],
                      items: [
                        { itemCode: itemCode.trim(), unitPrice, quantity },
                      ],
                      doctors: [
                        {
                          identificationNumber: doctorNumber.trim(),
                          identificationType: "registration_number",
                          regulationBody: "KMPDC",
                        },
                      ],
                    }),
                  "Preauthorization sent to DHA.",
                )
              }
            >
              {busy === "preauth" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}{" "}
              Submit preauthorization
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Ambulance className="h-5 w-5 text-red-500" /> Emergency claim
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={arrival}
                onChange={(event) =>
                  setArrival(event.target.value as typeof arrival)
                }
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="AMBULANCE">Ambulance</option>
                <option value="WALK-IN">Walk-in</option>
                <option value="OTHER">Other</option>
              </select>
              <select
                value={broughtBy}
                onChange={(event) =>
                  setBroughtBy(event.target.value as typeof broughtBy)
                }
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="PARAMEDICS">Paramedics</option>
                <option value="RELATIVE">Relative</option>
                <option value="SAMARITAN">Samaritan</option>
                <option value="UNKNOWN">Unknown</option>
              </select>
              <Input
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Emergency reference number"
              />
              <Input
                value={doctorNumber}
                onChange={(event) => setDoctorNumber(event.target.value)}
                placeholder="KMPDC registration number"
              />
              <Input
                value={emergencyOtp}
                onChange={(event) => setEmergencyOtp(event.target.value)}
                placeholder="Beneficiary OTP (optional)"
                autoComplete="one-time-code"
              />
            </div>
            <Button
              className="w-full rounded-xl"
              disabled={
                busy !== null ||
                !patientId ||
                !intervention ||
                !reference ||
                !doctorNumber
              }
              onClick={() =>
                run(
                  "emergency",
                  () =>
                    createDhaEmergency({
                      patientId: Number(patientId),
                      interventions: [intervention.trim()],
                      modeOfArrival: arrival,
                      broughtBy,
                      referenceNumber: reference.trim(),
                      practitionerIdentificationNumber: doctorNumber.trim(),
                      practitionerIdentificationType: "registration_number",
                      practitionerRegulationBody: "KMPDC",
                      otp: emergencyOtp.trim() || undefined,
                    }),
                  "Emergency claim created at DHA.",
                )
              }
            >
              {busy === "emergency" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}{" "}
              Create emergency claim
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileUp className="h-5 w-5 text-primary" /> Claim attachment
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Input
            value={attachmentType}
            onChange={(event) => setAttachmentType(event.target.value)}
            placeholder="DHA document type"
          />
          <Input
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={(event) => setAttachment(event.target.files?.[0] ?? null)}
          />
          <Button
            disabled={
              busy !== null || !commonReady || !attachmentType || !attachment
            }
            onClick={() =>
              attachment &&
              run(
                "attachment",
                () =>
                  addDhaAttachment({
                    patientId: Number(patientId),
                    consentAuthorizationId: Number(consentId),
                    interventionCode: intervention.trim(),
                    documentType: attachmentType.trim(),
                    file: attachment,
                  }),
                "Attachment uploaded to DHA.",
              )
            }
          >
            {busy === "attachment" && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}{" "}
            Upload
          </Button>
        </CardContent>
      </Card>
      <Feedback result={result} />
    </div>
  );
}
