import { Draft } from '../types/draft';
import { api } from './api';

const baseUrl = '/api/platform/v1';

export const listMyDrafts = async (): Promise<Draft[]> => api.get(`${baseUrl}/me/drafts`);
export const publishDraft = async (draftId: number) => api.post(`${baseUrl}/drafts/${draftId}/publish`, {});
export const abandonDraft = async (draftId: number) => api.post(`${baseUrl}/drafts/${draftId}/abandon`, {});
