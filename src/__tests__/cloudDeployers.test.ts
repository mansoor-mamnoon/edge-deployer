/**
 * Tests that every deployer correctly implements the IDeployer interface
 * and that validate() throws the right errors for missing credentials.
 */
import cloudflareDeployer from '../cloudDeployers/cloudflareDeployer';
import awsDeployer from '../cloudDeployers/awsDeployer';
import vercelDeployer from '../cloudDeployers/vercelDeployer';
import netlifyDeployer from '../cloudDeployers/netlifyDeployer';
import { IDeployer } from '../cloudDeployers/IDeployer';
import { EnvConfig } from '../types';

const DEPLOYERS: [string, IDeployer][] = [
  ['Cloudflare', cloudflareDeployer],
  ['AWS',        awsDeployer],
  ['Vercel',     vercelDeployer],
  ['Netlify',    netlifyDeployer],
];

describe('IDeployer interface compliance', () => {
  for (const [name, deployer] of DEPLOYERS) {
    describe(name, () => {
      it('exposes all required IDeployer methods', () => {
        expect(typeof deployer.validate).toBe('function');
        expect(typeof deployer.build).toBe('function');
        expect(typeof deployer.deploy).toBe('function');
        expect(typeof deployer.rollback).toBe('function');
        expect(typeof deployer.logs).toBe('function');
        expect(typeof deployer.teardown).toBe('function');
        expect(typeof deployer.healthcheck).toBe('function');
      });
    });
  }
});

describe('Cloudflare deployer — validate()', () => {
  const base: EnvConfig = {
    cloudProvider: 'cloudflare',
    cfApiToken: 'token',
    cfAccountId: 'account',
    cfScriptName: 'script',
  };

  it('passes with all credentials present', async () => {
    await expect(cloudflareDeployer.validate(base)).resolves.toBeUndefined();
  });

  it('throws when cfApiToken is missing', async () => {
    const cfg = { ...base, cfApiToken: undefined };
    await expect(cloudflareDeployer.validate(cfg)).rejects.toThrow('cfApiToken');
  });

  it('throws when cfAccountId is missing', async () => {
    const cfg = { ...base, cfAccountId: undefined };
    await expect(cloudflareDeployer.validate(cfg)).rejects.toThrow('cfAccountId');
  });

  it('throws when cfScriptName is missing', async () => {
    const cfg = { ...base, cfScriptName: undefined };
    await expect(cloudflareDeployer.validate(cfg)).rejects.toThrow('cfScriptName');
  });
});

describe('AWS deployer — validate()', () => {
  const base: EnvConfig = {
    cloudProvider: 'aws',
    awsAccessKeyId: 'key',
    awsSecretAccessKey: 'secret',
    awsRegion: 'us-east-1',
    awsLambdaName: 'my-fn',
  };

  it('passes with all credentials present', async () => {
    await expect(awsDeployer.validate(base)).resolves.toBeUndefined();
  });

  it('throws when awsAccessKeyId is missing', async () => {
    await expect(awsDeployer.validate({ ...base, awsAccessKeyId: undefined })).rejects.toThrow('awsAccessKeyId');
  });

  it('throws when awsRegion is missing', async () => {
    await expect(awsDeployer.validate({ ...base, awsRegion: undefined })).rejects.toThrow('awsRegion');
  });
});

describe('Vercel deployer — validate()', () => {
  const base: EnvConfig = {
    cloudProvider: 'vercel',
    vercelToken: 'tok',
    vercelProjectId: 'proj',
  };

  it('passes with all credentials present', async () => {
    await expect(vercelDeployer.validate(base)).resolves.toBeUndefined();
  });

  it('throws when vercelToken is missing', async () => {
    await expect(vercelDeployer.validate({ ...base, vercelToken: undefined })).rejects.toThrow('vercelToken');
  });
});

describe('Netlify deployer — validate()', () => {
  const base: EnvConfig = {
    cloudProvider: 'netlify',
    netlifyToken: 'tok',
    netlifySiteId: 'site',
  };

  it('passes with all credentials present', async () => {
    await expect(netlifyDeployer.validate(base)).resolves.toBeUndefined();
  });

  it('throws when netlifyToken is missing', async () => {
    await expect(netlifyDeployer.validate({ ...base, netlifyToken: undefined })).rejects.toThrow('netlifyToken');
  });
});

describe('build() returns a BuildArtifact', () => {
  const cfConfig: EnvConfig = { cloudProvider: 'cloudflare' };
  const code = `addEventListener("fetch", e => e.respondWith(new Response("hi")));`;

  it('Cloudflare build returns code and metadata', async () => {
    const artifact = await cloudflareDeployer.build(code, cfConfig);
    expect(artifact.code).toBe(code);
    expect(artifact.metadata).toBeDefined();
    expect(typeof artifact.metadata).toBe('object');
  });

  it('AWS build wraps code in a Lambda handler', async () => {
    const artifact = await awsDeployer.build(code, { cloudProvider: 'aws' });
    expect(artifact.code).toContain('exports.handler');
    expect(artifact.metadata.runtime).toContain('nodejs');
  });
});

describe('healthcheck() returns a HealthStatus', () => {
  it('returns ok: false for an unreachable URL', async () => {
    const status = await cloudflareDeployer.healthcheck('http://localhost:19999/nonexistent');
    expect(typeof status.ok).toBe('boolean');
    expect(typeof status.latencyMs).toBe('number');
    expect(status.latencyMs).toBeGreaterThanOrEqual(0);
  }, 10_000);
});
