# Plugin SDK

## Overview

Plugins extend Edge Deployer with custom code transforms, deploy hooks, and log writers. They run in a sandboxed vm context (no filesystem, no network by default) inside the Electron main process.

---

## Manifest (`plugin.json`)

Every plugin directory must contain a `plugin.json`:

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "What this plugin does",
  "entrypoint": "index.js",
  "permissions": ["code:transform"],
  "minAppVersion": "2.0.0"
}
```

### Required fields

| Field | Type | Description |
|---|---|---|
| `name` | string | Unique plugin identifier (kebab-case) |
| `version` | string | SemVer (e.g. `1.0.0`) |
| `entrypoint` | string | Path to the JS entry file (relative to plugin dir) |

### Optional fields

| Field | Type | Default | Description |
|---|---|---|---|
| `description` | string | `""` | Shown in the Plugin panel |
| `permissions` | string[] | `[]` | Required capabilities (see below) |
| `minAppVersion` | string | `"0.0.0"` | Minimum Edge Deployer version |

---

## Permissions

Declare only the permissions your plugin actually uses. Users see the permission list before enabling a plugin.

| Permission | What it grants |
|---|---|
| `code:read` | Read the current editor code in `onBeforeDeploy` |
| `code:transform` | Return a modified code string from `onBeforeDeploy` |
| `deploy:read` | Read the `DeployResult` in `onAfterDeploy` |
| `deploy:write` | (reserved for future use) |
| `network:fetch` | Call `fetch()` inside any hook |
| `logs:write` | Write to the plugin log accumulator |

---

## Hooks

Export named functions from your entrypoint. All hooks are optional.

### `onBeforeDeploy(code, config)`

Called after the user clicks Deploy, before the code is sent to the cloud. Return the (optionally modified) code string.

```js
// Strips console.log statements before deploying
exports.onBeforeDeploy = async function(code, config) {
  return code.replace(/console\.log\([^)]*\);?/g, '');
};
```

Requires: `code:read` (to receive code), `code:transform` (to return modified code).

### `onAfterDeploy(result)`

Called after a successful deployment. `result` is the `DeployResult` object:

```ts
interface DeployResult {
  url: string;
  provider: string;
  timestamp: string;
  deploymentId?: string;
  latencyMs?: number;
}
```

```js
// Notify an external webhook after each deploy
exports.onAfterDeploy = async function(result) {
  await fetch('https://hooks.example.com/deploy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: result.url, ts: result.timestamp }),
  });
};
```

Requires: `deploy:read`, `network:fetch`.

### `onCodeTransform(code)`

A simpler transform hook that only receives the code string and returns a modified version. Use this instead of `onBeforeDeploy` when you don't need the config.

```js
exports.onCodeTransform = async function(code) {
  return code + '\n// transformed by my-plugin';
};
```

Requires: `code:transform`.

---

## Sandbox environment

Your plugin runs in a restricted context. Available globals:

```
console.log / console.warn / console.error  → captured in plugin log panel
fetch(url, options)                          → only if network:fetch is declared
setTimeout / clearTimeout
Promise, JSON, Math, Date, Array, Object, String, Number, Boolean, RegExp, Error
module, exports
```

**Not available:** `require`, `fs`, `path`, `process`, `__dirname`, `__filename`, `net`, `http`, `child_process`, `Buffer` (use `TextEncoder`/`TextDecoder`).

---

## Plugin directory layout

```
my-plugin/
  plugin.json     ← manifest (required)
  index.js        ← entrypoint
  README.md       ← optional documentation
```

Place your plugin directory inside the workspace's `plugins/` subdirectory, or any directory that Edge Deployer scans on startup (configurable in future releases).

---

## Built-in plugins

Two plugins ship with the app and are always available:

### `console-stripper`

Strips all `console.log` statements from worker code before deploying. Zero configuration.

```json
{ "name": "console-stripper", "version": "1.0.0", "permissions": ["code:transform"] }
```

### `cors-headers`

Adds CORS headers to every Response returned by the worker. Useful for local API testing.

```json
{ "name": "cors-headers", "version": "1.0.0", "permissions": ["code:transform"] }
```

---

## Execution timeout

Each hook has a **5-second timeout**. If your hook exceeds this limit, it will throw a `Plugin hook timed out` error, which is caught and logged. The deployment or transform will proceed with the unmodified code.

---

## Versioning and compatibility

- The `minAppVersion` field uses semver comparison. Plugins that require a higher version than the running app are rejected at load time.
- Plugin authors should pin `minAppVersion` to the version of Edge Deployer they developed against.
- Breaking SDK changes will bump the minor version of the app.
