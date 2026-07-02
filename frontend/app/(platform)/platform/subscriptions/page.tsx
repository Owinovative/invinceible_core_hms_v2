"use client";

import * as React from "react";
import { CreditCard, Loader2 } from "lucide-react";
import {
  usePlatformFacilitySubscriptions,
  useRecordFacilitySubscriptionPayment,
} from "@/hooks/use-facility-subscription";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { appSelectClass } from "@/lib/select-class";

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function statusClass(level?: string) {
  if (level === "LOCKED" || level === "RED") return "bg-destructive-soft text-destructive";
  if (level === "YELLOW") return "bg-warning-soft text-warning";
  return "bg-success-soft text-success";
}

export default function PlatformSubscriptionsPage() {
  const { data = [] } = usePlatformFacilitySubscriptions();
  const mutation = useRecordFacilitySubscriptionPayment();
  const [facilityId, setFacilityId] = React.useState("");
  const [amount, setAmount] = React.useState("5000");
  const [paymentMethod, setPaymentMethod] = React.useState("CASH");
  const [reference, setReference] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [notice, setNotice] = React.useState<string | null>(null);

  const recordPayment = async () => {
    const result = await mutation.mutateAsync({
      facilityId: Number(facilityId),
      amount: Number(amount || 0),
      paymentMethod,
      reference: reference || undefined,
      notes: notes || undefined,
    });
    setNotice(
      `Payment recorded. Paid through ${formatDate(result.subscription.paidThrough)}.`,
    );
    setReference("");
    setNotes("");
  };

  return (
    <div className="space-y-6">
      <section className="border border-border bg-card p-6 shadow-sm">
        <Badge className="rounded-md bg-accent text-module">
          Facility billing
        </Badge>
        <div className="mt-4 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-border bg-surface-2 text-module">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#07345f]">
              Monthly facility subscriptions
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Each facility pays KES 5,000 monthly. Super admins record payments
              here; admin dashboards warn before due date and data entry locks
              when payment expires.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <div className="border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#07345f]">
            Record payment
          </h2>
          <div className="mt-4 space-y-4">
            <select
              value={facilityId}
              onChange={(event) => setFacilityId(event.target.value)}
              className={appSelectClass}
            >
              <option value="">Choose facility</option>
              {data.map((facility) => (
                <option key={facility.id} value={String(facility.id)}>
                  {facility.name}
                </option>
              ))}
            </select>
            <Input
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="h-11 rounded-md"
              placeholder="Amount paid"
            />
            <select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              className={appSelectClass}
            >
              {["CASH", "MPESA", "BANK", "WAIVER", "OTHER"].map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
            <Input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              className="h-11 rounded-md"
              placeholder="Reference"
            />
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-[92px] rounded-md"
              placeholder="Notes"
            />
            {notice ? (
              <p className="border border-success/25 bg-success-soft px-3 py-2 text-sm text-success">
                {notice}
              </p>
            ) : null}
            <Button
              className="h-11 rounded-md bg-primary text-white hover:bg-brand-strong"
              onClick={recordPayment}
              disabled={mutation.isPending || !facilityId || Number(amount || 0) <= 0}
            >
              {mutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save subscription payment
            </Button>
          </div>
        </div>

        <div className="border border-border bg-card shadow-sm">
          <div className="border-b border-border p-5">
            <h2 className="text-lg font-semibold text-[#07345f]">
              Facility payment control
            </h2>
          </div>
          <div className="max-h-[680px] overflow-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="sticky top-0 bg-[#eef7ff] text-left text-foreground">
                <tr>
                  <th className="px-4 py-3">Facility</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Due date</th>
                  <th className="px-4 py-3 text-right">Monthly fee</th>
                  <th className="px-4 py-3">Last payments</th>
                </tr>
              </thead>
              <tbody>
                {data.map((facility) => (
                  <tr key={facility.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{facility.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {facility.code} / {facility.town || facility.county || "-"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`rounded-md ${statusClass(facility.subscription.warningLevel)}`}>
                        {facility.subscription.warningLevel}
                      </Badge>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {facility.subscription.loginBlocked
                          ? "Facility logins blocked"
                          : facility.subscription.locked
                            ? "Data entry paused"
                            : facility.subscription.complianceWriteLocked
                              ? "Compliance read-only"
                              : "Active"}
                      </p>
                      {facility.subscription.lockReason ? (
                        <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                          {facility.subscription.lockReason}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {formatDate(facility.subscription.paidThrough)}
                      <p className="text-xs text-muted-foreground">
                        {Math.ceil(facility.subscription.daysRemaining)} days left
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatMoney(facility.subscription.monthlyFee)}
                    </td>
                    <td className="px-4 py-3">
                      {(facility.subscriptionPayments || []).slice(0, 2).map((payment) => (
                        <p key={payment.id} className="text-xs text-muted-foreground">
                          {payment.paymentNumber}: {formatMoney(payment.amount)} / {formatDate(payment.paidAt)}
                        </p>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
