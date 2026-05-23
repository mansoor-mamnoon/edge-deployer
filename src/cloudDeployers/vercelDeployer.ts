import { BuildArtifact, DeployResult, EnvConfig, HealthStatus, LogEntry } from '../types';
import { IDeployer } from './IDeployer';

class VercelDeployer implements IDeployer {
  async validate(config: EnvConfig): Promise<void> {
    if (!config.vercelToken) throw new Error('Vercel: vercelToken is required.');
    if (!config.vercelProjectId) throw new Error('Vercel: vercelProjectId is required.');
  }

  async build(code: string, _config: EnvConfig): Promise<BuildArtifact> {
    const vercelCode = `
export default async function handler(req, res) {
  const request = new Request(req.url, {
    method: req.method,
    headers: req.headers,
  });

  ${code}

  try {
    const response = await handleRequest(request);
    const body = await response.text();
    res.status(response.status);
    response.headers.forEach((v, k) => res.setHeader(k, v));
    res.send(body);
  } catch (err) {
    res.status(500).send(String(err));
  }
}
`;
    return { code: vercelCode, metadata: { runtime: 'nodejs20.x' } };
  }

  async deploy(artifact: BuildArtifact, config: EnvConfig): Promise<DeployResult> {
    const { vercelToken, vercelProjectId, vercelTeamId } = config;
    const t0 = Date.now();
    const teamQuery = vercelTeamId ? `?teamId=${vercelTeamId}` : '';

    const res = await fetch(`https://api.vercel.com/v13/deployments${teamQuery}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: vercelProjectId,
        files: [{ file: 'api/index.js', data: artifact.code, encoding: 'utf-8' }],
        projectSettings: { framework: null },
        target: 'production',
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Vercel deploy failed (${res.status}): ${text}`);
    }

    const json: any = await res.json();
    return {
      url: `https://${json.url}`,
      deploymentId: json.id,
      provider: 'vercel',
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - t0,
    };
  }

  async rollback(deploymentId: string, config: EnvConfig): Promise<DeployResult> {
    const { vercelToken, vercelProjectId, vercelTeamId } = config;
    const teamQuery = vercelTeamId ? `?teamId=${vercelTeamId}` : '';

    const res = await fetch(
      `https://api.vercel.com/v9/projects/${vercelProjectId}/promote/${deploymentId}${teamQuery}`,
      { method: 'POST', headers: { Authorization: `Bearer ${vercelToken}` } }
    );
    const json: any = await res.json();

    return {
      url: `https://${json.url || `${vercelProjectId}.vercel.app`}`,
      deploymentId,
      provider: 'vercel',
      timestamp: new Date().toISOString(),
      latencyMs: 0,
    };
  }

  async logs(config: EnvConfig): Promise<LogEntry[]> {
    return [];
  }

  async teardown(config: EnvConfig): Promise<void> {
    const { vercelToken, vercelProjectId } = config;
    await fetch(`https://api.vercel.com/v9/projects/${vercelProjectId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${vercelToken}` },
    });
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
}

export default new VercelDeployer();
