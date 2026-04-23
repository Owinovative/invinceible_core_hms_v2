"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CreditCard,
  Loader2,
  Trash2,
  Save,
} from "lucide-react";

import { useAuth } from "@/providers/auth-provider";
import { useInvoiceById } from "@/hooks/use-invoice-by-id";
import { useCreateCashPayment } from "@/hooks/use-create-cash-payment";
import { useCreateMpesaPaymentRequest } from "@/hooks/use-create-mpesa-payment-request";
import { useUpdateInvoiceItem } from "@/hooks/use-update-invoice-item";
import { useRemoveInvoiceItem } from "@/hooks/use-remove-invoice-item";

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
    default:
      return "border-cyan-500/20 bg-cyan-500/10 text-cyan-300";
  }
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const { user } = useAuth();
  const currentStaffId = user?.staffId ? Number(user.staffId) : undefined;

  const { data: invoice, isLoading } = useInvoiceById(id);
  const createCashPaymentMutation = useCreateCashPayment();
  const createMpesaPaymentMutation = useCreateMpesaPaymentRequest();
  const updateInvoiceItemMutation = useUpdateInvoiceItem();
  const removeInvoiceItemMutation = useRemoveInvoiceItem();

  const [message, setMessage] = React.useState<string | null>(null);

  const [cashAmount, setCashAmount] = React.useState("");
  const [cashReceiptNumber, setCashReceiptNumber] = React.useState("");

  const [mpesaAmount, setMpesaAmount] = React.useState("");
  const [mpesaReceiptNumber, setMpesaReceiptNumber] = React.useState("");
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = React.useState("");

  const [editItemId, setEditItemId] = React.useState<number | null>(null);
  const [editDescription, setEditDescription] = React.useState("");
  const [editQuantity, setEditQuantity] = React.useState("");
  const [editUnitPrice, setEditUnitPrice] = React.useState("");
  const [editNotes, setEditNotes] = React.useState("");
  const [removeReason, setRemoveReason] = React.useState("");

  const items = Array.isArray(invoice?.items) ? invoice.items : [];
  const payments = Array.isArray(invoice?.payments) ? invoice.payments : [];

  const handleStartEdit = (item: (typeof items)[number]) => {
    setEditItemId(item.id);
    setEditDescription(item.description || "");
    setEditQuantity(String(item.quantity || 1));
    setEditUnitPrice(String(item.unitPrice || 0));
    setEditNotes(item.notes || "");
    setRemoveReason("");
    setMessage(null);
  };

  const handleSaveItemEdit = async () => {
    if (!editItemId) return;

    await updateInvoiceItemMutation.mutateAsync({
      id: editItemId,
      payload: {
        description: editDescription,
        quantity: Number(editQuantity || 1),
        unitPrice: Number(editUnitPrice || 0),
        notes: editNotes || undefined,
        updatedByStaffId: currentStaffId,
      },
    });

    setMessage("Invoice item updated successfully.");
    setEditItemId(null);
  };

  const handleRemoveItem = async () => {
    if (!editItemId) return;
    if (!removeReason.trim()) {
      setMessage("Please enter a reason for removing the line.");
      return;
    }

    await removeInvoiceItemMutation.mutateAsync({
      id: editItemId,
      reason: removeReason.trim(),
    });

    setMessage("Invoice item removed successfully.");
    setEditItemId(null);
    setRemoveReason("");
  };

  const handleCashPayment = async () => {
    if (!invoice) return;
    await createCashPaymentMutation.mutateAsync({
      invoiceId: invoice.id,
      receiptNumber: cashReceiptNumber,
      amount: Number(cashAmount || 0),
      receivedByStaffId: currentStaffId,
    });

    setCashAmount("");
    setCashReceiptNumber("");
    setMessage("Cash payment recorded successfully.");
  };

  const handleMpesaRequest = async () => {
    if (!invoice) return;
    await createMpesaPaymentMutation.mutateAsync({
      invoiceId: invoice.id,
      receiptNumber: mpesaReceiptNumber,
      amount: Number(mpesaAmount || 0),
      phoneNumber: mpesaPhoneNumber,
      receivedByStaffId: currentStaffId,
    });

    setMpesaAmount("");
    setMpesaReceiptNumber("");
    setMpesaPhoneNumber("");
    setMessage("M-PESA request created successfully.");
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border gradient-border panel-shadow p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-600/10 via-cyan-500/5 to-transparent" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge className="rounded-full border-0 bg-emerald-600/10 px-3 py-1 text-emerald-700 dark:text-emerald-300">
              Invoice Details
            </Badge>

            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10">
                <CreditCard className="h-7 w-7 text-primary" />
              </div>

              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Invoice Workspace
                </h1>
                <p className="text-muted-foreground">
                  Review, edit lines, remove wrong charges, and record payments
                </p>
              </div>
            </div>
          </div>

          <Link href="/billing">
            <Button type="button" variant="outline" className="rounded-2xl">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Billing
            </Button>
          </Link>
        </div>
      </section>

      {message ? (
        <div className="rounded-[1.4rem] border border-cyan-500/20 bg-cyan-500/8 px-4 py-4 text-sm text-cyan-300">
          {message}
        </div>
      ) : null}

      {isLoading || !invoice ? (
        <Card className="rounded-[1.8rem] gradient-border panel-shadow">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Loading invoice...
          </CardContent>
        </Card>
      ) : (
        <>
          <section>
            <Card className="rounded-[1.8rem] gradient-border panel-shadow">
              <CardHeader>
                <CardTitle>Invoice Header</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="rounded-[1.3rem] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-lg font-bold">{invoice.facility?.name || "Hospital Name"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {invoice.facility?.address || "Hospital address"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {invoice.facility?.phone || "Phone"} • {invoice.facility?.email || "Email"}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Invoice Number</p>
                    <p className="mt-1 text-sm font-medium">{invoice.invoiceNumber}</p>
                  </div>

                  <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <div className="mt-2">
                      <Badge className={`rounded-full border px-3 py-1 ${statusTone(invoice.statusCode)}`}>
                        {invoice.statusCode}
                      </Badge>
                    </div>
                  </div>

                  <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Issued At</p>
                    <p className="mt-1 text-sm font-medium">{formatDate(invoice.issuedAt)}</p>
                  </div>

                  <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs text-muted-foreground">Patient</p>
                    <p className="mt-1 text-sm font-medium">{patientName(invoice.patient)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card className="rounded-[1.8rem] gradient-border panel-shadow">
              <CardHeader>
                <CardTitle>Invoice Lines</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {items.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-muted-foreground">
                    No invoice items found.
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
                            Qty: {item.quantity} • Unit: {formatMoney(item.unitPrice)} • Total:{" "}
                            {formatMoney(item.lineTotal)}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Auto: {item.isAutoGenerated ? "Yes" : "No"} • Removed:{" "}
                            {item.isRemoved ? "Yes" : "No"}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Notes: {item.notes || "—"}
                          </p>
                        </div>

                        {!item.isRemoved ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-2xl"
                            onClick={() => handleStartEdit(item)}
                          >
                            Edit Line
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}

                <div className="rounded-[1.2rem] border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <p className="text-sm">Subtotal: {formatMoney(invoice.subtotal)}</p>
                  <p className="text-sm">Discount: {formatMoney(invoice.discountAmount)}</p>
                  <p className="text-sm">Tax: {formatMoney(invoice.taxAmount)}</p>
                  <p className="mt-2 text-lg font-bold">Total: {formatMoney(invoice.totalAmount)}</p>
                  <p className="text-sm">Paid: {formatMoney(invoice.paidAmount)}</p>
                  <p className="text-sm">Balance: {formatMoney(invoice.balanceAmount)}</p>
                </div>
              </CardContent>
            </Card>
          </section>

          {editItemId ? (
            <section>
              <Card className="rounded-[1.8rem] gradient-border panel-shadow">
                <CardHeader>
                  <CardTitle>Edit Invoice Line</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
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
                      className="min-h-[100px] rounded-2xl"
                      placeholder="Only needed if removing this line"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      className="h-12 rounded-2xl"
                      onClick={handleSaveItemEdit}
                      disabled={updateInvoiceItemMutation.isPending}
                    >
                      {updateInvoiceItemMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Changes
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
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      Remove Line
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>
          ) : null}

          <section className="grid gap-6 xl:grid-cols-2">
            <Card className="rounded-[1.8rem] gradient-border panel-shadow">
              <CardHeader>
                <CardTitle>Cash Payment</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
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
              </CardContent>
            </Card>

            <Card className="rounded-[1.8rem] gradient-border panel-shadow">
              <CardHeader>
                <CardTitle>M-PESA Payment</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
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
                  onClick={handleMpesaRequest}
                  disabled={createMpesaPaymentMutation.isPending}
                >
                  {createMpesaPaymentMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Create M-PESA Request
                </Button>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card className="rounded-[1.8rem] gradient-border panel-shadow">
              <CardHeader>
                <CardTitle>Payments</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {payments.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-muted-foreground">
                    No payments recorded yet.
                  </div>
                ) : (
                  payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4"
                    >
                      <p className="font-semibold">
                        {payment.receiptNumber} • {payment.paymentMethod}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Amount: {formatMoney(payment.amount)}
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
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

