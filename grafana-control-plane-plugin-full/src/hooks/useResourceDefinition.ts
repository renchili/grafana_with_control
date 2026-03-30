import { useCallback, useEffect, useState } from 'react';
import { createDraftForResource, getResourceDefinition } from '../services/resources';
import { ResourceDefinition } from '../types/resource';

interface ResourceState {
  loading: boolean;
  data?: ResourceDefinition;
  error?: string;
  creatingDraft: boolean;
}

export const useResourceDefinition = (uid: string) => {
  const [state, setState] = useState<ResourceState>({ loading: true, creatingDraft: false });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: undefined }));
    try {
      const data = await getResourceDefinition(uid);
      setState({ loading: false, data, creatingDraft: false });
    } catch (error) {
      setState({
        loading: false,
        creatingDraft: false,
        error: error instanceof Error ? error.message : 'Failed to load resource definition',
      });
    }
  }, [uid]);

  useEffect(() => {
    load();
  }, [load]);

  const createDraft = useCallback(async () => {
    setState((prev) => ({ ...prev, creatingDraft: true, error: undefined }));
    try {
      const result = await createDraftForResource(uid);
      setState((prev) => ({ ...prev, creatingDraft: false }));
      return result;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        creatingDraft: false,
        error: error instanceof Error ? error.message : 'Failed to create draft',
      }));
      throw error;
    }
  }, [uid]);

  return { ...state, reload: load, createDraft };
};
