import React, { useState } from 'react';
import { Button, HorizontalGroup, Input, Modal } from '@grafana/ui';

interface Props {
  busy: boolean;
  onRebase: () => Promise<void>;
  onTakeOver: () => Promise<void>;
  onSaveAsCopy: (payload?: { title?: string; uid?: string }) => Promise<void>;
}

export const ConflictActionBar: React.FC<Props> = ({ busy, onRebase, onTakeOver, onSaveAsCopy }) => {
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [title, setTitle] = useState('');
  const [uid, setUid] = useState('');

  return (
    <>
      <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, background: 'var(--panel-bg)', padding: 12 }}>
        <HorizontalGroup>
          <Button onClick={() => onRebase()} disabled={busy}>Rebase Draft</Button>
          <Button variant="secondary" onClick={() => setShowCopyModal(true)} disabled={busy}>Save as Copy</Button>
          <Button variant="destructive" onClick={() => onTakeOver()} disabled={busy}>Take Over</Button>
        </HorizontalGroup>
      </div>
      {showCopyModal && (
        <Modal title="Save as copy" isOpen={showCopyModal} onDismiss={() => setShowCopyModal(false)}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <div style={{ marginBottom: 6 }}>New title</div>
              <Input value={title} onChange={(e) => setTitle(e.currentTarget.value)} />
            </div>
            <div>
              <div style={{ marginBottom: 6 }}>New UID</div>
              <Input value={uid} onChange={(e) => setUid(e.currentTarget.value)} />
            </div>
            <HorizontalGroup justify="flex-end">
              <Button variant="secondary" onClick={() => setShowCopyModal(false)}>Cancel</Button>
              <Button onClick={async () => { await onSaveAsCopy({ title: title || undefined, uid: uid || undefined }); setShowCopyModal(false); }} disabled={busy}>
                Create Copy
              </Button>
            </HorizontalGroup>
          </div>
        </Modal>
      )}
    </>
  );
};
