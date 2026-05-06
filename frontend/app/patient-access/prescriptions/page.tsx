import { PatientPortalShell } from "@/components/patient-portal/patient-portal-shell";

export default function PatientAccessPrescriptionsPage() {
  return (
    <PatientPortalShell title="Prescriptions">
      <div className="border border-sky-200 bg-[#f7fcff] p-5 text-sm leading-7 text-slate-700">
        Prescriptions shown here are linked to the signed-in patient record.
      </div>
    </PatientPortalShell>
  );
}
