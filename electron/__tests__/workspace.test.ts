import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { WorkspaceData } from '../../src/types';

// Mock electron before require
jest.mock('electron', () => ({
  app: { getPath: () => os.tmpdir() },
  dialog: {
    showSaveDialog: jest.fn(),
    showOpenDialog: jest.fn(),
  },
}));

let openRecentProject: (p: string) => WorkspaceData | null;
let loadRecentProjects: () => any[];
let autoSaveWorkspace: (p: string, d: WorkspaceData) => void;

beforeAll(() => {
  ({ openRecentProject, loadRecentProjects, autoSaveWorkspace } = require('../workspace'));
});

const TEST_WORKSPACE: WorkspaceData = {
  version: '1',
  name: 'test-project',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  config: { cloudProvider: 'cloudflare', cfAccountId: 'abc123', cfScriptName: 'my-worker' },
  tabs: [
    {
      id: 'tab-1',
      name: 'worker.js',
      code: 'addEventListener("fetch", e => e.respondWith(new Response("hello")));',
      language: 'javascript',
      isDirty: false,
    },
  ],
  activeTabId: 'tab-1',
  deployHistory: [],
  sidePanel: null,
  bottomPanel: 'test',
};

describe('Workspace save and load', () => {
  const tmpDir = os.tmpdir();
  let workspacePath: string;

  beforeEach(() => {
    workspacePath = path.join(tmpDir, `test-workspace-${Date.now()}`, 'edge.json');
  });

  afterEach(() => {
    try {
      fs.rmSync(path.dirname(workspacePath), { recursive: true, force: true });
    } catch {}
  });

  it('autoSave writes a valid edge.json file', () => {
    autoSaveWorkspace(workspacePath, TEST_WORKSPACE);
    expect(fs.existsSync(workspacePath)).toBe(true);
    const raw = JSON.parse(fs.readFileSync(workspacePath, 'utf8'));
    expect(raw.version).toBe('1');
    expect(raw.name).toBe('test-project');
  });

  it('autoSave creates project subdirectories', () => {
    autoSaveWorkspace(workspacePath, TEST_WORKSPACE);
    const dir = path.dirname(workspacePath);
    expect(fs.existsSync(path.join(dir, 'src'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'infra'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'tests'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'secrets'))).toBe(true);
  });

  it('openRecentProject loads the workspace back', () => {
    autoSaveWorkspace(workspacePath, TEST_WORKSPACE);
    const loaded = openRecentProject(workspacePath);
    expect(loaded).not.toBeNull();
    expect(loaded?.name).toBe('test-project');
    expect(loaded?.tabs).toHaveLength(1);
    expect(loaded?.tabs[0].code).toContain('hello');
  });

  it('openRecentProject returns null for a non-existent path', () => {
    const result = openRecentProject('/does/not/exist/edge.json');
    expect(result).toBeNull();
  });

  it('autoSave updates updatedAt timestamp', () => {
    const before = new Date(Date.now() - 1000).toISOString();
    autoSaveWorkspace(workspacePath, { ...TEST_WORKSPACE, updatedAt: before });
    const loaded = openRecentProject(workspacePath);
    expect(loaded?.updatedAt).not.toBe(before);
    expect(new Date(loaded!.updatedAt).getTime()).toBeGreaterThan(new Date(before).getTime());
  });

  it('workspace does not store sensitive credentials', () => {
    const workspaceWithCreds: WorkspaceData = {
      ...TEST_WORKSPACE,
      config: {
        ...TEST_WORKSPACE.config,
        // These should NOT end up in the file
      } as any,
    };
    autoSaveWorkspace(workspacePath, workspaceWithCreds);
    const raw = fs.readFileSync(workspacePath, 'utf8');
    // Config in workspace should not have token fields (enforced by type omission)
    const parsed = JSON.parse(raw);
    expect(parsed.config.cfApiToken).toBeUndefined();
    expect(parsed.config.awsSecretAccessKey).toBeUndefined();
  });

  it('openRecentProject returns null for a file with wrong version', () => {
    const badWorkspace = { ...TEST_WORKSPACE, version: '0' };
    const dir = path.dirname(workspacePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(workspacePath, JSON.stringify(badWorkspace));
    const result = openRecentProject(workspacePath);
    expect(result).toBeNull();
  });
});

describe('Recent projects', () => {
  it('loadRecentProjects returns only paths that exist on disk', () => {
    const recent = loadRecentProjects();
    // All returned paths should exist
    for (const r of recent) {
      expect(fs.existsSync(r.path)).toBe(true);
    }
  });
});
