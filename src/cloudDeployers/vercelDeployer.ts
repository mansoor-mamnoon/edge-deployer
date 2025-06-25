import { EnvConfig } from "../types";

export default async function deployToVercel(code: string, config: EnvConfig) {
  const { vercelToken, vercelProjectId, vercelTeamId } = config;

  if (!vercelToken || !vercelProjectId) {
    throw new Error("Missing Vercel credentials in config.");
  }

  console.log("🟡 Stub: deployToVercel is not yet implemented.");

  // ❗ TODO: Integrate with Vercel API (POST /v13/deployments)

  return {
    url: `https://vercel.app/${vercelProjectId}`, // or deployment URL returned from Vercel API
  };
}
