"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMasterCatalogOverview,
  getMasterCatalogRows,
  importMasterCatalogCsv,
  type MasterCatalogKind,
} from "@/services/master-catalog-service";

export function useMasterCatalogOverview() {
  return useQuery({
    queryKey: ["master-catalog-overview"],
    queryFn: getMasterCatalogOverview,
  });
}

export function useMasterCatalogRows(kind: MasterCatalogKind) {
  return useQuery({
    queryKey: ["master-catalog", kind],
    queryFn: () => getMasterCatalogRows(kind),
  });
}

export function useImportMasterCatalogCsv(kind: MasterCatalogKind) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (csvText: string) => importMasterCatalogCsv(kind, csvText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-catalog", kind] });
      queryClient.invalidateQueries({ queryKey: ["master-catalog-overview"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-medicines"] });
      queryClient.invalidateQueries({ queryKey: ["billing-services"] });
      queryClient.invalidateQueries({ queryKey: ["lab-tests"] });
    },
  });
}
