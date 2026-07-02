import { PatientPortalShell } from "@/components/patient-portal/patient-portal-shell";

export default function PatientAccessPage() {
  return (
    <PatientPortalShell title="Your hospital record">
      <div className="grid gap-4 md:grid-cols-2">
        {[
          "Appointments",
          "Invoices and receipts",
          "Released lab results",
          "Prescriptions",
        ].map((item) => (
          <div key={item} className="border border-border bg-[#f7fcff] p-5">
            <p className="text-lg font-bold text-foreground">{item}</p>
          </div>
        ))}
      </div>
    </PatientPortalShell>
  );
}
