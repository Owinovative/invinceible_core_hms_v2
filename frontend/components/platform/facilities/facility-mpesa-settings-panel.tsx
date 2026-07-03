"use client";

import * as React from "react";
import { CreditCard, Save, ShieldCheck } from "lucide-react";
import { useFacilities } from "@/hooks/use-facilities";
import { useUpdateFacility } from "@/hooks/use-update-facility";
import type { Facility, UpdateFacilityPayload } from "@/services/facility-service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function textOrEmpty(value?: string | null) {
  return value ?? "";
}

function cleanText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

type MpesaSettingsForm = {
  mpesaEnabled: boolean;
  mpesaEnvironment: string;
  mpesaShortcode: string;
  mpesaPaybill: string;
  mpesaAccountNumber: string;
  mpesaTillNumber: string;
  mpesaPochiNumber: string;
  mpesaConsumerKey: string;
  mpesaConsumerSecret: string;
  mpesaPasskey: string;
  mpesaCallbackUrl: string;
  mpesaTransactionType: string;
  showCashOnInvoice: boolean;
  showPaybillOnInvoice: boolean;
  showTillOnInvoice: boolean;
  showPochiOnInvoice: boolean;
};

const defaultForm: MpesaSettingsForm = {
  mpesaEnabled: false,
  mpesaEnvironment: "sandbox",
  mpesaShortcode: "",
  mpesaPaybill: "",
  mpesaAccountNumber: "",
  mpesaTillNumber: "",
  mpesaPochiNumber: "",
  mpesaConsumerKey: "",
  mpesaConsumerSecret: "",
  mpesaPasskey: "",
  mpesaCallbackUrl: "",
  mpesaTransactionType: "CustomerPayBillOnline",
  showCashOnInvoice: true,
  showPaybillOnInvoice: true,
  showTillOnInvoice: true,
  showPochiOnInvoice: true,
};

function formFromFacility(facility: Facility): MpesaSettingsForm {
  return {
    mpesaEnabled: facility.mpesaEnabled ?? false,
    mpesaEnvironment: facility.mpesaEnvironment ?? "sandbox",
    mpesaShortcode: textOrEmpty(facility.mpesaShortcode),
    mpesaPaybill: textOrEmpty(facility.mpesaPaybill),
    mpesaAccountNumber: textOrEmpty(facility.mpesaAccountNumber),
    mpesaTillNumber: textOrEmpty(facility.mpesaTillNumber),
    mpesaPochiNumber: textOrEmpty(facility.mpesaPochiNumber),
    mpesaConsumerKey: "",
    mpesaConsumerSecret: "",
    mpesaPasskey: "",
    mpesaCallbackUrl: textOrEmpty(facility.mpesaCallbackUrl),
    mpesaTransactionType:
      facility.mpesaTransactionType ?? "CustomerPayBillOnline",
    showCashOnInvoice: facility.showCashOnInvoice ?? true,
    showPaybillOnInvoice: facility.showPaybillOnInvoice ?? true,
    showTillOnInvoice: facility.showTillOnInvoice ?? true,
    showPochiOnInvoice: facility.showPochiOnInvoice ?? true,
  };
}

function credentialStatus(isSaved?: boolean) {
  return isSaved ? "Saved — enter a new value only to replace it" : "Not saved";
}

export function FacilityMpesaSettingsPanel() {
  const { data: facilitiesData, isLoading } = useFacilities();
  const updateFacilityMutation = useUpdateFacility();
  const facilities = React.useMemo(
    () => (Array.isArray(facilitiesData) ? facilitiesData : []),
    [facilitiesData],
  );

  const [selectedFacilityId, setSelectedFacilityId] = React.useState<number | null>(
    null,
  );
  const [form, setForm] = React.useState<MpesaSettingsForm>(defaultForm);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const selectedFacility = React.useMemo(() => {
    return facilities.find((facility) => facility.id === selectedFacilityId) ?? null;
  }, [facilities, selectedFacilityId]);

  React.useEffect(() => {
    if (!selectedFacilityId && facilities[0]) {
      setSelectedFacilityId(facilities[0].id);
    }
  }, [facilities, selectedFacilityId]);

  React.useEffect(() => {
    if (selectedFacility) {
      setForm(formFromFacility(selectedFacility));
      setSuccessMessage(null);
      setErrorMessage(null);
    }
  }, [selectedFacility]);

  const updateText = (name: keyof MpesaSettingsForm, value: string) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const updateBoolean = (name: keyof MpesaSettingsForm, value: boolean) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedFacility) return;

    setSuccessMessage(null);
    setErrorMessage(null);

    const payload: UpdateFacilityPayload = {
      mpesaEnabled: form.mpesaEnabled,
      mpesaEnvironment: cleanText(form.mpesaEnvironment),
      mpesaShortcode: cleanText(form.mpesaShortcode),
      mpesaPaybill: cleanText(form.mpesaPaybill),
      mpesaAccountNumber: cleanText(form.mpesaAccountNumber),
      mpesaTillNumber: cleanText(form.mpesaTillNumber),
      mpesaPochiNumber: cleanText(form.mpesaPochiNumber),
      mpesaCallbackUrl: cleanText(form.mpesaCallbackUrl),
      mpesaTransactionType: cleanText(form.mpesaTransactionType),
      showCashOnInvoice: form.showCashOnInvoice,
      showPaybillOnInvoice: form.showPaybillOnInvoice,
      showTillOnInvoice: form.showTillOnInvoice,
      showPochiOnInvoice: form.showPochiOnInvoice,
    };

    const consumerKey = cleanText(form.mpesaConsumerKey);
    const consumerSecret = cleanText(form.mpesaConsumerSecret);
    const passkey = cleanText(form.mpesaPasskey);

    if (consumerKey) payload.mpesaConsumerKey = consumerKey;
    if (consumerSecret) payload.mpesaConsumerSecret = consumerSecret;
    if (passkey) payload.mpesaPasskey = passkey;

    try {
      await updateFacilityMutation.mutateAsync({
        id: selectedFacility.id,
        payload,
      });
      setSuccessMessage("Facility M-Pesa settings saved successfully.");
      setForm((current) => ({
        ...current,
        mpesaConsumerKey: "",
        mpesaConsumerSecret: "",
        mpesaPasskey: "",
      }));
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to save facility M-Pesa settings.",
      );
    }
  };

  return (
    <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-success" />
              Facility M-Pesa / Daraja Settings
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter each facility&apos;s own Daraja credentials so STK prompts use
              the Paybill/shortcode of the invoice facility.
            </p>
          </div>
          <Badge className="w-fit rounded-full border-0 bg-success/10 text-success">
            Per facility
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Facility</label>
            <select
              value={selectedFacilityId ?? ""}
              onChange={(event) => setSelectedFacilityId(Number(event.target.value))}
              className="h-11 w-full rounded-xl border bg-background px-3 text-sm"
              disabled={isLoading || updateFacilityMutation.isPending}
            >
              {facilities.map((facility) => (
                <option key={facility.id} value={facility.id}>
                  {facility.name} {facility.code ? `(${facility.code})` : ""}
                </option>
              ))}
            </select>
          </div>

          {selectedFacility ? (
            <div className="rounded-xl border bg-muted/30 p-4 text-sm md:col-span-2">
              <div className="flex flex-wrap items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-success" />
                <span className="font-semibold">Credential status:</span>
                <span>Consumer key: {credentialStatus(selectedFacility.hasMpesaConsumerKey)}</span>
                <span className="text-muted-foreground">•</span>
                <span>
                  Consumer secret: {credentialStatus(selectedFacility.hasMpesaConsumerSecret)}
                </span>
                <span className="text-muted-foreground">•</span>
                <span>Passkey: {credentialStatus(selectedFacility.hasMpesaPasskey)}</span>
              </div>
            </div>
          ) : null}

          <label className="flex h-11 items-center gap-2 rounded-xl border bg-background px-3 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={form.mpesaEnabled}
              onChange={(event) => updateBoolean("mpesaEnabled", event.target.checked)}
            />
            Enable M-Pesa STK prompting for this facility
          </label>

          <div className="space-y-2">
            <label className="text-sm font-medium">Daraja Environment</label>
            <select
              value={form.mpesaEnvironment}
              onChange={(event) => updateText("mpesaEnvironment", event.target.value)}
              className="h-11 w-full rounded-xl border bg-background px-3 text-sm"
            >
              <option value="sandbox">sandbox</option>
              <option value="production">production</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Transaction Type</label>
            <Input
              className="h-11 rounded-xl"
              placeholder="CustomerPayBillOnline"
              value={form.mpesaTransactionType}
              onChange={(event) => updateText("mpesaTransactionType", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Shortcode / Business Short Code</label>
            <Input
              className="h-11 rounded-xl"
              placeholder="174379"
              value={form.mpesaShortcode}
              onChange={(event) => updateText("mpesaShortcode", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Paybill</label>
            <Input
              className="h-11 rounded-xl"
              placeholder="174379"
              value={form.mpesaPaybill}
              onChange={(event) => updateText("mpesaPaybill", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Account Reference / Account Number</label>
            <Input
              className="h-11 rounded-xl"
              placeholder="Optional default account reference"
              value={form.mpesaAccountNumber}
              onChange={(event) => updateText("mpesaAccountNumber", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Till Number</label>
            <Input
              className="h-11 rounded-xl"
              placeholder="Optional till number"
              value={form.mpesaTillNumber}
              onChange={(event) => updateText("mpesaTillNumber", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Pochi La Biashara Number</label>
            <Input
              className="h-11 rounded-xl"
              placeholder="Optional Pochi number"
              value={form.mpesaPochiNumber}
              onChange={(event) => updateText("mpesaPochiNumber", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Consumer Key</label>
            <Input
              className="h-11 rounded-xl"
              autoComplete="off"
              placeholder={
                selectedFacility?.hasMpesaConsumerKey
                  ? "Saved — enter only to replace"
                  : "Enter Daraja consumer key"
              }
              value={form.mpesaConsumerKey}
              onChange={(event) => updateText("mpesaConsumerKey", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Consumer Secret</label>
            <Input
              className="h-11 rounded-xl"
              type="password"
              autoComplete="new-password"
              placeholder={
                selectedFacility?.hasMpesaConsumerSecret
                  ? "Saved — enter only to replace"
                  : "Enter Daraja consumer secret"
              }
              value={form.mpesaConsumerSecret}
              onChange={(event) => updateText("mpesaConsumerSecret", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Lipa na M-Pesa Passkey</label>
            <Input
              className="h-11 rounded-xl"
              type="password"
              autoComplete="new-password"
              placeholder={
                selectedFacility?.hasMpesaPasskey
                  ? "Saved — enter only to replace"
                  : "Enter STK passkey"
              }
              value={form.mpesaPasskey}
              onChange={(event) => updateText("mpesaPasskey", event.target.value)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Callback URL</label>
            <Input
              className="h-11 rounded-xl"
              placeholder="https://your-backend-domain.com/billing/payments/mpesa/callback"
              value={form.mpesaCallbackUrl}
              onChange={(event) => updateText("mpesaCallbackUrl", event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Use the backend API URL, not the frontend application URL.
            </p>
          </div>

          <div className="rounded-xl border bg-muted/30 p-4 md:col-span-2">
            <p className="font-semibold">Show payment options on invoices</p>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              {([
                ["showCashOnInvoice", "Cash"],
                ["showPaybillOnInvoice", "Paybill"],
                ["showTillOnInvoice", "Till"],
                ["showPochiOnInvoice", "Pochi"],
              ] as const).map(([name, label]) => (
                <label
                  key={name}
                  className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(form[name])}
                    onChange={(event) => updateBoolean(name, event.target.checked)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-xl border border-destructive/25 bg-destructive-soft px-4 py-3 text-sm text-destructive md:col-span-2">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-xl border border-success/25 bg-success-soft px-4 py-3 text-sm text-success md:col-span-2">
              {successMessage}
            </div>
          ) : null}

          <div className="flex justify-end md:col-span-2">
            <Button
              type="submit"
              className="h-11 rounded-xl bg-emerald-700 px-6 text-white hover:bg-emerald-800"
              disabled={!selectedFacility || updateFacilityMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {updateFacilityMutation.isPending ? "Saving..." : "Save M-Pesa Settings"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
