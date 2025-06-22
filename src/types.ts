export interface EnvConfig {
    cloudProvider: string;
    apiKey: string;
    accountId: string;
    scriptName: string;
    envVars: { [key: string]: string };
  }
  