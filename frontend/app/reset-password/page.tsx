import { Suspense } from "react";
import ResetPasswordPageClient from "./reset-password-page-client";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <ResetPasswordPageClient />
    </Suspense>
  );
}