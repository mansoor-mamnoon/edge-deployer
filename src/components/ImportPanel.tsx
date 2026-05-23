import React, { useState } from 'react';
import { EnvConfig, ImportedProject } from '../types';

interface Props {
  config: EnvConfig;
  currentCode: string;
  onImport: (project: ImportedProject) => void;
}

interface DriftResult {
  hasDrift: boolean;
  localLines: number;
  remoteLines: number;
  diff: string;
}

export default function ImportPanel({ config, currentCode, onImport }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState<ImportedProject | null>(null);
  const [drift, setDrift] = useState<DriftResult | null>(null);
  const [driftLoading, setDriftLoading] = useState(false);

  const api = (window as any).electronAPI;

  async function handleImport() {
    setLoading(true);
    setError(null);
    setImported(null);
    setDrift(null);
    try {
      const project: ImportedProject = await api.importFromCloud(config);
      setImported(project);
    } catch (e: any) {
      setError(e.message ?? 'Import failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleDrift() {
    setDriftLoading(true);
    setError(null);
    setDrift(null);
    try {
      const result: DriftResult = await api.detectDrift(currentCode, config);
      setDrift(result);
    } catch (e: any) {
      setError(e.message ?? 'Drift check failed');
    } finally {
      setDriftLoading(false);
    }
  }

  const providerSupported = ['cloudflare', 'vercel', 'aws'].includes(config.cloudProvider ?? '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#141414' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a2a2a' }}>
        <div style={{ fontWeight: 600, color: '#eee', marginBottom: 4 }}>Import from Cloud</div>
        <div style={{ color: '#666', fontSize: 12 }}>
          Pull your deployed function code back into the editor.
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {/* Provider check */}
        {!providerSupported && (
          <div style={{
            background: '#2a1a1a', border: '1px solid #5c2a2a', borderRadius: 6,
            padding: 12, color: '#f88', marginBottom: 12, fontSize: 13,
          }}>
            Import is supported for Cloudflare, Vercel, and AWS. Select one in Config.
          </div>
        )}

        {/* Credentials hint */}
        <div style={{
          background: '#1e1e1e', border: '1px solid #2d2d2d', borderRadius: 6,
          padding: 12, marginBottom: 12, fontSize: 12,
        }}>
          <div style={{ color: '#aaa', fontWeight: 500, marginBottom: 4 }}>
            Active provider: <span style={{ color: '#7eb8f7' }}>{config.cloudProvider ?? 'none'}</span>
          </div>
          {config.cloudProvider === 'cloudflare' && (
            <div style={{ color: '#666' }}>
              Needs: CF API Token, Account ID, Script Name
            </div>
          )}
          {config.cloudProvider === 'vercel' && (
            <div style={{ color: '#666' }}>
              Needs: Vercel Token, Project ID
            </div>
          )}
          {config.cloudProvider === 'aws' && (
            <div style={{ color: '#666' }}>
              Needs: AWS credentials, Region, Lambda name
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            className="toolbar-button"
            onClick={handleImport}
            disabled={!providerSupported || loading}
            style={{ flex: 1, padding: '8px 0' }}
          >
            {loading ? 'Importing…' : `Import from ${config.cloudProvider ?? 'Cloud'}`}
          </button>

          <button
            className="toolbar-button"
            onClick={handleDrift}
            disabled={!providerSupported || driftLoading}
            style={{ flex: 1, padding: '8px 0' }}
            title="Compare local editor code with currently deployed code"
          >
            {driftLoading ? 'Checking…' : 'Check Drift'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: '#2a1a1a', border: '1px solid #5c2a2a', borderRadius: 6,
            padding: 12, color: '#f88', marginBottom: 12, fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* Drift result */}
        {drift && (
          <div style={{
            background: drift.hasDrift ? '#1e1a00' : '#0e1e12',
            border: `1px solid ${drift.hasDrift ? '#5c4a00' : '#1a4d2a'}`,
            borderRadius: 6, padding: 12, marginBottom: 12,
          }}>
            <div style={{ fontWeight: 600, color: drift.hasDrift ? '#ffcc00' : '#4caf50', marginBottom: 8 }}>
              {drift.hasDrift ? '⚠️  Drift detected' : '✅ No drift — local matches deployed'}
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#999', marginBottom: drift.hasDrift ? 8 : 0 }}>
              <span>Local: {drift.localLines} lines</span>
              <span>Remote: {drift.remoteLines} lines</span>
            </div>
            {drift.hasDrift && drift.diff && (
              <pre style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                background: '#111', borderRadius: 4, padding: 10, margin: 0,
                overflowX: 'auto', color: '#ccc', maxHeight: 200, overflowY: 'auto',
              }}>
                {drift.diff.split('\n').map((line, i) => (
                  <div key={i} style={{
                    color: line.startsWith('+') ? '#4caf50' : line.startsWith('-') ? '#f44' : '#888',
                  }}>
                    {line}
                  </div>
                ))}
              </pre>
            )}
          </div>
        )}

        {/* Import result */}
        {imported && (
          <div style={{
            background: '#0e1e12', border: '1px solid #1a4d2a', borderRadius: 6, padding: 12,
          }}>
            <div style={{ fontWeight: 600, color: '#4caf50', marginBottom: 8 }}>
              ✅ Imported: {imported.name}
            </div>
            <div style={{ color: '#888', fontSize: 12, marginBottom: 10 }}>
              Provider: {imported.provider} · {imported.code.split('\n').length} lines ·{' '}
              {new Date(imported.importedAt).toLocaleString()}
            </div>
            <pre style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
              background: '#111', borderRadius: 4, padding: 10, margin: '0 0 12px 0',
              overflowX: 'auto', color: '#ccc', maxHeight: 200, overflowY: 'auto',
            }}>
              {imported.code.slice(0, 800)}{imported.code.length > 800 ? '\n...' : ''}
            </pre>
            <button
              className="toolbar-button"
              style={{ width: '100%', padding: '8px 0', background: '#1a4d2a', borderColor: '#2a7a3a', color: '#7ddf85' }}
              onClick={() => onImport(imported)}
            >
              Load into editor
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
