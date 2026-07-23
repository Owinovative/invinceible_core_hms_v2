"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ModuleWorkspace } from "@/components/modules/module-workspace";
import {
  useAddDentalChartEntry,
  useAddDentalProcedure,
  useCreateDentalEncounter,
  useDentalEncounters,
} from "@/hooks/use-clinical-specialties";
import { usePatients } from "@/hooks/use-patients";
import { appSelectClass } from "@/lib/select-class";
import { useScope } from "@/providers/scope-provider";

export default function DentalPage() {
  const { selectedBranchId } = useScope();
  const encounters = useDentalEncounters();
  const patients = usePatients();
  const createEncounter = useCreateDentalEncounter();
  const addChart = useAddDentalChartEntry();
  const addProcedure = useAddDentalProcedure();
  const patientRows = Array.isArray(patients.data) ? patients.data : [];
  const [message, setMessage] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    patientId: "",
    chiefComplaint: "",
    examinationNotes: "",
    treatmentPlan: "",
    nextReviewAt: "",
  });
  const [selectedEncounterId, setSelectedEncounterId] = React.useState("");
  const [chart, setChart] = React.useState({
    toothCode: "",
    surfaceCode: "",
    conditionCode: "",
    diagnosisCode: "",
  });
  const [procedure, setProcedure] = React.useState({
    toothCode: "",
    procedureCode: "",
    procedureName: "",
    procedureNotes: "",
  });
  const attempt = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed.");
    }
  };
  const submit = async () => {
    try {
      await createEncounter.mutateAsync({
        patientId: Number(form.patientId),
        branchId: selectedBranchId,
        chiefComplaint: form.chiefComplaint || undefined,
        examinationNotes: form.examinationNotes || undefined,
        treatmentPlan: form.treatmentPlan || undefined,
        nextReviewAt: form.nextReviewAt || undefined,
      });
      setMessage("Dental encounter created. Tooth charting and procedures can now be recorded.");
      setForm({ patientId: "", chiefComplaint: "", examinationNotes: "", treatmentPlan: "", nextReviewAt: "" });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create dental encounter.");
    }
  };
  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader><CardTitle>New dental encounter</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <select className={appSelectClass} value={form.patientId} onChange={(event) => setForm({ ...form, patientId: event.target.value })}>
              <option value="">Select patient</option>
              {patientRows.map((patient) => <option key={patient.id} value={patient.id}>{patient.patientNumber} — {patient.firstName} {patient.lastName}</option>)}
            </select>
            <Input placeholder="Chief complaint" value={form.chiefComplaint} onChange={(event) => setForm({ ...form, chiefComplaint: event.target.value })} />
            <Textarea placeholder="Dental examination" value={form.examinationNotes} onChange={(event) => setForm({ ...form, examinationNotes: event.target.value })} />
            <Textarea placeholder="Treatment plan" value={form.treatmentPlan} onChange={(event) => setForm({ ...form, treatmentPlan: event.target.value })} />
            <Input type="datetime-local" value={form.nextReviewAt} onChange={(event) => setForm({ ...form, nextReviewAt: event.target.value })} />
            <Button onClick={submit} disabled={!form.patientId || createEncounter.isPending}>Open dental encounter</Button>
            {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Clinical dental records</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(encounters.data ?? []).map((encounter) => (
              <div key={encounter.id} className="border border-border p-4">
                <div className="flex justify-between gap-3">
                  <div><p className="font-semibold">{encounter.encounterNumber}</p><p className="text-sm text-muted-foreground">{encounter.patient.firstName} {encounter.patient.lastName}</p></div>
                  <Badge>{encounter.statusCode}</Badge>
                </div>
                <p className="mt-3 text-sm">{encounter.chiefComplaint || "No complaint recorded"}</p>
                <p className="mt-2 text-xs text-muted-foreground">{encounter.chartEntries.length} tooth chart entries · {encounter.procedures.length} procedures</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
      <Card>
        <CardHeader><CardTitle>Tooth chart and treatment</CardTitle></CardHeader>
        <CardContent className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-3">
            <select className={appSelectClass} value={selectedEncounterId} onChange={(event) => setSelectedEncounterId(event.target.value)}>
              <option value="">Select open dental encounter</option>
              {(encounters.data ?? []).map((row) => <option key={row.id} value={row.id}>{row.encounterNumber} — {row.patient.firstName} {row.patient.lastName}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="FDI tooth code e.g. 16" value={chart.toothCode} onChange={(event) => setChart({ ...chart, toothCode: event.target.value })} />
              <Input placeholder="Surface e.g. MO" value={chart.surfaceCode} onChange={(event) => setChart({ ...chart, surfaceCode: event.target.value })} />
            </div>
            <Input placeholder="Condition e.g. CARIES" value={chart.conditionCode} onChange={(event) => setChart({ ...chart, conditionCode: event.target.value })} />
            <Input placeholder="Diagnosis code" value={chart.diagnosisCode} onChange={(event) => setChart({ ...chart, diagnosisCode: event.target.value })} />
            <Button variant="outline" disabled={!selectedEncounterId || !chart.toothCode || !chart.conditionCode || addChart.isPending} onClick={() => attempt(
              () => addChart.mutateAsync({
                encounterId: Number(selectedEncounterId),
                toothCode: chart.toothCode,
                surfaceCode: chart.surfaceCode || undefined,
                conditionCode: chart.conditionCode,
                diagnosisCode: chart.diagnosisCode || undefined,
              }),
              "Tooth chart entry recorded.",
            )}>Record chart entry</Button>
          </div>
          <div className="space-y-3">
            <Input placeholder="Tooth code (optional)" value={procedure.toothCode} onChange={(event) => setProcedure({ ...procedure, toothCode: event.target.value })} />
            <Input placeholder="Configured procedure/tariff code" value={procedure.procedureCode} onChange={(event) => setProcedure({ ...procedure, procedureCode: event.target.value })} />
            <Input placeholder="Procedure name" value={procedure.procedureName} onChange={(event) => setProcedure({ ...procedure, procedureName: event.target.value })} />
            <Textarea placeholder="Procedure notes" value={procedure.procedureNotes} onChange={(event) => setProcedure({ ...procedure, procedureNotes: event.target.value })} />
            <Button disabled={!selectedEncounterId || !procedure.procedureCode || !procedure.procedureName || addProcedure.isPending} onClick={() => attempt(
              () => addProcedure.mutateAsync({
                encounterId: Number(selectedEncounterId),
                toothCode: procedure.toothCode || undefined,
                procedureCode: procedure.procedureCode,
                procedureName: procedure.procedureName,
                procedureNotes: procedure.procedureNotes || undefined,
              }),
              "Dental procedure recorded and sent to billing.",
            )}>Record and bill procedure</Button>
          </div>
        </CardContent>
      </Card>
      <ModuleWorkspace slug="dental" />
    </div>
  );
}
