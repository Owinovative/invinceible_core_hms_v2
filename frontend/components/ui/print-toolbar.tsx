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
      <Button variant="outline" size="sm" onClick={onPrint ?? (() => window.print())}>
        <Printer className="mr-2 h-4 w-4" />
        Print
      </Button>
      {onDownload ? (
        <Button size="sm" onClick={onDownload} disabled={isDownloading}>
          <Download className="mr-2 h-4 w-4" />
          PDF
        </Button>
      ) : null}
    </div>
  );
}
