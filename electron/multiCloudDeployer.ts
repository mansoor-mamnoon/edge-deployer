import { EnvConfig, DeployResult } from '../src/types';
import cloudflareDeployer from '../src/cloudDeployers/cloudflareDeployer';
import awsDeployer from '../src/cloudDeployers/awsDeployer';
import vercelDeployer from '../src/cloudDeployers/vercelDeployer';
import netlifyDeployer from '../src/cloudDeployers/netlifyDeployer';
import flyioDeployer from '../src/cloudDeployers/flyioDeployer';
import railwayDeployer from '../src/cloudDeployers/railwayDeployer';
import { IDeployer } from '../src/cloudDeployers/IDeployer';

function getDeployer(provider: EnvConfig['cloudProvider']): IDeployer {
  switch (provider) {
    case 'cloudflare': return cloudflareDeployer;
    case 'aws':        return awsDeployer;
    case 'vercel':     return vercelDeployer;
    case 'netlify':    return netlifyDeployer;
    case 'flyio':      return flyioDeployer;
    case 'railway':    return railwayDeployer;
    default:
      throw new Error(`Unsupported cloud provider: ${provider}`);
  }
}

export async function deployToSelectedCloud(
  code: string,
  config: EnvConfig,
  logFn?: (msg: string) => void
): Promise<DeployResult> {
  const deployer = getDeployer(config.cloudProvider);
  const log = logFn ?? (() => {});

  log(`Validating ${config.cloudProvider} credentials...`);
  await deployer.validate(config);

  log('Building artifact...');
  const artifact = await deployer.build(code, config);

  log(`Deploying to ${config.cloudProvider}...`);
  const result = await deployer.deploy(artifact, config);

  log(`Deploy complete: ${result.url}`);
  return result;
}

export async function rollbackDeploy(
  record: { code: string; deploymentId?: string },
  config: EnvConfig,
  logFn?: (msg: string) => void
): Promise<DeployResult> {
  const deployer = getDeployer(config.cloudProvider);
  const log = logFn ?? (() => {});

  if (record.deploymentId) {
    log(`Rolling back to deployment ${record.deploymentId}...`);
    return deployer.rollback(record.deploymentId, config);
  }

  // Fallback: re-deploy the stored code
  log('No deployment ID — re-deploying stored code...');
  return deployToSelectedCloud(record.code, config, log);
}

export async function healthcheckDeploy(url: string, provider: EnvConfig['cloudProvider']): Promise<{
  ok: boolean;
  latencyMs: number;
  statusCode?: number;
  error?: string;
}> {
  return getDeployer(provider).healthcheck(url);
}
