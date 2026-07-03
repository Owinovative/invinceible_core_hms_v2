import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppLogo } from "@/components/shared/app-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-[#f5fbff]">
      <div className="relative flex min-h-screen items-center justify-center px-6 py-10">
        <Card className="w-full max-w-md rounded-lg border-border bg-card text-foreground shadow-xl">
          <CardContent className="p-8 md:p-10">
            <div className="mb-8 flex flex-col items-center text-center">
              <AppLogo className="mb-4" />
              <h1 className="text-3xl font-bold tracking-tight">
                Password resets are handled by administration
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Contact the super admin to reset or reactivate an account. This
                public recovery form is disabled for security.
              </p>
            </div>

            <Button
              asChild
              className="h-12 w-full rounded-md bg-primary text-white hover:bg-brand-strong"
            >
              <Link href="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign in
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
