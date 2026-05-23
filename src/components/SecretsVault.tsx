import React, { useState, useEffect } from 'react';
import { SecretEntry } from '../types';
import { EnvConfig } from '../types';

interface SecretsVaultProps {
  config: EnvConfig;
}

const SecretsVault: React.FC<SecretsVaultProps> = ({ config }) => {
  const [secrets, setSecrets] = useState<SecretEntry[]>([]);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [scope, setScope] = useState<SecretEntry['scope']>('global');
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const load = async () => {
    try {
      const data = await (window as any).electronAPI.loadSecrets();
      setSecrets(data ?? []);
    } catch {
      setSecrets([]);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!newKey.trim() || !newValue.trim()) return;
    setLoading(true);
    try {
      const entry: SecretEntry = {
        key: newKey.trim(),
        value: newValue.trim(),
        scope,
        createdAt: new Date().toISOString(),
      };
      await (window as any).electronAPI.saveSecret(entry);
      setNewKey('');
      setNewValue('');
      setStatus('Saved');
      await load();
      setTimeout(() => setStatus(''), 2000);
    } finally {
      setLoading(false);
    }
  };

  const del = async (key: string) => {
    if (!confirm(`Delete secret "${key}"?`)) return;
    await (window as any).electronAPI.deleteSecret(key);
    await load();
  };

  const toggleReveal = (key: string) => {
    setRevealed(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <div style={{ padding: '12px 14px', color: '#f5f5f5', fontSize: '0.83rem' }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Secrets Vault</div>
      <div style={{ color: '#666', fontSize: '0.75rem', marginBottom: 14 }}>
        Stored with AES-256-GCM encryption. Secrets are never logged or transmitted outside your machine.
      </div>

      {/* Add new secret */}
      <div style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: 6, padding: '12px', marginBottom: 14 }}>
        <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: 8 }}>Add secret</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            value={newKey}
            onChange={e => setNewKey(e.target.value)}
            placeholder="KEY_NAME"
            style={{ flex: 1, minWidth: 120, background: '#111', border: '1px solid #444', color: '#fff', padding: '5px 8px', borderRadius: 4, fontFamily: 'monospace', fontSize: '0.8rem' }}
          />
          <input
            type="password"
            value={newValue}
            onChange={e => setNewValue(e.target.value)}
            placeholder="secret value"
            style={{ flex: 2, minWidth: 160, background: '#111', border: '1px solid #444', color: '#fff', padding: '5px 8px', borderRadius: 4, fontFamily: 'monospace', fontSize: '0.8rem' }}
            onKeyDown={e => { if (e.key === 'Enter') save(); }}
          />
          <select
            value={scope}
            onChange={e => setScope(e.target.value as SecretEntry['scope'])}
            style={{ background: '#111', border: '1px solid #444', color: '#fff', padding: '5px 8px', borderRadius: 4, fontSize: '0.8rem' }}
          >
            <option value="global">Global</option>
            <option value="cloudflare">Cloudflare</option>
            <option value="aws">AWS</option>
            <option value="vercel">Vercel</option>
            <option value="netlify">Netlify</option>
          </select>
          <button
            className="toolbar-button"
            onClick={save}
            disabled={loading || !newKey.trim() || !newValue.trim()}
            style={{ fontSize: '0.8rem' }}
          >
            {status || 'Add'}
          </button>
        </div>
      </div>

      {/* Secret list */}
      {secrets.length === 0 ? (
        <div style={{ color: '#444', textAlign: 'center', padding: '20px 0' }}>No secrets stored yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {secrets.map(s => (
            <div
              key={s.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: '#1e1e1e',
                border: '1px solid #2a2a2a',
                borderRadius: 4,
                padding: '7px 10px',
              }}
            >
              <span style={{ fontFamily: 'monospace', color: '#4af', flex: '0 0 auto', fontSize: '0.8rem' }}>{s.key}</span>
              <span style={{ flex: 1, fontFamily: 'monospace', color: '#888', fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {revealed.has(s.key) ? s.value : '••••••••'}
              </span>
              <span style={{ fontSize: '0.7rem', color: '#555', background: '#222', padding: '1px 6px', borderRadius: 3 }}>
                {s.scope}
              </span>
              <button
                className="toolbar-button"
                style={{ fontSize: '0.7rem', padding: '2px 7px' }}
                onClick={() => toggleReveal(s.key)}
                title={revealed.has(s.key) ? 'Hide' : 'Reveal'}
              >
                {revealed.has(s.key) ? 'Hide' : 'Show'}
              </button>
              <button
                className="toolbar-button"
                style={{ fontSize: '0.7rem', padding: '2px 7px', color: '#f44' }}
                onClick={() => del(s.key)}
                title="Delete"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SecretsVault;
