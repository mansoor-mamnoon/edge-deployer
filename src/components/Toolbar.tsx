import React from 'react';
import { EnvConfig, CloudProvider } from '../types';

interface ToolbarProps {
  code: string;
  config: EnvConfig;
  isDeploying: boolean;
  onRun: () => void;
  onDeploy: () => void;
  onSaveFile: () => void;
  onOpenFile: () => void;
  onReset: () => void;
  onOpenConfig: () => void;
  onNewTab: () => void;
}

const PROVIDER_LABELS: Record<CloudProvider, string> = {
  cloudflare: 'Cloudflare',
  aws: 'AWS Lambda',
  vercel: 'Vercel',
  netlify: 'Netlify',
  deno: 'Deno Deploy',
  railway: 'Railway',
  flyio: 'Fly.io',
};

declare global {
  interface Window {
    electronAPI: import('../types').ElectronAPI;
  }
}

const Toolbar: React.FC<ToolbarProps> = ({
  code,
  config,
  isDeploying,
  onRun,
  onDeploy,
  onSaveFile,
  onOpenFile,
  onReset,
  onOpenConfig,
  onNewTab,
}) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '7px 10px',
      background: '#1e1e1e',
      borderBottom: '1px solid #333',
      flexWrap: 'nowrap',
      overflowX: 'auto',
    }}>
      {/* Brand */}
      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#4af', marginRight: 6, flexShrink: 0, letterSpacing: '-0.5px' }}>
        Edge Deployer
      </div>

      <div style={{ width: 1, height: 18, background: '#333', flexShrink: 0 }} />

      {/* File ops */}
      <button className="toolbar-button" onClick={onNewTab} title="New tab">+ Tab</button>
      <button className="toolbar-button" onClick={onOpenFile} title="Open file (Ctrl+O)">Open</button>
      <button className="toolbar-button" onClick={onSaveFile} title="Save file (Ctrl+S)">Save</button>

      <div style={{ width: 1, height: 18, background: '#333', flexShrink: 0 }} />

      {/* Execution */}
      <button className="toolbar-button" onClick={onRun} title="Run preview (Ctrl+Enter)" style={{ color: '#4f4' }}>
        ▶ Run
      </button>

      <div style={{ width: 1, height: 18, background: '#333', flexShrink: 0 }} />

      {/* Deploy */}
      <button
        className="toolbar-button"
        onClick={onDeploy}
        disabled={isDeploying}
        style={{
          background: isDeploying ? '#1a3a1a' : '#1a4a1a',
          color: isDeploying ? '#666' : '#4f4',
          border: '1px solid #2a6a2a',
          fontWeight: 700,
          minWidth: 130,
          flexShrink: 0,
        }}
        title={`Deploy to ${PROVIDER_LABELS[config.cloudProvider]}`}
      >
        {isDeploying ? 'Deploying...' : `Deploy → ${PROVIDER_LABELS[config.cloudProvider] ?? config.cloudProvider}`}
      </button>

      <div style={{ width: 1, height: 18, background: '#333', flexShrink: 0 }} />

      {/* Utilities */}
      <button className="toolbar-button" onClick={onReset} title="Reset to default template">Reset</button>
      <button
        className="toolbar-button"
        onClick={onOpenConfig}
        title="Configure credentials"
        style={{ color: '#fa0' }}
      >
        ⚙ Config
      </button>
    </div>
  );
};

export default Toolbar;
