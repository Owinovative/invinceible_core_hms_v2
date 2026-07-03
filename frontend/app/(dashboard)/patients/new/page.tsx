"use client";

import { UserPlus } from "lucide-react";
import { CreatePatientForm } from "@/components/patients/create-patient-form";
import { Badge } from "@/components/ui/badge";

export default function NewPatientPage() {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border surface-spotlight shadow-md p-6 md:p-8">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-cyan-500/5 to-transparent" />
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative space-y-3">
          <Badge className="rounded-full border-0 bg-primary/10 px-3 py-1 text-module">
            Intake
          </Badge>

          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10">
              <UserPlus className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                Register Patient
              </h1>
              <p className="text-muted-foreground">
                Create a new patient record before appointment and consultation.
              </p>
            </div>
          </div>
        </div>
      </section>

      <CreatePatientForm />
    </div>
  );
}
