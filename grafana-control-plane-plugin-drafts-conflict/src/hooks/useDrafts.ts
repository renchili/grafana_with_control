import { useCallback, useEffect, useState } from 'react';
import { listMyDrafts, publishDraft, abandonDraft } from '../services/drafts';
import { Draft } from '../types/draft';

interface DraftState {
  loading: boolean;
  data: Draft[];
  error?: string;
  actingDraftId?: number;
}

export const useDrafts = () => {
  const [state, setState] = useState<DraftState>({ loading: true, data: [] });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: undefined }));
    try {
      const data = await listMyDrafts();
      setState({ loading: false, data });
    } catch (error) {
      setState({
        loading: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to load drafts',
      });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const publish = useCallback(async (draftId: number) => {
    setState((prev) => ({ ...prev, actingDraftId: draftId }));
    try {
      await publishDraft(draftId);
      await load();
    } finally {
      setState((prev) => ({ ...prev, actingDraftId: undefined }));
    }
  }, [load]);

  const abandon = useCallback(async (draftId: number) => {
    setState((prev) => ({ ...prev, actingDraftId: draftId }));
    try {
      await abandonDraft(draftId);
      await load();
    } finally {
      setState((prev) => ({ ...prev, actingDraftId: undefined }));
    }
  }, [load]);

  return { ...state, reload: load, publish, abandon };
};
