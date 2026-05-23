import { BuildArtifact, DeployResult, EnvConfig, HealthStatus, LogEntry } from '../types';
import { IDeployer } from './IDeployer';

// Fly.io Machines API — wraps the worker as a Node.js HTTP service in a Fly app.
// Requires a Fly.io account and the app to exist (fly apps create <name>).
const FLY_API = 'https://api.machines.dev/v1';

class FlyioDeployer implements IDeployer {
  async validate(config: EnvConfig): Promise<void> {
    if (!config.flyioToken) throw new Error('Fly.io: flyioToken is required.');
    if (!config.flyioAppName) throw new Error('Fly.io: flyioAppName (your Fly app name) is required.');

    const res = await fetch(`${FLY_API}/apps/${config.flyioAppName}`, {
      headers: { Authorization: `Bearer ${config.flyioToken}` },
    });
    if (!res.ok) {
      const err: any = await res.json().catch(() => ({}));
      throw new Error(`Fly.io validate failed: ${err.error ?? res.statusText}. Create the app first with: fly apps create ${config.flyioAppName}`);
    }
  }

  async build(code: string, config: EnvConfig): Promise<BuildArtifact> {
    // Wrap the Cloudflare-style Worker in a Node.js HTTP server for Fly.io
    const wrapped = `
import { createServer } from 'http';

// ── Original worker code ──────────────────────────────────────────────────
${code}
// ─────────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT ?? 8080;

let fetchHandler = null;
const originalAddEventListener = globalThis.addEventListener;
globalThis.addEventListener = (type, handler) => {
  if (type === 'fetch') fetchHandler = handler;
  else if (originalAddEventListener) originalAddEventListener(type, handler);
};

createServer(async (req, res) => {
  if (!fetchHandler) { res.writeHead(503); res.end('No fetch handler'); return; }
  const url = \`http://\${req.headers.host ?? 'localhost'}\${req.url}\`;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;

  const request = new Request(url, {
    method: req.method,
    headers: Object.fromEntries(Object.entries(req.headers).filter(([,v]) => v !== undefined)),
    body: body?.length ? body : undefined,
  });

  let response = null;
  const event = { request, respondWith: (r) => { response = r; }, waitUntil: () => {} };
  await fetchHandler(event);
  if (!response) { res.writeHead(500); res.end('No response'); return; }
  const r = await Promise.resolve(response);
  res.writeHead(r.status, Object.fromEntries(r.headers.entries()));
  res.end(await r.arrayBuffer().then(b => Buffer.from(b)));
}).listen(PORT, () => console.log(\`Worker running on port \${PORT}\`));
`.trim();

    return { code: wrapped, metadata: { runtime: 'flyio', appName: config.flyioAppName ?? '' } };
  }

  async deploy(artifact: BuildArtifact, config: EnvConfig): Promise<DeployResult> {
    const { flyioToken, flyioAppName, flyioRegion = 'iad' } = config;
    const t0 = Date.now();

    // Create a new machine with the worker image
    const body = {
      config: {
        image: 'flyio/node:18',
        env: { WORKER_CODE: artifact.code, PORT: '8080', ...(config.envVars ?? {}) },
        services: [{
          ports: [{ port: 443, handlers: ['tls', 'http'] }, { port: 80, handlers: ['http'] }],
          protocol: 'tcp',
          internal_port: 8080,
        }],
        init: { cmd: ['node', '-e', artifact.code] },
        guest: { cpu_kind: 'shared', cpus: 1, memory_mb: 256 },
      },
      region: flyioRegion,
      name: `${flyioAppName}-worker`,
    };

    const res = await fetch(`${FLY_API}/apps/${flyioAppName}/machines`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${flyioToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Fly.io deploy failed: ${json.error ?? res.statusText}`);

    return {
      url: `https://${flyioAppName}.fly.dev`,
      deploymentId: json.id,
      provider: 'flyio',
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - t0,
    };
  }

  async rollback(deploymentId: string, config: EnvConfig): Promise<DeployResult> {
    const { flyioToken, flyioAppName } = config;
    const t0 = Date.now();
    // Start the previous machine (by ID)
    await fetch(`${FLY_API}/apps/${flyioAppName}/machines/${deploymentId}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${flyioToken}` },
    });
    return {
      url: `https://${flyioAppName}.fly.dev`,
      deploymentId,
      provider: 'flyio',
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - t0,
    };
  }

  async logs(config: EnvConfig): Promise<LogEntry[]> {
    const { flyioToken, flyioAppName } = config;
    const res = await fetch(`${FLY_API}/apps/${flyioAppName}/logs?limit=20`, {
      headers: { Authorization: `Bearer ${flyioToken}` },
    });
    if (!res.ok) return [];
    const data: any = await res.json().catch(() => ({ logs: [] }));
    return (data.logs ?? []).map((l: any) => ({
      id: String(l.id ?? Math.random()),
      timestamp: l.timestamp ?? new Date().toISOString(),
      provider: 'flyio' as const,
      level: l.level === 'error' ? 'error' : 'info',
      message: l.message ?? '',
      latencyMs: undefined,
    }));
  }

  async teardown(config: EnvConfig): Promise<void> {
    const { flyioToken, flyioAppName } = config;
    // List machines and destroy them
    const res = await fetch(`${FLY_API}/apps/${flyioAppName}/machines`, {
      headers: { Authorization: `Bearer ${flyioToken}` },
    });
    if (!res.ok) return;
    const machines: any[] = await res.json().catch(() => []);
    await Promise.all(machines.map(m =>
      fetch(`${FLY_API}/apps/${flyioAppName}/machines/${m.id}?force=true`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${flyioToken}` },
      })
    ));
  }

  async healthcheck(url: string): Promise<HealthStatus> {
    const t0 = Date.now();
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      return { ok: res.ok, latencyMs: Date.now() - t0, statusCode: res.status };
    } catch (err: any) {
      return { ok: false, latencyMs: Date.now() - t0, error: err.message };
    }
  }
}

export default new FlyioDeployer();
