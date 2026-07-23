"use client";

import * as React from "react";
import { Copy, CreditCard, FlaskConical, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateExternalLabReferral,
  useCreateExternalLabResult,
  useExternalLabReferrals,
  useReleaseExternalLabResult,
  useValidateExternalLabResult,
  useCreateExternalLabPayment,
  useCreateExternalLabReportShare,
} from "@/hooks/use-external-lab-referrals";
import { useLabTests } from "@/hooks/use-lab-tests";
import { appSelectClass } from "@/lib/select-class";
import { useScope } from "@/providers/scope-provider";
import { API_BASE_URL } from "@/lib/api";

export default function ExternalLabPage() {
  const { facilityId, selectedBranchId } = useScope();
  const referrals = useExternalLabReferrals();
  const tests = useLabTests();
  const createReferral = useCreateExternalLabReferral();
  const createResult = useCreateExternalLabResult();
  const validateResult = useValidateExternalLabResult();
  const releaseResult = useReleaseExternalLabResult();
  const createPayment = useCreateExternalLabPayment();
  const createShare = useCreateExternalLabReportShare();
  const [message, setMessage] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    referringFacilityName: "",
    referringFacilityContact: "",
    referringClinicianName: "",
    externalPatientName: "",
    externalPatientIdentifier: "",
    patientPhone: "",
    sampleReference: "",
    specimenType: "",
    clinicalNotes: "",
    urgency: "ROUTINE",
    testId: "",
  });
  const [resultForm, setResultForm] = React.useState({
    itemId: "",
    resultValue: "",
    remarks: "",
  });
  const [paymentForm, setPaymentForm] = React.useState({
    referralId: "",
    amount: "",
    paymentMethod: "CASH" as
      | "CASH"
      | "MPESA"
      | "CARD"
      | "BANK_TRANSFER"
      | "INSURANCE",
    transactionReference: "",
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
    if (!facilityId || !form.testId) {
      setMessage("Select a facility and laboratory test.");
      return;
    }
    try {
      await createReferral.mutateAsync({
        facilityId,
        branchId: selectedBranchId,
        referringFacilityName: form.referringFacilityName,
        referringFacilityContact: form.referringFacilityContact || undefined,
        referringClinicianName: form.referringClinicianName || undefined,
        externalPatientName: form.externalPatientName,
        externalPatientIdentifier: form.externalPatientIdentifier || undefined,
        patientPhone: form.patientPhone || undefined,
        sampleReference: form.sampleReference,
        specimenType: form.specimenType || undefined,
        clinicalNotes: form.clinicalNotes || undefined,
        urgency: form.urgency,
        items: [{ testId: Number(form.testId) }],
      });
      setMessage("External laboratory referral received.");
      setForm({
        referringFacilityName: "",
        referringFacilityContact: "",
        referringClinicianName: "",
        externalPatientName: "",
        externalPatientIdentifier: "",
        patientPhone: "",
        sampleReference: "",
        specimenType: "",
        clinicalNotes: "",
        urgency: "ROUTINE",
        testId: "",
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save referral.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="surface-spotlight rounded-[2rem] border p-6 shadow-md">
        <Badge className="bg-primary/10 text-primary">Laboratory referral network</Badge>
        <h1 className="mt-4 text-3xl font-bold">External Sample Management</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Receive, identify, price and track samples referred by other facilities.
        </p>
      </section>
      {message ? <div className="border border-primary/20 bg-primary/10 p-4 text-sm">{message}</div> : null}
      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader><CardTitle>Receive external sample</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            <Input placeholder="Referring hospital or clinic" value={form.referringFacilityName} onChange={(event) => setForm({ ...form, referringFacilityName: event.target.value })} />
            <Input placeholder="Facility contact" value={form.referringFacilityContact} onChange={(event) => setForm({ ...form, referringFacilityContact: event.target.value })} />
            <Input placeholder="Referring clinician" value={form.referringClinicianName} onChange={(event) => setForm({ ...form, referringClinicianName: event.target.value })} />
            <Input placeholder="External patient name" value={form.externalPatientName} onChange={(event) => setForm({ ...form, externalPatientName: event.target.value })} />
            <Input placeholder="External patient identifier" value={form.externalPatientIdentifier} onChange={(event) => setForm({ ...form, externalPatientIdentifier: event.target.value })} />
            <Input placeholder="Patient phone" value={form.patientPhone} onChange={(event) => setForm({ ...form, patientPhone: event.target.value })} />
            <Input placeholder="Sample reference / barcode" value={form.sampleReference} onChange={(event) => setForm({ ...form, sampleReference: event.target.value })} />
            <Input placeholder="Specimen type" value={form.specimenType} onChange={(event) => setForm({ ...form, specimenType: event.target.value })} />
            <select className={appSelectClass} value={form.testId} onChange={(event) => setForm({ ...form, testId: event.target.value })}>
              <option value="">Select test</option>
              {(tests.data ?? []).map((test) => <option key={test.id} value={test.id}>{test.testName}</option>)}
            </select>
            <Textarea placeholder="Clinical notes" value={form.clinicalNotes} onChange={(event) => setForm({ ...form, clinicalNotes: event.target.value })} />
            <Button onClick={submit} disabled={createReferral.isPending}><Plus className="mr-2 h-4 w-4" />Receive sample</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>External referral queue</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(referrals.data ?? []).map((referral) => (
              <article key={referral.id} className="border border-border p-4">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-semibold">{referral.referralNumber}</p>
                    <p className="text-sm text-muted-foreground">{referral.externalPatientName} · {referral.referringFacilityName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Sample {referral.sampleReference}</p>
                  </div>
                  <Badge>{referral.statusCode}</Badge>
                </div>
                <div className="mt-3 grid gap-2 text-xs md:grid-cols-4">
                  <span>Invoice {referral.invoiceNumber}</span>
                  <span>Total KES {Number(referral.totalAmount).toFixed(2)}</span>
                  <span>Paid KES {Number(referral.paidAmount).toFixed(2)}</span>
                  <Badge>{referral.billingStatus}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {referral.items.map((item) => (
                    <span key={item.id} className="inline-flex items-center gap-2 border border-border px-3 py-1 text-xs">
                      <FlaskConical className="h-3 w-3" />{item.test.testName} · {item.statusCode}
                    </span>
                  ))}
                </div>
                {referral.statusCode === "RELEASED" && referral.billingStatus === "PAID" ? (
                  <Button
                    className="mt-3"
                    variant="outline"
                    disabled={createShare.isPending}
                    onClick={() =>
                      attempt(async () => {
                        const share = await createShare.mutateAsync({
                          referralId: referral.id,
                          expiresInHours: 72,
                        });
                        await navigator.clipboard.writeText(
                          `${API_BASE_URL}${share.accessPath}`,
                        );
                      }, "Secure report link copied. It expires in 72 hours.")
                    }
                  >
                    <Copy className="mr-2 h-4 w-4" /> Copy secure report link
                  </Button>
                ) : null}
              </article>
            ))}
            {(referrals.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No external referrals in this scope.</p> : null}
          </CardContent>
        </Card>
      </section>
      <Card>
        <CardHeader><CardTitle>External laboratory payment</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <select className={appSelectClass} value={paymentForm.referralId} onChange={(event) => {
            const referral = (referrals.data ?? []).find((item) => item.id === Number(event.target.value));
            setPaymentForm({
              ...paymentForm,
              referralId: event.target.value,
              amount: referral ? String(referral.balanceAmount) : "",
            });
          }}>
            <option value="">Select external invoice</option>
            {(referrals.data ?? []).filter((item) => Number(item.balanceAmount) > 0).map((item) => (
              <option key={item.id} value={item.id}>{item.invoiceNumber} · KES {Number(item.balanceAmount).toFixed(2)}</option>
            ))}
          </select>
          <Input type="number" min="0.01" step="0.01" placeholder="Amount" value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} />
          <select className={appSelectClass} value={paymentForm.paymentMethod} onChange={(event) => setPaymentForm({ ...paymentForm, paymentMethod: event.target.value as typeof paymentForm.paymentMethod })}>
            <option value="CASH">Cash</option><option value="MPESA">M-Pesa</option><option value="CARD">Card</option><option value="BANK_TRANSFER">Bank transfer</option><option value="INSURANCE">Insurance</option>
          </select>
          <Input placeholder="Transaction reference" value={paymentForm.transactionReference} onChange={(event) => setPaymentForm({ ...paymentForm, transactionReference: event.target.value })} />
          <Button disabled={!paymentForm.referralId || !paymentForm.amount || createPayment.isPending} onClick={() => attempt(
            () => createPayment.mutateAsync({
              referralId: Number(paymentForm.referralId),
              amount: Number(paymentForm.amount),
              paymentMethod: paymentForm.paymentMethod,
              transactionReference: paymentForm.transactionReference || undefined,
            }),
            "External laboratory payment recorded.",
          )}><CreditCard className="mr-2 h-4 w-4" />Record payment</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Result validation and release</CardTitle></CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
          <select className={appSelectClass} value={resultForm.itemId} onChange={(event) => setResultForm({ ...resultForm, itemId: event.target.value })}>
            <option value="">Select referred test</option>
            {(referrals.data ?? []).flatMap((referral) => referral.items.map((item) => (
              <option key={item.id} value={item.id}>
                {referral.referralNumber} — {item.test.testName} ({item.result?.statusCode ?? "NO RESULT"})
              </option>
            )))}
          </select>
          <Input placeholder="Result value" value={resultForm.resultValue} onChange={(event) => setResultForm({ ...resultForm, resultValue: event.target.value })} />
          <Button disabled={!resultForm.itemId || !resultForm.resultValue || createResult.isPending} onClick={() => attempt(
            () => createResult.mutateAsync({
              itemId: Number(resultForm.itemId),
              resultValue: resultForm.resultValue,
              remarks: resultForm.remarks || undefined,
            }),
            "Draft external result recorded.",
          )}>Record draft</Button>
          <Textarea className="lg:col-span-2" placeholder="Result remarks / validation notes" value={resultForm.remarks} onChange={(event) => setResultForm({ ...resultForm, remarks: event.target.value })} />
          <div className="flex gap-2">
            {(() => {
              const item = (referrals.data ?? []).flatMap((referral) => referral.items).find((row) => row.id === Number(resultForm.itemId));
              if (!item?.result) return null;
              return (
                <>
                  <Button variant="outline" disabled={item.result.statusCode !== "DRAFT" || validateResult.isPending} onClick={() => attempt(
                    () => validateResult.mutateAsync({ resultId: item.result!.id, validationNotes: resultForm.remarks || undefined }),
                    "External result validated.",
                  )}>Validate</Button>
                  <Button disabled={item.result.statusCode !== "VALIDATED" || releaseResult.isPending} onClick={() => attempt(
                    () => releaseResult.mutateAsync(item.result!.id),
                    "External result released.",
                  )}>Release</Button>
                </>
              );
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
