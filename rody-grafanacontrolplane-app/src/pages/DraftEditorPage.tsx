import React, { useEffect, useState } from 'react';

type Panel = {
  id: number;
  title: string;
  expr: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export const DraftEditorPage: React.FC<{ draftId?: string }> = ({ draftId = '0' }) => {
  const [panels, setPanels] = useState<Panel[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [json, setJson] = useState('');

  const load = async () => {
    const r = await fetch(`/api/platform/v1/drafts/${draftId}`);
    const d = await r.json();

    const p = (d.rawDraft?.panels || []).map((x: any, i: number) => ({
      id: x.id || i,
      title: x.title || 'Panel',
      expr: x.targets?.[0]?.expr || '',
      x: x.gridPos?.x || 0,
      y: x.gridPos?.y || i * 8,
      w: x.gridPos?.w || 12,
      h: x.gridPos?.h || 8
    }));

    setPanels(p);
    setJson(JSON.stringify(d.rawDraft || {}, null, 2));
  };

  useEffect(() => { load(); }, []);

  const update = (id: number, k: keyof Panel, v: any) => {
    const next = panels.map(p => p.id === id ? { ...p, [k]: v } : p);
    setPanels(next);

    const payload = {
      panels: next.map(p => ({
        id: p.id,
        title: p.title,
        gridPos: { x: p.x, y: p.y, w: p.w, h: p.h },
        targets: [{ expr: p.expr }]
      }))
    };

    setJson(JSON.stringify(payload, null, 2));
  };

  const save = async () => {
    await fetch(`/api/platform/v1/drafts/${draftId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: json
    });
  };

  const publish = async () => {
    await fetch(`/api/platform/v1/drafts/${draftId}/publish`, { method: 'POST' });
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={save}>Save</button>
        <button onClick={publish}>Publish</button>
      </div>

      {/* Layout Canvas */}
      <div style={{
        border: '1px solid #333',
        borderRadius: 8,
        padding: 16,
        minHeight: 400,
        position: 'relative'
      }}>
        {panels.map(p => (
          <div
            key={p.id}
            onClick={() => setSelected(p.id)}
            style={{
              position: 'absolute',
              left: `${p.x * 4}%`,
              top: p.y * 20,
              width: `${p.w * 4}%`,
              height: p.h * 20,
              border: selected === p.id ? '2px solid #3274d9' : '1px solid #555',
              borderRadius: 6,
              padding: 8,
              background: '#1f1f1f',
              cursor: 'pointer'
            }}
          >
            <div style={{ fontWeight: 600 }}>{p.title}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              x:{p.x} y:{p.y} w:{p.w} h:{p.h}
            </div>
          </div>
        ))}
      </div>

      {/* Properties */}
      {selected !== null && (
        <div style={{ border: '1px solid #333', padding: 16, borderRadius: 8 }}>
          <h4>Panel Properties</h4>

          {(() => {
            const p = panels.find(x => x.id === selected)!;
            return (
              <>
                <input
                  value={p.title}
                  onChange={e => update(p.id, 'title', e.target.value)}
                />

                <div style={{ display: 'flex', gap: 6 }}>
                  {['x','y','w','h'].map(k => (
                    <input
                      key={k}
                      type="number"
                      value={(p as any)[k]}
                      onChange={e => update(p.id, k as any, Number(e.target.value))}
                    />
                  ))}
                </div>

                <textarea
                  value={p.expr}
                  onChange={e => update(p.id, 'expr', e.target.value)}
                />
              </>
            );
          })()}
        </div>
      )}

      {/* JSON */}
      <div>
        <textarea value={json} onChange={e => setJson(e.target.value)} />
      </div>

    </div>
  );
};
