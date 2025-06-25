import { EnvConfig } from "../src/types";
import { generatePulumiCloudflare } from "./generatePulumiCloudflare";
import deployToCloudflare from "../src/cloudDeployers/cloudflareDeployer";
import deployToAWS from "../src/cloudDeployers/awsDeployer";
import deployToVercel from "../src/cloudDeployers/vercelDeployer";

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
