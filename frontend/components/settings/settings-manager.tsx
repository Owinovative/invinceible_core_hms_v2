"use client";

import * as React from "react";
import {
  BellRing,
  CreditCard,
  Hash,
  Loader2,
  Pill,
  Save,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
} from "lucide-react";
import { useSeedSettings } from "@/hooks/use-seed-settings";
import { useSettings } from "@/hooks/use-settings";
import { useUpdateSettingValue } from "@/hooks/use-update-setting-value";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/providers/auth-provider";

type SettingField = {
  key: string;
  label: string;
  description: string;
  defaultValue: string;
  type?: "text" | "number" | "select";
  options?: Array<{ label: string; value: string }>;
};

type SettingSection = {
  title: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  fields: SettingField[];
};

const SETTING_SECTIONS: SettingSection[] = [
  {
    title: "General Runtime",
    category: "GENERAL",
    icon: SlidersHorizontal,
    fields: [
      {
        key: "SYSTEM_TIMEZONE",
        label: "System Timezone",
        description: "Default timezone for operational dates and audit trails.",
        defaultValue: "Africa/Nairobi",
        type: "select",
        options: [
          { label: "Africa/Nairobi", value: "Africa/Nairobi" },
          { label: "UTC", value: "UTC" },
        ],
      },
      {
        key: "SYSTEM_CURRENCY",
        label: "System Currency",
        description: "Default currency used in billing and reports.",
        defaultValue: "KES",
        type: "select",
        options: [
          { label: "KES", value: "KES" },
          { label: "USD", value: "USD" },
          { label: "EUR", value: "EUR" },
        ],
      },
    ],
  },
  {
    title: "Numbering",
    category: "NUMBERING",
    icon: Hash,
    fields: [
      {
        key: "PATIENT_PREFIX",
        label: "Patient Prefix",
        description: "Prefix for generated patient numbers.",
        defaultValue: "PAT",
      },
      {
        key: "APPOINTMENT_PREFIX",
        label: "Appointment Prefix",
        description: "Prefix for generated appointment numbers.",
        defaultValue: "APT",
      },
      {
        key: "INVOICE_PREFIX",
        label: "Invoice Prefix",
        description: "Prefix for generated invoice numbers.",
        defaultValue: "INV",
      },
      {
        key: "RECEIPT_PREFIX",
        label: "Receipt Prefix",
        description: "Prefix for payment receipts.",
        defaultValue: "RCPT",
      },
    ],
  },
  {
    title: "Pharmacy Controls",
    category: "PHARMACY",
    icon: Pill,
    fields: [
      {
        key: "LOW_STOCK_THRESHOLD",
        label: "Default Low Stock Threshold",
        description:
          "Default reorder trigger for stock items without custom levels.",
        defaultValue: "20",
        type: "number",
      },
    ],
  },
  {
    title: "Notifications",
    category: "NOTIFICATIONS",
    icon: BellRing,
    fields: [
      {
        key: "ENABLE_NOTIFICATIONS",
        label: "Enable Notifications",
        description:
          "Controls whether in-app operational notifications are active.",
        defaultValue: "true",
        type: "select",
        options: [
          { label: "Enabled", value: "true" },
          { label: "Disabled", value: "false" },
        ],
      },
    ],
  },
  {
    title: "Payments",
    category: "PAYMENTS",
    icon: CreditCard,
    fields: [
      {
        key: "MPESA_SHORTCODE",
        label: "M-PESA Shortcode",
        description: "Primary shortcode for payment initiation.",
        defaultValue: "",
      },
      {
        key: "MPESA_CALLBACK_URL",
        label: "M-PESA Callback URL",
        description: "Backend callback endpoint for payment confirmations.",
        defaultValue: "",
      },
    ],
  },
];

const DEFAULT_VALUES = SETTING_SECTIONS.flatMap(
  (section) => section.fields,
).reduce(
  (acc, field) => {
    acc[field.key] = field.defaultValue;
    return acc;
  },
  {} as Record<string, string>,
);

export function SettingsManager({
  title = "Settings",
  badge = "System Configuration",
}: {
  title?: string;
  badge?: string;
}) {
  const { user } = useAuth();
  const { data, isLoading } = useSettings();
  const updateSettingMutation = useUpdateSettingValue();
  const seedSettingsMutation = useSeedSettings();
  const [values, setValues] =
    React.useState<Record<string, string>>(DEFAULT_VALUES);
  const [message, setMessage] = React.useState<string | null>(null);
  const canManageSettings = ["SUPER_ADMIN", "ADMIN", "FACILITY_ADMIN"].includes(
    user?.roleCode ?? "",
  );

  React.useEffect(() => {
    if (!Array.isArray(data)) return;

    const nextValues = { ...DEFAULT_VALUES };

    for (const setting of data) {
      nextValues[setting.settingKey] = setting.settingValue ?? "";
    }

    setValues(nextValues);
  }, [data]);

  const setValue = React.useCallback((key: string, value: string) => {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  }, []);

  const saveSection = async (section: SettingSection) => {
    setMessage(null);

    await Promise.all(
      section.fields.map((field) =>
        updateSettingMutation.mutateAsync({
          settingKey: field.key,
          value: values[field.key] ?? field.defaultValue,
        }),
      ),
    );

    setMessage(`${section.title} saved.`);
  };

  const handleSeedDefaults = async () => {
    setMessage(null);
    const result = await seedSettingsMutation.mutateAsync();
    setMessage(`Defaults checked. Created ${result.createdCount} setting(s).`);
  };

  if (!canManageSettings) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <Card className="w-full max-w-xl rounded-[1.8rem] surface-spotlight shadow-md">
          <CardContent className="px-6 py-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-500">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold">
              Administrator access required
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Facility settings are restricted to authorized administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border surface-spotlight shadow-md p-6 md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cyan-600/10 via-emerald-500/5 to-transparent" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge className="rounded-full border-0 bg-cyan-600/10 px-3 py-1 text-module">
              {badge}
            </Badge>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10">
                <Settings className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  {title}
                </h1>
                <p className="text-muted-foreground">
                  Runtime configuration for numbering, pharmacy controls,
                  payments, and notifications.
                </p>
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl"
            onClick={handleSeedDefaults}
            disabled={seedSettingsMutation.isPending}
          >
            {seedSettingsMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <SlidersHorizontal className="mr-2 h-4 w-4" />
            )}
            Seed Defaults
          </Button>
        </div>
      </section>

      {message ? (
        <div className="rounded-[1.2rem] border border-emerald-500/20 bg-success/10 px-4 py-3 text-sm text-emerald-300">
          {message}
        </div>
      ) : null}

      {isLoading ? (
        <Card className="rounded-[1.8rem] surface-spotlight shadow-md">
          <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading settings...
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-6 xl:grid-cols-2">
          {SETTING_SECTIONS.map((section) => {
            const Icon = section.icon;

            return (
              <Card
                key={section.category}
                className="rounded-[1.8rem] surface-spotlight shadow-md"
              >
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </span>
                    {section.title}
                  </CardTitle>
                  <Badge className="rounded-full border-0 bg-card/[0.06] text-muted-foreground">
                    {section.category}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-5">
                  {section.fields.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <label
                            htmlFor={field.key}
                            className="text-sm font-semibold"
                          >
                            {field.label}
                          </label>
                          <p className="text-xs text-muted-foreground">
                            {field.description}
                          </p>
                        </div>
                        <code className="text-xs text-muted-foreground">
                          {field.key}
                        </code>
                      </div>

                      {field.type === "select" ? (
                        <Select
                          value={values[field.key] ?? field.defaultValue}
                          onValueChange={(value) => setValue(field.key, value)}
                          disabled={updateSettingMutation.isPending}
                        >
                          <SelectTrigger
                            id={field.key}
                            className="h-11 rounded-xl"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(field.options ?? []).map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id={field.key}
                          type={field.type === "number" ? "number" : "text"}
                          className="h-11 rounded-xl"
                          value={values[field.key] ?? ""}
                          onChange={(event) =>
                            setValue(field.key, event.target.value)
                          }
                          disabled={updateSettingMutation.isPending}
                        />
                      )}
                    </div>
                  ))}

                  <div className="flex justify-end border-t pt-4">
                    <Button
                      type="button"
                      className="rounded-xl"
                      onClick={() => saveSection(section)}
                      disabled={updateSettingMutation.isPending}
                    >
                      {updateSettingMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Section
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}
    </div>
  );
}
