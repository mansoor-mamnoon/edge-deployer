# request-logger

Wraps your fetch event handler at transform time to inject structured request/response logging.

**Permissions:** `code:transform`, `logs:write`

## What it does

Injects a thin shim around `addEventListener("fetch", ...)` that logs:

```json
{ "method": "GET", "pathname": "/api/users", "status": 200, "latencyMs": 12 }
```

on every request. Logs appear in your provider's log tail and in the Edge Deployer Observability panel.

## Compatibility

Works with the standard Cloudflare Workers `addEventListener("fetch", handler)` pattern. Does not modify handlers that use the newer `export default { fetch() }` syntax (future version will support both).
