import { useCallback, useEffect, useState } from 'react';
import { abandonDraft, publishDraft } from '../services/drafts';
import { getDraftDetail, saveDraftDetail } from '../services/resources';
import { DraftDetail } from '../types/resource';

interface DraftDetailState {
  loading: boolean;
  data?: DraftDetail;
  error?: string;
  saving: boolean;
  publishing: boolean;
  abandoning: boolean;
}

export const useDraftDetail = (draftId: number) => {
  const [state, setState] = useState<DraftDetailState>({
    loading: true,
    saving: false,
    publishing: false,
    abandoning: false,
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: undefined }));
    try {
      const data = await getDraftDetail(draftId);
      setState({
        loading: false,
        data,
        saving: false,
        publishing: false,
        abandoning: false,
      });
    } catch (error) {
      setState({
        loading: false,
        saving: false,
        publishing: false,
        abandoning: false,
        error: error instanceof Error ? error.message : 'Failed to load draft',
      });
    }
  }, [draftId]);

  useEffect(() => {
    load();
  }, [load]);

  const saveDraft = useCallback(async (payload?: Partial<DraftDetail>): Promise<void> => {
    setState((prev) => ({ ...prev, saving: true, error: undefined }));
    try {
      const data = await saveDraftDetail(draftId, payload ?? state.data ?? {});
      setState((prev) => ({ ...prev, data, saving: false }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        saving: false,
        error: error instanceof Error ? error.message : 'Failed to save draft',
      }));
      throw error;
    }
  }, [draftId, state.data]);

  const publish = useCallback(async () => {
    setState((prev) => ({ ...prev, publishing: true, error: undefined }));
    try {
      await publishDraft(draftId);
      await load();
    } finally {
      setState((prev) => ({ ...prev, publishing: false }));
    }
  }, [draftId, load]);

  const abandon = useCallback(async () => {
    setState((prev) => ({ ...prev, abandoning: true, error: undefined }));
    try {
      await abandonDraft(draftId);
      await load();
    } finally {
      setState((prev) => ({ ...prev, abandoning: false }));
    }
  }, [draftId, load]);

  return { ...state, reload: load, saveDraft, publishDraft: publish, abandonDraft: abandon };
};
