import React, { useState, useEffect } from 'react';
import { EnvConfig, CloudProvider, TelemetryLevel } from '../types';

const PROVIDERS: { value: CloudProvider; label: string }[] = [
  { value: 'cloudflare', label: 'Cloudflare Workers' },
  { value: 'aws', label: 'AWS Lambda' },
  { value: 'vercel', label: 'Vercel Functions' },
  { value: 'netlify', label: 'Netlify Edge Functions' },
  { value: 'flyio', label: 'Fly.io' },
  { value: 'railway', label: 'Railway' },
];

const defaultConfig: EnvConfig = {
  cloudProvider: 'cloudflare',
  cfApiToken: '',
  cfAccountId: '',
  cfScriptName: '',
};

const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }> = ({
  label, value, onChange, type = 'text', placeholder,
}) => (
  <div style={{ marginBottom: 10 }}>
    <label style={{ display: 'block', fontSize: '0.78rem', color: '#888', marginBottom: 3 }}>{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        background: '#111',
        border: '1px solid #333',
        color: '#fff',
        padding: '6px 8px',
        borderRadius: 4,
        fontFamily: 'monospace',
        fontSize: '0.82rem',
        boxSizing: 'border-box',
      }}
    />
  </div>
);

const ConfigModal = ({ onClose }: { onClose: () => void }) => {
  const [config, setConfig] = useState<EnvConfig>(() => {
    const saved = localStorage.getItem('envConfig');
    return saved ? JSON.parse(saved) : defaultConfig;
  });
  const [telemetry, setTelemetryState] = useState<TelemetryLevel>('off');
  const [tab, setTab] = useState<'provider' | 'telemetry'>('provider');

  useEffect(() => {
    window.electronAPI?.getTelemetryLevel?.().then(l => setTelemetryState(l)).catch(() => {});
  }, []);

  const handleTelemetryChange = (level: TelemetryLevel) => {
    setTelemetryState(level);
    window.electronAPI?.setTelemetryLevel?.(level).catch(() => {});
  };

  const update = (field: keyof EnvConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const save = () => {
    localStorage.setItem('envConfig', JSON.stringify(config));
    onClose();
  };

  const renderFields = () => {
    switch (config.cloudProvider) {
      case 'cloudflare':
        return (
          <>
            <Field label="API Token" value={config.cfApiToken ?? ''} onChange={v => update('cfApiToken', v)} type="password" placeholder="cf-..." />
            <Field label="Account ID" value={config.cfAccountId ?? ''} onChange={v => update('cfAccountId', v)} placeholder="32-char hex" />
            <Field label="Script Name" value={config.cfScriptName ?? ''} onChange={v => update('cfScriptName', v)} placeholder="my-worker" />
          </>
        );
      case 'aws':
        return (
          <>
            <Field label="Access Key ID" value={config.awsAccessKeyId ?? ''} onChange={v => update('awsAccessKeyId', v)} placeholder="AKIAIOSFODNN7EXAMPLE" />
            <Field label="Secret Access Key" value={config.awsSecretAccessKey ?? ''} onChange={v => update('awsSecretAccessKey', v)} type="password" />
            <Field label="Region" value={config.awsRegion ?? ''} onChange={v => update('awsRegion', v)} placeholder="us-east-1" />
            <Field label="Function Name" value={config.awsLambdaName ?? ''} onChange={v => update('awsLambdaName', v)} placeholder="my-function" />
          </>
        );
      case 'vercel':
        return (
          <>
            <Field label="API Token" value={config.vercelToken ?? ''} onChange={v => update('vercelToken', v)} type="password" />
            <Field label="Project ID" value={config.vercelProjectId ?? ''} onChange={v => update('vercelProjectId', v)} />
            <Field label="Team ID (optional)" value={config.vercelTeamId ?? ''} onChange={v => update('vercelTeamId', v)} />
          </>
        );
      case 'netlify':
        return (
          <>
            <Field label="Personal Access Token" value={config.netlifyToken ?? ''} onChange={v => update('netlifyToken', v)} type="password" />
            <Field label="Site ID" value={config.netlifySiteId ?? ''} onChange={v => update('netlifySiteId', v)} />
          </>
        );
      case 'flyio':
        return (
          <>
            <Field label="Fly.io API Token" value={config.flyioToken ?? ''} onChange={v => update('flyioToken', v)} type="password" placeholder="fo1_..." />
            <Field label="App Name" value={config.flyioAppName ?? ''} onChange={v => update('flyioAppName', v)} placeholder="my-edge-worker" />
            <Field label="Region" value={config.flyioRegion ?? ''} onChange={v => update('flyioRegion', v)} placeholder="iad (default)" />
            <div style={{ color: '#666', fontSize: '0.75rem', marginTop: 4 }}>
              Create the app first: <code style={{ color: '#aaa' }}>fly apps create my-edge-worker</code>
            </div>
          </>
        );
      case 'railway':
        return (
          <>
            <Field label="Railway Token" value={config.railwayToken ?? ''} onChange={v => update('railwayToken', v)} type="password" />
            <Field label="Project ID" value={config.railwayProjectId ?? ''} onChange={v => update('railwayProjectId', v)} placeholder="From Project Settings" />
            <Field label="Service ID" value={config.railwayServiceId ?? ''} onChange={v => update('railwayServiceId', v)} />
            <Field label="Environment ID (optional)" value={config.railwayEnvironmentId ?? ''} onChange={v => update('railwayEnvironmentId', v)} placeholder="production" />
          </>
        );
      default:
        return <div style={{ color: '#666', fontSize: '0.8rem' }}>Provider not yet configured.</div>;
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#1e1e1e',
        border: '1px solid #333',
        borderRadius: 8,
        padding: 24,
        width: 420,
        color: '#fff',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Settings</h2>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['provider', 'telemetry'] as const).map(t => (
              <button key={t} className="toolbar-button" onClick={() => setTab(t)}
                style={{ fontSize: '0.75rem', background: tab === t ? '#1a4a7a' : undefined, textTransform: 'capitalize' }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {tab === 'provider' && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#888', marginBottom: 5 }}>Cloud Provider</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {PROVIDERS.map(p => (
                  <button
                    key={p.value}
                    className="toolbar-button"
                    onClick={() => update('cloudProvider', p.value)}
                    style={{
                      fontSize: '0.78rem',
                      background: config.cloudProvider === p.value ? '#1a4a7a' : '#2a2a2a',
                      border: config.cloudProvider === p.value ? '1px solid #4af' : '1px solid #333',
                      color: config.cloudProvider === p.value ? '#fff' : '#888',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ borderTop: '1px solid #333', paddingTop: 14, marginBottom: 14 }}>
              {renderFields()}
            </div>
          </>
        )}

        {tab === 'telemetry' && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: 12, lineHeight: 1.6 }}>
              Edge Deployer collects <strong style={{ color: '#ccc' }}>no data by default</strong>. If you opt in, only anonymous crash reports or aggregate feature usage are recorded locally and — only if you choose "Usage" — sent to our servers. Your code, credentials, and API keys are never included.
            </p>
            {(['off', 'errors', 'usage'] as TelemetryLevel[]).map(level => {
              const labels: Record<TelemetryLevel, string> = {
                off: 'Off — nothing recorded',
                errors: 'Errors only — local crash log, no network',
                usage: 'Errors + usage — anonymous, helps improve the app',
              };
              return (
                <div key={level} onClick={() => handleTelemetryChange(level)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', marginBottom: 6, borderRadius: 6,
                    background: telemetry === level ? '#1a3a1a' : '#1a1a1a', border: `1px solid ${telemetry === level ? '#2a6a2a' : '#333'}`,
                    cursor: 'pointer' }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid', flexShrink: 0,
                    borderColor: telemetry === level ? '#4f4' : '#555',
                    background: telemetry === level ? '#4f4' : 'transparent' }} />
                  <span style={{ fontSize: '0.82rem', color: telemetry === level ? '#fff' : '#888' }}>{labels[level]}</span>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="toolbar-button" onClick={onClose} style={{ color: '#666' }}>Cancel</button>
          <button
            className="toolbar-button"
            onClick={save}
            style={{ background: '#1a4a1a', border: '1px solid #2a6a2a', color: '#4f4', fontWeight: 700 }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigModal;
