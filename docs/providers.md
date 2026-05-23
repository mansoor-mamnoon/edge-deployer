# Cloud Provider Setup

## Cloudflare Workers

**Required config:**
| Field | Where to find it |
|---|---|
| `cfApiToken` | [dash.cloudflare.com → Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens) |
| `cfAccountId` | Right sidebar on any Cloudflare dashboard page |
| `cfScriptName` | The name of your Worker (created automatically on first deploy) |

**Minimum token permissions:**
- Account → Workers Scripts → Edit
- Zone → Workers Routes → Edit (if using a custom domain)

**Deploy mechanics:**
- `PUT /accounts/:accountId/workers/scripts/:scriptName` with `Content-Type: application/javascript`
- Rollback uses the [Workers Deployments API](https://developers.cloudflare.com/api/operations/worker-deployments-list-deployments)

**Import:** pulls the raw script body via `GET .../workers/scripts/:scriptName`.

---

## AWS Lambda

**Required config:**
| Field | Description |
|---|---|
| `awsAccessKeyId` | IAM user or role access key |
| `awsSecretAccessKey` | Corresponding secret key |
| `awsRegion` | e.g. `us-east-1` |
| `awsLambdaName` | Function name or ARN |

**Minimum IAM permissions:**
```json
{
  "Effect": "Allow",
  "Action": [
    "lambda:GetFunction",
    "lambda:CreateFunction",
    "lambda:UpdateFunctionCode",
    "lambda:PublishVersion",
    "lambda:UpdateAlias",
    "iam:PassRole"
  ],
  "Resource": "arn:aws:lambda:*:*:function:YOUR_FUNCTION_NAME"
}
```

**Deploy mechanics:**
- Code is wrapped in a Lambda-compatible handler, ZIPped in memory, and uploaded via `UpdateFunctionCode`
- `@aws-sdk/client-lambda` runs in the main process with credentials from the vault

**Import:** uses `GetFunctionCommand` to retrieve the pre-signed code URL, then downloads and unpacks the ZIP.

---

## Vercel

**Required config:**
| Field | Description |
|---|---|
| `vercelToken` | [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `vercelProjectId` | Found in Project Settings → General |
| `vercelTeamId` | (optional) Team ID for team-owned projects |

**Deploy mechanics:**
- Uses [Vercel v13 Deployments API](https://vercel.com/docs/rest-api/endpoints/deployments)
- Files are uploaded with SHA-256 digests; Vercel deduplicates content
- Rollback promotes a previous deployment via the promote endpoint

**Import:** fetches the latest production deployment's file tree and downloads `index.js` or `handler.js`.

---

## Netlify

**Required config:**
| Field | Description |
|---|---|
| `netlifyToken` | [app.netlify.com/user/applications](https://app.netlify.com/user/applications) → Personal access tokens |
| `netlifySiteId` | Found in Site Settings → General → Site ID |

**Deploy mechanics:**
- Uses Netlify's file-digest deploy endpoint (`/api/v1/sites/:siteId/deploys`)
- Edge function format: `export default async function handler(req) { ... }`

**Import:** not yet supported (Netlify does not expose a public source-download API).

---

## Drift detection

Drift detection compares the current editor contents against the live deployed code:

```
local code (editor)  ←→  remote code (cloud API)
         ↓ diff
  line-by-line unified diff (capped at 40 changed lines for display)
```

If drift is detected, the ImportPanel shows a color-coded diff and offers to load the remote version into a new tab.

---

## Known limitations

- AWS ZIP unpacking is not done in-app; the import returns function metadata and a placeholder handler instead of the full source.
- Netlify import is not supported.
- Vercel import finds `index.js` / `handler.js` by name; mono-repo layouts may need manual navigation.
- SigV4 signing for AWS calls is handled by `@aws-sdk/client-lambda` — no manual signing required, but credentials must be valid IAM keys (not session tokens without `awsSessionToken`).
