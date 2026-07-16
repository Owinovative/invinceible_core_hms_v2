import { PatientPortalShell } from "@/components/patient-portal/patient-portal-shell";

export default function PatientAccessInvoicesPage() {
  return (
    <PatientPortalShell title="Invoices and receipts">
      <div className="border border-border bg-surface-2 p-5 text-sm leading-7 text-muted-foreground">
        Patient invoices, receipts, and payment instructions load from protected
        billing records.
      </div>
    </PatientPortalShell>
  );
}
