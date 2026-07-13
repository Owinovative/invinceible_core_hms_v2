"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck, Loader2 } from "lucide-react";
import { getPublishedLegalDocuments, acceptLegalDocument } from "@/services/legal-service";
import type { LegalDocument } from "@/services/legal-service";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/providers/auth-provider";

export default function ConsentPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  useEffect(() => {
    async function fetchDocuments() {
      try {
        const response = await getPublishedLegalDocuments();
        setDocuments(response);
      } catch (_) {
        toast.error("Failed to load legal documents.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchDocuments();
  }, []);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const terms = documents.find((d) => d.type === "TERMS");
      const privacy = documents.find((d) => d.type === "PRIVACY");

      const acceptances = [];
      if (terms) {
        acceptances.push(acceptLegalDocument("TERMS", terms.version));
      }
      if (privacy) {
        acceptances.push(acceptLegalDocument("PRIVACY", privacy.version));
      }

      await Promise.all(acceptances);
      
      toast.success("Thank you for accepting the legal terms.");
      router.push("/dashboard");
    } catch (_) {
      toast.error("An error occurred while saving your consent.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-brand" />
      </div>
    );
  }

  const termsDoc = documents.find((d) => d.type === "TERMS");
  const privacyDoc = documents.find((d) => d.type === "PRIVACY");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4 sm:p-8">
      <div className="w-full max-w-3xl rounded-2xl border bg-card p-6 shadow-sm sm:p-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <ShieldCheck className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Welcome to Invinceible Core HMS
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Before continuing, you must review and accept our updated legal agreements.
          </p>
        </div>

        <div className="space-y-6">
          {/* Terms Section */}
          <div className="rounded-xl border bg-background p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-foreground">
                Terms of Use {termsDoc?.version && <span className="text-xs text-muted-foreground">(v{termsDoc.version})</span>}
              </h2>
              <a href="/terms" target="_blank" className="text-xs font-medium text-brand hover:underline">
                Read full terms &rarr;
              </a>
            </div>
            <ScrollArea className="h-40 rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              {termsDoc?.content ? (
                <div dangerouslySetInnerHTML={{ __html: termsDoc.content }} />
              ) : (
                <p>Please review our Terms of Use using the link above.</p>
              )}
            </ScrollArea>
            <div className="mt-4 flex items-center space-x-3">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
              />
              <label
                htmlFor="terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I have read and agree to the Terms of Use
              </label>
            </div>
          </div>

          {/* Privacy Section */}
          <div className="rounded-xl border bg-background p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-foreground">
                Privacy Policy {privacyDoc?.version && <span className="text-xs text-muted-foreground">(v{privacyDoc.version})</span>}
              </h2>
              <a href="/privacy" target="_blank" className="text-xs font-medium text-brand hover:underline">
                Read full policy &rarr;
              </a>
            </div>
            <ScrollArea className="h-40 rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              {privacyDoc?.content ? (
                <div dangerouslySetInnerHTML={{ __html: privacyDoc.content }} />
              ) : (
                <p>Please review our Privacy Policy using the link above.</p>
              )}
            </ScrollArea>
            <div className="mt-4 flex items-center space-x-3">
              <Checkbox
                id="privacy"
                checked={acceptedPrivacy}
                onChange={(e) => setAcceptedPrivacy(e.target.checked)}
              />
              <label
                htmlFor="privacy"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I have read and agree to the Privacy Policy
              </label>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
          <Button
            variant="outline"
            onClick={() => {
              logout();
              router.push("/login");
            }}
          >
            Cancel & Logout
          </Button>
          <Button
            className="bg-brand hover:bg-brand/90"
            disabled={!acceptedTerms || !acceptedPrivacy || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Accept & Continue
          </Button>
        </div>
      </div>
    </main>
  );
}
