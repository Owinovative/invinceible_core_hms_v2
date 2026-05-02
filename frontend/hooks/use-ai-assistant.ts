"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createClinicalAiDraft,
  getAiAssistantStatus,
  readIdentityCard,
} from "@/services/ai-assistant-service";

export function useAiAssistantStatus() {
  return useQuery({
    queryKey: ["ai-assistant-status"],
    queryFn: getAiAssistantStatus,
  });
}

export function useCreateClinicalAiDraft() {
  return useMutation({
    mutationFn: createClinicalAiDraft,
  });
}

export function useReadIdentityCard() {
  return useMutation({
    mutationFn: readIdentityCard,
  });
}
