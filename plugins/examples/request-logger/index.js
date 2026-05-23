/**
 * request-logger plugin
 *
 * Wraps the fetch event handler with structured request/response logging.
 * Logs: method, pathname, status code, and latency on every request.
 *
 * Works with the standard addEventListener("fetch", ...) pattern.
 */

exports.onCodeTransform = async function (code) {
  // Only inject if this looks like a standard Workers fetch handler
  if (!code.includes('addEventListener("fetch"') && !code.includes("addEventListener('fetch'")) {
    return code;
  }

  const logger = `
// [request-logger] injected by Edge Deployer plugin
const __rl_origAddEventListener = addEventListener;
let __rl_addEventListener = function(type, handler) {
  if (type !== 'fetch') return __rl_origAddEventListener(type, handler);
  __rl_origAddEventListener('fetch', function(event) {
    const start = Date.now();
    const { method, url } = event.request;
    const { pathname } = new URL(url);
    const wrapped = handler(event);
    if (wrapped && typeof wrapped.then === 'function') {
      wrapped.then(res => {
        const latency = Date.now() - start;
        console.log(JSON.stringify({ method, pathname, status: res?.status ?? 0, latencyMs: latency }));
      }).catch(() => {});
    }
    return wrapped;
  });
};
// Override addEventListener for this module scope
const addEventListener = __rl_addEventListener;

`;

  return logger + code;
};
