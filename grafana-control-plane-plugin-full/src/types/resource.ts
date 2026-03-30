export interface QueryDefinition {
  refId: string;
  datasource?: string;
  expression: string;
}

export interface PanelDefinition {
  id: number;
  title: string;
  type: string;
  datasource?: string;
  queries: QueryDefinition[];
  transformations: unknown[];
  fieldConfig?: unknown;
  options?: unknown;
  rawModel: unknown;
}

export interface ResourceDefinition {
  uid: string;
  title: string;
  ownerName: string;
  governanceMode: string;
  publishedVersionNo: number;
  hasDraft: boolean;
  draftId?: number;
  panels: PanelDefinition[];
}

export interface DraftDetail {
  draftId: number;
  resourceUid: string;
  title: string;
  ownerName: string;
  status: string;
  baseVersionNo: number;
  governanceMode: string;
  panels: PanelDefinition[];
  rawDraft?: unknown;
}
