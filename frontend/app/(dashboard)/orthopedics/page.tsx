"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useAddOrthopedicImplant,
  useCreateOrthopedicCase,
  useCreatePhysiotherapyReferral,
  useOrthopedicCases,
} from "@/hooks/use-clinical-specialties";
import { usePatients } from "@/hooks/use-patients";
import { appSelectClass } from "@/lib/select-class";
import { useScope } from "@/providers/scope-provider";

export default function OrthopedicsPage() {
  const { selectedBranchId } = useScope();
  const cases = useOrthopedicCases();
  const patients = usePatients();
  const createCase = useCreateOrthopedicCase();
  const addImplant = useAddOrthopedicImplant();
  const referPhysiotherapy = useCreatePhysiotherapyReferral();
  const patientRows = Array.isArray(patients.data) ? patients.data : [];
  const [message, setMessage] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    patientId: "", anatomicalSite: "", laterality: "", injuryMechanism: "",
    fractureClassification: "", imagingSummary: "", managementPlan: "", followUpAt: "",
  });
  const [selectedCaseId, setSelectedCaseId] = React.useState("");
  const [implant, setImplant] = React.useState({
    implantName: "",
    manufacturer: "",
    lotNumber: "",
    serialNumber: "",
  });
  const [referral, setReferral] = React.useState({
    referralReason: "",
    goals: "",
    precautions: "",
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
      await createCase.mutateAsync({
        patientId: Number(form.patientId),
        branchId: selectedBranchId,
        anatomicalSite: form.anatomicalSite,
        laterality: form.laterality || undefined,
        injuryMechanism: form.injuryMechanism || undefined,
        fractureClassification: form.fractureClassification || undefined,
        imagingSummary: form.imagingSummary || undefined,
        managementPlan: form.managementPlan || undefined,
        followUpAt: form.followUpAt || undefined,
      });
      setMessage("Orthopedic case created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create case.");
    }
  };
  return (
    <div className="space-y-6">
      <section className="surface-spotlight rounded-[2rem] border p-6 shadow-md">
        <Badge>Clinical specialty</Badge><h1 className="mt-4 text-3xl font-bold">Orthopedics</h1>
        <p className="mt-2 text-sm text-muted-foreground">Fractures, imaging, implants, procedures, physiotherapy referrals and follow-up.</p>
      </section>
      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card><CardHeader><CardTitle>Open orthopedic case</CardTitle></CardHeader><CardContent className="space-y-3">
          <select className={appSelectClass} value={form.patientId} onChange={(event) => setForm({ ...form, patientId: event.target.value })}><option value="">Select patient</option>{patientRows.map((patient) => <option key={patient.id} value={patient.id}>{patient.patientNumber} — {patient.firstName} {patient.lastName}</option>)}</select>
          <Input placeholder="Anatomical site" value={form.anatomicalSite} onChange={(event) => setForm({ ...form, anatomicalSite: event.target.value })} />
          <Input placeholder="Laterality" value={form.laterality} onChange={(event) => setForm({ ...form, laterality: event.target.value })} />
          <Textarea placeholder="Injury mechanism" value={form.injuryMechanism} onChange={(event) => setForm({ ...form, injuryMechanism: event.target.value })} />
          <Input placeholder="Fracture classification" value={form.fractureClassification} onChange={(event) => setForm({ ...form, fractureClassification: event.target.value })} />
          <Textarea placeholder="Imaging summary" value={form.imagingSummary} onChange={(event) => setForm({ ...form, imagingSummary: event.target.value })} />
          <Textarea placeholder="Management plan" value={form.managementPlan} onChange={(event) => setForm({ ...form, managementPlan: event.target.value })} />
          <Input type="datetime-local" value={form.followUpAt} onChange={(event) => setForm({ ...form, followUpAt: event.target.value })} />
          <Button onClick={submit} disabled={!form.patientId || !form.anatomicalSite || createCase.isPending}>Open case</Button>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Orthopedic case list</CardTitle></CardHeader><CardContent className="space-y-3">
          {(cases.data ?? []).map((item) => <div key={item.id} className="border border-border p-4"><div className="flex justify-between gap-3"><div><p className="font-semibold">{item.caseNumber}</p><p className="text-sm text-muted-foreground">{item.patient.firstName} {item.patient.lastName} · {item.anatomicalSite}</p></div><Badge>{item.statusCode}</Badge></div><p className="mt-2 text-sm">{item.fractureClassification || "Classification pending"}</p><p className="mt-2 text-xs text-muted-foreground">{item.implants.length} implants · {item.physiotherapyReferrals.length} physiotherapy referrals</p></div>)}
        </CardContent></Card>
      </section>
      <Card>
        <CardHeader><CardTitle>Implants and rehabilitation</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <select className={appSelectClass} value={selectedCaseId} onChange={(event) => setSelectedCaseId(event.target.value)}>
            <option value="">Select orthopedic case</option>
            {(cases.data ?? []).map((row) => <option key={row.id} value={row.id}>{row.caseNumber} — {row.patient.firstName} {row.patient.lastName}</option>)}
          </select>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-3">
              <Input placeholder="Implant name" value={implant.implantName} onChange={(event) => setImplant({ ...implant, implantName: event.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Manufacturer" value={implant.manufacturer} onChange={(event) => setImplant({ ...implant, manufacturer: event.target.value })} />
                <Input placeholder="Lot number" value={implant.lotNumber} onChange={(event) => setImplant({ ...implant, lotNumber: event.target.value })} />
              </div>
              <Input placeholder="Serial number" value={implant.serialNumber} onChange={(event) => setImplant({ ...implant, serialNumber: event.target.value })} />
              <p className="text-xs text-muted-foreground">
                The implant charge is resolved from the configured orthopedic tariff; clinical staff cannot override its price.
              </p>
              <Button disabled={!selectedCaseId || !implant.implantName || addImplant.isPending} onClick={() => attempt(
                () => addImplant.mutateAsync({
                  caseId: Number(selectedCaseId),
                  implantName: implant.implantName,
                  manufacturer: implant.manufacturer || undefined,
                  lotNumber: implant.lotNumber || undefined,
                  serialNumber: implant.serialNumber || undefined,
                }),
                "Implant traceability record saved and billed.",
              )}>Record implant</Button>
            </div>
            <div className="space-y-3">
              <Textarea placeholder="Physiotherapy referral reason" value={referral.referralReason} onChange={(event) => setReferral({ ...referral, referralReason: event.target.value })} />
              <Textarea placeholder="Rehabilitation goals" value={referral.goals} onChange={(event) => setReferral({ ...referral, goals: event.target.value })} />
              <Textarea placeholder="Clinical precautions" value={referral.precautions} onChange={(event) => setReferral({ ...referral, precautions: event.target.value })} />
              <Button variant="outline" disabled={!selectedCaseId || !referral.referralReason || referPhysiotherapy.isPending} onClick={() => attempt(
                () => referPhysiotherapy.mutateAsync({
                  caseId: Number(selectedCaseId),
                  referralReason: referral.referralReason,
                  goals: referral.goals || undefined,
                  precautions: referral.precautions || undefined,
                }),
                "Physiotherapy referral created.",
              )}>Refer to physiotherapy</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
