export interface TerminologyConceptQuery {
  owner?: string;
  source?: string;
  collection?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface TerminologyConcept {
  id: string;
  uuid: string;
  concept_class: string;
  datatype: string;
  display_name: string;
  display_locale: string;
  retired: boolean;
  source: string;
  owner: string;
  owner_type: string;
  url: string;
  version_url: string;
  mappings?: any[];
  names?: Array<{
    name: string;
    locale: string;
    locale_preferred: boolean;
    name_type: string;
  }>;
}

export interface TerminologyPaginatedResponse<T> {
  count: number;
  results: T[];
}

export interface TerminologyGatewayResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

export interface TerminologySource {
  id: string;
  name: string;
  short_code: string;
  description: string;
  url: string;
  owner: string;
  owner_type: string;
}

export interface TerminologyCollection {
  id: string;
  name: string;
  short_code: string;
  description: string;
  url: string;
  owner: string;
  owner_type: string;
}
