"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createInsurancePayer,
  createInsurancePolicy,
  createPrivateInsuranceClaim,
  getInsurancePayers,
  getInsurancePolicies,
  getPrivateInsuranceClaims,
  submitPrivateInsuranceClaim,
  verifyInsurancePolicy,
} from "@/services/private-insurance-service";

export function usePrivateInsurance() {
  const client = useQueryClient();
  const refresh = () =>
    client.invalidateQueries({ queryKey: ["private-insurance"] });

  return {
    payers: useQuery({
      queryKey: ["private-insurance", "payers"],
      queryFn: getInsurancePayers,
    }),
    policies: useQuery({
      queryKey: ["private-insurance", "policies"],
      queryFn: getInsurancePolicies,
    }),
    claims: useQuery({
      queryKey: ["private-insurance", "claims"],
      queryFn: getPrivateInsuranceClaims,
    }),
    createPayer: useMutation({
      mutationFn: createInsurancePayer,
      onSuccess: refresh,
    }),
    createPolicy: useMutation({
      mutationFn: createInsurancePolicy,
      onSuccess: refresh,
    }),
    verifyPolicy: useMutation({
      mutationFn: verifyInsurancePolicy,
      onSuccess: refresh,
    }),
    createClaim: useMutation({
      mutationFn: createPrivateInsuranceClaim,
      onSuccess: refresh,
    }),
    submitClaim: useMutation({
      mutationFn: submitPrivateInsuranceClaim,
      onSuccess: refresh,
    }),
  };
}
