"use client";

import * as React from "react";
import Link from "next/link";
import {
  BedDouble,
  Clock3,
  CreditCard,
  FileText,
  FlaskConical,
  Loader2,
  Pill,
  PlusCircle,
  Printer,
  Receipt,
  Search,
  Stethoscope,
  Trash2,
  Wallet,
  Smartphone,
  Banknote,
  CheckCircle2,
  Edit2
} from "lucide-react";

import { useBillingDashboard } from "@/hooks/use-billing-dashboard";
import { useInvoices } from "@/hooks/use-invoices";
import { useInvoiceById } from "@/hooks/use-invoice-by-id";
import { usePatients } from "@/hooks/use-patients";
import { useOpenPatientInvoice } from "@/hooks/use-open-patient-invoice";
import { usePatientBillingWorkspace } from "@/hooks/use-patient-billing-workspace";
import { useUpdateInvoiceItem } from "@/hooks/use-update-invoice-item";
import { useRemoveInvoiceItem } from "@/hooks/use-remove-invoice-item";
import { useCreateCashPayment } from "@/hooks/use-create-cash-payment";
import { useCreateMpesaPaymentRequest } from "@/hooks/use-create-mpesa-payment-request";
import { useAuth } from "@/providers/auth-provider";
import { useScope } from "@/providers/scope-provider";
import { AddInvoiceLinePanel } from "@/components/billing/add-invoice-line-panel";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { downloadPaymentReceiptPdf, type InvoiceItemRecord } from "@/services/billing-service";

// --- Minimalist Formatters ---
function formatMoney(value?: number | null) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
}

function patientName(patient?: { firstName?: string; middleName?: string | null; lastName?: string } | null) {
  if (!patient) return "Unknown";
  return [patient.firstName, patient.lastName].filter(Boolean).join(" ");
}

function statusTone(status?: string | null) {
  switch ((status || "").toUpperCase()) {
    case "CLOSED":
    case "PAID": return "border-success/25 bg-success-soft text-success";
    case "PARTIALLY_PAID": return "border-warning/30 bg-warning-soft text-warning";
    case "PENDING": return "border-border bg-cyan-50 text-module";
    case "REMOVED": return "border-destructive/25 bg-destructive-soft text-destructive";
    default: return "border-border bg-surface-2 text-muted-foreground";
  }
}

export default function BillingPage() {
  const { selectedBranchId } = useScope();
  const { user } = useAuth();

  const { data: dashboardData } = useBillingDashboard();
  const { data, isLoading } = useInvoices();
  const { data: patientData, isLoading: patientsLoading } = usePatients();
  const invoices = Array.isArray(data) ? data : [];
  const patients = React.useMemo(() => (Array.isArray(patientData) ? patientData : []), [patientData]);

  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState<number | null>(null);
  const [selectedPatientId, setSelectedPatientId] = React.useState<number | null>(null);
  const [patientSearch, setPatientSearch] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);

  const filteredPatients = React.useMemo(() => {
    const search = patientSearch.trim().toLowerCase();
    if (!search) return patients.slice(0, 40);
    return patients.filter((patient) => {
      return patientName(patient).toLowerCase().includes(search) || String(patient.patientNumber ?? "").toLowerCase().includes(search);
    }).slice(0, 40);
  }, [patients, patientSearch]);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) ?? null;
  const filteredInvoices = selectedPatientId ? invoices.filter((i) => i.patientId === selectedPatientId) : invoices;

  React.useEffect(() => {
    if (!selectedInvoiceId && filteredInvoices.length > 0) {
      setSelectedInvoiceId(filteredInvoices[0].id);
    }
  }, [filteredInvoices, selectedInvoiceId]);

  const { data: invoiceDetail, isLoading: detailLoading } = useInvoiceById(selectedInvoiceId);
  const { data: patientWorkspace } = usePatientBillingWorkspace(selectedPatientId);

  const updateInvoiceItemMutation = useUpdateInvoiceItem();
  const removeInvoiceItemMutation = useRemoveInvoiceItem();
  const createCashPaymentMutation = useCreateCashPayment();
  const createMpesaPaymentRequestMutation = useCreateMpesaPaymentRequest();
  const openPatientInvoiceMutation = useOpenPatientInvoice();

  const invoice = invoiceDetail ?? invoices.find((i) => i.id === selectedInvoiceId) ?? null;
  const items = Array.isArray(invoice?.items) ? invoice.items : [];
  const payments = Array.isArray(invoice?.payments) ? invoice.payments : [];

  const [editingItemId, setEditingItemId] = React.useState<number | null>(null);
  const [editDescription, setEditDescription] = React.useState("");
  const [editQuantity, setEditQuantity] = React.useState("");
  const [editUnitPrice, setEditUnitPrice] = React.useState("");
  const [editDiscountPercent, setEditDiscountPercent] = React.useState("");
  const [editNotes, setEditNotes] = React.useState("");
  const [removeReason, setRemoveReason] = React.useState("");

  const [cashAmount, setCashAmount] = React.useState("");
  const [mpesaAmount, setMpesaAmount] = React.useState("");
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = React.useState("");

  const startEdit = (item: InvoiceItemRecord) => {
    setEditingItemId(item.id);
    setEditDescription(item.description || "");
    setEditQuantity(String(item.quantity ?? 1));
    setEditUnitPrice(String(item.unitPrice ?? 0));
    setEditDiscountPercent(String(item.discountPercent ?? 0));
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
        discountPercent: Number(editDiscountPercent || 0),
        notes: editNotes || undefined,
      },
    });
    setEditingItemId(null);
    setMessage("Item updated.");
  };

  const handleRemoveItem = async () => {
    if (!editingItemId) return;
    if (!removeReason.trim()) { setMessage("Reason required."); return; }
    await removeInvoiceItemMutation.mutateAsync({ id: editingItemId, reason: removeReason.trim() });
    setEditingItemId(null);
    setRemoveReason("");
    setMessage("Item removed.");
  };

  const handleCashPayment = async () => {
    if (!invoice) return;
    await createCashPaymentMutation.mutateAsync({ invoiceId: invoice.id, amount: Number(cashAmount || 0), receivedByStaffId: user?.staffId ? Number(user.staffId) : undefined });
    setCashAmount("");
    setMessage("Cash logged.");
  };

  const handleMpesaPayment = async () => {
    if (!invoice) return;
    await createMpesaPaymentRequestMutation.mutateAsync({ invoiceId: invoice.id, amount: Number(mpesaAmount || 0), phoneNumber: mpesaPhoneNumber.trim(), receivedByStaffId: user?.staffId ? Number(user.staffId) : undefined });
    setMpesaAmount("");
    setMpesaPhoneNumber("");
    setMessage("M-PESA prompt sent.");
  };

  const handleOpenPatientInvoice = async () => {
    if (!selectedPatientId) return;
    const created = await openPatientInvoiceMutation.mutateAsync({ patientId: selectedPatientId, payload: { branchId: selectedBranchId, createdByStaffId: user?.staffId ? Number(user.staffId) : undefined } });
    setSelectedInvoiceId(created.id);
    setMessage(`Invoice created: ${created.invoiceNumber}`);
  };

  return (
    <div className="flex flex-col gap-6 animate-enter pb-12">
      
      {/* --- MINIMALIST TOP KPI BAR --- */}
      <div className="flex items-end justify-between px-2">
        <div className="flex gap-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-subtle">Total Outstanding</p>
            <p className="text-3xl font-black tracking-tight text-foreground">{formatMoney(dashboardData?.sums?.balanceAmount ?? 0)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-subtle">Pending</p>
            <p className="text-3xl font-black tracking-tight text-module">{dashboardData?.counts?.pendingInvoices ?? 0}</p>
          </div>
          <div className="hidden sm:block">
            <p className="text-[10px] font-bold uppercase tracking-wider text-subtle">Paid Today</p>
            <p className="text-3xl font-black tracking-tight text-success">{dashboardData?.counts?.paidInvoices ?? 0}</p>
          </div>
        </div>
        
        {message && (
          <div className="rounded-full bg-slate-800 px-4 py-1.5 text-xs font-medium text-white shadow-lg flex items-center gap-2">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" /> {message}
          </div>
        )}
      </div>

      {/* --- STACKED WORKSPACE --- */}
      <div className="flex flex-col gap-8">
        
        {/* TOP CARD: PATIENT QUEUE */}
        <div className="flex flex-col rounded-[2rem] bg-card/85 backdrop-blur-md shadow-md overflow-hidden max-h-[380px] shrink-0">
          <div className="border-b border-border/50 p-4 bg-card/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
              <Input
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="h-10 rounded-xl border-none bg-muted/50 pl-9 text-sm focus-visible:bg-card"
                placeholder="Search patients..."
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {patientsLoading ? (
              <p className="p-4 text-center text-xs text-subtle col-span-full">Loading...</p>
            ) : filteredPatients.map((patient) => {
              const patientInvoices = invoices.filter((i) => i.patientId === patient.id);
              const active = patient.id === selectedPatientId;
              return (
                <button
                  key={patient.id}
                  onClick={() => {
                    setSelectedPatientId(patient.id);
                    setSelectedInvoiceId(patientInvoices[0]?.id ?? null);
                    setMessage(null);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all ${
                    active ? "bg-cyan-50 shadow-sm border border-cyan-100/50" : "hover:bg-surface-2 border border-transparent"
                  }`}
                >
                  <div className="text-left min-w-0">
                    <p className={`truncate text-sm font-bold ${active ? "text-foreground" : "text-muted-foreground"}`}>
                      {patientName(patient)}
                    </p>
                    <p className="text-xs text-subtle truncate">{patient.patientNumber}</p>
                  </div>
                  {patientInvoices.length > 0 && (
                    <Badge className="bg-card border-border text-muted-foreground shadow-none hover:bg-card">
                      {patientInvoices.length}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* BOTTOM CARD: ACTIVE INVOICE & PAYMENTS */}
        <div className="flex flex-col rounded-[2rem] bg-card/85 backdrop-blur-md shadow-md overflow-hidden bg-card/60">
          {!selectedPatient ? (
            <div className="flex flex-col items-center justify-center text-subtle py-16">
              <CreditCard className="h-12 w-12 opacity-20 mb-4" />
              <p className="text-sm font-medium">Select a patient above to view financials</p>
            </div>
          ) : (
            <div className="flex flex-col">
              
              {/* Patient Header & Quick Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border p-6 bg-card/40 gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{patientName(selectedPatient)}</h2>
                  <div className="flex gap-4 mt-2 text-xs font-medium text-muted-foreground">
                    <span className="flex items-center gap-1"><Banknote className="h-3 w-3" /> Bal: {formatMoney(patientWorkspace?.summary.openBalance ?? 0)}</span>
                    <span className="flex items-center gap-1"><Clock3 className="h-3 w-3" /> Open: {(patientWorkspace?.summary.pendingLabOrders ?? 0) + (patientWorkspace?.summary.openPrescriptions ?? 0)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 border-border bg-card shadow-sm" asChild>
                    <Link href="/pharmacy"><Pill className="h-4 w-4 text-success" /></Link>
                  </Button>
                  <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 border-border bg-card shadow-sm" asChild>
                    <Link href="/lab"><FlaskConical className="h-4 w-4 text-module" /></Link>
                  </Button>
                  <Button onClick={handleOpenPatientInvoice} disabled={openPatientInvoiceMutation.isPending} className="rounded-xl h-10 px-4 shadow-sm bg-slate-900 text-white hover:bg-slate-800">
                    {openPatientInvoiceMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                    New Invoice
                  </Button>
                </div>
              </div>

              {/* Stacked Invoice Details and Payment Cards */}
              <div className="p-6 flex flex-col gap-8">
                
                {/* INVOICE DETAILS BLOCK */}
                <div className="space-y-6">
                  {/* Invoice Tab Selector */}
                  {filteredInvoices.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 border-b border-border">
                      {filteredInvoices.map((inv) => (
                        <button
                          key={inv.id}
                          onClick={() => setSelectedInvoiceId(inv.id)}
                          className={`flex-shrink-0 px-6 py-3 rounded-t-xl text-xs font-bold transition-all border border-b-0 ${
                            selectedInvoiceId === inv.id ? "bg-card border-border shadow-sm text-foreground translate-y-[1px]" : "bg-transparent border-transparent text-muted-foreground hover:bg-surface-2"
                          }`}
                        >
                          {inv.invoiceNumber}
                        </button>
                      ))}
                    </div>
                  )}

                  {detailLoading ? <div className="text-xs text-subtle">Loading invoice...</div> : !invoice ? (
                    <div className="text-xs text-subtle">No active invoice.</div>
                  ) : (
                    <div className="space-y-6">
                      {/* Sub-header */}
                      <div className="flex items-center justify-between">
                        <Badge className={`rounded-md px-3 py-1 shadow-none border ${statusTone(invoice.statusCode)}`}>
                          {invoice.statusCode}
                        </Badge>
                        <div className="text-right">
                          <p className="text-xs font-bold uppercase tracking-wider text-subtle">Balance Due</p>
                          <p className="text-3xl font-black text-destructive">{formatMoney(invoice.balanceAmount)}</p>
                        </div>
                      </div>

                      {/* Items Table (Minimalist) */}
                      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                        <div className="grid grid-cols-[1fr_80px_100px_40px] md:grid-cols-[1fr_100px_150px_60px] gap-4 bg-surface-2 px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-subtle">
                          <div>Item</div>
                          <div className="text-right">Price</div>
                          <div className="text-right">Total</div>
                          <div></div>
                        </div>
                        <div className="divide-y divide-slate-50">
                          {items.length === 0 ? (
                            <div className="p-6 text-center text-sm font-medium text-subtle">No items on this invoice.</div>
                          ) : items.map((item) => (
                            <div key={item.id} className="grid grid-cols-[1fr_80px_100px_40px] md:grid-cols-[1fr_100px_150px_60px] gap-4 px-6 py-4 items-center group hover:bg-surface-2/50 transition-colors">
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-foreground truncate">{item.description}</p>
                                <p className="text-xs font-medium text-subtle mt-1">Qty: {item.quantity}</p>
                              </div>
                              <div className="text-right text-sm font-medium text-muted-foreground">{formatMoney(item.unitPrice)}</div>
                              <div className="text-right text-base font-black text-foreground">{formatMoney(item.lineTotal)}</div>
                              <div className="text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => startEdit(item)} className="text-subtle hover:text-module p-2"><Edit2 className="h-4 w-4" /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Edit Inline Box */}
                      {editingItemId && (
                        <div className="rounded-2xl border border-border bg-surface-2 p-6 shadow-sm animate-enter">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <Input value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} type="number" placeholder="Qty" className="h-11 bg-card" />
                            <Input value={editUnitPrice} onChange={(e) => setEditUnitPrice(e.target.value)} type="number" placeholder="Price" className="h-11 bg-card" />
                            <Input value={editDiscountPercent} onChange={(e) => setEditDiscountPercent(e.target.value)} type="number" placeholder="Disc %" className="h-11 bg-card" />
                          </div>
                          <Textarea value={removeReason} onChange={(e) => setRemoveReason(e.target.value)} placeholder="Reason for removal (if deleting)" className="min-h-[50px] mb-4 bg-card text-sm" />
                          <div className="flex gap-3">
                            <Button onClick={handleUpdateItem} disabled={updateInvoiceItemMutation.isPending} className="h-11 text-sm rounded-xl bg-slate-900 text-white hover:bg-slate-800 px-8">Save Changes</Button>
                            <Button onClick={handleRemoveItem} disabled={removeInvoiceItemMutation.isPending} variant="destructive" className="h-11 text-sm rounded-xl px-6"><Trash2 className="h-4 w-4 mr-2"/> Remove Item</Button>
                            <Button onClick={() => setEditingItemId(null)} variant="outline" className="h-11 text-sm rounded-xl px-6">Cancel</Button>
                          </div>
                        </div>
                      )}

                      <AddInvoiceLinePanel invoiceId={invoice.id} branchId={invoice.branchId} currentStaffId={user?.staffId ? Number(user.staffId) : undefined} onMessage={setMessage} />
                    </div>
                  )}
                </div>

                {/* PAYMENTS & RECEIPT BLOCK */}
                {invoice && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-border pt-8">
                    
                    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                      <h3 className="text-sm font-bold text-foreground mb-5 flex items-center gap-2"><Wallet className="h-5 w-5 text-success"/> Receive Payment</h3>
                      
                      <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Input value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} type="number" placeholder="Cash Amount" className="h-12 bg-surface-2 border-none flex-1 text-base font-semibold" />
                          <Button onClick={handleCashPayment} disabled={createCashPaymentMutation.isPending} className="h-12 rounded-xl bg-success hover:bg-emerald-700 text-white px-8 text-base">Cash</Button>
                        </div>
                        <div className="flex flex-col gap-3 border-t border-slate-50 pt-6">
                          <div className="flex flex-col sm:flex-row gap-3">
                            <Input value={mpesaAmount} onChange={(e) => setMpesaAmount(e.target.value)} type="number" placeholder="M-PESA Amount" className="h-12 bg-surface-2 border-none sm:w-1/3 text-base font-semibold" />
                            <Input value={mpesaPhoneNumber} onChange={(e) => setMpesaPhoneNumber(e.target.value)} placeholder="Phone Number" className="h-12 bg-surface-2 border-none flex-1 text-base font-semibold" />
                          </div>
                          <Button onClick={handleMpesaPayment} disabled={createMpesaPaymentRequestMutation.isPending} className="h-12 rounded-xl bg-[#25D366] hover:bg-[#1DA851] text-white w-full text-base"><Smartphone className="mr-2 h-5 w-5"/> Push STK Prompt</Button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                       <div className="flex justify-between items-center mb-5">
                          <h3 className="text-sm font-bold text-foreground">Payment History</h3>
                          <Button variant="outline" size="sm" className="h-9 text-xs font-semibold rounded-xl border-border" asChild>
                            <Link href={`/billing/${invoice.id}`}><Printer className="mr-2 h-4 w-4"/> Print Final Invoice</Link>
                          </Button>
                       </div>
                       <div className="space-y-4">
                        {payments.length === 0 ? (
                          <div className="p-6 bg-surface-2 rounded-xl text-center">
                             <p className="text-sm font-medium text-subtle">No payments collected yet.</p>
                          </div>
                        ) : payments.map(p => (
                          <div key={p.id} className="text-sm flex justify-between items-center pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                            <div>
                              <p className="font-bold text-foreground">{p.paymentMethod}</p>
                              <p className="text-xs font-medium text-subtle mt-0.5">{formatDate(p.paidAt)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-black text-success">+{formatMoney(p.amount)}</p>
                              {p.statusCode === "COMPLETED" && (
                                <button onClick={() => void downloadPaymentReceiptPdf(p.id, p.receiptNumber)} className="text-[10px] font-bold uppercase tracking-wider text-module hover:text-module transition-colors mt-1">Download Receipt</button>
                              )}
                            </div>
                          </div>
                        ))}
                       </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
