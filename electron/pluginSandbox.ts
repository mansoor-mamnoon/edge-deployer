import * as vm from 'vm';
import * as path from 'path';
import * as fs from 'fs';
import { PluginManifest, PluginPermission, EnvConfig, DeployResult } from '../src/types';

const PLUGIN_TIMEOUT_MS = 5000;
const APP_VERSION = '2.0.0';

// ─── Manifest validation ──────────────────────────────────────────────────

const REQUIRED_FIELDS: (keyof PluginManifest)[] = ['name', 'version', 'description', 'entrypoint'];
const ALLOWED_PERMISSIONS: PluginPermission[] = [
  'deploy:read', 'deploy:write', 'code:read', 'code:transform', 'network:fetch', 'logs:write',
];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateManifest(manifest: unknown): ValidationResult {
  const errors: string[] = [];
  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, errors: ['Manifest must be a JSON object'] };
  }
  const m = manifest as Record<string, unknown>;

  for (const field of REQUIRED_FIELDS) {
    if (!m[field] || typeof m[field] !== 'string') {
      errors.push(`Missing or invalid required field: "${field}"`);
    }
  }

  if (m.permissions && !Array.isArray(m.permissions)) {
    errors.push('"permissions" must be an array');
  } else if (Array.isArray(m.permissions)) {
    for (const p of m.permissions as unknown[]) {
      if (!ALLOWED_PERMISSIONS.includes(p as PluginPermission)) {
        errors.push(`Unknown permission: "${p}". Allowed: ${ALLOWED_PERMISSIONS.join(', ')}`);
      }
    }
  }

  if (m.minAppVersion && typeof m.minAppVersion === 'string') {
    if (!isVersionCompatible(m.minAppVersion, APP_VERSION)) {
      errors.push(`Plugin requires app version >= ${m.minAppVersion}, but app is ${APP_VERSION}`);
    }
  }

  // Validate name format (no path traversal)
  if (typeof m.name === 'string' && !/^[a-z0-9-_]+$/i.test(m.name)) {
    errors.push('Plugin name must be alphanumeric with hyphens/underscores only');
  }

  return { valid: errors.length === 0, errors };
}

function isVersionCompatible(required: string, actual: string): boolean {
  const parse = (v: string) => v.split('.').map(Number);
  const [rMaj, rMin = 0] = parse(required);
  const [aMaj, aMin = 0] = parse(actual);
  if (aMaj !== rMaj) return aMaj > rMaj;
  return aMin >= rMin;
}

// ─── Sandbox context ──────────────────────────────────────────────────────

function buildSandbox(permissions: PluginPermission[]): vm.Context {
  const logs: string[] = [];

  const ctx: Record<string, unknown> = {
    module: { exports: {} as Record<string, unknown> },
    exports: {} as Record<string, unknown>,
    console: {
      log: (...a: unknown[]) => logs.push(a.map(String).join(' ')),
      warn: (...a: unknown[]) => logs.push('[WARN] ' + a.map(String).join(' ')),
      error: (...a: unknown[]) => logs.push('[ERR] ' + a.map(String).join(' ')),
    },
    Promise,
    JSON,
    Math,
    Date,
    Error,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Map,
    Set,
    Symbol,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURIComponent,
    decodeURIComponent,
    __pluginLogs: logs,
    // Network access only if permitted
    ...(permissions.includes('network:fetch')
      ? { fetch: globalThis.fetch }
      : {}),
  };

  vm.createContext(ctx);
  return ctx;
}

// ─── Load + run a plugin ──────────────────────────────────────────────────

export interface LoadedPlugin {
  manifest: PluginManifest;
  onBeforeDeploy?: (code: string, config: EnvConfig) => Promise<string>;
  onAfterDeploy?: (result: DeployResult) => Promise<void>;
  onCodeTransform?: (code: string) => Promise<string>;
  logs: string[];
  enabled: boolean;
}

export function loadPlugin(pluginDir: string): LoadedPlugin | null {
  const manifestPath = path.join(pluginDir, 'plugin.json');
  if (!fs.existsSync(manifestPath)) return null;

  let manifest: PluginManifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as PluginManifest;
  } catch {
    console.error(`[PluginSandbox] Invalid plugin.json at ${manifestPath}`);
    return null;
  }

  const { valid, errors } = validateManifest(manifest);
  if (!valid) {
    console.error(`[PluginSandbox] Plugin "${manifest.name}" failed validation:`, errors);
    return null;
  }

  const entryPath = path.join(pluginDir, manifest.entrypoint);
  if (!fs.existsSync(entryPath)) {
    console.error(`[PluginSandbox] Entrypoint not found: ${entryPath}`);
    return null;
  }

  const code = fs.readFileSync(entryPath, 'utf8');
  const permissions = manifest.permissions ?? [];
  const ctx = buildSandbox(permissions);

  try {
    const script = new vm.Script(
      `(function(module, exports) { ${code} })(module, exports)`,
      { filename: entryPath }
    );
    script.runInContext(ctx, { timeout: PLUGIN_TIMEOUT_MS });
  } catch (err) {
    console.error(`[PluginSandbox] Failed to load plugin "${manifest.name}":`, err);
    return null;
  }

  const exports = (ctx as any).module.exports as Record<string, unknown>;

  const wrapHook = <T extends unknown[], R = unknown>(fn: ((...a: T) => Promise<R>) | undefined) => {
    if (!fn || typeof fn !== 'function') return undefined;
    return async (...args: T): Promise<R> => {
      try {
        const result = await Promise.race([
          fn(...args),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Plugin hook timed out')), PLUGIN_TIMEOUT_MS)),
        ]);
        return result as R;
      } catch (err) {
        console.error(`[PluginSandbox] Hook error in "${manifest.name}":`, err);
        throw err;
      }
    };
  };

  return {
    manifest,
    onBeforeDeploy: wrapHook<[string, EnvConfig], string>(exports.onBeforeDeploy as any),
    onAfterDeploy: wrapHook<[DeployResult], void>(exports.onAfterDeploy as any),
    onCodeTransform: wrapHook<[string], string>(exports.onCodeTransform as any),
    logs: (ctx as any).__pluginLogs ?? [],
    enabled: true,
  };
}
