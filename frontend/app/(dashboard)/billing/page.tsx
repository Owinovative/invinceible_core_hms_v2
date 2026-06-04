"use client";

import * as React from "react";
import Link from "next/link";
import {
  BedDouble,
  CreditCard,
  Clock3,
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
    case "PAID": return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "PARTIALLY_PAID": return "border-amber-200 bg-amber-50 text-amber-700";
    case "PENDING": return "border-cyan-200 bg-cyan-50 text-cyan-700";
    case "REMOVED": return "border-red-200 bg-red-50 text-red-700";
    default: return "border-slate-200 bg-slate-50 text-slate-600";
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
    <div className="flex h-[calc(100vh-140px)] flex-col gap-6 animate-fade-in">
      
      {/* --- MINIMALIST TOP KPI BAR --- */}
      <div className="flex items-end justify-between px-2">
        <div className="flex gap-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Outstanding</p>
            <p className="text-3xl font-black tracking-tight text-slate-800">{formatMoney(dashboardData?.sums?.balanceAmount ?? 0)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending</p>
            <p className="text-3xl font-black tracking-tight text-cyan-600">{dashboardData?.counts?.pendingInvoices ?? 0}</p>
          </div>
          <div className="hidden sm:block">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Paid Today</p>
            <p className="text-3xl font-black tracking-tight text-emerald-600">{dashboardData?.counts?.paidInvoices ?? 0}</p>
          </div>
        </div>
        
        {message && (
          <div className="rounded-full bg-slate-800 px-4 py-1.5 text-xs font-medium text-white shadow-lg flex items-center gap-2">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" /> {message}
          </div>
        )}
      </div>

      {/* --- TWO-COLUMN WORKSPACE --- */}
      <div className="grid h-full min-h-0 grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        
        {/* LEFT PANE: PATIENT QUEUE */}
        <div className="flex flex-col rounded-[2rem] glass panel-shadow overflow-hidden">
          <div className="border-b border-slate-100/50 p-4 bg-white/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="h-10 rounded-xl border-none bg-slate-100/50 pl-9 text-sm focus-visible:bg-white"
                placeholder="Search patients..."
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            {patientsLoading ? (
              <p className="p-4 text-center text-xs text-slate-400">Loading...</p>
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
                    active ? "bg-cyan-50 shadow-sm border border-cyan-100/50" : "hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  <div className="text-left min-w-0">
                    <p className={`truncate text-sm font-bold ${active ? "text-cyan-900" : "text-slate-700"}`}>
                      {patientName(patient)}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{patient.patientNumber}</p>
                  </div>
                  {patientInvoices.length > 0 && (
                    <Badge className="bg-white border-slate-200 text-slate-600 shadow-none hover:bg-white">
                      {patientInvoices.length}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANE: ACTIVE INVOICE & PAYMENTS */}
        <div className="flex flex-col min-h-0 rounded-[2rem] glass panel-shadow overflow-hidden bg-white/60">
          {!selectedPatient ? (
            <div className="flex h-full flex-col items-center justify-center text-slate-400">
              <CreditCard className="h-12 w-12 opacity-20 mb-4" />
              <p className="text-sm font-medium">Select a patient to view financials</p>
            </div>
          ) : (
            <div className="flex h-full flex-col overflow-y-auto custom-scrollbar">
              
              {/* Patient Header & Quick Actions */}
              <div className="flex items-center justify-between border-b border-slate-100 p-6 bg-white/40">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">{patientName(selectedPatient)}</h2>
                  <div className="flex gap-4 mt-2 text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1"><Banknote className="h-3 w-3" /> Bal: {formatMoney(patientWorkspace?.summary.openBalance ?? 0)}</span>
                    <span className="flex items-center gap-1"><Clock3 className="h-3 w-3" /> Open: {(patientWorkspace?.summary.pendingLabOrders ?? 0) + (patientWorkspace?.summary.openPrescriptions ?? 0)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 border-slate-200 bg-white shadow-sm" asChild>
                    <Link href="/pharmacy"><Pill className="h-4 w-4 text-emerald-600" /></Link>
                  </Button>
                  <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 border-slate-200 bg-white shadow-sm" asChild>
                    <Link href="/lab"><FlaskConical className="h-4 w-4 text-cyan-600" /></Link>
                  </Button>
                  <Button onClick={handleOpenPatientInvoice} disabled={openPatientInvoiceMutation.isPending} className="rounded-xl h-10 px-4 shadow-sm bg-slate-900 text-white hover:bg-slate-800">
                    {openPatientInvoiceMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                    New Invoice
                  </Button>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-8">
                
                {/* INVOICE DETAILS */}
                <div className="space-y-6">
                  {/* Invoice Tab Selector */}
                  {filteredInvoices.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                      {filteredInvoices.map((inv) => (
                        <button
                          key={inv.id}
                          onClick={() => setSelectedInvoiceId(inv.id)}
                          className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                            selectedInvoiceId === inv.id ? "bg-white border-slate-200 shadow-sm text-slate-800" : "bg-transparent border-transparent text-slate-500 hover:bg-slate-100"
                          }`}
                        >
                          {inv.invoiceNumber}
                        </button>
                      ))}
                    </div>
                  )}

                  {detailLoading ? <div className="text-xs text-slate-400">Loading invoice...</div> : !invoice ? (
                    <div className="text-xs text-slate-400">No active invoice.</div>
                  ) : (
                    <div className="space-y-6">
                      {/* Sub-header */}
                      <div className="flex items-center justify-between">
                        <Badge className={`rounded-md px-2 shadow-none border ${statusTone(invoice.statusCode)}`}>
                          {invoice.statusCode}
                        </Badge>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">Balance Due</p>
                          <p className="text-2xl font-black text-rose-600">{formatMoney(invoice.balanceAmount)}</p>
                        </div>
                      </div>

                      {/* Items Table (Minimalist) */}
                      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                        <div className="grid grid-cols-[1fr_80px_100px_40px] gap-4 bg-slate-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <div>Item</div>
                          <div className="text-right">Price</div>
                          <div className="text-right">Total</div>
                          <div></div>
                        </div>
                        <div className="divide-y divide-slate-50">
                          {items.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-400">No items on this invoice.</div>
                          ) : items.map((item) => (
                            <div key={item.id} className="grid grid-cols-[1fr_80px_100px_40px] gap-4 px-4 py-3 items-center group hover:bg-slate-50/50 transition-colors">
                              <div>
                                <p className="text-sm font-semibold text-slate-800 truncate">{item.description}</p>
                                <p className="text-[10px] text-slate-400">Qty: {item.quantity}</p>
                              </div>
                              <div className="text-right text-sm text-slate-600">{formatMoney(item.unitPrice)}</div>
                              <div className="text-right text-sm font-bold text-slate-800">{formatMoney(item.lineTotal)}</div>
                              <div className="text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => startEdit(item)} className="text-slate-400 hover:text-cyan-600"><Edit2 className="h-4 w-4" /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Edit Inline Box */}
                      {editingItemId && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm animate-fade-in">
                          <div className="grid grid-cols-3 gap-3 mb-3">
                            <Input value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} type="number" placeholder="Qty" className="h-9 bg-white" />
                            <Input value={editUnitPrice} onChange={(e) => setEditUnitPrice(e.target.value)} type="number" placeholder="Price" className="h-9 bg-white" />
                            <Input value={editDiscountPercent} onChange={(e) => setEditDiscountPercent(e.target.value)} type="number" placeholder="Disc %" className="h-9 bg-white" />
                          </div>
                          <Textarea value={removeReason} onChange={(e) => setRemoveReason(e.target.value)} placeholder="Reason for removal (if deleting)" className="min-h-[40px] mb-3 bg-white text-xs" />
                          <div className="flex gap-2">
                            <Button onClick={handleUpdateItem} disabled={updateInvoiceItemMutation.isPending} className="h-9 text-xs rounded-xl bg-slate-900 text-white hover:bg-slate-800 flex-1">Save</Button>
                            <Button onClick={handleRemoveItem} disabled={removeInvoiceItemMutation.isPending} variant="destructive" className="h-9 text-xs rounded-xl flex-1"><Trash2 className="h-3 w-3 mr-2"/> Remove</Button>
                            <Button onClick={() => setEditingItemId(null)} variant="outline" className="h-9 text-xs rounded-xl">Cancel</Button>
                          </div>
                        </div>
                      )}

                      <AddInvoiceLinePanel invoiceId={invoice.id} branchId={invoice.branchId} currentStaffId={user?.staffId ? Number(user.staffId) : undefined} onMessage={setMessage} />
                    </div>
                  )}
                </div>

                {/* PAYMENTS & RECEIPT (Right Side of Right Pane) */}
                {invoice && (
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                      <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><Wallet className="h-4 w-4 text-emerald-600"/> Receive Payment</h3>
                      
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <Input value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} type="number" placeholder="Cash Amt" className="h-10 bg-slate-50 border-none flex-1" />
                          <Button onClick={handleCashPayment} disabled={createCashPaymentMutation.isPending} className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">Cash</Button>
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <Input value={mpesaAmount} onChange={(e) => setMpesaAmount(e.target.value)} type="number" placeholder="M-PESA Amt" className="h-10 bg-slate-50 border-none w-1/3" />
                            <Input value={mpesaPhoneNumber} onChange={(e) => setMpesaPhoneNumber(e.target.value)} placeholder="Phone" className="h-10 bg-slate-50 border-none flex-1" />
                          </div>
                          <Button onClick={handleMpesaPayment} disabled={createMpesaPaymentRequestMutation.isPending} className="h-10 rounded-xl bg-[#25D366] hover:bg-[#1DA851] text-white w-full"><Smartphone className="mr-2 h-4 w-4"/> Push STK</Button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                       <div className="flex justify-between items-center mb-4">
                          <h3 className="text-sm font-bold text-slate-800">History</h3>
                          <Button variant="outline" size="sm" className="h-7 text-[10px] rounded-lg border-slate-200" asChild>
                            <Link href={`/billing/${invoice.id}`}><Printer className="mr-1 h-3 w-3"/> Print Invoice</Link>
                          </Button>
                       </div>
                       <div className="space-y-3">
                        {payments.length === 0 ? (
                          <p className="text-xs text-slate-400">No payments yet.</p>
                        ) : payments.map(p => (
                          <div key={p.id} className="text-xs flex justify-between items-start pb-2 border-b border-slate-50 last:border-0 last:pb-0">
                            <div>
                              <p className="font-bold text-slate-700">{p.paymentMethod}</p>
                              <p className="text-slate-400">{formatDate(p.paidAt)}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-emerald-600">+{formatMoney(p.amount)}</p>
                              {p.statusCode === "COMPLETED" && (
                                <button onClick={() => void downloadPaymentReceiptPdf(p.id, p.receiptNumber)} className="text-[9px] text-cyan-600 hover:underline mt-1">Receipt</button>
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
