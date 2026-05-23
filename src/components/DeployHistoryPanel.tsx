import React, { useState, useEffect } from 'react';
import { DeployRecord, EnvConfig } from '../types';

interface DeployHistoryPanelProps {
  onRollback?: (record: DeployRecord) => void;
}

const PROVIDER_ICONS: Record<string, string> = {
  cloudflare: '🟠',
  aws: '🟡',
  vercel: '⚫',
  netlify: '🟢',
};

const DeployHistoryPanel: React.FC<DeployHistoryPanelProps> = ({ onRollback }) => {
  const [history, setHistory] = useState<DeployRecord[]>([]);
  const [rolling, setRolling] = useState<string | null>(null);

  const load = () => {
    const raw = localStorage.getItem('deployHistory');
    setHistory(raw ? JSON.parse(raw) : []);
  };

  useEffect(() => {
    load();
    // Refresh when storage changes (e.g. deploy from another tab)
    window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }, []);

  if (history.length === 0) return null;

  const handleRollback = async (record: DeployRecord) => {
    setRolling(record.id);
    try {
      onRollback?.(record);
    } finally {
      setRolling(null);
    }
  };

  return (
    <div className="panel" style={{ margin: '8px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#ccc' }}>Deploy History</h3>
        <button
          className="toolbar-button"
          style={{ fontSize: '0.72rem', padding: '2px 8px', color: '#666' }}
          onClick={() => { localStorage.removeItem('deployHistory'); load(); }}
        >
          Clear
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {history.map(entry => (
          <div
            key={entry.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: '#1a1a1a',
              borderRadius: 5,
              padding: '8px 10px',
              fontSize: '0.8rem',
            }}
          >
            <span style={{ fontSize: '1rem' }}>{PROVIDER_ICONS[entry.cloudProvider] ?? '☁️'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: '#ddd', fontSize: '0.82rem' }}>{entry.scriptName}</div>
              <div style={{ color: '#666', fontSize: '0.72rem', marginTop: 1 }}>
                {new Date(entry.timestamp).toLocaleString()} · {entry.cloudProvider}
                {entry.latencyMs && <span style={{ color: '#4af', marginLeft: 6 }}>{entry.latencyMs}ms</span>}
              </div>
            </div>
            <a
              href={entry.deployUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#4af', fontSize: '0.75rem', flexShrink: 0 }}
              title={entry.deployUrl}
            >
              Open
            </a>
            {onRollback && (
              <button
                className="toolbar-button"
                style={{ fontSize: '0.72rem', padding: '2px 8px', flexShrink: 0 }}
                disabled={rolling === entry.id}
                onClick={() => handleRollback(entry)}
                title="Re-deploy this version"
              >
                {rolling === entry.id ? '...' : 'Rollback'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeployHistoryPanel;
