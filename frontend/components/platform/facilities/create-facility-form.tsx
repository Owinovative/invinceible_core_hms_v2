"use client";

import * as React from "react";
import { Building2, LocateFixed, MapPin, Save } from "lucide-react";
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
  latitude: z.string().min(1, "Latitude is required"),
  longitude: z.string().min(1, "Longitude is required"),
  mapLocationLabel: z.string().optional(),
  googleMapsUrl: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  mpesaShortcode: z.string().optional(),
  mpesaPaybill: z.string().optional(),
  mpesaAccountNumber: z.string().optional(),
  mpesaTillNumber: z.string().optional(),
  mpesaPochiNumber: z.string().optional(),
  mpesaEnabled: z.boolean().optional(),
  mpesaEnvironment: z.string().optional(),
  mpesaConsumerKey: z.string().optional(),
  mpesaConsumerSecret: z.string().optional(),
  mpesaPasskey: z.string().optional(),
  mpesaCallbackUrl: z.string().optional(),
  mpesaTransactionType: z.string().optional(),
  showCashOnInvoice: z.boolean().optional(),
  showPaybillOnInvoice: z.boolean().optional(),
  showTillOnInvoice: z.boolean().optional(),
  showPochiOnInvoice: z.boolean().optional(),
  shaFidCode: z.string().optional(),
  shaClaimStartNumber: z.string().optional(),
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
      latitude: "",
      longitude: "",
      mapLocationLabel: "",
      googleMapsUrl: "",
      timezone: "Africa/Nairobi",
      currency: "KES",
      mpesaShortcode: "",
      mpesaPaybill: "",
      mpesaAccountNumber: "",
      mpesaTillNumber: "",
      mpesaPochiNumber: "",
      mpesaEnabled: false,
      mpesaEnvironment: "sandbox",
      mpesaConsumerKey: "",
      mpesaConsumerSecret: "",
      mpesaPasskey: "",
      mpesaCallbackUrl: "",
      mpesaTransactionType: "",
      showCashOnInvoice: true,
      showPaybillOnInvoice: true,
      showTillOnInvoice: true,
      showPochiOnInvoice: true,
      shaFidCode: "",
      shaClaimStartNumber: "1",
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
        latitude: Number(values.latitude),
        longitude: Number(values.longitude),
        mapLocationLabel: values.mapLocationLabel || undefined,
        googleMapsUrl:
          values.googleMapsUrl ||
          `https://www.google.com/maps?q=${values.latitude},${values.longitude}`,
        timezone: values.timezone || undefined,
        currency: values.currency || undefined,
        mpesaShortcode: values.mpesaShortcode || undefined,
        mpesaPaybill: values.mpesaPaybill || undefined,
        mpesaAccountNumber: values.mpesaAccountNumber || undefined,
        mpesaTillNumber: values.mpesaTillNumber || undefined,
        mpesaPochiNumber: values.mpesaPochiNumber || undefined,
        mpesaEnabled: values.mpesaEnabled ?? false,
        mpesaEnvironment: values.mpesaEnvironment || undefined,
        mpesaConsumerKey: values.mpesaConsumerKey || undefined,
        mpesaConsumerSecret: values.mpesaConsumerSecret || undefined,
        mpesaPasskey: values.mpesaPasskey || undefined,
        mpesaCallbackUrl: values.mpesaCallbackUrl || undefined,
        mpesaTransactionType: values.mpesaTransactionType || undefined,
        showCashOnInvoice: values.showCashOnInvoice ?? true,
        showPaybillOnInvoice: values.showPaybillOnInvoice ?? true,
        showTillOnInvoice: values.showTillOnInvoice ?? true,
        showPochiOnInvoice: values.showPochiOnInvoice ?? true,
        shaFidCode: values.shaFidCode || undefined,
        shaClaimStartNumber: Number(values.shaClaimStartNumber || 1),
        shaClaimNextNumber: Number(values.shaClaimStartNumber || 1),
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
        latitude: "",
        longitude: "",
        mapLocationLabel: "",
        googleMapsUrl: "",
        timezone: "Africa/Nairobi",
        currency: "KES",
        mpesaShortcode: "",
        mpesaPaybill: "",
        mpesaAccountNumber: "",
        mpesaTillNumber: "",
        mpesaPochiNumber: "",
        mpesaEnabled: false,
        mpesaEnvironment: "sandbox",
        mpesaConsumerKey: "",
        mpesaConsumerSecret: "",
        mpesaPasskey: "",
        mpesaCallbackUrl: "",
        mpesaTransactionType: "",
        showCashOnInvoice: true,
        showPaybillOnInvoice: true,
        showTillOnInvoice: true,
        showPochiOnInvoice: true,
        shaFidCode: "",
        shaClaimStartNumber: "1",
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
      form.setValue("latitude", latitude, { shouldDirty: true, shouldValidate: true });
      form.setValue("longitude", longitude, { shouldDirty: true, shouldValidate: true });
      form.setValue("googleMapsUrl", `https://www.google.com/maps?q=${latitude},${longitude}`, {
        shouldDirty: true,
      });
    });
  };

  const handleLogoUpload = (file?: File | null) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      if (value) {
        form.setValue("logoUrl", value, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const openMapsPicker = () => {
    const latitude = form.getValues("latitude");
    const longitude = form.getValues("longitude");
    const url =
      latitude && longitude
        ? `https://www.google.com/maps?q=${latitude},${longitude}`
        : "https://www.google.com/maps";
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-module" />
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
                <FormItem className="md:col-span-2">
                  <FormLabel>Facility Logo</FormLabel>
                  <FormControl>
                    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                      <Input
                        className="h-11 rounded-xl"
                        placeholder="Logo data is stored after upload"
                        {...field}
                      />
                      <Input
                        type="file"
                        accept="image/*"
                        className="h-11 rounded-xl"
                        onChange={(event) =>
                          handleLogoUpload(event.target.files?.[0])
                        }
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Upload the facility logo as an image. It is used on
                    invoices, receipts, medical reports, and discharge
                    summaries.
                  </FormDescription>
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
              name="mpesaAccountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>M-PESA Account Number</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" placeholder="Account shown on invoice" {...field} />
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
                    Facility map location
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Coordinates are mandatory so the platform map can place the
                    facility accurately.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={useCurrentLocation}
                >
                  <LocateFixed className="mr-2 h-4 w-4" />
                  Use current location
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={openMapsPicker}
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  Open Google Maps
                </Button>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input className="h-11 rounded-xl" placeholder="-1.2921" {...field} />
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
                        <Input className="h-11 rounded-xl" placeholder="36.8219" {...field} />
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
                        <Input className="h-11 rounded-xl" placeholder="Building, estate, landmark" {...field} />
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
                        <Input className="h-11 rounded-xl" placeholder="https://www.google.com/maps?q=..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

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

            <FormField
              control={form.control}
              name="mpesaPochiNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pochi La Biashara</FormLabel>
                  <FormControl>
                    <Input className="h-11 rounded-xl" placeholder="Optional Pochi number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-xl border bg-background/65 p-4 md:col-span-2">
              <p className="font-semibold">Facility Daraja setup</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Use these only when this facility has its own Safaricom app.
                Empty credential fields fall back to backend environment variables.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="mpesaEnabled"
                  render={({ field }) => (
                    <label className="flex h-11 items-center gap-2 rounded-xl border bg-card px-3 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(field.value)}
                        onChange={(event) => field.onChange(event.target.checked)}
                      />
                      Enable Daraja for this facility
                    </label>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mpesaEnvironment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Environment</FormLabel>
                      <FormControl>
                        <Input className="h-11 rounded-xl" placeholder="sandbox or production" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mpesaConsumerKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Consumer Key</FormLabel>
                      <FormControl>
                        <Input className="h-11 rounded-xl" autoComplete="off" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mpesaConsumerSecret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Consumer Secret</FormLabel>
                      <FormControl>
                        <Input className="h-11 rounded-xl" type="password" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mpesaPasskey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lipa na M-PESA Passkey</FormLabel>
                      <FormControl>
                        <Input className="h-11 rounded-xl" type="password" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mpesaTransactionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transaction Type</FormLabel>
                      <FormControl>
                        <Input className="h-11 rounded-xl" placeholder="CustomerPayBillOnline" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mpesaCallbackUrl"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Callback URL</FormLabel>
                      <FormControl>
                        <Input className="h-11 rounded-xl" placeholder="https://your-backend.example.com/billing/payments/mpesa/callback" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="rounded-xl border bg-background/65 p-4 md:col-span-2">
              <p className="font-semibold">Invoice payment options</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Only selected options are printed on invoices and receipts.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                {[
                  ["showCashOnInvoice", "Cash"],
                  ["showPaybillOnInvoice", "Paybill"],
                  ["showTillOnInvoice", "Till"],
                  ["showPochiOnInvoice", "Pochi"],
                ].map(([name, label]) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name as keyof FacilityFormValues}
                    render={({ field }) => (
                      <label className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={Boolean(field.value)}
                          onChange={(event) =>
                            field.onChange(event.target.checked)
                          }
                        />
                        {label}
                      </label>
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-background/65 p-4 md:col-span-2">
              <p className="font-semibold">SHA claim settings</p>
              <p className="mt-1 text-sm text-muted-foreground">
                FID and claim numbering are used when SHA claim records are
                generated for the facility.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="shaFidCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SHA FID Code</FormLabel>
                      <FormControl>
                        <Input className="h-11 rounded-xl" placeholder="FID..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shaClaimStartNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Starting Claim Number</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" className="h-11 rounded-xl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-3 pt-2">
              <FormDescription>
                Facility code is generated automatically by the backend.
              </FormDescription>

              {createFacilityMutation.isError ? (
                <div className="rounded-xl border border-destructive/25 bg-destructive-soft px-4 py-3 text-sm text-destructive">
                  Failed to create facility.
                </div>
              ) : null}

              {successMessage ? (
                <div className="rounded-xl border border-success/25 bg-success-soft px-4 py-3 text-sm text-success">
                  {successMessage}
                  {createdCode ? ` Facility Code: ${createdCode}` : ""}
                </div>
              ) : null}

              <Button
                type="submit"
                className="h-11 rounded-md bg-primary px-6 text-white hover:bg-brand-strong"
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
