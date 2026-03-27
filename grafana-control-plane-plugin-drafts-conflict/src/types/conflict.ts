export interface ConflictPayload {
  draftId: number;
  resourceUid: string;
  resourceType: 'dashboard' | 'folder' | 'datasource' | 'alert_rule';
  baseVersionNo: number;
  currentVersionNo: number;
  hasConflict: boolean;
  conflictPaths: string[];
  base: Record<string, unknown>;
  yours: Record<string, unknown>;
  theirs: Record<string, unknown>;
}

export interface ConflictActionResponse {
  success: boolean;
  message?: string;
  jobId?: number;
  newResourceUid?: string;
}
