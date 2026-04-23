import { PlatformGuard } from "@/components/platform/platform-guard";
import { PlatformShell } from "@/components/platform/platform-shell";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PlatformGuard>
      <PlatformShell>{children}</PlatformShell>
    </PlatformGuard>
  );
}
