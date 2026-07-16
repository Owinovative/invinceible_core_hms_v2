import { PatientPortalShell } from "@/components/patient-portal/patient-portal-shell";

export default function PatientAccessPrescriptionsPage() {
  return (
    <PatientPortalShell title="Prescriptions">
      <div className="border border-border bg-surface-2 p-5 text-sm leading-7 text-muted-foreground">
        Prescriptions shown here are linked to the signed-in patient record.
      </div>
    </PatientPortalShell>
  );
}
