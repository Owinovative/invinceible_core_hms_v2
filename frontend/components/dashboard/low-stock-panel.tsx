import { PackageSearch, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SystemHealthSummaryResponse } from "@/types/dashboard";

export function LowStockPanel({
  items,
}: {
  items: SystemHealthSummaryResponse["panels"]["lowStockItems"];
}) {
  return (
    <Card className="relative overflow-hidden rounded-[1.8rem] surface-spotlight shadow-md">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/[0.03] via-transparent to-orange-500/[0.03]" />

      <CardHeader className="relative flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Low Stock</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Medicines approaching or below reorder level
          </p>
        </div>

        <div className="rounded-full border border-white/10 bg-card/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Pharmacy
        </div>
      </CardHeader>

      <CardContent className="relative space-y-4">
        {items.length === 0 ? (
          <div className="rounded-[1.35rem] border border-emerald-500/20 bg-success/8 p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-card/[0.04]">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              </div>

              <div>
                <p className="font-semibold">No low-stock items</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  All tracked medicines are above reorder level.
                </p>
              </div>
            </div>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-[1.35rem] border border-white/10 bg-card/[0.03] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-card/[0.05]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-card/[0.04]">
                    <PackageSearch className="h-5 w-5 text-amber-400" />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {item.medicineName ?? "Unknown medicine"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.branchName ?? "No branch"} • Reorder level{" "}
                      {item.reorderLevel}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Available
                  </p>
                  <p className="mt-1 text-2xl font-bold tracking-tight">
                    {item.stockQuantity}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
