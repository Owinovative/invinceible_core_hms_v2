"use client";

import * as React from "react";
import { Save, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreatePatient } from "@/hooks/use-create-patient";
import { useScope } from "@/providers/scope-provider";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const patientSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  age: z.string().optional(),
  phonePrimary: z.string().optional(),
  phoneSecondary: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  occupation: z.string().optional(),
});

type PatientFormValues = z.infer<typeof patientSchema>;

function calculateAgeFromDob(dateOfBirth?: string) {
  if (!dateOfBirth) return "";

  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return "";

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();

  const hasHadBirthdayThisYear =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());

  if (!hasHadBirthdayThisYear) {
    age -= 1;
  }

  return age >= 0 ? String(age) : "";
}

function calculateDobFromAge(ageValue?: string) {
  if (!ageValue) return "";

  const age = Number(ageValue);
  if (!Number.isFinite(age) || age < 0) return "";

  const today = new Date();
  const dob = new Date(
    today.getFullYear() - age,
    today.getMonth(),
    today.getDate(),
  );

  const year = dob.getFullYear();
  const month = String(dob.getMonth() + 1).padStart(2, "0");
  const day = String(dob.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function CreatePatientForm() {
  const { facilityId } = useScope();
  const createPatientMutation = useCreatePatient();
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [createdNumber, setCreatedNumber] = React.useState<string | null>(null);
  const syncingRef = React.useRef(false);

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      gender: "",
      dateOfBirth: "",
      age: "",
      phonePrimary: "",
      phoneSecondary: "",
      email: "",
      occupation: "",
    },
  });

  const dateOfBirth = form.watch("dateOfBirth");
  const age = form.watch("age");

  React.useEffect(() => {
    if (syncingRef.current) return;
    syncingRef.current = true;

    const nextAge = calculateAgeFromDob(dateOfBirth);
    if (nextAge !== age) {
      form.setValue("age", nextAge, {
        shouldDirty: true,
        shouldValidate: false,
      });
    }

    syncingRef.current = false;
  }, [dateOfBirth, age, form]);

  const handleAgeChange = (value: string) => {
    const cleanValue = value.replace(/[^\d]/g, "");
    form.setValue("age", cleanValue, {
      shouldDirty: true,
      shouldValidate: true,
    });

    const nextDob = calculateDobFromAge(cleanValue);

    syncingRef.current = true;
    form.setValue("dateOfBirth", nextDob, {
      shouldDirty: true,
      shouldValidate: false,
    });
    syncingRef.current = false;
  };

  const onSubmit = async (values: PatientFormValues) => {
    setSuccessMessage(null);
    setCreatedNumber(null);

    if (!facilityId) return;

    try {
      const created = await createPatientMutation.mutateAsync({
        firstName: values.firstName,
        middleName: values.middleName || undefined,
        lastName: values.lastName,
        gender: values.gender || undefined,
        dateOfBirth: values.dateOfBirth || undefined,
        phonePrimary: values.phonePrimary || undefined,
        phoneSecondary: values.phoneSecondary || undefined,
        email: values.email || undefined,
        occupation: values.occupation || undefined,
        facilityId,
        isActive: true,
        isDeceased: false,
      });

      setSuccessMessage("Patient registered successfully.");
      setCreatedNumber(created.patientNumber);

      form.reset({
        firstName: "",
        middleName: "",
        lastName: "",
        gender: "",
        dateOfBirth: "",
        age: "",
        phonePrimary: "",
        phoneSecondary: "",
        email: "",
        occupation: "",
      });
    } catch {
      setSuccessMessage(null);
      setCreatedNumber(null);
    }
  };

  return (
    <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          New Patient
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5 md:grid-cols-2">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="middleName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Middle Name</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Age</FormLabel>
                  <FormControl>
                    <Input
                      className="h-11 rounded-xl"
                      inputMode="numeric"
                      placeholder="Enter age"
                      value={field.value || ""}
                      onChange={(e) => handleAgeChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phonePrimary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Phone</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phoneSecondary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Secondary Phone</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="occupation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Occupation</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="md:col-span-2 space-y-3 pt-2">
              {createPatientMutation.isError ? (
                <div className="rounded-xl border border-destructive/25 bg-destructive-soft px-4 py-3 text-sm text-destructive">
                  Failed to register patient.
                </div>
              ) : null}

              {successMessage ? (
                <div className="rounded-xl border border-success/25 bg-success-soft px-4 py-3 text-sm text-success">
                  {successMessage}
                  {createdNumber ? ` Patient Number: ${createdNumber}` : ""}
                </div>
              ) : null}

              <Button
                type="submit"
                className="h-11 rounded-xl px-6"
                disabled={createPatientMutation.isPending || !facilityId}
              >
                <Save className="mr-2 h-4 w-4" />
                {createPatientMutation.isPending ? "Saving..." : "Register Patient"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
