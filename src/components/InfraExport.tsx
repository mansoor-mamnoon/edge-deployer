import React, { useState } from 'react';
import { EnvConfig } from '../types';

interface InfraExportProps {
  code: string;
  config: EnvConfig;
}

type ExportFormat = 'pulumi' | 'terraform' | 'wrangler' | 'dockerfile';

interface ExportOption {
  id: ExportFormat;
  label: string;
  description: string;
  icon: string;
  provider?: string[];
}

const OPTIONS: ExportOption[] = [
  {
    id: 'pulumi',
    label: 'Pulumi',
    description: 'TypeScript Pulumi program — deploy with `pulumi up`',
    icon: '🔷',
    provider: ['cloudflare'],
  },
  {
    id: 'terraform',
    label: 'Terraform',
    description: 'HCL config — deploy with `terraform apply`',
    icon: '🟣',
    provider: ['cloudflare', 'aws', 'vercel'],
  },
  {
    id: 'wrangler',
    label: 'Wrangler',
    description: '`wrangler.toml` — deploy with `wrangler deploy`',
    icon: '🟠',
    provider: ['cloudflare'],
  },
  {
    id: 'dockerfile',
    label: 'Docker + Kubernetes',
    description: 'Dockerfile + `kubernetes.yaml` for any cloud',
    icon: '🐳',
    provider: undefined, // all providers
  },
];

const InfraExport: React.FC<InfraExportProps> = ({ code, config }) => {
  const [loading, setLoading] = useState<ExportFormat | null>(null);
  const [done, setDone] = useState<ExportFormat | null>(null);

  const download = async (format: ExportFormat) => {
    setLoading(format);
    setDone(null);
    try {
      const api = (window as any).electronAPI;
      switch (format) {
        case 'pulumi': await api.downloadPulumi(config, code); break;
        case 'terraform': await api.downloadTerraform(config, code); break;
        case 'wrangler': await api.downloadWrangler(config, code); break;
        case 'dockerfile': await api.downloadDockerfile(config, code); break;
      }
      setDone(format);
      setTimeout(() => setDone(null), 3000);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{ padding: '12px 14px', color: '#f5f5f5', fontSize: '0.83rem' }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Infrastructure Export</div>
      <div style={{ color: '#666', fontSize: '0.78rem', marginBottom: 14 }}>
        Export your current code as production-ready infrastructure configs.
        Files are saved to your Downloads folder.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {OPTIONS.map(opt => {
          const supported = !opt.provider || opt.provider.includes(config.cloudProvider);
          return (
            <div
              key={opt.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#1e1e1e',
                border: '1px solid #333',
                borderRadius: 6,
                padding: '10px 14px',
                opacity: supported ? 1 : 0.4,
              }}
            >
              <span style={{ fontSize: '1.3rem', marginRight: 12 }}>{opt.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{opt.label}</div>
                <div style={{ color: '#888', fontSize: '0.75rem' }}>{opt.description}</div>
                {!supported && (
                  <div style={{ color: '#555', fontSize: '0.72rem', marginTop: 2 }}>
                    Not available for {config.cloudProvider}
                  </div>
                )}
              </div>
              <button
                className="toolbar-button"
                disabled={!supported || loading === opt.id}
                onClick={() => download(opt.id)}
                style={{ minWidth: 90, fontSize: '0.78rem' }}
              >
                {loading === opt.id ? 'Exporting...' : done === opt.id ? 'Saved!' : 'Export'}
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16, padding: '10px 12px', background: '#1a2a1a', border: '1px solid #2a4a2a', borderRadius: 6, fontSize: '0.78rem', color: '#888' }}>
        <strong style={{ color: '#4f4' }}>Tip:</strong> After exporting, open the downloaded folder and follow the README.
        All configs are production-ready with proper variable substitution.
      </div>
    </div>
  );
};

export default InfraExport;
