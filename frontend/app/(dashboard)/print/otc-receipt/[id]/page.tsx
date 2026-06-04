"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Download,
  Loader2,
  Printer,
  Receipt,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

import {
  downloadOtcReceiptPdf,
  getOtcSale,
  type OtcSale,
} from "@/services/otc-sales-service";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// --- Minimalist Formatters ---
function formatMoney(value?: number | null) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value?: string | null) {
  if (!value) return "Not finalized";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not finalized" : date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function patientLabel(sale?: OtcSale | null) {
  if (!sale?.patient) return sale?.customerName || "Walk-in customer";
  const name = [sale.patient.firstName, sale.patient.lastName].filter(Boolean).join(" ");
  return `${name || "Linked patient"}${sale.patient.patientNumber ? ` (${sale.patient.patientNumber})` : ""}`;
}

function paymentStatusColor(status: string) {
  switch (status) {
    case 'COMPLETED':
    case 'PAID': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'PENDING': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'FAILED': return 'bg-rose-100 text-rose-700 border-rose-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export default function OtcReceiptPrintPage() {
  const params = useParams<{ id: string }>();
  const saleId = Number(params.id);
  const [downloading, setDownloading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const saleQuery = useQuery({
    queryKey: ["otc-receipt-preview", saleId],
    queryFn: () => getOtcSale(saleId),
    enabled: Number.isFinite(saleId) && saleId > 0,
  });

  const sale = saleQuery.data;

  const handleDownload = async () => {
    if (!sale) return;
    setDownloading(true);
    setError(null);
    try {
      await downloadOtcReceiptPdf(sale.id, sale.saleNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to download the OTC receipt PDF.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in pb-12">
      
      {/* HEADER ACTION BAR */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between px-2">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-4 text-cyan-600 hover:bg-cyan-50 hover:text-cyan-700 px-0">
            <Link href="/pharmacy/otc-sales">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to OTC Register
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-lg shadow-cyan-500/30">
              <Receipt className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-800">
                Receipt Preview
              </h1>
              <p className="text-sm font-medium text-slate-500 flex items-center gap-1 mt-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                Official generated document
              </p>
            </div>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleDownload}
          disabled={!sale || downloading}
          className="rounded-xl h-11 px-6 bg-slate-900 text-white hover:bg-slate-800 shadow-md transition-all active:scale-95"
        >
          {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Download PDF
        </Button>
      </div>

      {/* ERROR & LOADING STATES */}
      {saleQuery.isLoading && (
        <div className="rounded-[2rem] glass panel-shadow p-12 flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin mb-4 text-cyan-500" />
          <p className="font-semibold tracking-wide uppercase text-xs">Retrieving Receipt Data...</p>
        </div>
      )}

      {(saleQuery.error || error) && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 backdrop-blur-md p-6 flex items-start gap-4 text-rose-800 shadow-sm">
           <AlertCircle className="h-6 w-6 shrink-0 text-rose-600" />
           <div>
             <p className="font-bold text-sm">Failed to load preview</p>
             <p className="text-xs mt-1 opacity-90">{error || (saleQuery.error instanceof Error ? saleQuery.error.message : "An unknown error occurred.")}</p>
           </div>
        </div>
      )}

      {/* MAIN RECEIPT BODY */}
      {sale && (
        <div className="rounded-[2rem] glass panel-shadow overflow-hidden border border-white/60">
          
          {/* KPI Summary Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 bg-white/40">
            <div className="p-6">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sale Number</p>
              <p className="text-lg font-black text-slate-800 mt-1">{sale.saleNumber}</p>
            </div>
            <div className="p-6">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</p>
              <Badge className={`mt-1 shadow-none border ${paymentStatusColor(sale.paymentStatus)}`}>
                {sale.paymentStatus.replace(/_/g, " ")}
              </Badge>
            </div>
            <div className="p-6">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Paid</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{formatMoney(sale.totalAmount)}</p>
            </div>
            <div className="p-6">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Balance</p>
              <p className="text-2xl font-black text-rose-600 mt-1">{formatMoney(sale.balanceAmount)}</p>
            </div>
          </div>

          <div className="p-8 space-y-8 bg-white/60">
            
            {/* Meta Information */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 rounded-2xl bg-slate-50/50 border border-slate-100">
               <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Facility</p>
                  <p className="text-sm font-bold text-slate-800 mt-1 truncate">{sale.facility?.name || "System"}</p>
               </div>
               <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Branch</p>
                  <p className="text-sm font-bold text-slate-800 mt-1 truncate">{sale.branch?.name || "Main"}</p>
               </div>
               <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer</p>
                  <p className="text-sm font-bold text-slate-800 mt-1 truncate">{patientLabel(sale)}</p>
               </div>
               <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</p>
                  <p className="text-sm font-bold text-slate-800 mt-1">{formatDate(sale.soldAt)}</p>
               </div>
            </div>

            {/* Line Items Table */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Purchased Items ({sale.items.length})</h3>
              <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <div className="grid grid-cols-[1fr_80px_100px_120px] gap-4 bg-slate-50 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <div>Medicine</div>
                  <div className="text-center">Qty</div>
                  <div className="text-right">Unit Price</div>
                  <div className="text-right">Line Total</div>
                </div>
                <div className="divide-y divide-slate-50">
                  {sale.items.map((item) => (
                    <div key={item.id} className="grid grid-cols-[1fr_80px_100px_120px] gap-4 px-5 py-4 items-center">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{item.medicineNameSnapshot}</p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {[item.dosageFormSnapshot, item.strengthSnapshot].filter(Boolean).join(" / ") || "Standard Unit"}
                        </p>
                      </div>
                      <div className="text-center text-sm font-medium text-slate-600">{item.quantity}</div>
                      <div className="text-right text-sm text-slate-600">{formatMoney(item.unitPrice)}</div>
                      <div className="text-right text-sm font-black text-slate-800">{formatMoney(item.lineTotal)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Payment Lines */}
            <div>
               <h3 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Transaction History</h3>
               {sale.payments.length === 0 ? (
                  <p className="text-xs font-medium text-slate-400 italic bg-slate-50 p-4 rounded-xl text-center">No payment records found.</p>
               ) : (
                  <div className="grid gap-3">
                     {sale.payments.map((payment) => (
                        <div key={payment.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-white border border-slate-100 p-4 shadow-sm">
                           <div className="flex items-center gap-4">
                              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${payment.statusCode === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                 <CheckCircle2 className="h-5 w-5" />
                              </div>
                              <div>
                                 <p className="font-bold text-sm text-slate-800">{payment.paymentMethod.replace(/_/g, " ")}</p>
                                 <p className="text-[10px] font-medium text-slate-400 mt-0.5 uppercase tracking-wider">
                                    REF: {payment.transactionRef || payment.mpesaReceiptNumber || payment.insuranceClaimReference || "N/A"}
                                 </p>
                              </div>
                           </div>
                           <div className="text-left sm:text-right">
                              <p className="font-black text-lg text-emerald-600">
                                 +{formatMoney(payment.paymentMethod === "INSURANCE" ? (payment.insuranceCoveredAmount || payment.amount) : payment.amount)}
                              </p>
                              <Badge variant="outline" className={`mt-1 shadow-none text-[9px] ${paymentStatusColor(payment.statusCode)}`}>
                                 {payment.insuranceClaimStatus || payment.statusCode}
                              </Badge>
                           </div>
                        </div>
                     ))}
                  </div>
               )}
            </div>
            
            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-slate-100">
               <Button variant="outline" className="h-11 rounded-xl bg-white border-slate-200" asChild>
                  <Link href="/pharmacy/otc-sales">New Walk-in Sale</Link>
               </Button>
               <Button onClick={handleDownload} className="h-11 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white shadow-md">
                  <Printer className="mr-2 h-4 w-4" /> Print Final Receipt
               </Button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
