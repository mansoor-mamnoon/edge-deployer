import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { PluginManifest } from '../src/types';

const PLUGINS_DIR = () => path.join(app.getPath('userData'), 'plugins');

export function getPluginsDir(): string {
  const dir = PLUGINS_DIR();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function loadPluginManifests(): PluginManifest[] {
  const dir = getPluginsDir();
  const manifests: PluginManifest[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const manifestPath = path.join(dir, entry.name, 'plugin.json');
      if (!fs.existsSync(manifestPath)) continue;
      try {
        const raw = fs.readFileSync(manifestPath, 'utf8');
        const manifest = JSON.parse(raw) as PluginManifest;
        manifests.push(manifest);
      } catch {
        // Skip malformed manifests
      }
    }
  } catch {
    // Plugins dir not yet created
  }

  return manifests;
}

export function scaffoldExamplePlugin(): void {
  const dir = path.join(getPluginsDir(), 'example-plugin');
  fs.mkdirSync(dir, { recursive: true });

  const manifest: PluginManifest = {
    name: 'example-plugin',
    version: '1.0.0',
    description: 'Example Edge Deployer plugin',
    author: 'You',
    entrypoint: 'index.js',
  };

  fs.writeFileSync(path.join(dir, 'plugin.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(
    path.join(dir, 'index.js'),
    `// Edge Deployer Plugin SDK example
module.exports = {
  name: 'example-plugin',
  version: '1.0.0',
  description: 'Example plugin',

  // Called before every deploy — return (possibly modified) code
  async onBeforeDeploy(code, config) {
    console.log('[example-plugin] onBeforeDeploy called');
    return code;
  },

  // Called after every successful deploy
  async onAfterDeploy(result) {
    console.log('[example-plugin] Deployed to:', result.url);
  },
};
`
  );
}
