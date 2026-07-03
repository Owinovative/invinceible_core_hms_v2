import { SkeletonPage } from "@/components/ui/loading-skeleton";

/**
 * Route-group loading state: every dashboard route shows a structural
 * skeleton during segment loads — never a blank screen.
 */
export default function DashboardLoading() {
  return <SkeletonPage />;
}
