import { apiFetch } from "@/lib/api";

export interface ShrMetrics {
  totalPublications: number;
  successfulCount: number;
  failedCount: number;
}

export interface ShrPublication {
  id: number;
  uuid: string;
  encounterId: number | null;
  patientId: number;
  policy: string;
  state: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
  snapshots?: ShrBundleSnapshot[];
  attempts?: ShrPublicationAttempt[];
}

export interface ShrBundleSnapshot {
  id: number;
  uuid: string;
  publicationId: number;
  version: number;
  fhirVersion: string;
  profileVersion: string | null;
  bundleHash: string;
  payload: any;
  createdAt: string;
}

export interface ShrPublicationAttempt {
  id: number;
  uuid: string;
  publicationId: number;
  snapshotId: number;
  queueJobId: string | null;
  status: string;
  correlationId: string | null;
  startedAt: string;
  completedAt: string | null;
}

export const shrService = {
  getMetrics: async (): Promise<ShrMetrics> => {
    return apiFetch('/shr/metrics');
  },
  getPublication: async (id: number): Promise<ShrPublication> => {
    return apiFetch(`/shr/publications/${id}`);
  },
};
