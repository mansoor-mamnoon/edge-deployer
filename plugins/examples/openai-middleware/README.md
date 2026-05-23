# openai-middleware

Validates OpenAI key hygiene before every deploy and appends a reminder comment to the deployed artifact.

**Permissions:** `code:read`, `code:transform`, `logs:write`

## What it does

- Scans for hardcoded `sk-...` keys and warns if found
- Checks that `OPENAI_API_KEY` is referenced (not inlined)
- Prepends a comment banner reminding you to set the key in your dashboard
- Logs the deployed URL and latency after a successful deploy

## Install

Copy this directory into your workspace's `plugins/` folder. It will appear in the Plugin panel automatically.
