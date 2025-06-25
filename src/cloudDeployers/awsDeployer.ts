import { EnvConfig } from "../types";

export default async function deployToAWS(code: string, config: EnvConfig) {
  const { awsAccessKeyId, awsSecretAccessKey, awsRegion, awsLambdaName } = config;

  if (!awsAccessKeyId || !awsSecretAccessKey || !awsRegion || !awsLambdaName) {
    throw new Error("Missing AWS credentials in config.");
  }

  console.log("🟡 Stub: deployToAWS is not yet implemented.");

  // ❗ TODO: Integrate with AWS SDK (Lambda + IAM setup needed)

  return {
    url: `https://${awsRegion}.lambda.amazonaws.com/2015-03-31/functions/${awsLambdaName}/invocations`,
  };
}
