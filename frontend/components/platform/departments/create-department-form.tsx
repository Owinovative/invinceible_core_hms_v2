"use client";

import * as React from "react";
import { Building2, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateDepartment } from "@/hooks/use-create-department";
import { useFacilities } from "@/hooks/use-facilities";
import { useBranches } from "@/hooks/use-branches";
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

const departmentSchema = z.object({
  name: z.string().min(1, "Department name is required"),
  facilityId: z.string().min(1, "Facility is required"),
  branchId: z.string().optional(),
});

type DepartmentFormValues = z.infer<typeof departmentSchema>;

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Failed to create department.";
}

export function CreateDepartmentForm() {
  const createDepartmentMutation = useCreateDepartment();
  const { data: facilitiesData } = useFacilities();
  const { data: branchesData } = useBranches();

  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [createdCode, setCreatedCode] = React.useState<string | null>(null);

  const facilities = Array.isArray(facilitiesData) ? facilitiesData : [];
  const branches = Array.isArray(branchesData) ? branchesData : [];

  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: "",
      facilityId: "",
      branchId: "",
    },
  });

  const selectedFacilityId = form.watch("facilityId");

  const filteredBranches = React.useMemo(() => {
    if (!selectedFacilityId) return branches;
    return branches.filter(
      (branch) => branch.facilityId === Number(selectedFacilityId),
    );
  }, [branches, selectedFacilityId]);

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

  const onSubmit = async (values: DepartmentFormValues) => {
    setSuccessMessage(null);
    setCreatedCode(null);

    try {
      const created = await createDepartmentMutation.mutateAsync({
        name: values.name.trim(),
        facilityId: Number(values.facilityId),
        branchId: values.branchId ? Number(values.branchId) : undefined,
        isActive: true,
      });

      setSuccessMessage("Department created successfully.");
      setCreatedCode(created.code);

      form.reset({
        name: "",
        facilityId: "",
        branchId: "",
      });
    } catch (error) {
      console.error("Create department error:", error);
      setSuccessMessage(null);
      setCreatedCode(null);
    }
  };

  return (
    <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-module" />
          New Department
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
              name="name"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Department Name</FormLabel>
                  <FormControl>
                    <Input
                      className="h-11 rounded-xl"
                      placeholder="Laboratory / Nursing / Accounts"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="md:col-span-2 space-y-3 pt-2">
              {createDepartmentMutation.isError ? (
                <div className="rounded-xl border border-destructive/25 bg-destructive-soft px-4 py-3 text-sm text-destructive">
                  {getErrorMessage(createDepartmentMutation.error)}
                </div>
              ) : null}

              {successMessage ? (
                <div className="rounded-xl border border-success/25 bg-success-soft px-4 py-3 text-sm text-success">
                  {successMessage}
                  {createdCode ? ` Department Code: ${createdCode}` : ""}
                </div>
              ) : null}

              <Button
                type="submit"
                className="h-11 rounded-xl px-6"
                disabled={createDepartmentMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {createDepartmentMutation.isPending ? "Saving..." : "Create Department"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
