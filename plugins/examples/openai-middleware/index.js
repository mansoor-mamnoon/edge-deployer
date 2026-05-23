/**
 * openai-middleware plugin
 *
 * Validates that the worker code references OPENAI_API_KEY before deploying,
 * and injects a warning comment if the key appears to be hardcoded.
 */

exports.onBeforeDeploy = async function (code, config) {
  const hasKeyRef = /OPENAI_API_KEY/.test(code);
  const hasHardcoded = /sk-[a-zA-Z0-9]{20,}/.test(code);

  if (hasHardcoded) {
    console.warn(
      '[openai-middleware] WARNING: A hardcoded OpenAI key was detected. ' +
      'Move it to the secrets vault and reference it via environment variables.'
    );
  }

  if (!hasKeyRef) {
    console.log(
      '[openai-middleware] No OPENAI_API_KEY reference found. ' +
      'Make sure your OpenAI calls use env.OPENAI_API_KEY.'
    );
  }

  // Prepend a reminder comment to the deployed code
  const banner = [
    '// [openai-middleware] Deployed by Edge Deployer',
    '// Make sure OPENAI_API_KEY is set in your Cloudflare dashboard or Lambda env.',
    '',
  ].join('\n');

  return banner + code;
};

exports.onAfterDeploy = async function (result) {
  console.log(
    `[openai-middleware] Deployed to ${result.provider} at ${result.url}. ` +
    `Latency: ${result.latencyMs ?? 'n/a'}ms`
  );
};
