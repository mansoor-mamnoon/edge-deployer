import { EnvConfig, ImportedProject, CloudProvider } from '../src/types';

// ─── Cloudflare ───────────────────────────────────────────────────────────

async function importFromCloudflare(config: EnvConfig): Promise<ImportedProject> {
  const { cfApiToken, cfAccountId, cfScriptName } = config;
  if (!cfApiToken || !cfAccountId || !cfScriptName) {
    throw new Error('Cloudflare: cfApiToken, cfAccountId, and cfScriptName are required to import.');
  }

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/workers/scripts/${cfScriptName}`,
    { headers: { Authorization: `Bearer ${cfApiToken}` } }
  );

  if (!res.ok) {
    const json: any = await res.json().catch(() => ({}));
    const msg = json.errors?.map((e: any) => e.message).join('; ') ?? `HTTP ${res.status}`;
    throw new Error(`Cloudflare import failed: ${msg}`);
  }

  // The response body is the raw Worker script (text/javascript)
  const code = await res.text();

  return {
    name: cfScriptName,
    provider: 'cloudflare',
    code,
    config: { cloudProvider: 'cloudflare', cfAccountId, cfScriptName },
    importedAt: new Date().toISOString(),
  };
}

// ─── Vercel ───────────────────────────────────────────────────────────────

async function importFromVercel(config: EnvConfig): Promise<ImportedProject> {
  const { vercelToken, vercelProjectId, vercelTeamId } = config;
  if (!vercelToken || !vercelProjectId) {
    throw new Error('Vercel: vercelToken and vercelProjectId are required to import.');
  }

  const teamQ = vercelTeamId ? `?teamId=${vercelTeamId}` : '';

  // Get the latest production deployment
  const deploymentsRes = await fetch(
    `https://api.vercel.com/v6/deployments${teamQ}&projectId=${vercelProjectId}&target=production&limit=1`,
    { headers: { Authorization: `Bearer ${vercelToken}` } }
  );

  if (!deploymentsRes.ok) {
    throw new Error(`Vercel import failed: HTTP ${deploymentsRes.status}`);
  }

  const deploymentsJson: any = await deploymentsRes.json();
  const deployment = deploymentsJson.deployments?.[0];
  if (!deployment) {
    throw new Error('No production deployments found for this Vercel project.');
  }

  // List files in the deployment
  const filesRes = await fetch(
    `https://api.vercel.com/v6/deployments/${deployment.uid}/files${teamQ}`,
    { headers: { Authorization: `Bearer ${vercelToken}` } }
  );

  if (!filesRes.ok) {
    throw new Error(`Vercel file listing failed: HTTP ${filesRes.status}`);
  }

  const filesJson: any = await filesRes.json();

  // Find the main handler — look for api/index.js or index.js
  const findFile = (files: any[], name: string): any => {
    for (const f of files) {
      if (f.name === name) return f;
      if (f.children) { const r = findFile(f.children, name); if (r) return r; }
    }
    return null;
  };

  const candidates = ['index.js', 'index.ts', 'handler.js'];
  let mainFile: any = null;
  for (const c of candidates) {
    mainFile = findFile(filesJson, c);
    if (mainFile) break;
  }

  let code = `// Vercel project: ${vercelProjectId}\n// No handler file found automatically.\n// Re-import after checking your project structure.\n`;

  if (mainFile?.uid) {
    const fileRes = await fetch(
      `https://api.vercel.com/v6/deployments/${deployment.uid}/files/${mainFile.uid}${teamQ}`,
      { headers: { Authorization: `Bearer ${vercelToken}` } }
    );
    if (fileRes.ok) code = await fileRes.text();
  }

  return {
    name: vercelProjectId,
    provider: 'vercel',
    code,
    config: { cloudProvider: 'vercel', vercelProjectId, vercelTeamId },
    importedAt: new Date().toISOString(),
  };
}

// ─── AWS Lambda ───────────────────────────────────────────────────────────

async function importFromAWS(config: EnvConfig): Promise<ImportedProject> {
  const { awsRegion, awsLambdaName } = config;
  if (!awsRegion || !awsLambdaName) {
    throw new Error('AWS: awsRegion and awsLambdaName are required to import.');
  }

  // Use AWS SDK via dynamic import (runs in main process)
  const { LambdaClient, GetFunctionCommand } = await import('@aws-sdk/client-lambda');

  const client = new LambdaClient({
    region: awsRegion,
    credentials: {
      accessKeyId: config.awsAccessKeyId ?? '',
      secretAccessKey: config.awsSecretAccessKey ?? '',
    },
  });

  const cmd = new GetFunctionCommand({ FunctionName: awsLambdaName });
  const response = await client.send(cmd);

  const codeLocation = response.Code?.Location;
  if (!codeLocation) {
    throw new Error('AWS Lambda returned no code download URL.');
  }

  // Download the deployment package
  const zipRes = await fetch(codeLocation);
  if (!zipRes.ok) {
    throw new Error(`Failed to download Lambda package: HTTP ${zipRes.status}`);
  }

  // We can't unzip in the main process without a library easily, so return a placeholder
  // with the function configuration instead
  const env = response.Configuration?.Environment?.Variables ?? {};
  const envCode = Object.entries(env)
    .map(([k, v]) => `// env.${k} = "${v}"`)
    .join('\n');

  const code = `// AWS Lambda function: ${awsLambdaName}
// Region: ${awsRegion}
// Runtime: ${response.Configuration?.Runtime}
// Handler: ${response.Configuration?.Handler}
// Memory: ${response.Configuration?.MemorySize}MB
// Timeout: ${response.Configuration?.Timeout}s
// Last modified: ${response.Configuration?.LastModified}
${envCode}

// Tip: download and unzip the function package to view the full source.
// Code URL (expires in 10 minutes): ${codeLocation.slice(0, 60)}...

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  return new Response("Imported from AWS Lambda: ${awsLambdaName}", {
    headers: { "Content-Type": "text/plain" },
  });
}`;

  return {
    name: awsLambdaName,
    provider: 'aws',
    code,
    config: { cloudProvider: 'aws', awsRegion, awsLambdaName },
    importedAt: new Date().toISOString(),
  };
}

// ─── Drift detection ──────────────────────────────────────────────────────

export async function detectDrift(
  localCode: string,
  config: EnvConfig
): Promise<{ hasDrift: boolean; localLines: number; remoteLines: number; diff: string }> {
  const imported = await importFromCloud(config);
  const local = localCode.trim();
  const remote = imported.code.trim();

  const localLines = local.split('\n').length;
  const remoteLines = remote.split('\n').length;

  const hasDrift = local !== remote;
  let diff = '';
  if (hasDrift) {
    const localL = local.split('\n');
    const remoteL = remote.split('\n');
    const maxLen = Math.max(localL.length, remoteL.length);
    const lines: string[] = [];
    for (let i = 0; i < maxLen; i++) {
      const l = localL[i] ?? '';
      const r = remoteL[i] ?? '';
      if (l !== r) {
        lines.push(`- ${l}`);
        lines.push(`+ ${r}`);
      }
    }
    diff = lines.slice(0, 40).join('\n'); // cap at 40 diff lines for display
  }

  return { hasDrift, localLines, remoteLines, diff };
}

// ─── Dispatcher ───────────────────────────────────────────────────────────

export async function importFromCloud(config: EnvConfig): Promise<ImportedProject> {
  switch (config.cloudProvider) {
    case 'cloudflare': return importFromCloudflare(config);
    case 'vercel':     return importFromVercel(config);
    case 'aws':        return importFromAWS(config);
    default:
      throw new Error(`Cloud import not yet supported for provider: ${config.cloudProvider}`);
  }
}
