"use client";

import { CalendarPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CreateAppointmentForm } from "@/components/appointments/create-appointment-form";

export default function NewAppointmentPage() {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border surface-spotlight shadow-md p-6 md:p-8">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-cyan-500/5 to-transparent" />
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative space-y-3">
          <Badge className="rounded-full border-0 bg-primary/10 px-3 py-1 text-module">
            Scheduling
          </Badge>

          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10">
              <CalendarPlus className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                Create Appointment
              </h1>
              <p className="text-muted-foreground">
                Schedule patient visit and move the journey to queue and consultation.
              </p>
            </div>
          </div>
        </div>
      </section>

      <CreateAppointmentForm />
    </div>
  );
}
