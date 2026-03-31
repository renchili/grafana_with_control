import React, { useEffect, useState } from 'react';

export const DraftEditorPage: React.FC<{ draftId?: string }> = ({ draftId = '0' }) => {
  const [json, setJson] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  const load = async () => {
    const r = await fetch(`/api/platform/v1/drafts/${draftId}`);
    const d = await r.json();
    setJson(JSON.stringify(d.rawDraft || {}, null, 2));
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    await fetch(`/api/platform/v1/drafts/${draftId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: json
    });
    alert('saved');
  };

  const publish = async () => {
    await fetch(`/api/platform/v1/drafts/${draftId}/publish`, { method: 'POST' });
    alert('published');
  };

  const refreshPreview = async () => {
    const r = await fetch(`/api/platform/v1/drafts/${draftId}/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: json
    });

    const d = await r.json();
    if (d.url) {
      setPreviewUrl(d.url);
    } else {
      alert('preview failed');
    }
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={save}>Save</button>
        <button onClick={refreshPreview}>Refresh Preview</button>
        <button onClick={publish}>Publish</button>
      </div>

      {/* JSON Editor（保持原样，不再乱改） */}
      <textarea
        value={json}
        onChange={e => setJson(e.target.value)}
        style={{ width: '100%', height: 300 }}
      />

      {/* Preview */}
      <div style={{
        border: '1px solid #333',
        borderRadius: 8,
        overflow: 'hidden'
      }}>
        {previewUrl ? (
          <iframe
            src={previewUrl}
            style={{ width: '100%', height: 600, border: 'none' }}
          />
        ) : (
          <div style={{ padding: 20, color: '#888' }}>
            Click "Refresh Preview" to render dashboard
          </div>
        )}
      </div>

    </div>
  );
};
