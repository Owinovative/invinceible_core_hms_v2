"use client";

import * as React from "react";
import { GitBranch, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateBranch } from "@/hooks/use-create-branch";
import { useFacilities } from "@/hooks/use-facilities";
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

const branchSchema = z.object({
  name: z.string().min(1, "Branch name is required"),
  facilityId: z.string().min(1, "Facility is required"),
  county: z.string().optional(),
  town: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
  postalAddress: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  mpesaShortcode: z.string().optional(),
  mpesaPaybill: z.string().optional(),
  mpesaAccountNumber: z.string().optional(),
  mpesaTillNumber: z.string().optional(),
  mpesaPochiNumber: z.string().optional(),
});

type BranchFormValues = z.infer<typeof branchSchema>;

export function CreateBranchForm() {
  const createBranchMutation = useCreateBranch();
  const { data: facilitiesData } = useFacilities();
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [createdCode, setCreatedCode] = React.useState<string | null>(null);

  const facilities = Array.isArray(facilitiesData) ? facilitiesData : [];

  const form = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      name: "",
      facilityId: "",
      county: "",
      town: "",
      country: "",
      phone: "",
      email: "",
      address: "",
      postalAddress: "",
      timezone: "",
      currency: "",
      mpesaShortcode: "",
      mpesaPaybill: "",
      mpesaAccountNumber: "",
      mpesaTillNumber: "",
      mpesaPochiNumber: "",
    },
  });

  const onSubmit = async (values: BranchFormValues) => {
    setSuccessMessage(null);
    setCreatedCode(null);

    try {
      const created = await createBranchMutation.mutateAsync({
        name: values.name,
        facilityId: Number(values.facilityId),
        county: values.county || undefined,
        town: values.town || undefined,
        country: values.country || undefined,
        phone: values.phone || undefined,
        email: values.email || undefined,
        address: values.address || undefined,
        postalAddress: values.postalAddress || undefined,
        timezone: values.timezone || undefined,
        currency: values.currency || undefined,
        mpesaShortcode: values.mpesaShortcode || undefined,
        mpesaPaybill: values.mpesaPaybill || undefined,
        mpesaAccountNumber: values.mpesaAccountNumber || undefined,
        mpesaTillNumber: values.mpesaTillNumber || undefined,
        mpesaPochiNumber: values.mpesaPochiNumber || undefined,
        isActive: true,
      });

      setSuccessMessage("Branch created successfully.");
      setCreatedCode(created.code);

      form.reset({
        name: "",
        facilityId: "",
        county: "",
        town: "",
        country: "",
        phone: "",
        email: "",
        address: "",
        postalAddress: "",
        timezone: "",
        currency: "",
        mpesaShortcode: "",
        mpesaPaybill: "",
        mpesaAccountNumber: "",
        mpesaTillNumber: "",
        mpesaPochiNumber: "",
      });
    } catch {
      setSuccessMessage(null);
      setCreatedCode(null);
    }
  };

  return (
    <Card className="rounded-[1.8rem] gradient-border panel-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          New Branch
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch Name</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" placeholder="Main Branch" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="county"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>County</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="town"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Town</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
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
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="postalAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Postal Address</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" placeholder="Africa/Nairobi" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" placeholder="KES" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mpesaShortcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>M-Pesa Shortcode</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mpesaPaybill"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>M-Pesa Paybill</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mpesaAccountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>M-Pesa Account Number</FormLabel>
                  <FormControl>
                    <Input
                      className="h-11 rounded-xl"
                      placeholder="Account shown on invoice"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mpesaTillNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>M-Pesa Till Number</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mpesaPochiNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pochi La Biashara</FormLabel>
                  <FormControl>
                    <Input
                      className="h-11 rounded-xl"
                      placeholder="Optional Pochi number"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="md:col-span-2 space-y-3 pt-2">
              {createBranchMutation.isError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
                  Failed to create branch.
                </div>
              ) : null}

              {successMessage ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400">
                  {successMessage}
                  {createdCode ? ` Branch Code: ${createdCode}` : ""}
                </div>
              ) : null}

              <Button
                type="submit"
                className="h-11 rounded-xl px-6"
                disabled={createBranchMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {createBranchMutation.isPending ? "Saving..." : "Create Branch"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
