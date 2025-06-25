export interface EnvConfig {
    cloudProvider: 'cloudflare' | 'aws' | 'vercel';
    // Cloudflare
    cfAccountId?: string;
    cfApiToken?: string;
    cfScriptName?: string;
  
    // AWS
    awsAccessKeyId?: string;
    awsSecretAccessKey?: string;
    awsRegion?: string;
    awsLambdaName?: string;
  
    // Vercel
    vercelToken?: string;
    vercelProjectId?: string;
    vercelTeamId?: string;
  }
  
  export interface DeployResult {
    url: string;
  }
  
  export type LogCallback = (entry: { timestamp: string; status: string; body: string }) => void;
  