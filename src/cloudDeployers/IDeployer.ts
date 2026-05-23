import { BuildArtifact, DeployResult, EnvConfig, HealthStatus, LogEntry } from '../types';

export interface IDeployer {
  /** Validate that credentials and config are present and well-formed. Throws on failure. */
  validate(config: EnvConfig): Promise<void>;
  /** Transform raw code into a deployment artifact (bundled, zipped, etc.). */
  build(code: string, config: EnvConfig): Promise<BuildArtifact>;
  /** Upload the artifact and return the live URL + metadata. */
  deploy(artifact: BuildArtifact, config: EnvConfig): Promise<DeployResult>;
  /** Re-deploy a previous artifact by deployment ID. */
  rollback(deploymentId: string, config: EnvConfig): Promise<DeployResult>;
  /** Fetch recent log lines from the provider's log API. */
  logs(config: EnvConfig): Promise<LogEntry[]>;
  /** Delete / undeploy the worker from the provider. */
  teardown(config: EnvConfig): Promise<void>;
  /** Ping the live URL and return latency + status. */
  healthcheck(url: string): Promise<HealthStatus>;
}
