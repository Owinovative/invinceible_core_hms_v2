"use client";

import * as React from "react";
import { GitBranch, LocateFixed, MapPin, Save } from "lucide-react";
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
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  mapLocationLabel: z.string().optional(),
  googleMapsUrl: z.string().optional(),
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
      latitude: "",
      longitude: "",
      mapLocationLabel: "",
      googleMapsUrl: "",
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
        latitude: values.latitude ? Number(values.latitude) : undefined,
        longitude: values.longitude ? Number(values.longitude) : undefined,
        mapLocationLabel: values.mapLocationLabel || undefined,
        googleMapsUrl:
          values.googleMapsUrl ||
          (values.latitude && values.longitude
            ? `https://www.google.com/maps?q=${values.latitude},${values.longitude}`
            : undefined),
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
        latitude: "",
        longitude: "",
        mapLocationLabel: "",
        googleMapsUrl: "",
      });
    } catch {
      setSuccessMessage(null);
      setCreatedCode(null);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition((position) => {
      const latitude = String(Number(position.coords.latitude.toFixed(7)));
      const longitude = String(Number(position.coords.longitude.toFixed(7)));
      form.setValue("latitude", latitude, { shouldDirty: true });
      form.setValue("longitude", longitude, { shouldDirty: true });
      form.setValue("googleMapsUrl", `https://www.google.com/maps?q=${latitude},${longitude}`, {
        shouldDirty: true,
      });
    });
  };

  const openMapsPicker = () => {
    const latitude = form.getValues("latitude");
    const longitude = form.getValues("longitude");
    window.open(
      latitude && longitude
        ? `https://www.google.com/maps?q=${latitude},${longitude}`
        : "https://www.google.com/maps",
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-module" />
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

            <div className="rounded-xl border bg-background/65 p-4 md:col-span-2">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="flex items-center gap-2 font-semibold">
                    <MapPin className="h-4 w-4 text-module" />
                    Branch map location
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Attach branch coordinates for maps, audit context, and
                    facility visibility.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={useCurrentLocation}
                  >
                    <LocateFixed className="mr-2 h-4 w-4" />
                    Current location
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={openMapsPicker}
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    Open Maps
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input className="h-11 rounded-xl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude</FormLabel>
                      <FormControl>
                        <Input className="h-11 rounded-xl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mapLocationLabel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location Label</FormLabel>
                      <FormControl>
                        <Input className="h-11 rounded-xl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="googleMapsUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Google Maps URL</FormLabel>
                      <FormControl>
                        <Input className="h-11 rounded-xl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-3 pt-2">
              {createBranchMutation.isError ? (
                <div className="rounded-xl border border-destructive/25 bg-destructive-soft px-4 py-3 text-sm text-destructive">
                  Failed to create branch.
                </div>
              ) : null}

              {successMessage ? (
                <div className="rounded-xl border border-success/25 bg-success-soft px-4 py-3 text-sm text-success">
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
