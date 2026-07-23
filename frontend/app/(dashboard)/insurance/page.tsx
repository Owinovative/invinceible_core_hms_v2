"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ModuleWorkspace } from "@/components/modules/module-workspace";
import { useInvoices } from "@/hooks/use-invoices";
import { usePatients } from "@/hooks/use-patients";
import { usePrivateInsurance } from "@/hooks/use-private-insurance";
import { appSelectClass } from "@/lib/select-class";
import { useScope } from "@/providers/scope-provider";

export default function InsurancePage() {
  const { facilityId, selectedBranchId } = useScope();
  const insurance = usePrivateInsurance();
  const patients = usePatients();
  const invoices = useInvoices();
  const [notice, setNotice] = React.useState<string | null>(null);
  const [payer, setPayer] = React.useState({ code: "", name: "" });
  const [policy, setPolicy] = React.useState({
    patientId: "",
    insurancePayerId: "",
    policyNumber: "",
    memberNumber: "",
  });
  const [claim, setClaim] = React.useState({
    patientInsurancePolicyId: "",
    invoiceId: "",
  });

  const selectedPolicy = (insurance.policies.data ?? []).find(
    (row) => row.id === Number(claim.patientInsurancePolicyId),
  );
  const eligibleInvoices = (invoices.data ?? []).filter(
    (row) => !selectedPolicy || row.patientId === selectedPolicy.patient.id,
  );
  const attempt = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      setNotice(success);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Request failed.");
    }
  };

  return (
    <div className="space-y-8">
      <section className="surface-spotlight rounded-[2rem] border p-6 shadow-md">
        <Badge>Private payer workflow</Badge>
        <h1 className="mt-4 text-3xl font-bold">Insurance Eligibility and Claims</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Register contracted payers, verify patient cover, and submit
          invoice-backed claims without mixing private insurance with SHA.
        </p>
        {notice ? <p className="mt-3 text-sm">{notice}</p> : null}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>1. Contracted payer</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Payer code" value={payer.code} onChange={(event) => setPayer({ ...payer, code: event.target.value })} />
            <Input placeholder="Payer name" value={payer.name} onChange={(event) => setPayer({ ...payer, name: event.target.value })} />
            <Button
              disabled={!facilityId || !payer.code || !payer.name || insurance.createPayer.isPending}
              onClick={() => attempt(
                () => insurance.createPayer.mutateAsync({
                  facilityId: facilityId as number,
                  code: payer.code,
                  name: payer.name,
                }),
                "Payer registered.",
              )}
            >
              Add payer
            </Button>
            <div className="space-y-2 pt-2">
              {(insurance.payers.data ?? []).map((row) => (
                <div key={row.id} className="border border-border p-3 text-sm">
                  <p className="font-medium">{row.name}</p>
                  <p className="text-muted-foreground">{row.code} · {row._count?.policies ?? 0} policies</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>2. Patient cover</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <select className={appSelectClass} value={policy.patientId} onChange={(event) => setPolicy({ ...policy, patientId: event.target.value })}>
              <option value="">Select patient</option>
              {(patients.data ?? []).map((row) => <option key={row.id} value={row.id}>{row.patientNumber} — {row.firstName} {row.lastName}</option>)}
            </select>
            <select className={appSelectClass} value={policy.insurancePayerId} onChange={(event) => setPolicy({ ...policy, insurancePayerId: event.target.value })}>
              <option value="">Select payer</option>
              {(insurance.payers.data ?? []).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
            <Input placeholder="Policy number" value={policy.policyNumber} onChange={(event) => setPolicy({ ...policy, policyNumber: event.target.value })} />
            <Input placeholder="Member number (optional)" value={policy.memberNumber} onChange={(event) => setPolicy({ ...policy, memberNumber: event.target.value })} />
            <Button
              disabled={!policy.patientId || !policy.insurancePayerId || !policy.policyNumber || insurance.createPolicy.isPending}
              onClick={() => attempt(
                () => insurance.createPolicy.mutateAsync({
                  patientId: Number(policy.patientId),
                  branchId: selectedBranchId,
                  insurancePayerId: Number(policy.insurancePayerId),
                  policyNumber: policy.policyNumber,
                  memberNumber: policy.memberNumber || undefined,
                }),
                "Patient policy registered.",
              )}
            >
              Register cover
            </Button>
            <div className="space-y-2 pt-2">
              {(insurance.policies.data ?? []).map((row) => (
                <div key={row.id} className="border border-border p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div><p className="font-medium">{row.patient.firstName} {row.patient.lastName}</p><p className="text-muted-foreground">{row.payer.name} · {row.policyNumber}</p></div>
                    <Badge variant="outline">{row.statusCode}</Badge>
                  </div>
                  <Button className="mt-2" size="sm" variant="outline" onClick={() => attempt(() => insurance.verifyPolicy.mutateAsync(row.id), "Eligibility check completed.")}>Verify</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>3. Invoice claim</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <select className={appSelectClass} value={claim.patientInsurancePolicyId} onChange={(event) => setClaim({ patientInsurancePolicyId: event.target.value, invoiceId: "" })}>
              <option value="">Select verified cover</option>
              {(insurance.policies.data ?? []).map((row) => <option key={row.id} value={row.id}>{row.patient.firstName} {row.patient.lastName} — {row.policyNumber}</option>)}
            </select>
            <select className={appSelectClass} value={claim.invoiceId} onChange={(event) => setClaim({ ...claim, invoiceId: event.target.value })}>
              <option value="">Select patient invoice</option>
              {eligibleInvoices.map((row) => <option key={row.id} value={row.id}>{row.invoiceNumber} — KES {Number(row.balanceAmount).toFixed(2)}</option>)}
            </select>
            <Button
              disabled={!claim.patientInsurancePolicyId || !claim.invoiceId || insurance.createClaim.isPending}
              onClick={() => attempt(
                () => insurance.createClaim.mutateAsync({
                  patientInsurancePolicyId: Number(claim.patientInsurancePolicyId),
                  invoiceId: Number(claim.invoiceId),
                }),
                "Draft claim created.",
              )}
            >
              Create claim
            </Button>
            <div className="space-y-2 pt-2">
              {(insurance.claims.data ?? []).map((row) => (
                <div key={row.id} className="border border-border p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div><p className="font-medium">{row.claimNumber}</p><p className="text-muted-foreground">{row.payer.name} · KES {Number(row.claimedAmount).toFixed(2)}</p></div>
                    <Badge variant="outline">{row.statusCode}</Badge>
                  </div>
                  {row.statusCode === "DRAFT" ? <Button className="mt-2" size="sm" onClick={() => attempt(() => insurance.submitClaim.mutateAsync(row.id), "Claim submission processed.")}>Submit claim</Button> : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
      <ModuleWorkspace slug="insurance" />
    </div>
  );
}
