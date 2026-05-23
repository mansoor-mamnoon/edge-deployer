import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import '../public/index.css';

import Toolbar from './components/Toolbar';
import TabBar from './components/TabBar';
import MonacoEditor from './components/MonacoEditor';
import DeploymentPanel from './components/DeploymentPanel';
import DeployLogPanel from './components/DeployLogPanel';
import DeployHistoryPanel from './components/DeployHistoryPanel';
import TestPanel from './components/TestPanel';
import LogPanel from './components/LogPanel';
import ConfigModal from './components/ConfigModal';
import AIAssistant from './components/AIAssistant';
import ObservabilityPanel from './components/ObservabilityPanel';
import TemplatesPanel from './components/TemplatesPanel';
import LoadTestPanel from './components/LoadTestPanel';
import SecurityScanner from './components/SecurityScanner';
import InfraExport from './components/InfraExport';
import SecretsVault from './components/SecretsVault';
import PluginPanel from './components/PluginPanel';
import WorkspaceBar from './components/WorkspaceBar';
import ImportPanel from './components/ImportPanel';

import { Tab, EnvConfig, LogEntry, DeployRecord, DeployResult, WorkspaceData, RecentProject, ImportedProject } from './types';

// ── Silence ResizeObserver noise from Monaco ──────────────────────────────
window.addEventListener('error', e => {
  if (e.message?.includes('ResizeObserver')) e.stopImmediatePropagation();
});

// ── Default Worker template ───────────────────────────────────────────────
const DEFAULT_CODE = `addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const { method, url } = request;
  const { pathname } = new URL(url);

  return new Response(
    JSON.stringify({ ok: true, path: pathname, method, ts: Date.now() }),
    { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
  );
}`.trim();

let _tabCounter = 1;
function newTab(code = DEFAULT_CODE, name?: string): Tab {
  const id = `tab-${Date.now()}-${_tabCounter++}`;
  return { id, name: name ?? `worker-${_tabCounter - 1}.js`, code, language: 'javascript', isDirty: false };
}

function makeid() {
  return Math.random().toString(36).slice(2, 10);
}

// ── Sidebar panels ────────────────────────────────────────────────────────
type SidePanel = 'ai' | 'templates' | 'secrets' | 'plugins' | 'import' | null;
type BottomPanel = 'observability' | 'loadtest' | 'security' | 'infra' | 'test' | 'logs' | null;

const App = () => {
  // ── Tabs ────────────────────────────────────────────────────────────────
  const [tabs, setTabs] = useState<Tab[]>([newTab()]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);

  const activeTab = tabs.find(t => t.id === activeTabId) ?? tabs[0];
  const code = activeTab.code;

  const setCode = useCallback((newCode: string) => {
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, code: newCode, isDirty: true } : t));
  }, [activeTabId]);

  const addTab = (code = DEFAULT_CODE, name?: string) => {
    const tab = newTab(code, name);
    setTabs(prev => [...prev, tab]);
    setActiveTabId(tab.id);
  };

  const closeTab = (id: string) => {
    setTabs(prev => {
      const next = prev.filter(t => t.id !== id);
      if (activeTabId === id && next.length) setActiveTabId(next[next.length - 1].id);
      return next;
    });
  };

  // ── Deploy state ─────────────────────────────────────────────────────────
  const [status, setStatus] = useState('');
  const [statusClass, setStatusClass] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [deployLogs, setDeployLogs] = useState<{ message: string; type: string; timestamp: string }[]>([]);

  // ── Observability logs ───────────────────────────────────────────────────
  const [obsLogs, setObsLogs] = useState<LogEntry[]>([]);

  // ── API test ─────────────────────────────────────────────────────────────
  const [testLogs, setTestLogs] = useState<any[]>([]);
  const [requestInput, setRequestInput] = useState('');
  const [requestMethod, setRequestMethod] = useState<'GET' | 'POST'>('GET');

  // ── Config ───────────────────────────────────────────────────────────────
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<EnvConfig>(() => {
    const saved = localStorage.getItem('envConfig');
    return saved ? JSON.parse(saved) : { cloudProvider: 'cloudflare' };
  });

  // Sync config changes from ConfigModal
  useEffect(() => {
    const interval = setInterval(() => {
      const saved = localStorage.getItem('envConfig');
      if (saved) {
        const parsed = JSON.parse(saved);
        setConfig(prev => JSON.stringify(prev) !== saved ? parsed : prev);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Panels ───────────────────────────────────────────────────────────────
  const [sidePanel, setSidePanel] = useState<SidePanel>(null);
  const [bottomPanel, setBottomPanel] = useState<BottomPanel>('test');

  // ── Workspace ────────────────────────────────────────────────────────────
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildWorkspaceData = useCallback((): WorkspaceData => ({
    version: '1',
    name: workspace?.name ?? 'Untitled Project',
    createdAt: workspace?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    config: { cloudProvider: config.cloudProvider },
    tabs,
    activeTabId,
    deployHistory: JSON.parse(localStorage.getItem('deployHistory') ?? '[]'),
    sidePanel,
    bottomPanel,
  }), [workspace, config, tabs, activeTabId, sidePanel, bottomPanel]);

  useEffect(() => {
    if (!workspacePath) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      window.electronAPI?.autoSaveWorkspace?.(workspacePath, buildWorkspaceData());
    }, 30_000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [workspacePath, tabs, buildWorkspaceData]);

  const handleSaveWorkspace = useCallback(async () => {
    try {
      const path = await window.electronAPI?.saveWorkspace(buildWorkspaceData());
      if (path) setWorkspacePath(path);
    } catch { /* user cancelled */ }
  }, [buildWorkspaceData]);

  const handleOpenWorkspace = useCallback(async () => {
    const data = await window.electronAPI?.openWorkspace();
    if (!data) return;
    applyWorkspace(data);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpenRecent = useCallback(async (recent: RecentProject) => {
    const data = await window.electronAPI?.openRecentProject(recent.path);
    if (!data) return;
    setWorkspacePath(recent.path);
    applyWorkspace(data);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function applyWorkspace(data: WorkspaceData) {
    setWorkspace(data);
    if (data.tabs?.length) {
      setTabs(data.tabs);
      setActiveTabId(data.activeTabId ?? data.tabs[0].id);
    }
    if (data.sidePanel) setSidePanel(data.sidePanel as SidePanel);
    if (data.bottomPanel) setBottomPanel(data.bottomPanel as BottomPanel);
    if (data.config?.cloudProvider) {
      setConfig(prev => ({ ...prev, cloudProvider: data.config.cloudProvider }));
    }
    if (data.deployHistory?.length) {
      localStorage.setItem('deployHistory', JSON.stringify(data.deployHistory));
      window.dispatchEvent(new Event('storage'));
    }
  }

  // ── Deploy log stream ─────────────────────────────────────────────────────
  useEffect(() => {
    window.electronAPI?.onDeployLog?.((line: string) => {
      const timestamp = new Date().toLocaleTimeString();
      let type = 'info';
      if (line.includes('ERROR') || line.includes('❌')) type = 'error';
      else if (line.includes('SUCCESS') || line.includes('✅')) type = 'success';
      else if (line.includes('WARNING') || line.includes('⚠️')) type = 'warning';
      setDeployLogs(prev => [...prev, { message: line, type, timestamp }]);

      // Also push to structured observability log
      const entry: LogEntry = {
        id: makeid(),
        timestamp: new Date().toISOString(),
        provider: config.cloudProvider,
        level: type === 'error' ? 'error' : type === 'success' ? 'success' : 'info',
        message: line,
      };
      setObsLogs(prev => [...prev.slice(-499), entry]);
    });
  }, [config.cloudProvider]);

  // ── Dev automation hooks (stripped in production) ─────────────────────────
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    (window as any).__editorDebug = {
      setCode,
      openBottom: (p: string) => setBottomPanel(p as BottomPanel),
      openSide:   (p: string) => setSidePanel(p as SidePanel),
      closeBottom: () => setBottomPanel(null),
      closeSide:   () => setSidePanel(null),
      addObsLog:  (msg: string) => setObsLogs(prev => [...prev, {
        id: makeid(), timestamp: new Date().toISOString(),
        provider: 'cloudflare', level: 'info', message: msg, latencyMs: Math.floor(Math.random()*80)+10,
      }]),
    };
  }, [setCode, setBottomPanel, setSidePanel, setObsLogs]);

  // ── Run preview ───────────────────────────────────────────────────────────
  const runPreview = useCallback(() => {
    const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'preview-started' }, '*');
      setTimeout(() => {
        iframe.contentWindow?.postMessage({ type: 'run-code', code }, '*');
      }, 80);
    }
  }, [code]);

  // ── Deploy ────────────────────────────────────────────────────────────────
  const deploy = async () => {
    setIsDeploying(true);
    setStatus(`Deploying to ${config.cloudProvider}...`);
    setStatusClass('');
    setDeployLogs([]);

    try {
      const result: DeployResult = await window.electronAPI.deployToCloud(code, config);

      setDeployUrl(result.url);
      setStatus('Deploy successful!');
      setStatusClass('status-success');

      // Save to history
      const scriptName = config.cfScriptName ?? config.awsLambdaName ?? config.vercelProjectId ?? 'unnamed';
      const record: DeployRecord = {
        id: makeid(),
        scriptName,
        timestamp: result.timestamp,
        cloudProvider: result.provider,
        deployUrl: result.url,
        code,
        deploymentId: result.deploymentId,
        latencyMs: result.latencyMs,
      };
      const existing: DeployRecord[] = JSON.parse(localStorage.getItem('deployHistory') ?? '[]');
      localStorage.setItem('deployHistory', JSON.stringify([record, ...existing].slice(0, 10)));
      window.dispatchEvent(new Event('storage'));

      // Mark tab as clean
      setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, isDirty: false } : t));

      // Add to observability log
      setObsLogs(prev => [...prev, {
        id: makeid(),
        timestamp: result.timestamp,
        provider: result.provider,
        level: 'success',
        message: `Deployed: ${result.url}`,
        latencyMs: result.latencyMs,
        status: 200,
      }]);

    } catch (err: any) {
      setStatus(`Deploy failed: ${err.message}`);
      setStatusClass('status-error');
      setObsLogs(prev => [...prev, {
        id: makeid(),
        timestamp: new Date().toISOString(),
        provider: config.cloudProvider,
        level: 'error',
        message: `Deploy failed: ${err.message}`,
      }]);
    } finally {
      setIsDeploying(false);
    }
  };

  // ── Rollback ──────────────────────────────────────────────────────────────
  const handleRollback = async (record: DeployRecord) => {
    setIsDeploying(true);
    setStatus('Rolling back...');
    setDeployLogs([]);

    try {
      const result = await window.electronAPI.rollbackDeploy(record, config);
      setDeployUrl(result.url);
      setStatus('Rollback complete!');
      setStatusClass('status-success');
    } catch (err: any) {
      setStatus(`Rollback failed: ${err.message}`);
      setStatusClass('status-error');
    } finally {
      setIsDeploying(false);
    }
  };

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runPreview(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (workspacePath) {
          window.electronAPI?.autoSaveWorkspace?.(workspacePath, buildWorkspaceData());
        } else {
          window.electronAPI?.saveFile(code);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') { e.preventDefault(); handleOpenFile(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 't') { e.preventDefault(); addTab(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [code, runPreview]);

  const handleOpenFile = async () => {
    const content = await window.electronAPI?.openFile();
    if (content) addTab(content, 'opened-file.js');
  };

  // ── Side panel toggle ─────────────────────────────────────────────────────
  const toggleSide = (panel: SidePanel) => setSidePanel(prev => prev === panel ? null : panel);
  const toggleBottom = (panel: BottomPanel) => setBottomPanel(prev => prev === panel ? null : panel);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="app-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Workspace bar ── */}
      <WorkspaceBar
        workspace={workspace}
        workspacePath={workspacePath}
        onSave={handleSaveWorkspace}
        onOpen={handleOpenWorkspace}
        onOpenRecent={handleOpenRecent}
      />

      {/* ── Toolbar ── */}
      <Toolbar
        code={code}
        config={config}
        isDeploying={isDeploying}
        onRun={runPreview}
        onDeploy={deploy}
        onSaveFile={() => window.electronAPI?.saveFile(code)}
        onOpenFile={handleOpenFile}
        onReset={() => setCode(DEFAULT_CODE)}
        onOpenConfig={() => setShowConfig(true)}
        onNewTab={() => addTab()}
      />

      {/* ── Tab bar + side panel buttons ── */}
      <div style={{ display: 'flex', alignItems: 'center', background: '#1a1a1a', borderBottom: '1px solid #333' }}>
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onSelect={setActiveTabId}
          onClose={closeTab}
          onNew={() => addTab()}
        />
        <div style={{ flex: 1 }} />
        {/* Side panel buttons */}
        <div style={{ display: 'flex', gap: 2, padding: '0 8px', flexShrink: 0 }}>
          {([
            { id: 'templates', label: 'Templates' },
            { id: 'ai', label: 'AI' },
            { id: 'secrets', label: 'Secrets' },
            { id: 'plugins', label: 'Plugins' },
            { id: 'import', label: 'Import' },
          ] as { id: SidePanel; label: string }[]).map(btn => (
            <button
              key={btn.id}
              className="toolbar-button"
              onClick={() => toggleSide(btn.id)}
              style={{
                fontSize: '0.72rem',
                padding: '3px 8px',
                background: sidePanel === btn.id ? '#1a4a7a' : undefined,
                color: sidePanel === btn.id ? '#fff' : '#888',
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Editor + Deploy column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* Editor + right panel */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0, padding: '8px 8px 0' }}>

            {/* Monaco editor */}
            <div style={{ flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <MonacoEditor
                code={code}
                language={activeTab.language}
                setCode={setCode}
                onHotReload={runPreview}
              />
            </div>

            {/* Deploy panel + preview */}
            <div style={{ flex: 1, minWidth: 260, maxWidth: 380, display: 'flex', flexDirection: 'column', marginLeft: 8, gap: 8 }}>
              <div className="panel" style={{ margin: 0, padding: '10px 12px' }}>
                <DeploymentPanel
                  status={status}
                  isDeploying={isDeploying}
                  deployUrl={deployUrl}
                  statusClass={statusClass}
                />
              </div>

              {/* Preview */}
              <div className="panel" style={{ margin: 0, flex: 1, padding: '8px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '0.78rem', color: '#666', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Preview (hot reload)</span>
                  <button className="toolbar-button" style={{ fontSize: '0.68rem', padding: '1px 6px' }} onClick={runPreview}>↺</button>
                </div>
                <iframe
                  id="preview-iframe"
                  src="preview.html"
                  title="Edge Function Preview"
                  style={{
                    flex: 1,
                    width: '100%',
                    minHeight: 160,
                    background: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    borderRadius: 4,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Deploy log strip */}
          {deployLogs.length > 0 && (
            <div className="panel" style={{ margin: '0 8px 0', padding: '6px 10px' }}>
              <DeployLogPanel logs={deployLogs} />
            </div>
          )}

          {/* Deploy history */}
          <DeployHistoryPanel onRollback={handleRollback} />

          {/* Bottom panel selector */}
          <div style={{ display: 'flex', gap: 2, padding: '4px 8px', borderTop: '1px solid #2a2a2a', background: '#151515' }}>
            {([
              { id: 'test', label: 'API Test' },
              { id: 'logs', label: 'Response Log' },
              { id: 'observability', label: 'Observability' },
              { id: 'loadtest', label: 'Load Test' },
              { id: 'security', label: 'Security' },
              { id: 'infra', label: 'IaC Export' },
            ] as { id: BottomPanel; label: string }[]).map(btn => (
              <button
                key={btn.id}
                className="toolbar-button"
                onClick={() => toggleBottom(btn.id)}
                style={{
                  fontSize: '0.72rem',
                  padding: '3px 8px',
                  background: bottomPanel === btn.id ? '#1a3a5a' : undefined,
                  color: bottomPanel === btn.id ? '#fff' : '#666',
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Bottom panel content */}
          {bottomPanel && (
            <div style={{ height: 240, borderTop: '1px solid #2a2a2a', background: '#171717', overflowY: 'auto' }}>
              {bottomPanel === 'test' && (
                <TestPanel
                  deployUrl={deployUrl}
                  requestInput={requestInput}
                  setRequestInput={setRequestInput}
                  requestMethod={requestMethod}
                  setRequestMethod={setRequestMethod}
                  setLogs={setTestLogs}
                />
              )}
              {bottomPanel === 'logs' && (
                <LogPanel logs={testLogs} setLogs={setTestLogs} />
              )}
              {bottomPanel === 'observability' && (
                <ObservabilityPanel
                  logs={obsLogs}
                  onClear={() => setObsLogs([])}
                  config={config}
                  onAddLog={(entry) => setObsLogs(prev => [...prev, entry])}
                />
              )}
              {bottomPanel === 'loadtest' && (
                <LoadTestPanel deployUrl={deployUrl} />
              )}
              {bottomPanel === 'security' && (
                <SecurityScanner code={code} />
              )}
              {bottomPanel === 'infra' && (
                <InfraExport code={code} config={config} />
              )}
            </div>
          )}
        </div>

        {/* ── Side panel ── */}
        {sidePanel && (
          <div style={{
            width: 380,
            borderLeft: '1px solid #2a2a2a',
            background: '#141414',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            flexShrink: 0,
          }}>
            {sidePanel === 'ai' && (
              <AIAssistant
                code={code}
                onInsertCode={c => setCode(c)}
              />
            )}
            {sidePanel === 'templates' && (
              <TemplatesPanel
                onLoad={(c, name) => {
                  addTab(c, `${name.toLowerCase().replace(/\s+/g, '-')}.js`);
                  setSidePanel(null);
                }}
              />
            )}
            {sidePanel === 'secrets' && (
              <SecretsVault config={config} />
            )}
            {sidePanel === 'plugins' && (
              <PluginPanel />
            )}
            {sidePanel === 'import' && (
              <ImportPanel
                config={config}
                currentCode={code}
                onImport={(project: ImportedProject) => {
                  addTab(project.code, `${project.name}.js`);
                  setSidePanel(null);
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Config modal ── */}
      {showConfig && <ConfigModal onClose={() => setShowConfig(false)} />}
    </div>
  );
};

// ── Mount ─────────────────────────────────────────────────────────────────
const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(<App />);
} else {
  console.error('Root element not found');
}
