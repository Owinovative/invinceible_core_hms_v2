import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function LoadingSkeleton({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="grid grid-cols-[2fr_1fr_1fr] gap-3 border border-sky-100 bg-white p-3"
        >
          <Skeleton className="h-5 rounded-none" />
          <Skeleton className="h-5 rounded-none" />
          <Skeleton className="h-5 rounded-none" />
        </div>
      ))}
    </div>
  );
}
