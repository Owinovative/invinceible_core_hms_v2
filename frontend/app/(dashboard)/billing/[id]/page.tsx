"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Download,
  Loader2,
  RefreshCw,
  Trash2,
  Save,
} from "lucide-react";

import { useAuth } from "@/providers/auth-provider";
import { useInvoiceById } from "@/hooks/use-invoice-by-id";
import { useCreateCashPayment } from "@/hooks/use-create-cash-payment";
import { useCreateMpesaPaymentRequest } from "@/hooks/use-create-mpesa-payment-request";
import { useCreateShaClaim } from "@/hooks/use-create-sha-claim";
import { useResendMpesaPaymentRequest } from "@/hooks/use-resend-mpesa-payment-request";
import { useCheckMpesaPaymentStatus } from "@/hooks/use-check-mpesa-payment-status";
import { useCloseInvoice } from "@/hooks/use-close-invoice";
import { useUpdateInvoiceItem } from "@/hooks/use-update-invoice-item";
import { useRemoveInvoiceItem } from "@/hooks/use-remove-invoice-item";
import { downloadInvoicePdf } from "@/services/billing-service";
import { AddInvoiceLinePanel } from "@/components/billing/add-invoice-line-panel";
import { PrintableInvoice } from "@/components/billing/printable-invoice";

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
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const { user } = useAuth();
  const currentStaffId = user?.staffId ? Number(user.staffId) : undefined;

  const { data: invoice, isLoading } = useInvoiceById(id);
  const createCashPaymentMutation = useCreateCashPayment();
  const createMpesaPaymentMutation = useCreateMpesaPaymentRequest();
  const createShaClaimMutation = useCreateShaClaim();
  const resendMpesaPaymentMutation = useResendMpesaPaymentRequest();
  const checkMpesaPaymentStatusMutation = useCheckMpesaPaymentStatus();
  const closeInvoiceMutation = useCloseInvoice();
  const updateInvoiceItemMutation = useUpdateInvoiceItem();
  const removeInvoiceItemMutation = useRemoveInvoiceItem();

  const [message, setMessage] = React.useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = React.useState(false);

  const [cashAmount, setCashAmount] = React.useState("");

  const [mpesaAmount, setMpesaAmount] = React.useState("");
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = React.useState("");
  const [shaAmount, setShaAmount] = React.useState("");
  const [shaMemberNumber, setShaMemberNumber] = React.useState("");

  const [editItemId, setEditItemId] = React.useState<number | null>(null);
  const [editDescription, setEditDescription] = React.useState("");
  const [editQuantity, setEditQuantity] = React.useState("");
  const [editUnitPrice, setEditUnitPrice] = React.useState("");
  const [editNotes, setEditNotes] = React.useState("");
  const [removeReason, setRemoveReason] = React.useState("");

  const items = Array.isArray(invoice?.items) ? invoice.items : [];
  const payments = Array.isArray(invoice?.payments) ? invoice.payments : [];
  const invoiceStatus = invoice?.statusCode?.toUpperCase() || "";
  const isClosed = invoiceStatus === "CLOSED";
  const isFullyPaid = !!invoice && invoice.totalAmount > 0 && invoice.balanceAmount <= 0;

  React.useEffect(() => {
    if (!invoice) return;
    if (!mpesaAmount && invoice.balanceAmount > 0) {
      setMpesaAmount(String(invoice.balanceAmount));
    }
    if (!shaAmount && invoice.balanceAmount > 0) {
      setShaAmount(String(invoice.balanceAmount));
    }
    if (!mpesaPhoneNumber && invoice.patient?.phonePrimary) {
      setMpesaPhoneNumber(invoice.patient.phonePrimary);
    }
  }, [invoice, mpesaAmount, mpesaPhoneNumber, shaAmount]);

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
      amount: Number(cashAmount || 0),
      receivedByStaffId: currentStaffId,
    });

    setCashAmount("");
    setMessage("Cash payment recorded successfully.");
  };

  const handleMpesaRequest = async () => {
    if (!invoice) return;
    const result = await createMpesaPaymentMutation.mutateAsync({
      invoiceId: invoice.id,
      amount: Number(mpesaAmount || 0),
      phoneNumber: mpesaPhoneNumber,
      receivedByStaffId: currentStaffId,
    });

    if (!result.duplicatePrevented) {
      setMpesaAmount("");
      setMpesaPhoneNumber("");
    }
    setMessage(result.message || "M-PESA STK Push request processed.");
  };

  const handleShaCoverage = async () => {
    if (!invoice) return;
    const amount = Number(shaAmount || 0);
    if (amount <= 0) {
      setMessage("Enter a valid SHA cover amount.");
      return;
    }

    const created = await createShaClaimMutation.mutateAsync({
      facilityId: invoice.facilityId,
      branchId: invoice.branchId ?? undefined,
      patientId: invoice.patientId,
      invoiceId: invoice.id,
      claimedAmount: amount,
      memberNumber: shaMemberNumber.trim() || undefined,
      notes: "SHA payment cover created from invoice workspace.",
    });

    setMessage(
      `SHA cover ${created.claimNumber} recorded. Patient balance has been recalculated.`,
    );
    setShaAmount("");
    setShaMemberNumber("");
  };

  const handleDownloadInvoicePdf = async () => {
    if (!invoice) return;

    setMessage(null);
    setIsDownloadingPdf(true);

    try {
      await downloadInvoicePdf(invoice.id, invoice.invoiceNumber);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to download the invoice PDF.",
      );
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleCloseInvoice = async () => {
    if (!invoice) return;

    const updated = await closeInvoiceMutation.mutateAsync(invoice.id);
    setMessage(`Invoice ${updated.invoiceNumber} is closed.`);
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border surface-spotlight shadow-md p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-600/10 via-cyan-500/5 to-transparent" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge className="rounded-full border-0 bg-success/10 px-3 py-1 text-success">
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

          <div className="flex flex-wrap gap-3 print:hidden">
            <Button
              type="button"
              variant={isClosed ? "default" : "outline"}
              className="rounded-2xl"
              onClick={handleCloseInvoice}
              disabled={!invoice || !isFullyPaid || isClosed || closeInvoiceMutation.isPending}
            >
              {closeInvoiceMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              {isClosed ? "Invoice Closed" : "Close Invoice"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl"
              onClick={handleDownloadInvoicePdf}
              disabled={!invoice || isDownloadingPdf}
            >
              {isDownloadingPdf ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              PDF
            </Button>
            <Link href="/billing">
              <Button type="button" variant="outline" className="rounded-2xl">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Billing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {message ? (
        <div className="rounded-[1.4rem] border border-cyan-500/20 bg-cyan-500/8 px-4 py-4 text-sm text-cyan-300">
          {message}
        </div>
      ) : null}

      {isLoading || !invoice ? (
        <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Loading invoice...
          </CardContent>
        </Card>
      ) : (
        <>
          <div id="invoice-print-area" className="print:max-w-none">
            <PrintableInvoice invoice={invoice} />
          </div>

          <section className="print:hidden">
            <div className="overflow-hidden rounded-[1.2rem] border border-border bg-card shadow-sm">
              <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    Invoice Line Control
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Edit wrong lines, remove unnecessary billing lines, then
                    download the approved PDF invoice.
                  </p>
                </div>
                <Badge className="w-fit rounded border-0 bg-accent text-module">
                  {items.filter((item) => !item.isRemoved).length} active lines
                </Badge>
              </div>

              <div className="max-h-[360px] overflow-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-surface-2 text-xs uppercase text-foreground">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Item</th>
                      <th className="px-4 py-3">Qty</th>
                      <th className="px-4 py-3">Unit Price</th>
                      <th className="px-4 py-3">Total</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr
                        key={item.id}
                        className="border-t border-border"
                      >
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(item.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">
                            {item.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.sourceModule || item.billingService?.category || "Manual"}
                          </p>
                        </td>
                        <td className="px-4 py-3">{item.quantity}</td>
                        <td className="px-4 py-3">
                          {formatMoney(item.unitPrice)}
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          {formatMoney(item.lineTotal)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={`rounded border-0 ${
                              item.isRemoved
                                ? "bg-destructive-soft text-destructive"
                                : "bg-success-soft text-success"
                            }`}
                          >
                            {item.isRemoved ? "Removed" : "Active"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-xl"
                            onClick={() => handleStartEdit(item)}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {editItemId ? (
            <section>
              <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
                <CardHeader>
                  <CardTitle>Edit Invoice Line</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Description
                    </label>
                    <Input
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="h-12 rounded-2xl"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Quantity
                      </label>
                      <Input
                        type="number"
                        value={editQuantity}
                        onChange={(e) => setEditQuantity(e.target.value)}
                        className="h-12 rounded-2xl"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Unit Price
                      </label>
                      <Input
                        type="number"
                        value={editUnitPrice}
                        onChange={(e) => setEditUnitPrice(e.target.value)}
                        className="h-12 rounded-2xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Notes
                    </label>
                    <Textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="min-h-[100px] rounded-2xl"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Remove Reason
                    </label>
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

          <section>
            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle>Add Invoice Line</CardTitle>
              </CardHeader>

              <CardContent>
                <AddInvoiceLinePanel
                  invoiceId={invoice.id}
                  branchId={invoice.branchId}
                  currentStaffId={currentStaffId}
                  onMessage={setMessage}
                />
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle>Cash Payment</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-foreground">
                  Receipt number is generated by the system.
                </p>
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

            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle>M-PESA Payment</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-foreground">
                  STK requests are protected from duplicate sends. Use resend
                  from the payment list if the patient did not receive it.
                </p>
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

            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle>SHA Cover</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-foreground">
                  SHA can cover the full bill or part of it. Any remaining
                  balance stays open for cash, M-PESA, or another method.
                </p>
                <Input
                  type="number"
                  value={shaAmount}
                  onChange={(e) => setShaAmount(e.target.value)}
                  className="h-12 rounded-2xl"
                  placeholder="SHA amount"
                />
                <Input
                  value={shaMemberNumber}
                  onChange={(e) => setShaMemberNumber(e.target.value)}
                  className="h-12 rounded-2xl"
                  placeholder="SHA member number"
                />
                <Button
                  type="button"
                  className="h-12 rounded-2xl"
                  onClick={handleShaCoverage}
                  disabled={createShaClaimMutation.isPending || isClosed}
                >
                  {createShaClaimMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Apply SHA Cover
                </Button>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
              <CardHeader>
                <CardTitle>Payments</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {payments.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-card/[0.02] p-5 text-sm text-muted-foreground">
                    No payments recorded yet.
                  </div>
                ) : (
                  payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="rounded-[1.2rem] border border-white/10 bg-card/[0.03] p-4"
                    >
                      <p className="font-semibold">
                        {payment.receiptNumber} / {payment.paymentMethod}
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
                      {payment.paymentMethod === "MPESA" &&
                      payment.statusCode === "PENDING" ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {payment.checkoutRequestId ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-xl"
                              disabled={checkMpesaPaymentStatusMutation.isPending}
                              onClick={async () => {
                                if (!payment.checkoutRequestId) return;
                                const result =
                                  await checkMpesaPaymentStatusMutation.mutateAsync(
                                    payment.checkoutRequestId,
                                  );
                                setMessage(
                                  result.message || "M-PESA status checked.",
                                );
                              }}
                            >
                              {checkMpesaPaymentStatusMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="mr-2 h-4 w-4" />
                              )}
                              Check Status
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-xl"
                            disabled={resendMpesaPaymentMutation.isPending}
                            onClick={async () => {
                              const result =
                                await resendMpesaPaymentMutation.mutateAsync(
                                  payment.id,
                                );
                              setMessage(
                                result.message || "M-PESA STK Push resent.",
                              );
                            }}
                          >
                            Resend STK Push
                          </Button>
                        </div>
                      ) : null}
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
