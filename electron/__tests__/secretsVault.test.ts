/**
 * Tests for the secrets vault encryption/decryption.
 * We mock the electron `app` module to avoid needing a running Electron instance.
 */

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

// Mock electron before any imports that pull it in
jest.mock('electron', () => ({
  app: {
    getPath: (_: string) => os.tmpdir(),
  },
}));

// Dynamically require after mock setup
let saveSecret: any, loadSecrets: any, deleteSecret: any, getSecret: any;

beforeAll(() => {
  // Use a fresh temp directory per test run
  const tmpVault = path.join(os.tmpdir(), `vault-test-${Date.now()}.vault`);
  jest.doMock('electron', () => ({
    app: { getPath: () => path.dirname(tmpVault) },
  }));
  ({ saveSecret, loadSecrets, deleteSecret, getSecret } = require('../secretsVault'));
});

afterAll(() => {
  // Clean up temp vault files
  const tmpDir = os.tmpdir();
  fs.readdirSync(tmpDir).filter(f => f.endsWith('.vault')).forEach(f => {
    try { fs.unlinkSync(path.join(tmpDir, f)); } catch {}
  });
});

describe('Secrets Vault', () => {
  const testSecret = {
    key: 'TEST_API_KEY',
    value: 'super-secret-value-12345',
    scope: 'global' as const,
    createdAt: new Date().toISOString(),
  };

  it('saves and loads a secret', () => {
    saveSecret(testSecret);
    const secrets = loadSecrets();
    expect(secrets).toContainEqual(expect.objectContaining({ key: 'TEST_API_KEY' }));
  });

  it('retrieves the correct value after encryption/decryption', () => {
    saveSecret(testSecret);
    const value = getSecret('TEST_API_KEY');
    expect(value).toBe('super-secret-value-12345');
  });

  it('does not store plaintext value in the vault file', () => {
    saveSecret(testSecret);
    const tmpDir = os.tmpdir();
    const vaultFiles = fs.readdirSync(tmpDir).filter(f => f.endsWith('.vault'));
    for (const f of vaultFiles) {
      const raw = fs.readFileSync(path.join(tmpDir, f), 'utf8');
      expect(raw).not.toContain('super-secret-value-12345');
      expect(raw).not.toContain('TEST_API_KEY');
    }
  });

  it('overwrites a secret with the same key', () => {
    saveSecret(testSecret);
    saveSecret({ ...testSecret, value: 'updated-value' });
    expect(getSecret('TEST_API_KEY')).toBe('updated-value');
    expect(loadSecrets().filter((s: any) => s.key === 'TEST_API_KEY')).toHaveLength(1);
  });

  it('deletes a secret', () => {
    saveSecret(testSecret);
    deleteSecret('TEST_API_KEY');
    expect(getSecret('TEST_API_KEY')).toBeUndefined();
  });

  it('returns undefined for a non-existent key', () => {
    expect(getSecret('DOES_NOT_EXIST')).toBeUndefined();
  });

  it('stores multiple secrets independently', () => {
    const a = { key: 'KEY_A', value: 'val-a', scope: 'global' as const, createdAt: new Date().toISOString() };
    const b = { key: 'KEY_B', value: 'val-b', scope: 'cloudflare' as const, createdAt: new Date().toISOString() };
    saveSecret(a);
    saveSecret(b);
    expect(getSecret('KEY_A')).toBe('val-a');
    expect(getSecret('KEY_B')).toBe('val-b');
  });
});
