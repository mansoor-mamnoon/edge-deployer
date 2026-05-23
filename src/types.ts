// ─── Provider types ────────────────────────────────────────────────────────
export type CloudProvider =
  | 'cloudflare'
  | 'aws'
  | 'vercel'
  | 'netlify'
  | 'deno'
  | 'railway'
  | 'flyio';

export type TelemetryLevel = 'off' | 'errors' | 'usage';

// ─── Credential config ────────────────────────────────────────────────────
export interface EnvConfig {
  cloudProvider: CloudProvider;
  // Cloudflare
  cfAccountId?: string;
  cfApiToken?: string;
  cfScriptName?: string;
  // AWS
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsRegion?: string;
  awsLambdaName?: string;
  // Vercel
  vercelToken?: string;
  vercelProjectId?: string;
  vercelTeamId?: string;
  // Netlify
  netlifyToken?: string;
  netlifySiteId?: string;
  // Deno Deploy
  denoToken?: string;
  denoProjectId?: string;
  // Fly.io
  flyioToken?: string;
  flyioAppName?: string;
  flyioRegion?: string;
  // Railway
  railwayToken?: string;
  railwayProjectId?: string;
  railwayServiceId?: string;
  railwayEnvironmentId?: string;
  // Shared
  envVars?: Record<string, string>;
}

// ─── Deploy lifecycle ─────────────────────────────────────────────────────
export interface BuildArtifact {
  code: string;
  metadata: Record<string, string>;
}

export interface DeployResult {
  url: string;
  deploymentId?: string;
  provider: CloudProvider;
  timestamp: string;
  latencyMs: number;
}

export interface HealthStatus {
  ok: boolean;
  latencyMs: number;
  statusCode?: number;
  error?: string;
}

export interface DeployRecord {
  id: string;
  scriptName: string;
  timestamp: string;
  cloudProvider: CloudProvider;
  deployUrl: string;
  code: string;
  deploymentId?: string;
  latencyMs?: number;
}

// ─── Logging + observability ──────────────────────────────────────────────
export interface LogEntry {
  id: string;
  timestamp: string;
  provider: CloudProvider | 'local';
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  latencyMs?: number;
  status?: number;
  meta?: Record<string, unknown>;
}

export interface MetricSnapshot {
  timestamp: string;
  requestCount: number;
  errorCount: number;
  avgLatencyMs: number;
  p50: number;
  p95: number;
  p99: number;
}

// ─── Multi-tab editor ─────────────────────────────────────────────────────
export interface Tab {
  id: string;
  name: string;
  code: string;
  language: 'javascript' | 'typescript' | 'json';
  isDirty: boolean;
  savedPath?: string;
}

// ─── Security scanner ─────────────────────────────────────────────────────
export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface SecurityIssue {
  id: string;
  severity: IssueSeverity;
  rule: string;
  message: string;
  line?: number;
  column?: number;
  snippet?: string;
}

// ─── Load testing ─────────────────────────────────────────────────────────
export interface LoadTestConfig {
  url: string;
  rps: number;
  durationSec: number;
  method: 'GET' | 'POST';
  body?: string;
  headers?: Record<string, string>;
}

export interface LoadTestResult {
  totalRequests: number;
  successCount: number;
  errorCount: number;
  avgLatencyMs: number;
  p50: number;
  p95: number;
  p99: number;
  throughputRps: number;
  durationMs: number;
}

// ─── Templates ────────────────────────────────────────────────────────────
export interface WorkerTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  code: string;
  tags: string[];
}

// ─── Workspace ───────────────────────────────────────────────────────────
export interface WorkspaceData {
  version: '1';
  name: string;
  createdAt: string;
  updatedAt: string;
  /** Provider config — credentials are NOT stored here (they live in the vault) */
  config: Omit<EnvConfig, 'cfApiToken' | 'awsSecretAccessKey' | 'vercelToken' | 'netlifyToken' | 'denoToken'>;
  tabs: Tab[];
  activeTabId: string;
  deployHistory: DeployRecord[];
  sidePanel: string | null;
  bottomPanel: string | null;
}

export interface RecentProject {
  name: string;
  path: string;
  lastOpened: string;
  provider: CloudProvider;
}

// ─── Cloud import ─────────────────────────────────────────────────────────
export interface ImportedProject {
  name: string;
  provider: CloudProvider;
  code: string;
  config: Partial<EnvConfig>;
  importedAt: string;
}

// ─── Plugin system ────────────────────────────────────────────────────────
export type PluginPermission =
  | 'deploy:read'
  | 'deploy:write'
  | 'code:read'
  | 'code:transform'
  | 'network:fetch'
  | 'logs:write';

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  entrypoint: string;
  permissions?: PluginPermission[];
  minAppVersion?: string;
}

export interface PluginHooks {
  onBeforeDeploy?: (code: string, config: EnvConfig) => Promise<string>;
  onAfterDeploy?: (result: DeployResult) => Promise<void>;
  onCodeTransform?: (code: string) => Promise<string>;
  onLogEntry?: (entry: LogEntry) => void;
}

export type Plugin = PluginManifest & PluginHooks;

// ─── Secrets ──────────────────────────────────────────────────────────────
export interface SecretEntry {
  key: string;
  value: string;
  scope: 'global' | CloudProvider;
  createdAt: string;
}

// ─── AI assistant ─────────────────────────────────────────────────────────
export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// ─── IPC surface ──────────────────────────────────────────────────────────
export interface ElectronAPI {
  // File ops
  saveFile: (code: string) => Promise<boolean>;
  openFile: () => Promise<string | null>;
  // Deploy
  deployCode: (code: string) => Promise<string>;
  deployToCloud: (code: string, config: EnvConfig) => Promise<DeployResult>;
  rollbackDeploy: (record: DeployRecord, config: EnvConfig) => Promise<DeployResult>;
  rollbackWithHealthcheck: (record: DeployRecord, config: EnvConfig) => Promise<DeployResult & { health?: HealthStatus }>;
  // IaC exports
  downloadPulumi: (config: EnvConfig, code: string) => Promise<string>;
  downloadTerraform: (config: EnvConfig, code: string) => Promise<string>;
  downloadWrangler: (config: EnvConfig, code: string) => Promise<string>;
  downloadDockerfile: (config: EnvConfig, code: string) => Promise<string>;
  // Secrets vault
  saveSecret: (entry: SecretEntry) => Promise<void>;
  loadSecrets: () => Promise<SecretEntry[]>;
  deleteSecret: (key: string) => Promise<void>;
  // AI assistant
  aiAssist: (messages: AIMessage[], code: string, apiKey: string) => Promise<string>;
  aiGenerate: (prompt: string, apiKey: string) => Promise<string>;
  // Plugins
  loadPlugins: () => Promise<PluginManifest[]>;
  // Workspace
  saveWorkspace: (data: WorkspaceData) => Promise<string>;
  openWorkspace: () => Promise<WorkspaceData | null>;
  loadRecentProjects: () => Promise<RecentProject[]>;
  openRecentProject: (path: string) => Promise<WorkspaceData | null>;
  autoSaveWorkspace: (filePath: string, data: WorkspaceData) => Promise<void>;
  // Cloudflare log tail
  cfTailStart: (config: EnvConfig) => Promise<{ tailId: string }>;
  cfTailStop: (tailId: string, config: EnvConfig) => Promise<void>;
  // Telemetry
  getTelemetryLevel: () => Promise<TelemetryLevel>;
  setTelemetryLevel: (level: TelemetryLevel) => Promise<void>;
  // Cloud import
  importFromCloud: (config: EnvConfig) => Promise<ImportedProject>;
  detectDrift: (localCode: string, config: EnvConfig) => Promise<{
    hasDrift: boolean; localLines: number; remoteLines: number; diff: string;
  }>;
  // Open external
  openExternal: (url: string) => Promise<void>;
  // Events
  onDeployLog: (callback: (log: string) => void) => void;
  onCfTailLog: (callback: (entry: { tailId: string; message: string; level: string; timestamp: string }) => void) => void;
}

export type LogCallback = (entry: LogEntry) => void;
