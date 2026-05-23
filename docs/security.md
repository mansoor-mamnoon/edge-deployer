# Security

## Threat model

Edge Deployer runs locally. There is no server, no telemetry, and no third-party data collection. The attack surface is:

1. **Hardcoded secrets in worker code** — caught by the security scanner
2. **Credential theft from disk** — mitigated by AES-256-GCM encryption
3. **Malicious plugin code** — mitigated by vm sandbox
4. **Compromised workspace file** — credentials are excluded from `edge.json`
5. **XSS in preview iframe** — mitigated by origin isolation

---

## Secrets vault

**Location:** `~/.config/Edge Deployer/secrets.enc` (macOS: `~/Library/Application Support/Edge Deployer/`)

**Encryption:** AES-256-GCM with PBKDF2 key derivation

```
key = PBKDF2(machineId, sha256("edge-deployer-salt-v1"), 100_000 iterations, 32 bytes, sha256)
ciphertext format: base64(iv[12] + authTag[16] + ciphertext)
```

`machineId` is derived from the OS hostname/computer name — the key is machine-specific with zero user friction. A copy of the secrets file on another machine will not decrypt.

**What is stored:**
- Cloud provider tokens (cfApiToken, vercelToken, netlifyToken, ANTHROPIC_API_KEY, etc.)
- Each entry has a `scope` field (global or project-specific)

**What is never stored:**
- Plaintext credentials anywhere on disk
- Credentials in `edge.json` workspace files
- Credentials in deploy history records

---

## Security scanner

The scanner (`src/lib/securityScanner.ts`) runs in the renderer process on every editor change. Rules (10 total):

| ID | Severity | Pattern |
|---|---|---|
| `hardcoded-aws-key` | critical | `AKIA[0-9A-Z]{16}` |
| `hardcoded-bearer` | critical | `Bearer [A-Za-z0-9...]{20,}` |
| `hardcoded-private-key` | critical | `-----BEGIN ... PRIVATE KEY-----` |
| `github-token` | critical | `gh[ps]_[a-zA-Z0-9]{36}` |
| `hardcoded-password` | high | `password = "..."` |
| `hardcoded-secret` | high | `secret/api_key/token = "..."` |
| `insecure-eval` | high | `eval(` |
| `cors-wildcard` | medium | `Access-Control-Allow-Origin` + `*` |
| `no-timeout` | low | `await fetch(...)` without `AbortSignal` |
| `console-log` | low | `console.log` |

`hasCriticalIssues()` blocks deployment when critical issues are present.

---

## Plugin sandbox

Plugins run inside a `vm.Context` (Node.js `vm` module) in the Electron main process:

**What the sandbox has:**
- `module`, `exports`, `require` (stubbed — always throws)
- `console.log/warn/error` (redirected to `__pluginLogs` array, not real console)
- `fetch` — only if the manifest declares `network:fetch` permission
- `setTimeout`, `clearTimeout`, `Promise`, `JSON`, `Math`, etc.

**What the sandbox does NOT have:**
- `fs` — no file system access
- `process` — no env vars, no process exit
- `__dirname`, `__filename`
- Real `require` — no native module loading
- `net`, `http`, `https`, `child_process`

**Timeout:** plugins have 5 seconds per hook. Exceeded hooks throw and are caught; the plugin continues in a degraded state.

**Manifest validation:** checked before loading:
- `name`, `version` (semver), `entrypoint`, `permissions` (allowlist)
- Version compatibility: `minAppVersion` ≤ current app version

---

## Electron security settings

```typescript
webPreferences: {
  contextIsolation: true,  // renderer cannot access Node APIs
  nodeIntegration: false,  // no require() in renderer
  sandbox: false,          // needed for preload to use require
}
```

`contextBridge` is the only channel between renderer and main. The renderer has no direct access to `ipcRenderer.send` or `ipcRenderer.invoke` — only the typed surface exposed via `window.electronAPI`.

---

## Preview iframe isolation

The preview iframe (`public/preview.html`) is served from the same origin as the renderer but is a fully isolated document. Worker code runs inside a `try/catch` with a 5-second `AbortSignal.timeout`. The iframe communicates results back via `postMessage` with origin checks.

---

## Known limitations

- The machine key derivation (`hostname`) is not cryptographically strong — it provides obfuscation, not full security against an attacker with filesystem access and knowledge of the hostname.
- No code signing for the app binary in the free build. macOS Gatekeeper will prompt users to allow the app unless the release is signed with an Apple Developer certificate.
- The security scanner uses regex, not a full AST parser. Obfuscated secrets may evade detection.
