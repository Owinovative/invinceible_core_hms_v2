import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePatientContacts, useSendVisitOtp, useVerifyVisitOtp } from '@/hooks/useConsent';
import { Loader2 } from 'lucide-react';

interface RequestConsentModalProps {
  patientId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RequestConsentModal({ patientId, isOpen, onClose, onSuccess }: RequestConsentModalProps) {
  const [step, setStep] = useState<'CONTACTS' | 'VERIFY'>('CONTACTS');
  const [selectedContact, setSelectedContact] = useState<number | null>(null);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: contacts, isLoading: isLoadingContacts } = usePatientContacts(patientId, isOpen && step === 'CONTACTS');
  const sendOtpMutation = useSendVisitOtp();
  const verifyOtpMutation = useVerifyVisitOtp();

  const handleSendOtp = async () => {
    if (!selectedContact) {
      setError('Please select a contact method');
      return;
    }
    setError(null);
    try {
      await sendOtpMutation.mutateAsync({
        patientId,
        contactId: selectedContact,
        interventionCodes: ['CONSULTATION'], // Default for generic visit
      });
      setStep('VERIFY');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to send OTP');
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 4) {
      setError('Please enter a valid OTP');
      return;
    }
    setError(null);
    try {
      await verifyOtpMutation.mutateAsync({
        patientId,
        otpCode: otp,
        interventionCodes: ['CONSULTATION'],
        serviceType: 'OUTPATIENT', // Default, should be configurable based on context
      });
      onSuccess();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to verify OTP');
    }
  };

  // Reset state when closed
  React.useEffect(() => {
    if (!isOpen) {
      setStep('CONTACTS');
      setOtp('');
      setError(null);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>DHA Consent Required</DialogTitle>
          <DialogDescription>
            You must obtain patient consent before proceeding with this action.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">{error}</div>}

          {step === 'CONTACTS' ? (
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Select Contact Method</h4>
              {isLoadingContacts ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : contacts && contacts.length > 0 ? (
                <div className="space-y-2">
                  {contacts.map((contact) => (
                    <label
                      key={contact.contact_id}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedContact === contact.contact_id ? 'border-primary bg-primary/5' : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="contact"
                        className="mr-3"
                        checked={selectedContact === contact.contact_id}
                        onChange={() => setSelectedContact(contact.contact_id)}
                      />
                      <span className="font-medium">{contact.contact_value}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No contacts found for this patient on the DHA Registry.</div>
              )}
              
              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSendOtp} 
                  disabled={!selectedContact || sendOtpMutation.isPending}
                >
                  {sendOtpMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Send OTP
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Enter Verification Code</h4>
              <p className="text-sm text-gray-500">
                Please ask the patient for the code sent to their selected contact method.
              </p>
              <Input
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                className="text-center text-lg tracking-widest"
              />
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep('CONTACTS')}>
                  Back
                </Button>
                <Button 
                  onClick={handleVerifyOtp} 
                  disabled={!otp || verifyOtpMutation.isPending}
                >
                  {verifyOtpMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Verify & Authorize
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
