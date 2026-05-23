import { BuildArtifact, DeployResult, EnvConfig, HealthStatus, LogEntry } from '../types';
import { IDeployer } from './IDeployer';

class NetlifyDeployer implements IDeployer {
  async validate(config: EnvConfig): Promise<void> {
    if (!config.netlifyToken) throw new Error('Netlify: netlifyToken is required.');
    if (!config.netlifySiteId) throw new Error('Netlify: netlifySiteId is required.');
  }

  async build(code: string, _config: EnvConfig): Promise<BuildArtifact> {
    // Netlify Edge Functions use Deno-compatible syntax
    const netlifyCode = `
import type { Context } from "https://edge.netlify.com";

export default async (request: Request, context: Context): Promise<Response> => {
  // User code injected below
  ${code}

  try {
    return await handleRequest(request);
  } catch (err) {
    return new Response(String(err), { status: 500 });
  }
};

export const config = { path: "/*" };
`;
    return { code: netlifyCode, metadata: { runtime: 'netlify-edge' } };
  }

  async deploy(artifact: BuildArtifact, config: EnvConfig): Promise<DeployResult> {
    const { netlifyToken, netlifySiteId } = config;
    const t0 = Date.now();

    // Upload as a file digest deploy
    const encoder = new TextEncoder();
    const data = encoder.encode(artifact.code);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    // Start deploy
    const deployRes = await fetch(`https://api.netlify.com/api/v1/sites/${netlifySiteId}/deploys`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${netlifyToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: { '/edge-functions/handler.ts': hashHex },
        async: true,
      }),
    });

    if (!deployRes.ok) {
      const text = await deployRes.text();
      throw new Error(`Netlify deploy failed (${deployRes.status}): ${text}`);
    }

    const deploy: any = await deployRes.json();

    // Upload the file
    await fetch(`https://api.netlify.com/api/v1/deploys/${deploy.id}/files/edge-functions/handler.ts`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${netlifyToken}`,
        'Content-Type': 'application/octet-stream',
      },
      body: data,
    });

    return {
      url: deploy.ssl_url || deploy.url || `https://${netlifySiteId}.netlify.app`,
      deploymentId: deploy.id,
      provider: 'netlify',
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - t0,
    };
  }

  async rollback(deploymentId: string, config: EnvConfig): Promise<DeployResult> {
    const { netlifyToken, netlifySiteId } = config;

    await fetch(`https://api.netlify.com/api/v1/sites/${netlifySiteId}/deploys/${deploymentId}/restore`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${netlifyToken}` },
    });

    return {
      url: `https://${netlifySiteId}.netlify.app`,
      deploymentId,
      provider: 'netlify',
      timestamp: new Date().toISOString(),
      latencyMs: 0,
    };
  }

  async logs(config: EnvConfig): Promise<LogEntry[]> {
    return [];
  }

  async teardown(config: EnvConfig): Promise<void> {
    const { netlifyToken, netlifySiteId } = config;
    await fetch(`https://api.netlify.com/api/v1/sites/${netlifySiteId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${netlifyToken}` },
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

export default new NetlifyDeployer();
