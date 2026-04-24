"use client";

import * as React from "react";
import { Pencil, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type EditRecordOption = {
  label: string;
  value: string;
};

export type EditRecordField = {
  name: string;
  label: string;
  placeholder?: string;
  type?: "text" | "email" | "select";
  options?: EditRecordOption[];
  className?: string;
  disabled?: boolean;
};

type EditRecordDialogProps = {
  title: string;
  description?: string;
  fields: EditRecordField[];
  initialValues: Record<string, string>;
  isPending?: boolean;
  triggerLabel?: string;
  submitLabel?: string;
  errorMessage?: string;
  onSubmit: (values: Record<string, string>) => Promise<unknown> | unknown;
};

export function EditRecordDialog({
  title,
  description,
  fields,
  initialValues,
  isPending,
  triggerLabel = "Edit",
  submitLabel = "Save changes",
  errorMessage,
  onSubmit,
}: EditRecordDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [values, setValues] =
    React.useState<Record<string, string>>(initialValues);

  React.useEffect(() => {
    if (open) {
      setValues(initialValues);
    }
  }, [initialValues, open]);

  const updateValue = React.useCallback((name: string, value: string) => {
    setValues((current) => ({
      ...current,
      [name]: value,
    }));
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(values);
    setOpen(false);
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="rounded-xl"
        onClick={() => setOpen(true)}
      >
        <Pencil className="mr-2 h-4 w-4" />
        {triggerLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto rounded-2xl sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? (
              <DialogDescription>{description}</DialogDescription>
            ) : null}
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            {fields.map((field) => (
              <div
                key={field.name}
                className={cn("space-y-2", field.className)}
              >
                <Label htmlFor={field.name}>{field.label}</Label>
                {field.type === "select" ? (
                  <Select
                    value={values[field.name] ?? ""}
                    onValueChange={(value) => updateValue(field.name, value)}
                    disabled={field.disabled || isPending}
                  >
                    <SelectTrigger id={field.name} className="h-11 rounded-xl">
                      <SelectValue placeholder={field.placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.options ?? []).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={field.name}
                    type={field.type ?? "text"}
                    value={values[field.name] ?? ""}
                    placeholder={field.placeholder}
                    disabled={field.disabled || isPending}
                    className="h-11 rounded-xl"
                    onChange={(event) =>
                      updateValue(field.name, event.target.value)
                    }
                  />
                )}
              </div>
            ))}

            {errorMessage ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 md:col-span-2">
                {errorMessage}
              </div>
            ) : null}

            <div className="flex justify-end gap-2 border-t pt-4 md:col-span-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl" disabled={isPending}>
                <Save className="mr-2 h-4 w-4" />
                {isPending ? "Saving..." : submitLabel}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
