# env-injector

Scans your worker code for `env.VARNAME` and `process.env.VARNAME` references and injects a JSDoc comment block listing all required environment variables.

**Permissions:** `code:read`, `code:transform`

## What it does

Before every code transform, it:
1. Finds all `env.VARNAME` and `process.env.VARNAME` references
2. Prepends a `/** Environment variables required: ... */` block to the output

This makes it immediately clear to anyone reading the deployed code which secrets need to be configured in the provider dashboard.

## Example output

```js
/**
 * Environment variables required by this worker:
 *   DATABASE_URL
 *   OPENAI_API_KEY
 *   STRIPE_SECRET_KEY
 *
 * Set these in your provider dashboard or via the Edge Deployer Secrets Vault.
 */

addEventListener("fetch", event => { ... });
```
