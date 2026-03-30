import { api } from './api';
import { DraftDetail, ResourceDefinition } from '../types/resource';

const baseUrl = '/api/platform/v1';

export const getResourceDefinition = async (uid: string): Promise<ResourceDefinition> =>
  api.get(`${baseUrl}/resources/${uid}`);

export const createDraftForResource = async (uid: string): Promise<{ draftId: number }> =>
  api.post(`${baseUrl}/resources/${uid}/drafts`, {});

export const getDraftDetail = async (draftId: number): Promise<DraftDetail> =>
  api.get(`${baseUrl}/drafts/${draftId}`);

export const saveDraftDetail = async (draftId: number, payload: Partial<DraftDetail>): Promise<DraftDetail> =>
  api.post(`${baseUrl}/drafts/${draftId}/save`, payload);
