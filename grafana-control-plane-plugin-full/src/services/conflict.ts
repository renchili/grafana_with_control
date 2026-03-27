import { ConflictActionResponse, ConflictPayload } from '../types/conflict';
import { api } from './api';

const baseUrl = '/api/platform/v1';

export const getConflict = async (draftId: number): Promise<ConflictPayload> =>
  api.get(`${baseUrl}/drafts/${draftId}/conflict`);

export const rebaseDraft = async (draftId: number): Promise<ConflictActionResponse> =>
  api.post(`${baseUrl}/drafts/${draftId}/rebase`, {});

export const saveAsCopy = async (
  draftId: number,
  payload?: { title?: string; uid?: string }
): Promise<ConflictActionResponse> =>
  api.post(`${baseUrl}/drafts/${draftId}/save-as-copy`, payload ?? {});

export const takeoverDraft = async (draftId: number): Promise<ConflictActionResponse> =>
  api.post(`${baseUrl}/drafts/${draftId}/takeover`, {});
