"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, FileUp, Loader2, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  createDhaWorkflow,
  recoverDhaWorkflow,
  submitDhaWorkflowAction,
  uploadDhaWorkflowAttachment,
  type DhaWorkflow,
  type DhaWorkflowAction,
} from "@/services/dha-workflow-service";

const actions: Array<{ value: DhaWorkflowAction; label: string; hint: string }> = [
  { value: "authorize", label: "Authorization", hint: "OTP or biometrics authorization" },
  { value: "visit", label: "Visit", hint: "Create the DHA virtual visit" },
  { value: "interventions", label: "Intervention", hint: "Add an approved intervention" },
  { value: "diagnoses", label: "Diagnosis", hint: "Add ICD diagnosis" },
  { value: "items", label: "Billable item", hint: "Add a line item" },
  { value: "preview", label: "Preview", hint: "Validate the provider claim" },
  { value: "submit", label: "Submit", hint: "Submit the provider claim" },
  { value: "discharge", label: "Discharge", hint: "Discharge an inpatient claim" },
  { value: "close", label: "Close", hint: "Close a virtual claim" },
  { value: "emergency", label: "Emergency", hint: "Create emergency claim" },
  { value: "preauthorizations", label: "Preauthorization", hint: "Submit scanned preauth evidence" },
  { value: "emt", label: "EMT", hint: "Submit emergency medical transport claim" },
  { value: "otp-whitelist", label: "OTP whitelist", hint: "Submit biometric exception request" },
];

function makeKey(action: string) {
  return `${action}-${crypto.randomUUID()}`;
}

export default function DhaWorkflowsPage() {
  const [workflow, setWorkflow] = React.useState<DhaWorkflow | null>(null);
  const [patientId, setPatientId] = React.useState("");
  const [serviceType, setServiceType] = React.useState<"INPATIENT" | "OUTPATIENT">("OUTPATIENT");
  const [codes, setCodes] = React.useState("");
  const [action, setAction] = React.useState<DhaWorkflowAction>("authorize");
  const [payloadText, setPayloadText] = React.useState('{\n  \n}');
  const [documentType, setDocumentType] = React.useState("CLINICAL_DOCUMENTATION");
  const [attachmentCode, setAttachmentCode] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const run = async (work: () => Promise<void>) => {
    setBusy(true); setError(null); setNotice(null);
    try { await work(); } catch (err) { setError(err instanceof Error ? err.message : "Request failed"); } finally { setBusy(false); }
  };

  const create = () => run(async () => {
    const result = await createDhaWorkflow({
      patientId: Number(patientId),
      serviceType,
      interventionCodes: codes.split(",").map((code) => code.trim()).filter(Boolean),
    });
    setWorkflow(result); setNotice(`Workflow ${result.id} created. Start authorization or emergency flow.`);
  });

  const submitAction = () => run(async () => {
    if (!workflow) throw new Error("Create a DHA workflow first");
    const payload = JSON.parse(payloadText) as Record<string, unknown>;
    const result = await submitDhaWorkflowAction(workflow.id, action, { payload, idempotencyKey: makeKey(action) });
    setWorkflow((current) => current ? { ...current, status: "IN_PROGRESS", steps: [...(current.steps ?? []), { id: result.stepId, action: action.toUpperCase(), status: "QUEUED" }] } : current);
    setNotice(result.idempotent ? "Existing action returned safely." : `${actions.find((item) => item.value === action)?.label} queued.`);
  });

  const upload = () => run(async () => {
    if (!workflow || !file) throw new Error("Choose a workflow and attachment file");
    await uploadDhaWorkflowAttachment(workflow.id, { documentType, interventionCode: attachmentCode, file });
    setFile(null); setNotice("Attachment encrypted and queued for malware scanning.");
  });

  const recover = () => run(async () => {
    if (!workflow) throw new Error("Create a DHA workflow first");
    const result = await recoverDhaWorkflow(workflow.id);
    setNotice(result.recovered ? `${result.recovered} workflow action(s) requeued.` : "No recoverable actions were found.");
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-10">
      <section className="flex flex-col gap-2 border-b pb-5 md:flex-row md:items-end md:justify-between">
        <div><p className="text-sm text-muted-foreground">DHA / SHA Operations</p><h1 className="text-2xl font-semibold">Claim workflow workspace</h1></div>
        {workflow && <Badge variant="outline">Workflow #{workflow.id}: {workflow.status}</Badge>}
      </section>
      {(notice || error) && <div className={`flex items-center gap-2 rounded-md border p-3 text-sm ${error ? "border-destructive/40 text-destructive" : "border-emerald-500/40 text-emerald-700"}`}><AlertCircle className="h-4 w-4" />{error ?? notice}</div>}
      <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4 border p-4">
          <h2 className="font-medium">1. Create workflow</h2>
          <Input value={patientId} onChange={(event) => setPatientId(event.target.value)} inputMode="numeric" placeholder="Local patient ID" />
          <select className="h-9 w-full border bg-background px-2 text-sm" value={serviceType} onChange={(event) => setServiceType(event.target.value as "INPATIENT" | "OUTPATIENT")}><option value="OUTPATIENT">Outpatient</option><option value="INPATIENT">Inpatient</option></select>
          <Input value={codes} onChange={(event) => setCodes(event.target.value)} placeholder="Intervention codes, comma separated" />
          <Button className="w-full" onClick={create} disabled={busy || !patientId || !codes}><CheckCircle2 className="mr-2 h-4 w-4" />Create</Button>
          <div className="border-t pt-4"><h2 className="mb-3 font-medium">2. Supporting attachment</h2><Input value={documentType} onChange={(event) => setDocumentType(event.target.value)} placeholder="DHA document type" /><Input className="mt-2" value={attachmentCode} onChange={(event) => setAttachmentCode(event.target.value)} placeholder="Intervention code" /><Input className="mt-2" type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><Button className="mt-2 w-full" variant="outline" onClick={upload} disabled={busy || !workflow || !file || !attachmentCode}><FileUp className="mr-2 h-4 w-4" />Encrypt and scan</Button></div>
        </div>
        <div className="space-y-4 border p-4">
          <div className="flex items-center justify-between"><h2 className="font-medium">3. Queue DHA action</h2><Button variant="outline" size="sm" onClick={recover} disabled={busy || !workflow}><RefreshCw className="mr-2 h-4 w-4" />Recover</Button></div>
          <select className="h-9 w-full border bg-background px-2 text-sm" value={action} onChange={(event) => setAction(event.target.value as DhaWorkflowAction)}>{actions.map((item) => <option key={item.value} value={item.value}>{item.label} - {item.hint}</option>)}</select>
          <Textarea value={payloadText} onChange={(event) => setPayloadText(event.target.value)} className="min-h-72 font-mono text-xs" aria-label="DHA action JSON payload" />
          <Button onClick={submitAction} disabled={busy || !workflow} className="w-full">{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Queue action</Button>
          <div className="border-t pt-4"><h2 className="mb-2 font-medium">Workflow activity</h2>{workflow?.lastError && <p className="mb-2 text-sm text-destructive">{workflow.lastError}</p>}<div className="space-y-2">{workflow?.steps?.length ? workflow.steps.map((step) => <div key={step.id} className="flex items-center justify-between border px-3 py-2 text-sm"><span>{step.action}</span><Badge variant="outline">{step.status}</Badge></div>) : <p className="text-sm text-muted-foreground">Workflow steps appear here as actions are queued. Refresh/reconciliation requires the workflow-status API from the backend.</p>}</div></div>
        </div>
      </section>
    </main>
  );
}
