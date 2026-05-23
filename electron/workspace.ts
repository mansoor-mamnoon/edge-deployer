import * as fs from 'fs';
import * as path from 'path';
import { app, dialog } from 'electron';
import { WorkspaceData, RecentProject, CloudProvider } from '../src/types';

const WORKSPACE_FILE = 'edge.json';
const RECENT_FILE = () => path.join(app.getPath('userData'), 'recent-projects.json');
const MAX_RECENT = 10;
const WORKSPACE_VERSION = '1' as const;

// ─── Recent projects ──────────────────────────────────────────────────────

function readRecent(): RecentProject[] {
  try {
    const raw = fs.readFileSync(RECENT_FILE(), 'utf8');
    return JSON.parse(raw) as RecentProject[];
  } catch {
    return [];
  }
}

function writeRecent(items: RecentProject[]): void {
  fs.mkdirSync(path.dirname(RECENT_FILE()), { recursive: true });
  fs.writeFileSync(RECENT_FILE(), JSON.stringify(items, null, 2), 'utf8');
}

function upsertRecent(entry: RecentProject): void {
  const items = readRecent().filter(r => r.path !== entry.path);
  items.unshift(entry);
  writeRecent(items.slice(0, MAX_RECENT));
}

// ─── Read / write workspace ───────────────────────────────────────────────

function readWorkspace(filePath: string): WorkspaceData | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw) as WorkspaceData;
    if (data.version !== WORKSPACE_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

function writeWorkspace(filePath: string, data: WorkspaceData): void {
  const dir = path.dirname(filePath);
  // Create the standard project subdirectories
  for (const sub of ['src', 'infra', 'tests', 'secrets']) {
    fs.mkdirSync(path.join(dir, sub), { recursive: true });
  }
  data.updatedAt = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// ─── Public API ───────────────────────────────────────────────────────────

/** Show a Save dialog and write the workspace. Returns the path written. */
export async function saveWorkspace(data: WorkspaceData): Promise<string> {
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Save Edge Deployer Project',
    defaultPath: `${data.name || 'edge-project'}/${WORKSPACE_FILE}`,
    filters: [{ name: 'Edge Project', extensions: ['json'] }],
  });

  if (canceled || !filePath) throw new Error('Save cancelled');

  const withVersion: WorkspaceData = { ...data, version: WORKSPACE_VERSION };
  writeWorkspace(filePath, withVersion);

  upsertRecent({
    name: data.name,
    path: filePath,
    lastOpened: new Date().toISOString(),
    provider: (data.config?.cloudProvider as CloudProvider) ?? 'cloudflare',
  });

  return filePath;
}

/** Show an Open dialog and return the loaded WorkspaceData. */
export async function openWorkspace(): Promise<WorkspaceData | null> {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    title: 'Open Edge Deployer Project',
    filters: [{ name: 'Edge Project (edge.json)', extensions: ['json'] }],
    properties: ['openFile'],
  });

  if (canceled || !filePaths.length) return null;

  const data = readWorkspace(filePaths[0]);
  if (!data) throw new Error('Invalid or incompatible workspace file.');

  upsertRecent({
    name: data.name,
    path: filePaths[0],
    lastOpened: new Date().toISOString(),
    provider: (data.config?.cloudProvider as CloudProvider) ?? 'cloudflare',
  });

  return data;
}

/** Load a workspace by path without showing a dialog. */
export function openRecentProject(filePath: string): WorkspaceData | null {
  const data = readWorkspace(filePath);
  if (data) {
    upsertRecent({
      name: data.name,
      path: filePath,
      lastOpened: new Date().toISOString(),
      provider: (data.config?.cloudProvider as CloudProvider) ?? 'cloudflare',
    });
  }
  return data;
}

export function loadRecentProjects(): RecentProject[] {
  return readRecent().filter(r => fs.existsSync(r.path));
}

/** Auto-save the workspace to the last used path (no dialog). */
export function autoSaveWorkspace(filePath: string, data: WorkspaceData): void {
  try {
    writeWorkspace(filePath, { ...data, version: WORKSPACE_VERSION });
  } catch {
    // Auto-save failures are silent — user will be prompted on explicit save
  }
}
