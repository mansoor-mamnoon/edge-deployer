import { validateManifest, loadPlugin } from '../pluginSandbox';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

// Mock electron
jest.mock('electron', () => ({
  app: { getPath: () => os.tmpdir() },
}));

function makePluginDir(manifest: object, code: string): string {
  const dir = path.join(os.tmpdir(), `plugin-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'plugin.json'), JSON.stringify(manifest));
  fs.writeFileSync(path.join(dir, 'index.js'), code);
  return dir;
}

describe('Plugin manifest validation', () => {
  it('accepts a valid manifest', () => {
    const { valid, errors } = validateManifest({
      name: 'my-plugin',
      version: '1.0.0',
      description: 'A test plugin',
      entrypoint: 'index.js',
    });
    expect(valid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('rejects missing required fields', () => {
    const { valid, errors } = validateManifest({ name: 'test' });
    expect(valid).toBe(false);
    expect(errors.some(e => e.includes('version'))).toBe(true);
    expect(errors.some(e => e.includes('description'))).toBe(true);
    expect(errors.some(e => e.includes('entrypoint'))).toBe(true);
  });

  it('rejects unknown permissions', () => {
    const { valid, errors } = validateManifest({
      name: 'test-plugin',
      version: '1.0.0',
      description: 'desc',
      entrypoint: 'index.js',
      permissions: ['fs:write'], // not allowed
    });
    expect(valid).toBe(false);
    expect(errors.some(e => e.includes('fs:write'))).toBe(true);
  });

  it('accepts known permissions', () => {
    const { valid } = validateManifest({
      name: 'test-plugin',
      version: '1.0.0',
      description: 'desc',
      entrypoint: 'index.js',
      permissions: ['code:transform', 'logs:write'],
    });
    expect(valid).toBe(true);
  });

  it('rejects plugin name with path traversal characters', () => {
    const { valid, errors } = validateManifest({
      name: '../evil',
      version: '1.0.0',
      description: 'desc',
      entrypoint: 'index.js',
    });
    expect(valid).toBe(false);
    expect(errors.some(e => e.includes('alphanumeric'))).toBe(true);
  });

  it('rejects non-object manifest', () => {
    expect(validateManifest('not an object').valid).toBe(false);
    expect(validateManifest(null).valid).toBe(false);
    expect(validateManifest(42).valid).toBe(false);
  });
});

describe('Plugin sandbox execution', () => {
  afterAll(() => {
    // Clean up temp plugin dirs
    const tmpDir = os.tmpdir();
    fs.readdirSync(tmpDir).filter(d => d.startsWith('plugin-test-')).forEach(d => {
      try { fs.rmSync(path.join(tmpDir, d), { recursive: true }); } catch {}
    });
  });

  it('loads a valid plugin', () => {
    const dir = makePluginDir(
      { name: 'valid-plugin', version: '1.0.0', description: 'desc', entrypoint: 'index.js' },
      `module.exports = { name: 'valid-plugin', version: '1.0.0', description: 'desc', entrypoint: 'index.js' };`
    );
    const plugin = loadPlugin(dir);
    expect(plugin).not.toBeNull();
    expect(plugin?.manifest.name).toBe('valid-plugin');
  });

  it('sandboxes the plugin — cannot access require()', async () => {
    const dir = makePluginDir(
      { name: 'evil-plugin', version: '1.0.0', description: 'desc', entrypoint: 'index.js' },
      `
        let gotFs = false;
        try { const fs = require('fs'); gotFs = true; } catch {}
        module.exports = {
          name: 'evil-plugin', version: '1.0.0', description: 'desc', entrypoint: 'index.js',
          async onCodeTransform(code) { return gotFs ? 'PWNED' : code; }
        };
      `
    );
    const plugin = loadPlugin(dir);
    // If plugin loaded, the transform should not have fs access
    if (plugin?.onCodeTransform) {
      const result = await plugin.onCodeTransform('safe-code');
      expect(result).not.toBe('PWNED');
    }
    // OR: plugin fails to load (also acceptable)
  });

  it('returns null for a plugin with invalid manifest', () => {
    const dir = makePluginDir(
      { name: '../traversal', version: '1.0.0', description: 'desc', entrypoint: 'index.js' },
      `module.exports = {};`
    );
    const plugin = loadPlugin(dir);
    expect(plugin).toBeNull();
  });

  it('returns null when entrypoint is missing', () => {
    const tmpDir = os.tmpdir();
    const dir = path.join(tmpDir, `plugin-missing-${Date.now()}`);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'plugin.json'), JSON.stringify({
      name: 'no-entry', version: '1.0.0', description: 'desc', entrypoint: 'missing.js',
    }));
    const plugin = loadPlugin(dir);
    expect(plugin).toBeNull();
  });

  it('wraps onCodeTransform hook safely', async () => {
    const dir = makePluginDir(
      { name: 'transform-plugin', version: '1.0.0', description: 'desc', entrypoint: 'index.js' },
      `
        module.exports = {
          name: 'transform-plugin',
          version: '1.0.0',
          description: 'desc',
          entrypoint: 'index.js',
          async onCodeTransform(code) {
            return '// transformed\\n' + code;
          }
        };
      `
    );
    const plugin = loadPlugin(dir);
    expect(plugin).not.toBeNull();
    if (plugin?.onCodeTransform) {
      const result = await plugin.onCodeTransform('original code');
      expect(result).toContain('// transformed');
      expect(result).toContain('original code');
    }
  });
});
