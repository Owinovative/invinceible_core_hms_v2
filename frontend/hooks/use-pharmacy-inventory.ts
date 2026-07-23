"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPharmacyLocation,
  getInventoryDashboard,
  getMedicineReturns,
  getPharmacyLocations,
  receiveMedicineBatch,
  createMedicineReturn,
  getInventoryBatches,
  getStockMovements,
  reviewMedicineReturn,
} from "@/services/pharmacy-inventory-service";

export function useInventoryDashboard() {
  return useQuery({
    queryKey: ["pharmacy-inventory", "dashboard"],
    queryFn: getInventoryDashboard,
  });
}

export function useMedicineReturns() {
  return useQuery({
    queryKey: ["pharmacy-inventory", "returns"],
    queryFn: getMedicineReturns,
  });
}

export function usePharmacyLocations() {
  return useQuery({
    queryKey: ["pharmacy-inventory", "locations"],
    queryFn: getPharmacyLocations,
  });
}

export function useInventoryBatches() {
  return useQuery({
    queryKey: ["pharmacy-inventory", "batches"],
    queryFn: getInventoryBatches,
  });
}

export function useStockMovements() {
  return useQuery({
    queryKey: ["pharmacy-inventory", "movements"],
    queryFn: getStockMovements,
  });
}

export function useCreatePharmacyLocation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createPharmacyLocation,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["pharmacy-inventory"] });
    },
  });
}

export function useReceiveMedicineBatch() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: receiveMedicineBatch,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["pharmacy-inventory"] });
      await client.invalidateQueries({ queryKey: ["pharmacy-stock"] });
    },
  });
}

export function useCreateMedicineReturn() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createMedicineReturn,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["pharmacy-inventory"] });
    },
  });
}

export function useReviewMedicineReturn() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      returnId,
      payload,
    }: {
      returnId: number;
      payload: Parameters<typeof reviewMedicineReturn>[1];
    }) => reviewMedicineReturn(returnId, payload),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["pharmacy-inventory"] });
      await client.invalidateQueries({ queryKey: ["pharmacy-stock"] });
    },
  });
}
