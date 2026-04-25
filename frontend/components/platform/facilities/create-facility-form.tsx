"use client";

import * as React from "react";
import { Building2, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateFacility } from "@/hooks/use-create-facility";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const facilitySchema = z.object({
  name: z.string().min(1, "Facility name is required"),
  facilityType: z.string().optional(),
  county: z.string().optional(),
  town: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  altPhone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  website: z.string().optional(),
  address: z.string().optional(),
  postalAddress: z.string().optional(),
  registrationNo: z.string().optional(),
  taxPin: z.string().optional(),
  licenseNumber: z.string().optional(),
  logoUrl: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  mpesaShortcode: z.string().optional(),
  mpesaPaybill: z.string().optional(),
  mpesaTillNumber: z.string().optional(),
});

type FacilityFormValues = z.infer<typeof facilitySchema>;

export function CreateFacilityForm() {
  const createFacilityMutation = useCreateFacility();
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [createdCode, setCreatedCode] = React.useState<string | null>(null);

  const form = useForm<FacilityFormValues>({
    resolver: zodResolver(facilitySchema),
    defaultValues: {
      name: "",
      facilityType: "",
      county: "",
      town: "",
      country: "Kenya",
      phone: "",
      altPhone: "",
      email: "",
      website: "",
      address: "",
      postalAddress: "",
      registrationNo: "",
      taxPin: "",
      licenseNumber: "",
      logoUrl: "",
      timezone: "Africa/Nairobi",
      currency: "KES",
      mpesaShortcode: "",
      mpesaPaybill: "",
      mpesaTillNumber: "",
    },
  });

  const onSubmit = async (values: FacilityFormValues) => {
    setSuccessMessage(null);
    setCreatedCode(null);

    try {
      const created = await createFacilityMutation.mutateAsync({
        name: values.name,
        facilityType: values.facilityType || undefined,
        county: values.county || undefined,
        town: values.town || undefined,
        country: values.country || undefined,
        phone: values.phone || undefined,
        altPhone: values.altPhone || undefined,
        email: values.email || undefined,
        website: values.website || undefined,
        address: values.address || undefined,
        postalAddress: values.postalAddress || undefined,
        registrationNo: values.registrationNo || undefined,
        taxPin: values.taxPin || undefined,
        licenseNumber: values.licenseNumber || undefined,
        logoUrl: values.logoUrl || undefined,
        timezone: values.timezone || undefined,
        currency: values.currency || undefined,
        mpesaShortcode: values.mpesaShortcode || undefined,
        mpesaPaybill: values.mpesaPaybill || undefined,
        mpesaTillNumber: values.mpesaTillNumber || undefined,
        isHeadOffice: false,
        isDefault: false,
        isActive: true,
      });

      setSuccessMessage("Facility created successfully.");
      setCreatedCode(created.code);

      form.reset({
        name: "",
        facilityType: "",
        county: "",
        town: "",
        country: "Kenya",
        phone: "",
        altPhone: "",
        email: "",
        website: "",
        address: "",
        postalAddress: "",
        registrationNo: "",
        taxPin: "",
        licenseNumber: "",
        logoUrl: "",
        timezone: "Africa/Nairobi",
        currency: "KES",
        mpesaShortcode: "",
        mpesaPaybill: "",
        mpesaTillNumber: "",
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
          <Building2 className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          New Facility
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Facility Name</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" placeholder="Invinceible Core Hospital" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="facilityType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Facility Type</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" placeholder="Hospital, Clinic, Medical Centre..." {...field} />
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
                    <Input className="h-11 rounded-xl" placeholder="Nairobi" {...field} />
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
                    <Input className="h-11 rounded-xl" placeholder="Westlands" {...field} />
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
                  <FormLabel>Primary Phone</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" placeholder="+254..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="altPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alternative Phone</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" placeholder="+254..." {...field} />
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
                    <Input className="h-11 rounded-xl" type="email" placeholder="info@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" placeholder="https://example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Physical Address</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" placeholder="Street, building, area..." {...field} />
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
              name="registrationNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Registration Number</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="taxPin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax PIN</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="licenseNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>License Number</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="logoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo URL</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" placeholder="https://..." {...field} />
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
                    <Input className="h-11 rounded-xl" {...field} />
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
                  <FormLabel>M-PESA Shortcode</FormLabel>
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
                  <FormLabel>M-PESA Paybill</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" {...field} />
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
                  <FormLabel>M-PESA Till Number</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="md:col-span-2 space-y-3 pt-2">
              <FormDescription>
                Facility code is generated automatically by the backend.
              </FormDescription>

              {createFacilityMutation.isError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
                  Failed to create facility.
                </div>
              ) : null}

              {successMessage ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400">
                  {successMessage}
                  {createdCode ? ` Facility Code: ${createdCode}` : ""}
                </div>
              ) : null}

              <Button
                type="submit"
                className="h-11 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-500 px-6 text-white hover:opacity-95"
                disabled={createFacilityMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {createFacilityMutation.isPending ? "Saving..." : "Create Facility"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
