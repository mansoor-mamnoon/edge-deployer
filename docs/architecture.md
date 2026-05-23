# Architecture

## Overview

Edge Deployer is an Electron 36 desktop application. It combines a Monaco-based code editor, a multi-cloud deployment engine, and a local edge-runtime simulator into a single native app.

```
┌─────────────────────────────────────────────────┐
│                 Electron Main Process            │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐ │
│  │  Deploy  │  │ Secrets  │  │   Workspace   │ │
│  │  Engine  │  │  Vault   │  │  Persistence  │ │
│  └────┬─────┘  └────┬─────┘  └───────┬───────┘ │
│       │              │                │          │
│  ┌────▼──────────────▼────────────────▼───────┐ │
│  │               IPC Bridge (ipcMain)          │ │
│  └────────────────────┬────────────────────────┘ │
└───────────────────────│──────────────────────────┘
                        │ contextBridge (preload.ts)
┌───────────────────────▼──────────────────────────┐
│              Renderer Process (React)             │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  Monaco  │  │  Panels  │  │  WorkspaceBar │  │
│  │  Editor  │  │  (tabs)  │  │  + ImportPanel│  │
│  └──────────┘  └──────────┘  └───────────────┘  │
│  ┌──────────────────────────────────────────────┐ │
│  │          Preview iframe (preview.html)        │ │
│  │   Edge runtime simulation (fetch events, KV)  │ │
│  └──────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────┘
```

## Process separation

| Concern | Process | Rationale |
|---|---|---|
| File I/O, secrets encryption | Main | Node.js APIs not available in renderer |
| Cloud API calls | Main | CORS restrictions; token isolation |
| Plugin sandbox (vm module) | Main | Full Node.js vm isolation |
| UI, editor state | Renderer | React + Monaco |
| Edge runtime preview | iframe | Origin isolation; simulated fetch API |

**Rule:** the renderer never holds plaintext credentials. All tokens flow through the encrypted vault in the main process and are redacted from IPC responses.

## IPC surface (`electron/preload.ts`)

Every renderer → main call goes through `contextBridge.exposeInMainWorld('electronAPI', {...})`. The full surface is typed in `src/types.ts` as `ElectronAPI`. No `nodeIntegration`, no `remote` module.

Key channel groups:
- `deploy-to-cloud`, `rollback-with-healthcheck` — deployment engine
- `save-workspace`, `open-workspace`, `auto-save-workspace` — project persistence
- `import-from-cloud`, `detect-drift` — cloud import
- `save-secret`, `load-secrets`, `delete-secret` — secrets vault
- `ai-assist`, `ai-generate` — AI assistant (Claude API)
- `load-plugins` — plugin discovery
- `download-{pulumi,terraform,wrangler,dockerfile}` — IaC export

## Deployment pipeline

```
validate(config)
  → build(code, config)      // produce BuildArtifact
  → deploy(artifact, config) // returns DeployResult { url, deploymentId, latencyMs }
```

The `IDeployer` interface (`src/cloudDeployers/IDeployer.ts`) is the only contract each provider must implement. Adding a new provider means creating one file that satisfies those 7 methods.

## Workspace model (`edge.json`)

A workspace is a JSON file written by `electron/workspace.ts`. Credentials are **never** written (enforced by the `WorkspaceData` type's `Omit<EnvConfig, ...>` config field). The file tracks:

- Tabs (code + language + dirty flag)
- Active tab ID
- Deploy history (last 10 records)
- Panel layout state
- Provider (but not token)

Auto-save fires 30 seconds after the last edit when a workspace file is open.

## Plugin sandbox

Plugins run inside a `vm.Context` constructed by `electron/pluginSandbox.ts`. The sandbox:
- Has no `require`, no `fs`, no `net` by default
- Exposes `fetch` only if the manifest declares `network:fetch` permission
- Has a 5-second execution timeout
- Exposes a `__pluginLog` accumulator (no direct console access)

Plugin manifests are validated against a schema before loading. Invalid or version-incompatible manifests are rejected with a typed error.

## Security model

See [security.md](security.md) for the full threat model.
