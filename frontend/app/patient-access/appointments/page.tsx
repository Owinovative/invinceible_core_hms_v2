import { PatientPortalShell } from "@/components/patient-portal/patient-portal-shell";

export default function PatientAccessAppointmentsPage() {
  return (
    <PatientPortalShell title="Appointments">
      <div className="border border-border bg-[#f7fcff] p-5 text-sm leading-7 text-muted-foreground">
        Upcoming and past appointments are scoped to the signed-in patient only.
      </div>
    </PatientPortalShell>
  );
}
