import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ConsentService, VerifyOtpPayload } from '../services/consent.service';

export function usePatientContacts(patientId: string, enabled = true) {
  return useQuery({
    queryKey: ['consent', 'contacts', patientId],
    queryFn: () => ConsentService.getContacts(patientId),
    enabled: !!patientId && enabled,
  });
}

export function useActiveConsent(patientId: string) {
  return useQuery({
    queryKey: ['consent', 'status', patientId],
    queryFn: () => ConsentService.getActiveConsent(patientId),
    enabled: !!patientId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

export function useSendVisitOtp() {
  return useMutation({
    mutationFn: ({ patientId, contactId, interventionCodes }: { patientId: string; contactId: number; interventionCodes: string[] }) =>
      ConsentService.sendVisitOtp(patientId, contactId, interventionCodes),
  });
}

export function useVerifyVisitOtp() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: VerifyOtpPayload) => ConsentService.verifyVisitOtp(payload),
    onSuccess: (_, variables) => {
      // Invalidate the active consent query upon success
      queryClient.invalidateQueries({ queryKey: ['consent', 'status', variables.patientId] });
    },
  });
}
