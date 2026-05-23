import { BuildArtifact, DeployResult, EnvConfig, HealthStatus, LogEntry } from '../types';
import { IDeployer } from './IDeployer';

class CloudflareDeployer implements IDeployer {
  async validate(config: EnvConfig): Promise<void> {
    const { cfApiToken, cfAccountId, cfScriptName } = config;
    if (!cfApiToken) throw new Error('Cloudflare: cfApiToken is required.');
    if (!cfAccountId) throw new Error('Cloudflare: cfAccountId is required.');
    if (!cfScriptName) throw new Error('Cloudflare: cfScriptName is required.');
  }

  async build(code: string, _config: EnvConfig): Promise<BuildArtifact> {
    return { code, metadata: { runtime: 'cloudflare-workers' } };
  }

  async deploy(artifact: BuildArtifact, config: EnvConfig): Promise<DeployResult> {
    const { cfApiToken, cfAccountId, cfScriptName } = config;
    const t0 = Date.now();

    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/workers/scripts/${cfScriptName}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${cfApiToken}`,
          'Content-Type': 'application/javascript',
        },
        body: artifact.code,
      }
    );

    const json: any = await res.json();
    if (!json.success) {
      const msg = json.errors?.map((e: any) => e.message).join('; ') ?? 'Unknown error';
      throw new Error(`Cloudflare deploy failed: ${msg}`);
    }

    return {
      url: `https://${cfScriptName}.${this._subdomain(cfAccountId!)}.workers.dev`,
      deploymentId: json.result?.id,
      provider: 'cloudflare',
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - t0,
    };
  }

  async rollback(deploymentId: string, config: EnvConfig): Promise<DeployResult> {
    const { cfApiToken, cfAccountId, cfScriptName } = config;
    const t0 = Date.now();

    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/workers/scripts/${cfScriptName}/deployments/${deploymentId}/rollback`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${cfApiToken}` },
      }
    );

    const json: any = await res.json();
    if (!json.success) throw new Error(`Cloudflare rollback failed: ${JSON.stringify(json.errors)}`);

    return {
      url: `https://${cfScriptName}.${this._subdomain(cfAccountId!)}.workers.dev`,
      deploymentId,
      provider: 'cloudflare',
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - t0,
    };
  }

  async logs(config: EnvConfig): Promise<LogEntry[]> {
    // Cloudflare log retrieval requires Logpush or tail workers — return empty for now
    return [];
  }

  async teardown(config: EnvConfig): Promise<void> {
    const { cfApiToken, cfAccountId, cfScriptName } = config;
    await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/workers/scripts/${cfScriptName}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${cfApiToken}` },
      }
    );
  }

  async healthcheck(url: string): Promise<HealthStatus> {
    const t0 = Date.now();
    try {
      const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(5000) });
      return { ok: res.ok, latencyMs: Date.now() - t0, statusCode: res.status };
    } catch (err: any) {
      return { ok: false, latencyMs: Date.now() - t0, error: err.message };
    }
  }

  private _subdomain(accountId: string) {
    return accountId.slice(0, 8);
  }
}

export default new CloudflareDeployer();
