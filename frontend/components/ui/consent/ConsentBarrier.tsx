import React, { useState } from 'react';
import { useActiveConsent } from '@/hooks/useConsent';
import { RequestConsentModal } from './RequestConsentModal';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface ConsentBarrierProps {
  patientId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode; // Optional custom fallback UI instead of the default alert
}

/**
 * A wrapper component that checks if a patient has active DHA consent.
 * If consent is active, it renders its children.
 * If not, it renders an alert block with a button to initiate the OTP workflow.
 */
export function ConsentBarrier({ patientId, children, fallback }: ConsentBarrierProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data, isLoading, error, refetch } = useActiveConsent(patientId);

  if (!patientId) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 border rounded-lg border-dashed">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-sm text-gray-500">Verifying DHA Consent status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <ShieldAlert className="w-4 h-4" />
        <AlertTitle>Consent Verification Failed</AlertTitle>
        <AlertDescription>
          Unable to verify DHA consent status. Please check your connection and try again.
          <Button variant="link" className="px-0 ml-2 text-red-100 h-auto" onClick={() => refetch()}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!data?.hasActiveConsent) {
    if (fallback) {
      return (
        <>
          {fallback}
          <RequestConsentModal 
            patientId={patientId} 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)}
            onSuccess={() => setIsModalOpen(false)}
          />
        </>
      );
    }

    return (
      <>
        <Alert className="border-orange-200 bg-orange-50 text-orange-900">
          <ShieldAlert className="w-5 h-5 text-orange-600" />
          <AlertTitle className="text-orange-800 font-semibold text-lg">Active DHA Consent Required</AlertTitle>
          <AlertDescription className="mt-2 text-sm text-orange-700">
            This action is protected. You must obtain patient consent via OTP before viewing protected clinical data or initiating workflows.
            <div className="mt-4">
              <Button onClick={() => setIsModalOpen(true)} className="bg-orange-600 hover:bg-orange-700 text-white">
                Request Patient Consent
              </Button>
            </div>
          </AlertDescription>
        </Alert>

        <RequestConsentModal 
          patientId={patientId} 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => setIsModalOpen(false)}
        />
      </>
    );
  }

  return <>{children}</>;
}
