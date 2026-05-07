"use client";

import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintToolbar({
  onPrint,
  onDownload,
  isDownloading,
}: {
  onPrint?: () => void;
  onDownload?: () => void;
  isDownloading?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border border-sky-200 bg-white p-2">
      {onPrint ? (
        <Button variant="outline" size="sm" onClick={onPrint}>
          <Printer className="mr-2 h-4 w-4" />
          Preview print
        </Button>
      ) : null}
      {onDownload ? (
        <Button size="sm" onClick={onDownload} disabled={isDownloading}>
          <Download className="mr-2 h-4 w-4" />
          PDF
        </Button>
      ) : null}
    </div>
  );
}
