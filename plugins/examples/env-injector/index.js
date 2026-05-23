/**
 * env-injector plugin
 *
 * Scans the worker code for env.VARNAME or process.env.VARNAME references,
 * then prepends a comment block listing all variable names found.
 * Does NOT inject secret values — just documents what the worker expects.
 */

exports.onCodeTransform = async function (code) {
  const found = new Set();

  // Match env.VARNAME (Cloudflare Workers style)
  const cfMatches = code.matchAll(/\benv\.([A-Z_][A-Z0-9_]*)\b/g);
  for (const m of cfMatches) found.add(m[1]);

  // Match process.env.VARNAME (Node.js / Lambda style)
  const nodeMatches = code.matchAll(/process\.env\.([A-Z_][A-Z0-9_]*)\b/g);
  for (const m of nodeMatches) found.add(m[1]);

  if (found.size === 0) return code;

  const block = [
    '/**',
    ' * Environment variables required by this worker:',
    ...Array.from(found).sort().map(v => ` *   ${v}`),
    ' *',
    ' * Set these in your provider dashboard or via the Edge Deployer Secrets Vault.',
    ' */',
    '',
  ].join('\n');

  return block + code;
};
