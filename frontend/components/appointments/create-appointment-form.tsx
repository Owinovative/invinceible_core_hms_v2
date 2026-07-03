"use client";

import * as React from "react";
import { CalendarPlus, Save, Search, UserRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateAppointment } from "@/hooks/use-create-appointment";
import { usePatients } from "@/hooks/use-patients";
import { useStaff } from "@/hooks/use-staff";
import { useClinics } from "@/hooks/use-clinics";
import type { Patient } from "@/types/patient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const appointmentSchema = z.object({
  appointmentDate: z.string().min(1, "Appointment date is required"),
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().optional(),
  clinicId: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  visitReason: z.string().optional(),
  statusCode: z.string().optional(),
  triagePriority: z.string().optional(),
  notes: z.string().optional(),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

function getPatientName(patient: Patient) {
  return [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(" ");
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeInput(date: Date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function getRoundedStartTime() {
  const now = new Date();
  now.setSeconds(0, 0);

  const minutes = now.getMinutes();
  const roundedMinutes = minutes <= 30 ? 30 : 60;

  if (roundedMinutes === 60) {
    now.setHours(now.getHours() + 1);
    now.setMinutes(0);
  } else {
    now.setMinutes(30);
  }

  return formatTimeInput(now);
}

function addMinutesToTime(time: string, minutesToAdd: number) {
  if (!time) return "";
  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return "";

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  date.setMinutes(date.getMinutes() + minutesToAdd);

  return formatTimeInput(date);
}

export function CreateAppointmentForm() {
  const createAppointmentMutation = useCreateAppointment();
  const { data: patientsData, isLoading: patientsLoading } = usePatients();
  const { data: staffData } = useStaff();
  const { data: clinicsData } = useClinics();

  const [patientSearch, setPatientSearch] = React.useState("");
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [createdNumber, setCreatedNumber] = React.useState<string | null>(null);

  const patients = patientsData ?? [];
  const clinicians = (staffData ?? []).filter((staff) => staff.isClinician);
  const clinics = clinicsData ?? [];

  const defaultStartTime = React.useMemo(() => getRoundedStartTime(), []);
  const defaultEndTime = React.useMemo(
    () => addMinutesToTime(defaultStartTime, 30),
    [defaultStartTime],
  );

  const filteredPatients = React.useMemo(() => {
    const query = patientSearch.trim().toLowerCase();
    if (!query) return patients.slice(0, 30);

    return patients
      .filter((patient) => {
        const haystack = [
          patient.patientNumber,
          patient.firstName,
          patient.middleName,
          patient.lastName,
          patient.phonePrimary,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      })
      .slice(0, 30);
  }, [patients, patientSearch]);

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      appointmentDate: formatDateInput(new Date()),
      patientId: "",
      doctorId: "",
      clinicId: "",
      startTime: defaultStartTime,
      endTime: defaultEndTime,
      visitReason: "",
      statusCode: "BOOKED",
      triagePriority: "NORMAL",
      notes: "",
    },
  });

  const watchedStartTime = form.watch("startTime");
  const touchedEndTimeRef = React.useRef(false);

  React.useEffect(() => {
    if (!watchedStartTime) return;
    if (touchedEndTimeRef.current) return;

    const nextEndTime = addMinutesToTime(watchedStartTime, 30);
    form.setValue("endTime", nextEndTime, {
      shouldDirty: true,
      shouldValidate: false,
    });
  }, [watchedStartTime, form]);

  React.useEffect(() => {
    const currentClinicId = form.getValues("clinicId");
    if (currentClinicId) return;
    if (clinics.length === 0) return;

    form.setValue("clinicId", String(clinics[0].id), {
      shouldDirty: false,
      shouldValidate: false,
    });
  }, [clinics, form]);

  const onSubmit = async (values: AppointmentFormValues) => {
    setSuccessMessage(null);
    setCreatedNumber(null);

    try {
      const created = await createAppointmentMutation.mutateAsync({
        appointmentNumber: "",
        appointmentDate: values.appointmentDate,
        patientId: Number(values.patientId),
        doctorId: values.doctorId ? Number(values.doctorId) : undefined,
        clinicId: values.clinicId ? Number(values.clinicId) : undefined,
        startTime: values.startTime || undefined,
        endTime: values.endTime || undefined,
        visitReason: values.visitReason || undefined,
        statusCode: values.statusCode || undefined,
        triagePriority: values.triagePriority || undefined,
        notes: values.notes || undefined,
      });

      setSuccessMessage("Appointment created successfully.");
      setCreatedNumber(created.appointmentNumber);

      const refreshedStartTime = getRoundedStartTime();

      form.reset({
        appointmentDate: formatDateInput(new Date()),
        patientId: "",
        doctorId: "",
        clinicId: clinics[0] ? String(clinics[0].id) : "",
        startTime: refreshedStartTime,
        endTime: addMinutesToTime(refreshedStartTime, 30),
        visitReason: "",
        statusCode: "BOOKED",
        triagePriority: "NORMAL",
        notes: "",
      });

      touchedEndTimeRef.current = false;
      setPatientSearch("");
    } catch {
      setSuccessMessage(null);
      setCreatedNumber(null);
    }
  };

  return (
    <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarPlus className="h-5 w-5 text-primary" />
          New Appointment
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-5 md:grid-cols-2"
          >
            <FormField
              control={form.control}
              name="appointmentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Appointment Date</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div />

            <div className="md:col-span-2 space-y-3 rounded-[1.3rem] border p-4">
              <div className="space-y-1">
                <p className="font-semibold">Select Patient</p>
                <p className="text-sm text-muted-foreground">
                  Search patient by number, name, or phone
                </p>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder="Search patient..."
                  className="h-11 rounded-xl pl-10"
                />
              </div>

              <FormField
                control={form.control}
                name="patientId"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border p-3">
                        {patientsLoading ? (
                          <p className="text-sm text-muted-foreground">
                            Loading patients...
                          </p>
                        ) : filteredPatients.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No patients found.
                          </p>
                        ) : (
                          filteredPatients.map((patient) => {
                            const selected = field.value === String(patient.id);

                            return (
                              <button
                                type="button"
                                key={patient.id}
                                onClick={() => field.onChange(String(patient.id))}
                                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                                  selected
                                    ? "border-primary bg-primary/5"
                                    : "hover:bg-muted/40"
                                }`}
                              >
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                                  <UserRound className="h-5 w-5 text-primary" />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-semibold">
                                    {getPatientName(patient)}
                                  </p>
                                  <p className="truncate text-sm text-muted-foreground">
                                    {patient.patientNumber} •{" "}
                                    {patient.phonePrimary || "No phone"}
                                  </p>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="doctorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Doctor</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select doctor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clinicians.map((doctor) => (
                        <SelectItem key={doctor.id} value={String(doctor.id)}>
                          {[doctor.firstName, doctor.lastName]
                            .filter(Boolean)
                            .join(" ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clinicId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clinic</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select clinic" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clinics.map((clinic) => (
                        <SelectItem key={clinic.id} value={String(clinic.id)}>
                          {clinic.name || clinic.code || `Clinic ${clinic.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Time</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Time</FormLabel>
                  <FormControl>
                    <Input
                      className="h-11 rounded-xl"
                      type="time"
                      {...field}
                      onChange={(e) => {
                        touchedEndTimeRef.current = true;
                        field.onChange(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="statusCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "BOOKED"}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="BOOKED">Booked</SelectItem>
                      <SelectItem value="WAITING">Waiting</SelectItem>
                      <SelectItem value="CHECKED_IN">Checked In</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="triagePriority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Triage Priority</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "NORMAL"}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="NORMAL">Normal</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="visitReason"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Visit Reason</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-[100px] rounded-xl"
                      placeholder="Reason for visit"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-[100px] rounded-xl"
                      placeholder="Extra notes"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="md:col-span-2 space-y-3 pt-2">
              {createAppointmentMutation.isError ? (
                <div className="rounded-xl border border-destructive/25 bg-destructive-soft px-4 py-3 text-sm text-destructive">
                  Failed to create appointment.
                </div>
              ) : null}

              {successMessage ? (
                <div className="rounded-xl border border-success/25 bg-success-soft px-4 py-3 text-sm text-success">
                  {successMessage}
                  {createdNumber ? ` Appointment Number: ${createdNumber}` : ""}
                </div>
              ) : null}

              <Button
                type="submit"
                className="h-11 rounded-xl px-6"
                disabled={createAppointmentMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {createAppointmentMutation.isPending
                  ? "Saving..."
                  : "Create Appointment"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
