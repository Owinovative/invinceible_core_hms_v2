"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addDentalChartEntry,
  addDentalProcedure,
  addOrthopedicImplant,
  createDentalEncounter,
  createOrthopedicCase,
  createPhysiotherapyReferral,
  getDentalEncounters,
  getOrthopedicCases,
} from "@/services/clinical-specialties-service";

export function useDentalEncounters() {
  return useQuery({ queryKey: ["dental", "encounters"], queryFn: getDentalEncounters });
}

function useSpecialtyMutation<T>(mutationFn: (input: T) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["dental"] }).then(() =>
        client.invalidateQueries({ queryKey: ["orthopedic"] }),
      ),
  });
}

export function useAddDentalChartEntry() {
  return useSpecialtyMutation(addDentalChartEntry);
}

export function useAddDentalProcedure() {
  return useSpecialtyMutation(addDentalProcedure);
}

export function useAddOrthopedicImplant() {
  return useSpecialtyMutation(addOrthopedicImplant);
}

export function useCreatePhysiotherapyReferral() {
  return useSpecialtyMutation(createPhysiotherapyReferral);
}

export function useCreateDentalEncounter() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createDentalEncounter,
    onSuccess: () => client.invalidateQueries({ queryKey: ["dental"] }),
  });
}

export function useOrthopedicCases() {
  return useQuery({ queryKey: ["orthopedic", "cases"], queryFn: getOrthopedicCases });
}

export function useCreateOrthopedicCase() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createOrthopedicCase,
    onSuccess: () => client.invalidateQueries({ queryKey: ["orthopedic"] }),
  });
}
