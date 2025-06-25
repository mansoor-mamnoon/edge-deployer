import { EnvConfig } from "../types";
import { generatePulumiCloudflare } from "../../electron/generatePulumiCloudflare";


export default async function deployToCloudflare(code: string, config: EnvConfig) {
  const { cfApiToken, cfAccountId, cfScriptName } = config;

  if (!cfApiToken || !cfAccountId || !cfScriptName) {
    throw new Error("Missing Cloudflare credentials in config.");
  }

  // ✅ Generate Pulumi infra code
  generatePulumiCloudflare(config, code);

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/workers/scripts/${cfScriptName}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${cfApiToken}`,
        "Content-Type": "application/javascript",
      },
      body: code,
    }
  );

  const json = await res.json();
  if (!json.success) throw new Error(JSON.stringify(json.errors));

  return {
    url: `https://${cfScriptName}.mansoormmamnoon.workers.dev`,
  };
}
