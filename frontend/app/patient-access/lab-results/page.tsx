import { PatientPortalShell } from "@/components/patient-portal/patient-portal-shell";

export default function PatientAccessLabResultsPage() {
  return (
    <PatientPortalShell title="Lab results">
      <div className="border border-border bg-[#f7fcff] p-5 text-sm leading-7 text-muted-foreground">
        Only released or resulted lab records are available to the patient
        portal.
      </div>
    </PatientPortalShell>
  );
}
