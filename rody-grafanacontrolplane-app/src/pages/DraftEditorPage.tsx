import React, { useEffect, useState } from 'react';
import { Card, Button } from '../components/ui';

type Row = {
  id: number;
  title: string;
  expr: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export const DraftEditorPage: React.FC<{ draftId?: string }> = ({ draftId = '0' }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [json, setJson] = useState('');

  const load = async () => {
    const r = await fetch(`/api/platform/v1/drafts/${draftId}`);
    const d = await r.json();

    const panels = d.rawDraft?.panels || [];
    const mapped = panels.map((p: any, i: number) => ({
      id: p.id || i + 1,
      title: p.title || 'Panel',
      expr: p.targets?.[0]?.expr || '',
      x: p.gridPos?.x || 0,
      y: p.gridPos?.y || i * 8,
      w: p.gridPos?.w || 12,
      h: p.gridPos?.h || 8
    }));

    setRows(mapped);
    setJson(JSON.stringify(d.rawDraft || {}, null, 2));
  };

  useEffect(() => { load(); }, [draftId]);

  const update = (id: number, k: keyof Row, v: any) => {
    const next = rows.map(r => r.id === id ? { ...r, [k]: v } : r);
    setRows(next);

    const panels = next.map(r => ({
      id: r.id,
      title: r.title,
      gridPos: { x: r.x, y: r.y, w: r.w, h: r.h },
      targets: [{ expr: r.expr }]
    }));

    setJson(JSON.stringify({ panels }, null, 2));
  };

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

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card title="Editor">
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={save}>Save</Button>
          <Button onClick={publish}>Publish</Button>
        </div>
      </Card>

      <Card title="Panels">
        {rows.map(r => (
          <div key={r.id} style={{ border: '1px solid #333', padding: 12, marginBottom: 8 }}>
            <input value={r.title} onChange={e => update(r.id, 'title', e.target.value)} />

            <div style={{ display: 'flex', gap: 6 }}>
              {['x','y','w','h'].map(k => (
                <input
                  key={k}
                  type="number"
                  value={(r as any)[k]}
                  onChange={e => update(r.id, k as any, Number(e.target.value))}
                  style={{ width: 60 }}
                />
              ))}
            </div>

            <textarea
              value={r.expr}
              onChange={e => update(r.id, 'expr', e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        ))}
      </Card>

      <Card title="Preview">
        <div style={{ position: 'relative', height: 400 }}>
          {rows.map(r => (
            <div key={r.id} style={{
              position: 'absolute',
              left: `${r.x * 4}%`,
              top: r.y * 20,
              width: `${r.w * 4}%`,
              height: r.h * 20,
              border: '1px solid #888',
              padding: 4
            }}>
              {r.title}
            </div>
          ))}
        </div>
      </Card>

      <Card title="JSON">
        <textarea value={json} onChange={e => setJson(e.target.value)} style={{ width: '100%', height: 200 }} />
      </Card>
    </div>
  );
};
