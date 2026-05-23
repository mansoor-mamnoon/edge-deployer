import { contextBridge, ipcRenderer } from 'electron';
import { EnvConfig, DeployRecord, AIMessage, SecretEntry, WorkspaceData, TelemetryLevel } from '../src/types';

contextBridge.exposeInMainWorld('electronAPI', {
  // ── File ops ─────────────────────────────────────────────────────────────
  saveFile: (code: string) => ipcRenderer.invoke('save-file', code),
  openFile: () => ipcRenderer.invoke('open-file'),

  // ── Deploy ────────────────────────────────────────────────────────────────
  deployCode: (code: string) => ipcRenderer.invoke('deploy-code', code),
  deployToCloud: (code: string, config: EnvConfig) =>
    ipcRenderer.invoke('deploy-to-cloud', code, config),
  rollbackDeploy: (record: DeployRecord, config: EnvConfig) =>
    ipcRenderer.invoke('rollback-deploy', record, config),
  rollbackWithHealthcheck: (record: DeployRecord, config: EnvConfig) =>
    ipcRenderer.invoke('rollback-with-healthcheck', record, config),

  // ── IaC exports ───────────────────────────────────────────────────────────
  downloadPulumi: (config: EnvConfig, code: string) =>
    ipcRenderer.invoke('download-pulumi', config, code),
  downloadTerraform: (config: EnvConfig, code: string) =>
    ipcRenderer.invoke('download-terraform', config, code),
  downloadWrangler: (config: EnvConfig, code: string) =>
    ipcRenderer.invoke('download-wrangler', config, code),
  downloadDockerfile: (config: EnvConfig, code: string) =>
    ipcRenderer.invoke('download-dockerfile', config, code),

  // ── Secrets vault ─────────────────────────────────────────────────────────
  saveSecret: (entry: SecretEntry) => ipcRenderer.invoke('save-secret', entry),
  loadSecrets: () => ipcRenderer.invoke('load-secrets'),
  deleteSecret: (key: string) => ipcRenderer.invoke('delete-secret', key),

  // ── AI assistant ──────────────────────────────────────────────────────────
  aiAssist: (messages: AIMessage[], code: string, apiKey: string) =>
    ipcRenderer.invoke('ai-assist', messages, code, apiKey),
  aiGenerate: (prompt: string, apiKey: string) =>
    ipcRenderer.invoke('ai-generate', prompt, apiKey),

  // ── Plugins ───────────────────────────────────────────────────────────────
  loadPlugins: () => ipcRenderer.invoke('load-plugins'),

  // ── Workspace ─────────────────────────────────────────────────────────────
  saveWorkspace: (data: WorkspaceData) => ipcRenderer.invoke('save-workspace', data),
  openWorkspace: () => ipcRenderer.invoke('open-workspace'),
  loadRecentProjects: () => ipcRenderer.invoke('load-recent-projects'),
  openRecentProject: (filePath: string) => ipcRenderer.invoke('open-recent-project', filePath),
  autoSaveWorkspace: (filePath: string, data: WorkspaceData) =>
    ipcRenderer.invoke('auto-save-workspace', filePath, data),

  // ── Cloud import ──────────────────────────────────────────────────────────
  importFromCloud: (config: EnvConfig) => ipcRenderer.invoke('import-from-cloud', config),
  detectDrift: (localCode: string, config: EnvConfig) =>
    ipcRenderer.invoke('detect-drift', localCode, config),

  // ── Cloudflare log tail ───────────────────────────────────────────────────
  cfTailStart: (config: EnvConfig) => ipcRenderer.invoke('cf-tail-start', config),
  cfTailStop: (tailId: string, config: EnvConfig) =>
    ipcRenderer.invoke('cf-tail-stop', tailId, config),

  // ── Telemetry ─────────────────────────────────────────────────────────────
  getTelemetryLevel: () => ipcRenderer.invoke('get-telemetry-level'),
  setTelemetryLevel: (level: TelemetryLevel) =>
    ipcRenderer.invoke('set-telemetry-level', level),

  // ── Open external URL ─────────────────────────────────────────────────────
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),

  // ── Events ────────────────────────────────────────────────────────────────
  onDeployLog: (callback: (log: string) => void) => {
    ipcRenderer.removeAllListeners('deploy-log');
    ipcRenderer.on('deploy-log', (_event, log) => callback(log));
  },
  onCfTailLog: (callback: (entry: { tailId: string; message: string; level: string; timestamp: string }) => void) => {
    ipcRenderer.removeAllListeners('cf-tail-log');
    ipcRenderer.on('cf-tail-log', (_event, entry) => callback(entry));
  },
});
