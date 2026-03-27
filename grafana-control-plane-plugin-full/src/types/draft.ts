export type DraftStatus = 'active' | 'conflict' | 'needs_review' | 'published' | 'abandoned';

export interface Draft {
  draftId: number;
  resourceType: 'dashboard' | 'folder' | 'alert_rule' | 'datasource';
  resourceUid: string;
  title: string;
  ownerName: string;
  baseVersionNo: number;
  governanceMode: 'native' | 'platform' | 'provisioned' | 'git';
  status: DraftStatus;
  updatedAt: string;
}
