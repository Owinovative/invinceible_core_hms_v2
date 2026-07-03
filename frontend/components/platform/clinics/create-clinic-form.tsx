"use client";

import * as React from "react";
import { Save, Stethoscope } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateClinic } from "@/hooks/use-create-clinic";
import { useFacilities } from "@/hooks/use-facilities";
import { useBranches } from "@/hooks/use-branches";
import { useDepartments } from "@/hooks/use-departments";
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

const clinicSchema = z.object({
  name: z.string().min(1, "Clinic name is required"),
  clinicType: z.string().min(1, "Clinic type is required"),
  facilityId: z.string().min(1, "Facility is required"),
  branchId: z.string().optional(),
  departmentId: z.string().min(1, "Department is required"),
  roomLocation: z.string().optional(),
  phoneExtension: z.string().optional(),
  consultationMinutes: z.string().optional(),
  maxDailyCapacity: z.string().optional(),
  serviceStartTime: z.string().optional(),
  serviceEndTime: z.string().optional(),
  isWalkInAllowed: z.string().optional(),
  isReferralRequired: z.string().optional(),
  notes: z.string().optional(),
});

type ClinicFormValues = z.infer<typeof clinicSchema>;

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return "Failed to create clinic.";
}

export function CreateClinicForm() {
  const createClinicMutation = useCreateClinic();
  const { data: facilitiesData } = useFacilities();
  const { data: branchesData } = useBranches();
  const { data: departmentsData } = useDepartments();

  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [createdCode, setCreatedCode] = React.useState<string | null>(null);

  const facilities = Array.isArray(facilitiesData) ? facilitiesData : [];
  const branches = Array.isArray(branchesData) ? branchesData : [];
  const departments = Array.isArray(departmentsData) ? departmentsData : [];

  const form = useForm<ClinicFormValues>({
    resolver: zodResolver(clinicSchema),
    defaultValues: {
      name: "",
      clinicType: "",
      facilityId: "",
      branchId: "",
      departmentId: "",
      roomLocation: "",
      phoneExtension: "",
      consultationMinutes: "15",
      maxDailyCapacity: "20",
      serviceStartTime: "",
      serviceEndTime: "",
      isWalkInAllowed: "true",
      isReferralRequired: "false",
      notes: "",
    },
  });

  const selectedFacilityId = form.watch("facilityId");
  const selectedBranchId = form.watch("branchId");

  const filteredBranches = React.useMemo(() => {
    if (!selectedFacilityId) return branches;
    return branches.filter(
      (branch) => branch.facilityId === Number(selectedFacilityId),
    );
  }, [branches, selectedFacilityId]);

  const filteredDepartments = React.useMemo(() => {
    if (!selectedFacilityId) return departments;

    return departments.filter((department) => {
      if (department.facilityId !== Number(selectedFacilityId)) return false;
      if (!selectedBranchId) return true;
      return !department.branchId || department.branchId === Number(selectedBranchId);
    });
  }, [departments, selectedFacilityId, selectedBranchId]);

  React.useEffect(() => {
    const currentBranchId = form.getValues("branchId");
    if (!currentBranchId) return;

    const exists = filteredBranches.some(
      (branch) => String(branch.id) === currentBranchId,
    );

    if (!exists) {
      form.setValue("branchId", "");
    }
  }, [filteredBranches, form]);

  React.useEffect(() => {
    const currentDepartmentId = form.getValues("departmentId");
    if (!currentDepartmentId) return;

    const exists = filteredDepartments.some(
      (department) => String(department.id) === currentDepartmentId,
    );

    if (!exists) {
      form.setValue("departmentId", "");
    }
  }, [filteredDepartments, form]);

  const onSubmit = async (values: ClinicFormValues) => {
    setSuccessMessage(null);
    setCreatedCode(null);

    try {
      const created = await createClinicMutation.mutateAsync({
        name: values.name.trim(),
        clinicType: values.clinicType.trim(),
        facilityId: Number(values.facilityId),
        branchId: values.branchId ? Number(values.branchId) : undefined,
        departmentId: Number(values.departmentId),
        roomLocation: values.roomLocation || undefined,
        phoneExtension: values.phoneExtension || undefined,
        consultationMinutes: values.consultationMinutes
          ? Number(values.consultationMinutes)
          : undefined,
        maxDailyCapacity: values.maxDailyCapacity
          ? Number(values.maxDailyCapacity)
          : undefined,
        serviceStartTime: values.serviceStartTime || undefined,
        serviceEndTime: values.serviceEndTime || undefined,
        isWalkInAllowed: values.isWalkInAllowed !== "false",
        isReferralRequired: values.isReferralRequired === "true",
        isActive: true,
        notes: values.notes || undefined,
      });

      setSuccessMessage("Clinic created successfully.");
      setCreatedCode(created.code);

      form.reset({
        name: "",
        clinicType: "",
        facilityId: "",
        branchId: "",
        departmentId: "",
        roomLocation: "",
        phoneExtension: "",
        consultationMinutes: "15",
        maxDailyCapacity: "20",
        serviceStartTime: "",
        serviceEndTime: "",
        isWalkInAllowed: "true",
        isReferralRequired: "false",
        notes: "",
      });
    } catch (error) {
      console.error("Create clinic error:", error);
      setSuccessMessage(null);
      setCreatedCode(null);
    }
  };

  return (
    <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-module" />
          New Clinic
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5 md:grid-cols-2">
            <FormField
              control={form.control}
              name="facilityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Facility</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select facility" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {facilities.map((facility) => (
                        <SelectItem key={facility.id} value={String(facility.id)}>
                          {facility.name}
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
              name="branchId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Optional branch" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredBranches.map((branch) => (
                        <SelectItem key={branch.id} value={String(branch.id)}>
                          {branch.name}
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
              name="departmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredDepartments.map((department) => (
                        <SelectItem key={department.id} value={String(department.id)}>
                          {department.name}
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clinic Name</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" placeholder="General OPD" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clinicType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clinic Type</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" placeholder="OUTPATIENT" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="roomLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Room Location</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phoneExtension"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Extension</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="consultationMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Consultation Minutes</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxDailyCapacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Daily Capacity</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="serviceStartTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Start Time</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="serviceEndTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service End Time</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isWalkInAllowed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Walk-in Allowed</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "true"}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isReferralRequired"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referral Required</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "false"}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
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
                    <Textarea className="min-h-[100px] rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="md:col-span-2 space-y-3 pt-2">
              {createClinicMutation.isError ? (
                <div className="rounded-xl border border-destructive/25 bg-destructive-soft px-4 py-3 text-sm text-destructive">
                  {getErrorMessage(createClinicMutation.error)}
                </div>
              ) : null}

              {successMessage ? (
                <div className="rounded-xl border border-success/25 bg-success-soft px-4 py-3 text-sm text-success">
                  {successMessage}
                  {createdCode ? ` Clinic Code: ${createdCode}` : ""}
                </div>
              ) : null}

              <Button
                type="submit"
                className="h-11 rounded-xl px-6"
                disabled={createClinicMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {createClinicMutation.isPending ? "Saving..." : "Create Clinic"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 

