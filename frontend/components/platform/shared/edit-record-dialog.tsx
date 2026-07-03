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
  type?: "text" | "email" | "password" | "select" | "fileDataUrl";
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

  const handleFileUpload = (name: string, file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateValue(name, reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

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
                ) : field.type === "fileDataUrl" ? (
                  <div className="space-y-2">
                    {values[field.name]?.startsWith("data:image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={values[field.name]}
                        alt=""
                        className="h-16 w-16 rounded-full border object-cover"
                      />
                    ) : null}
                    <Input
                      id={field.name}
                      type="file"
                      accept="image/*"
                      disabled={field.disabled || isPending}
                      className="h-11 rounded-xl"
                      onChange={(event) =>
                        handleFileUpload(field.name, event.target.files?.[0])
                      }
                    />
                    <Input
                      value={values[field.name] ?? ""}
                      placeholder={field.placeholder}
                      disabled={field.disabled || isPending}
                      className="h-11 rounded-xl"
                      onChange={(event) =>
                        updateValue(field.name, event.target.value)
                      }
                    />
                  </div>
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
              <div className="rounded-xl border border-destructive/25 bg-destructive-soft px-4 py-3 text-sm text-destructive md:col-span-2">
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
