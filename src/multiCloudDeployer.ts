import { EnvConfig } from "./types";
import deployToCloudflare from "./cloudDeployers/cloudflareDeployer";
import deployToAWS from "./cloudDeployers/awsDeployer";
import deployToVercel from "./cloudDeployers/vercelDeployer";

export async function deployToSelectedCloud(code: string, config: EnvConfig) {
  switch (config.cloudProvider) {
    case "cloudflare":
      return deployToCloudflare(code, config);
    case "aws":
      return deployToAWS(code, config);
    case "vercel":
      return deployToVercel(code, config);
    default:
      throw new Error("Unsupported cloud provider: " + config.cloudProvider);
  }
}
