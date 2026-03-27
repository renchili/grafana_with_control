import { useCallback, useEffect, useState } from 'react';
import { getConflict, rebaseDraft, saveAsCopy, takeoverDraft } from '../services/conflict';
import { ConflictActionResponse, ConflictPayload } from '../types/conflict';

interface UseConflictState {
  loading: boolean;
  error?: string;
  data?: ConflictPayload;
  acting: boolean;
}

export const useConflict = (draftId: number) => {
  const [state, setState] = useState<UseConflictState>({ loading: true, acting: false });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: undefined }));
    try {
      const data = await getConflict(draftId);
      setState({ loading: false, acting: false, data });
    } catch (error) {
      setState({
        loading: false,
        acting: false,
        error: error instanceof Error ? error.message : 'Failed to load conflict data',
      });
    }
  }, [draftId]);

  useEffect(() => {
    if (!draftId) {
      setState({ loading: false, acting: false, error: 'Missing draftId' });
      return;
    }
    load();
  }, [draftId, load]);

const runAction = useCallback(
  async (
    action: 'rebase' | 'save_as_copy' | 'takeover',
    payload?: { title?: string; uid?: string }
  ): Promise<ConflictActionResponse | undefined> => {
    setState((prev) => ({ ...prev, acting: true, error: undefined }));

    try {
      let result: ConflictActionResponse;

      if (action === 'rebase') {
        result = await rebaseDraft(draftId);
      } else if (action === 'save_as_copy') {
        result = await saveAsCopy(draftId, payload);
      } else {
        result = await takeoverDraft(draftId);
      }

      await load();
      return result;

    } catch (error) {
      setState((prev) => ({
        ...prev,
        acting: false,
        error: error instanceof Error ? error.message : 'Action failed',
      }));

      return undefined; // ✅ 必须加这个
    }
  },
  [draftId, load]
);
  return { ...state, reload: load, runAction };
};
