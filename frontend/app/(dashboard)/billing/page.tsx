"use client";

import * as React from "react";
import {
  CreditCard,
  FileText,
  Loader2,
  Receipt,
  Wallet,
} from "lucide-react";

import { useBillingDashboard } from "@/hooks/use-billing-dashboard";
import { useInvoices } from "@/hooks/use-invoices";
import { useInvoiceById } from "@/hooks/use-invoice-by-id";
import { useUpdateInvoiceItem } from "@/hooks/use-update-invoice-item";
import { useRemoveInvoiceItem } from "@/hooks/use-remove-invoice-item";
import { useCreateCashPayment } from "@/hooks/use-create-cash-payment";
import { useCreateMpesaPaymentRequest } from "@/hooks/use-create-mpesa-payment-request";
import { useAuth } from "@/providers/auth-provider";
import { useScope } from "@/providers/scope-provider";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}


function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function patientName(
  patient?:
    | {
        firstName?: string;
        middleName?: string | null;
        lastName?: string;
      }
    | null,
) {
  if (!patient) return "Unknown patient";
  return [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(" ");
}

function statusTone(status?: string | null) {
  switch ((status || "").toUpperCase()) {
    case "PAID":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
    case "PARTIALLY_PAID":
      return "border-amber-500/20 bg-amber-500/10 text-amber-300";
    case "PENDING":
      return "border-cyan-500/20 bg-cyan-500/10 text-cyan-300";
    case "REMOVED":
      return "border-red-500/20 bg-red-500/10 text-red-300";
    default:
      return "border-white/10 bg-white/[0.04] text-muted-foreground";
  }
}

export default function BillingPage() {
  const { facilityName, selectedBranchName } = useScope();
  const { user } = useAuth();

  const { data: dashboardData } = useBillingDashboard();
  const { data, isLoading } = useInvoices();
  const invoices = Array.isArray(data) ? data : [];

  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState<number | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!selectedInvoiceId && invoices.length > 0) {
      setSelectedInvoiceId(invoices[0].id);
    }
  }, [invoices, selectedInvoiceId]);

  const { data: invoiceDetail, isLoading: detailLoading } =
    useInvoiceById(selectedInvoiceId);

  const updateInvoiceItemMutation = useUpdateInvoiceItem();
  const removeInvoiceItemMutation = useRemoveInvoiceItem();
  const createCashPaymentMutation = useCreateCashPayment();
  const createMpesaPaymentRequestMutation = useCreateMpesaPaymentRequest();

  const invoice = invoiceDetail ?? invoices.find((item) => item.id === selectedInvoiceId) ?? null;
  const items = Array.isArray(invoice?.items) ? invoice.items : [];
  const payments = Array.isArray(invoice?.payments) ? invoice.payments : [];

  const [editingItemId, setEditingItemId] = React.useState<number | null>(null);
  const [editDescription, setEditDescription] = React.useState("");
  const [editQuantity, setEditQuantity] = React.useState("");
  const [editUnitPrice, setEditUnitPrice] = React.useState("");
  const [editNotes, setEditNotes] = React.useState("");
  const [removeReason, setRemoveReason] = React.useState("");

  const [cashReceiptNumber, setCashReceiptNumber] = React.useState("");
  const [cashAmount, setCashAmount] = React.useState("");

  const [mpesaReceiptNumber, setMpesaReceiptNumber] = React.useState("");
  const [mpesaAmount, setMpesaAmount] = React.useState("");
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = React.useState("");

  const startEdit = (item: any) => {
    setEditingItemId(item.id);
    setEditDescription(item.description || "");
    setEditQuantity(String(item.quantity ?? 1));
    setEditUnitPrice(String(item.unitPrice ?? 0));
    setEditNotes(item.notes || "");
    setRemoveReason("");
    setMessage(null);
  };

  const handleUpdateItem = async () => {
    if (!editingItemId) return;

    await updateInvoiceItemMutation.mutateAsync({
      id: editingItemId,
      payload: {
        description: editDescription,
        quantity: Number(editQuantity || 1),
        unitPrice: Number(editUnitPrice || 0),
        notes: editNotes || undefined,
      },
    });

    setEditingItemId(null);
    setMessage("Invoice item updated successfully.");
  };

  const handleRemoveItem = async () => {
    if (!editingItemId) return;
    if (!removeReason.trim()) {
      setMessage("Please enter a reason for removing this line.");
      return;
    }

    await removeInvoiceItemMutation.mutateAsync({
      id: editingItemId,
      reason: removeReason.trim(),
    });

    setEditingItemId(null);
    setRemoveReason("");
    setMessage("Invoice item removed successfully.");
  };

  const handleCashPayment = async () => {
    if (!invoice) return;

    await createCashPaymentMutation.mutateAsync({
      receiptNumber: cashReceiptNumber.trim(),
      invoiceId: invoice.id,
      amount: Number(cashAmount || 0),
      receivedByStaffId: user?.staffId ? Number(user.staffId) : undefined,
    });

    setCashReceiptNumber("");
    setCashAmount("");
    setMessage("Cash payment recorded successfully.");
  };

  const handleMpesaPayment = async () => {
    if (!invoice) return;

    await createMpesaPaymentRequestMutation.mutateAsync({
      receiptNumber: mpesaReceiptNumber.trim(),
      invoiceId: invoice.id,
      amount: Number(mpesaAmount || 0),
      phoneNumber: mpesaPhoneNumber.trim(),
      receivedByStaffId: user?.staffId ? Number(user.staffId) : undefined,
    });

    setMpesaReceiptNumber("");
    setMpesaAmount("");
    setMpesaPhoneNumber("");
    setMessage("M-PESA payment request created successfully.");
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border gradient-border panel-shadow p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-600/10 via-cyan-500/5 to-transparent" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <Badge className="rounded-full border-0 bg-emerald-600/10 px-3 py-1 text-emerald-700 dark:text-emerald-300">
              Billing Workspace
            </Badge>

            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10">
                <CreditCard className="h-7 w-7 text-primary" />
              </div>

              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Billing & Invoices
                </h1>
                <p className="text-muted-foreground">
                  Review invoices, edit bill lines, remove incorrect charges, and receive payments
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
            <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Facility
              </p>
              <p className="mt-2 text-sm font-semibold">{facilityName || "No facility"}</p>
            </div>

            <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Branch
              </p>
              <p className="mt-2 text-sm font-semibold">{selectedBranchName || "No branch"}</p>
            </div>
          </div>
        </div>
      </section>

      {message ? (
        <div className="rounded-[1.4rem] border border-cyan-500/20 bg-cyan-500/8 px-4 py-4 text-sm text-cyan-300">
          {message}
        </div>
      ) : null}

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-[1.6rem] gradient-border panel-shadow">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Invoices</p>
              <p className="mt-2 text-2xl font-bold">
                {dashboardData?.counts?.totalInvoices ?? 0}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.6rem] gradient-border panel-shadow">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="mt-2 text-2xl font-bold">
                {dashboardData?.counts?.pendingInvoices ?? 0}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Receipt className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.6rem] gradient-border panel-shadow">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Paid</p>
              <p className="mt-2 text-2xl font-bold">
                {dashboardData?.counts?.paidInvoices ?? 0}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.6rem] gradient-border panel-shadow">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Outstanding</p>
              <p className="mt-2 text-2xl font-bold">
                {formatMoney(dashboardData?.sums?.balanceAmount ?? 0)}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-[1.8rem] gradient-border panel-shadow">
          <CardHeader>
            <CardTitle>Invoice List</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading invoices...</div>
            ) : invoices.length === 0 ? (
              <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-muted-foreground">
                No invoices found.
              </div>
            ) : (
              invoices.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedInvoiceId(item.id)}
                  className={`w-full rounded-[1.2rem] border p-4 text-left transition-all ${
                    selectedInvoiceId === item.id
                      ? "border-cyan-400/40 bg-cyan-500/10"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="font-semibold">{item.invoiceNumber}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {patientName(item.patient)}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Issued: {formatDate(item.issuedAt)}
                      </p>
                      <p className="mt-1 text-xs text-cyan-300">
                        Balance: {formatMoney(item.balanceAmount)}
                      </p>
                    </div>

                    <Badge className={`rounded-full border px-3 py-1 ${statusTone(item.statusCode)}`}>
                      {item.statusCode}
                    </Badge>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-[1.8rem] gradient-border panel-shadow">
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {!invoice ? (
                <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-muted-foreground">
                  Select an invoice.
                </div>
              ) : detailLoading ? (
                <div className="text-sm text-muted-foreground">Loading invoice details...</div>
              ) : (
                <>
                  <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-bold">{invoice.invoiceNumber}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {patientName(invoice.patient)}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {invoice.patient?.patientNumber || "No patient number"}
                        </p>
                      </div>

                      <Badge className={`rounded-full border px-3 py-1 ${statusTone(invoice.statusCode)}`}>
                        {invoice.statusCode}
                      </Badge>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-xs text-muted-foreground">Subtotal</p>
                        <p className="mt-1 text-sm font-medium">{formatMoney(invoice.subtotal)}</p>
                      </div>
                      <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="mt-1 text-sm font-medium">{formatMoney(invoice.totalAmount)}</p>
                      </div>
                      <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-xs text-muted-foreground">Paid</p>
                        <p className="mt-1 text-sm font-medium">{formatMoney(invoice.paidAmount)}</p>
                      </div>
                      <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-xs text-muted-foreground">Balance</p>
                        <p className="mt-1 text-sm font-medium">{formatMoney(invoice.balanceAmount)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-semibold">Invoice Lines</p>

                    {items.length === 0 ? (
                      <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-muted-foreground">
                        No invoice lines found.
                      </div>
                    ) : (
                      items.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4"
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <p className="font-semibold">{item.description}</p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                Qty: {item.quantity} • Unit: {formatMoney(item.unitPrice)} • Line: {formatMoney(item.lineTotal)}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {item.isAutoGenerated ? "Auto generated" : "Manual"}
                                {item.sourceModule ? ` • ${item.sourceModule}` : ""}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                className="rounded-2xl"
                                onClick={() => startEdit(item)}
                              >
                                Edit
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {editingItemId ? (
                    <div className="space-y-4 rounded-[1.2rem] border border-cyan-500/20 bg-cyan-500/5 p-4">
                      <p className="font-semibold">Edit Invoice Line</p>

                      <div>
                        <label className="mb-2 block text-sm font-medium">Description</label>
                        <Input
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="h-12 rounded-2xl"
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium">Quantity</label>
                          <Input
                            type="number"
                            value={editQuantity}
                            onChange={(e) => setEditQuantity(e.target.value)}
                            className="h-12 rounded-2xl"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium">Unit Price</label>
                          <Input
                            type="number"
                            value={editUnitPrice}
                            onChange={(e) => setEditUnitPrice(e.target.value)}
                            className="h-12 rounded-2xl"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium">Notes</label>
                        <Textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          className="min-h-[100px] rounded-2xl"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium">Remove Reason</label>
                        <Textarea
                          value={removeReason}
                          onChange={(e) => setRemoveReason(e.target.value)}
                          className="min-h-[90px] rounded-2xl"
                          placeholder="Why this charge should be removed"
                        />
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <Button
                          type="button"
                          className="h-12 rounded-2xl"
                          onClick={handleUpdateItem}
                          disabled={updateInvoiceItemMutation.isPending}
                        >
                          {updateInvoiceItemMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Save Line
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          className="h-12 rounded-2xl"
                          onClick={handleRemoveItem}
                          disabled={removeInvoiceItemMutation.isPending}
                        >
                          {removeInvoiceItemMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Remove Line
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          className="h-12 rounded-2xl"
                          onClick={() => setEditingItemId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>

          {invoice ? (
            <Card className="rounded-[1.8rem] gradient-border panel-shadow">
              <CardHeader>
                <CardTitle>Receive Payment</CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-4 rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4">
                  <p className="font-semibold">Cash Payment</p>

                  <Input
                    value={cashReceiptNumber}
                    onChange={(e) => setCashReceiptNumber(e.target.value)}
                    className="h-12 rounded-2xl"
                    placeholder="Receipt number"
                  />

                  <Input
                    type="number"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    className="h-12 rounded-2xl"
                    placeholder="Amount"
                  />

                  <Button
                    type="button"
                    className="h-12 rounded-2xl"
                    onClick={handleCashPayment}
                    disabled={createCashPaymentMutation.isPending}
                  >
                    {createCashPaymentMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Record Cash Payment
                  </Button>
                </div>

                <div className="space-y-4 rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4">
                  <p className="font-semibold">M-PESA Payment</p>

                  <Input
                    value={mpesaReceiptNumber}
                    onChange={(e) => setMpesaReceiptNumber(e.target.value)}
                    className="h-12 rounded-2xl"
                    placeholder="Receipt number"
                  />

                  <Input
                    type="number"
                    value={mpesaAmount}
                    onChange={(e) => setMpesaAmount(e.target.value)}
                    className="h-12 rounded-2xl"
                    placeholder="Amount"
                  />

                  <Input
                    value={mpesaPhoneNumber}
                    onChange={(e) => setMpesaPhoneNumber(e.target.value)}
                    className="h-12 rounded-2xl"
                    placeholder="Phone number"
                  />

                  <Button
                    type="button"
                    className="h-12 rounded-2xl"
                    onClick={handleMpesaPayment}
                    disabled={createMpesaPaymentRequestMutation.isPending}
                  >
                    {createMpesaPaymentRequestMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Create M-PESA Request
                  </Button>
                </div>

                <div className="space-y-3">
                  <p className="font-semibold">Payment History</p>

                  {payments.length === 0 ? (
                    <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-muted-foreground">
                      No payments recorded yet.
                    </div>
                  ) : (
                    payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4"
                      >
                        <p className="font-medium">
                          {payment.paymentMethod} • {formatMoney(payment.amount)}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Receipt: {payment.receiptNumber}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Status: {payment.statusCode}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Paid At: {formatDate(payment.paidAt)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </section>
    </div>
  );
}

