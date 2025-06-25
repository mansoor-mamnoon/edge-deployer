import fs from "fs";
import path from "path";
import { EnvConfig } from "../../types";

export function generatePulumiCloudflare(config: EnvConfig, code: string, returnOnly: boolean = false): string | void {

  const { cfAccountId, cfApiToken, cfScriptName } = config;

  if (!cfAccountId || !cfApiToken || !cfScriptName) {
    throw new Error("Missing Cloudflare config values for Pulumi generation.");
  }

  const pulumiContent = `import * as cloudflare from "@pulumi/cloudflare";

const script = new cloudflare.WorkerScript("${cfScriptName}", {
  content: \`${code.replace(/`/g, "\\`")}\`,
  name: "${cfScriptName}",
});

export const workerUrl = script.name.apply(name => \`https://\${name}.workers.dev\`);
`;

  const outDir = path.resolve("infra", "cloudflare");
  const outFile = path.join(outDir, "index.ts");

  if (returnOnly) {
    return pulumiContent;
  } else {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outFile, pulumiContent);
  }

}
