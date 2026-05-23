import { BuildArtifact, DeployResult, EnvConfig, HealthStatus, LogEntry } from '../types';
import { IDeployer } from './IDeployer';

// Railway GraphQL API
const RAILWAY_GQL = 'https://backboard.railway.app/graphql/v2';

async function gql(token: string, query: string, variables: Record<string, unknown> = {}): Promise<any> {
  const res = await fetch(RAILWAY_GQL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) throw new Error(`Railway API error: ${json.errors[0].message}`);
  return json.data;
}

class RailwayDeployer implements IDeployer {
  async validate(config: EnvConfig): Promise<void> {
    if (!config.railwayToken) throw new Error('Railway: railwayToken is required.');
    if (!config.railwayProjectId) throw new Error('Railway: railwayProjectId is required.');
    if (!config.railwayServiceId) throw new Error('Railway: railwayServiceId is required.');

    const data = await gql(config.railwayToken, `
      query { project(id: $id) { id name } }
    `, { id: config.railwayProjectId });

    if (!data?.project) throw new Error('Railway: project not found. Check railwayProjectId.');
  }

  async build(code: string, _config: EnvConfig): Promise<BuildArtifact> {
    // Wrap worker as an Express-compatible Node.js service
    const wrapped = `
const http = require('http');
const PORT = process.env.PORT || 3000;

// ── Original worker code ──────────────────────────────────────────────────
${code}
// ─────────────────────────────────────────────────────────────────────────

let _fetchHandler = null;
const _origAEL = typeof addEventListener !== 'undefined' ? addEventListener : null;
if (_origAEL) globalThis.addEventListener = (type, fn) => {
  if (type === 'fetch') _fetchHandler = fn;
};

http.createServer(async (req, res) => {
  if (!_fetchHandler) { res.writeHead(503); return res.end('no handler'); }
  const url = 'http://' + (req.headers.host || 'localhost') + req.url;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const request = new Request(url, {
    method: req.method,
    headers: req.headers,
    body: chunks.length ? Buffer.concat(chunks) : undefined,
  });
  let response = null;
  await _fetchHandler({ request, respondWith: r => { response = r; }, waitUntil: () => {} });
  const r = await Promise.resolve(response);
  res.writeHead(r.status, Object.fromEntries(r.headers));
  res.end(Buffer.from(await r.arrayBuffer()));
}).listen(PORT, () => console.log('Railway worker on port', PORT));
`.trim();

    return { code: wrapped, metadata: { runtime: 'railway' } };
  }

  async deploy(artifact: BuildArtifact, config: EnvConfig): Promise<DeployResult> {
    const { railwayToken, railwayProjectId, railwayServiceId, railwayEnvironmentId } = config;
    const t0 = Date.now();

    // Set the source code as an environment variable for inline execution
    const envVars = {
      WORKER_CODE: artifact.code,
      ...(config.envVars ?? {}),
    };

    // Upsert environment variables
    const varMutation = `
      mutation UpsertVariables($input: VariableCollectionUpsertInput!) {
        variableCollectionUpsert(input: $input)
      }
    `;
    await gql(railwayToken!, varMutation, {
      input: {
        projectId: railwayProjectId,
        serviceId: railwayServiceId,
        environmentId: railwayEnvironmentId ?? 'production',
        variables: envVars,
      },
    });

    // Trigger a new deployment
    const deployMutation = `
      mutation Deploy($serviceId: String!, $environmentId: String) {
        serviceInstanceDeploy(serviceId: $serviceId, environmentId: $environmentId) { id }
      }
    `;
    const data = await gql(railwayToken!, deployMutation, {
      serviceId: railwayServiceId,
      environmentId: railwayEnvironmentId ?? 'production',
    });

    const deploymentId = data?.serviceInstanceDeploy?.id;

    // Fetch the domain for this service
    const domainQuery = `
      query ServiceDomain($serviceId: String!, $environmentId: String!) {
        service(id: $serviceId) {
          domains(environmentId: $environmentId) { domain }
        }
      }
    `;
    const domainData = await gql(railwayToken!, domainQuery, {
      serviceId: railwayServiceId,
      environmentId: railwayEnvironmentId ?? 'production',
    }).catch(() => null);

    const domain = domainData?.service?.domains?.[0]?.domain;

    return {
      url: domain ? `https://${domain}` : `https://railway.app/project/${railwayProjectId}`,
      deploymentId,
      provider: 'railway',
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - t0,
    };
  }

  async rollback(deploymentId: string, config: EnvConfig): Promise<DeployResult> {
    const { railwayToken, railwayProjectId } = config;
    const t0 = Date.now();

    await gql(railwayToken!, `
      mutation Rollback($id: String!) { deploymentRollback(id: $id) }
    `, { id: deploymentId });

    return {
      url: `https://railway.app/project/${railwayProjectId}`,
      deploymentId,
      provider: 'railway',
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - t0,
    };
  }

  async logs(config: EnvConfig): Promise<LogEntry[]> {
    const { railwayToken, railwayServiceId, railwayEnvironmentId } = config;
    try {
      const data = await gql(railwayToken!, `
        query Logs($serviceId: String!, $environmentId: String) {
          logs(serviceId: $serviceId, environmentId: $environmentId, limit: 20) {
            timestamp message severity
          }
        }
      `, { serviceId: railwayServiceId, environmentId: railwayEnvironmentId ?? 'production' });

      return (data?.logs ?? []).map((l: any, i: number) => ({
        id: String(i),
        timestamp: l.timestamp ?? new Date().toISOString(),
        provider: 'railway' as const,
        level: l.severity === 'ERROR' ? 'error' : 'info',
        message: l.message ?? '',
      }));
    } catch {
      return [];
    }
  }

  async teardown(config: EnvConfig): Promise<void> {
    const { railwayToken, railwayServiceId } = config;
    await gql(railwayToken!, `
      mutation DeleteService($id: String!) { serviceDelete(id: $id) }
    `, { id: railwayServiceId });
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

export default new RailwayDeployer();
