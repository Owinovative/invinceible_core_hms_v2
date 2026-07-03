import { PatientPortalShell } from "@/components/patient-portal/patient-portal-shell";

export default function PatientAccessProfilePage() {
  return (
    <PatientPortalShell title="Profile">
      <div className="border border-border bg-[#f7fcff] p-5 text-sm leading-7 text-muted-foreground">
        Patient profile data is loaded through the protected patient portal API.
      </div>
    </PatientPortalShell>
  );
}
