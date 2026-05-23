import { Plugin, EnvConfig, DeployResult, LogEntry } from '../types';

// The plugin SDK surface exposed to plugin authors
export interface EdgeDeployerPluginContext {
  /** Current editor code */
  readonly code: string;
  /** Active provider config (credentials redacted) */
  readonly config: Omit<EnvConfig, 'cfApiToken' | 'awsSecretAccessKey' | 'vercelToken' | 'netlifyToken' | 'denoToken'>;
  /** Emit a log line to the observability panel */
  log(message: string, level?: LogEntry['level']): void;
}

export type PluginFactory = (ctx: EdgeDeployerPluginContext) => Plugin;

// Plugin registry — loaded plugins register themselves here
class PluginRegistry {
  private _plugins: Map<string, Plugin> = new Map();

  register(plugin: Plugin): void {
    this._plugins.set(plugin.name, plugin);
    console.log(`[PluginRegistry] Registered: ${plugin.name}@${plugin.version}`);
  }

  get(name: string): Plugin | undefined {
    return this._plugins.get(name);
  }

  list(): Plugin[] {
    return Array.from(this._plugins.values());
  }

  async runBeforeDeploy(code: string, config: EnvConfig): Promise<string> {
    let result = code;
    for (const plugin of this._plugins.values()) {
      if (plugin.onBeforeDeploy) {
        result = await plugin.onBeforeDeploy(result, config);
      }
    }
    return result;
  }

  async runAfterDeploy(deployResult: DeployResult): Promise<void> {
    for (const plugin of this._plugins.values()) {
      if (plugin.onAfterDeploy) {
        await plugin.onAfterDeploy(deployResult);
      }
    }
  }

  async runCodeTransform(code: string): Promise<string> {
    let result = code;
    for (const plugin of this._plugins.values()) {
      if (plugin.onCodeTransform) {
        result = await plugin.onCodeTransform(result);
      }
    }
    return result;
  }
}

export const pluginRegistry = new PluginRegistry();

// Example built-in plugin: console.log stripper
export const consoleStripperPlugin: Plugin = {
  name: 'console-stripper',
  version: '1.0.0',
  description: 'Removes console.log statements before production deploy',
  entrypoint: 'built-in',
  async onBeforeDeploy(code) {
    return code.replace(/console\.log\([^)]*\);?\n?/g, '');
  },
};

// Example built-in plugin: CORS injector
export const corsPlugin: Plugin = {
  name: 'cors-headers',
  version: '1.0.0',
  description: 'Injects permissive CORS headers into every response',
  entrypoint: 'built-in',
  async onCodeTransform(code) {
    const corsHelper = `
// Injected by cors-headers plugin
function addCors(response) {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return new Response(response.body, { status: response.status, headers });
}
`;
    return corsHelper + '\n' + code;
  },
};
