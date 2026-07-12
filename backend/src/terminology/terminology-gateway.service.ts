import { Injectable } from '@nestjs/common';
import { TerminologyHttpClient } from './adapters/terminology-http.client';
import type {
  TerminologyConceptQuery,
  TerminologyPaginatedResponse,
  TerminologyConcept,
} from './terminology.types';

@Injectable()
export class TerminologyGateway {
  constructor(private readonly client: TerminologyHttpClient) {}

  async searchConcepts(
    query: TerminologyConceptQuery,
  ): Promise<TerminologyPaginatedResponse<TerminologyConcept>> {
    return this.client.searchConcepts(query);
  }

  async getSources(): Promise<any> {
    return this.client.getSources();
  }

  async getCollections(): Promise<any> {
    return this.client.getCollections();
  }

  async getVersions(): Promise<any> {
    return this.client.getVersions();
  }

  async checkHealth(): Promise<{ status: 'UP' | 'DOWN'; error?: string }> {
    try {
      // Perform a minimal call to verify connectivity and auth
      await this.client.searchConcepts({ limit: 1 });
      return { status: 'UP' };
    } catch (e: any) {
      return { status: 'DOWN', error: e.message };
    }
  }
}
