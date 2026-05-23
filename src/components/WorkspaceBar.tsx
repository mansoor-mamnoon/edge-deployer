import React, { useEffect, useState, useCallback } from 'react';
import { WorkspaceData, RecentProject } from '../types';

interface Props {
  workspace: WorkspaceData | null;
  workspacePath: string | null;
  onSave: () => void;
  onOpen: () => void;
  onOpenRecent: (p: RecentProject) => void;
}

export default function WorkspaceBar({ workspace, workspacePath, onSave, onOpen, onOpenRecent }: Props) {
  const [recents, setRecents] = useState<RecentProject[]>([]);
  const [showRecents, setShowRecents] = useState(false);

  const loadRecents = useCallback(async () => {
    const api = (window as any).electronAPI;
    if (!api?.loadRecentProjects) return;
    const list = await api.loadRecentProjects();
    setRecents(list ?? []);
  }, []);

  useEffect(() => { loadRecents(); }, [loadRecents]);

  const providerBadge: Record<string, string> = {
    cloudflare: '#f38020',
    aws: '#ff9900',
    vercel: '#ffffff',
    netlify: '#00c7b7',
    deno: '#70ffaf',
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '4px 12px',
      background: '#1a1a1a',
      borderBottom: '1px solid #2a2a2a',
      fontSize: 12,
      color: '#888',
      flexShrink: 0,
      position: 'relative',
    }}>
      {/* Project name */}
      <span style={{ color: '#ccc', fontWeight: 500, minWidth: 120 }}>
        {workspace?.name ?? 'Untitled Project'}
        {workspace && workspacePath && (
          <span style={{ color: '#555', marginLeft: 6 }}>—</span>
        )}
        {workspacePath && (
          <span style={{ color: '#555', marginLeft: 4, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {workspacePath.replace(/.*\//, '')}
          </span>
        )}
      </span>

      {/* Provider badge */}
      {workspace?.config?.cloudProvider && (
        <span style={{
          background: providerBadge[workspace.config.cloudProvider] ?? '#444',
          color: '#000',
          padding: '1px 6px',
          borderRadius: 3,
          fontWeight: 600,
          fontSize: 10,
          textTransform: 'uppercase',
        }}>
          {workspace.config.cloudProvider}
        </span>
      )}

      <div style={{ flex: 1 }} />

      <button className="toolbar-button" onClick={onSave} title="Save project (Cmd+S)">
        Save
      </button>

      <button
        className="toolbar-button"
        onClick={() => { setShowRecents(v => !v); if (!showRecents) loadRecents(); }}
        title="Open or switch project"
      >
        Open ▾
      </button>

      {showRecents && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 80,
          background: '#1e1e1e',
          border: '1px solid #333',
          borderRadius: 6,
          minWidth: 320,
          zIndex: 1000,
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #333', color: '#aaa', fontSize: 11 }}>
            Recent Projects
          </div>
          {recents.length === 0 && (
            <div style={{ padding: '12px', color: '#555' }}>No recent projects</div>
          )}
          {recents.map(r => (
            <button
              key={r.path}
              onClick={() => { onOpenRecent(r); setShowRecents(false); }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                padding: '8px 12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                borderBottom: '1px solid #2a2a2a',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#2a2a2a')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <span style={{ color: '#ddd', fontWeight: 500 }}>{r.name}</span>
              <span style={{ color: '#555', fontSize: 10, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.path}
              </span>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <span style={{
                  background: providerBadge[r.provider] ?? '#444',
                  color: '#000',
                  padding: '0 4px',
                  borderRadius: 2,
                  fontSize: 9,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}>
                  {r.provider}
                </span>
                <span style={{ color: '#555', fontSize: 10 }}>
                  {new Date(r.lastOpened).toLocaleDateString()}
                </span>
              </div>
            </button>
          ))}
          <button
            className="toolbar-button"
            style={{ width: 'calc(100% - 24px)', margin: '6px 12px 8px' }}
            onClick={() => { onOpen(); setShowRecents(false); }}
          >
            Browse for project…
          </button>
        </div>
      )}
    </div>
  );
}
