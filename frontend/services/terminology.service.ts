import { apiFetch } from '@/lib/api';

export interface TerminologyConcept {
  id: number;
  uuid: string;
  system: string;
  code: string;
  display: string;
  conceptClass?: string;
  datatype?: string;
  version?: string;
}

export interface TerminologySearchQuery {
  q: string;
  system?: string;
  conceptClass?: string;
  limit?: number;
}

export interface TerminologyMetrics {
  totalConcepts: number;
  totalSources: number;
  totalCollections: number;
  activeVersions: number;
  lastSuccessfulSync?: { date: string | null; durationMs?: number | null; target?: string | null } | null;
  lastFailedSync?: { date: string | null; error?: string | null; target?: string | null } | null;
  recentSyncs: Array<{
    id: number;
    startedAt: string;
    completedAt?: string | null;
    status: string;
    targetSystem?: string | null;
    conceptsAdded?: number;
    conceptsUpdated?: number;
    durationMs?: number | null;
    errorMessage?: string | null;
  }>;
  coverage: {
    consultations: { coded: number; total: number; percentage: number };
    claims: { coded: number; total: number; percentage: number };
    medicines: { coded: number; total: number; percentage: number };
    labTests: { coded: number; total: number; percentage: number };
  };
  latency: {
    averageSyncDurationMs?: number;
  };
}

export interface TerminologyCollection {
  id: string;
  name: string;
  description?: string;
  memberCount?: number;
}

export const terminologyService = {
  searchLocalConcepts: async (query: TerminologySearchQuery): Promise<TerminologyConcept[]> => {
    const params = new URLSearchParams({
      q: query.q,
      ...(query.system && { system: query.system }),
      ...(query.conceptClass && { conceptClass: query.conceptClass }),
      ...(query.limit && { limit: query.limit.toString() }),
    });
    
    return apiFetch<TerminologyConcept[]>(`/terminology/search?${params.toString()}`);
  },

  searchRemoteConcepts: async (q: string, source?: string): Promise<unknown> => {
    const params = new URLSearchParams({
      q,
      ...(source && { source }),
    });
    return apiFetch<unknown>(`/terminology/remote-search?${params.toString()}`);
  },

  checkHealth: async (): Promise<unknown> => {
    return apiFetch<unknown>('/terminology/health');
  },

  getMetrics: async (): Promise<TerminologyMetrics> => {
    return apiFetch<TerminologyMetrics>('/terminology/metrics');
  },

  getCollections: async (): Promise<TerminologyCollection[]> => {
    return apiFetch<TerminologyCollection[]>('/terminology/collections');
  },

  triggerSync: async (): Promise<unknown> => {
    return apiFetch<unknown>('/terminology/sync/trigger', { method: 'POST' });
  }
};
