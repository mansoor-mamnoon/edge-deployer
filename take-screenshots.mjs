/**
 * CDP automation script — drives the live Electron app and takes screenshots
 * of every panel for the README. Run AFTER the app is booted with
 * --remote-debugging-port=9222.
 *
 * Usage: node take-screenshots.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { get } from 'http';

const CDP_BASE = 'http://localhost:9222';
const OUT_DIR  = 'docs/screenshots';
const GIF_DIR  = 'docs/screenshots/gif-frames';

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(GIF_DIR, { recursive: true });

// ── CDP helpers ──────────────────────────────────────────────────────────────

function httpGet(url) {
  return new Promise((resolve, reject) => {
    get(url, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function getTarget() {
  for (let i = 0; i < 20; i++) {
    try {
      const raw = await httpGet(`${CDP_BASE}/json`);
      const targets = JSON.parse(raw);
      const t = targets.find(t => t.url.includes('localhost:8080') && t.type === 'page');
      if (t) return t;
    } catch {}
    await sleep(1000);
  }
  throw new Error('Could not find renderer target after 20 retries');
}

function cdpSession(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let _id = 1;
  const pending = new Map();
  const listeners = {};

  ws.addEventListener('message', ({ data }) => {
    const msg = JSON.parse(data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
    if (msg.method && listeners[msg.method]) {
      listeners[msg.method](msg.params);
    }
  });

  const ready = new Promise(r => ws.addEventListener('open', r));

  const send = (method, params = {}) => {
    const id = _id++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  return { ready, send, ws, on: (e, fn) => { listeners[e] = fn; } };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function evalJS(session, expr) {
  const r = await session.send('Runtime.evaluate', {
    expression: expr,
    awaitPromise: true,
    returnByValue: true,
    timeout: 10000,
  });
  return r?.result?.value;
}

async function screenshot(session, filename) {
  const r = await session.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  });
  writeFileSync(filename, Buffer.from(r.data, 'base64'));
  console.log(`  ✓ ${filename}`);
}

// ── UI helpers ────────────────────────────────────────────────────────────────

async function clickByText(session, text) {
  await evalJS(session, `
    (function() {
      const all = [...document.querySelectorAll('button, [role="button"]')];
      const btn = all.find(b => b.textContent.trim() === ${JSON.stringify(text)});
      if (btn) btn.click();
      return btn ? 'clicked' : 'not found: ' + ${JSON.stringify(text)};
    })()
  `);
  await sleep(600);
}

async function clickByLabel(session, label) {
  // broader search including partial match
  await evalJS(session, `
    (function() {
      const all = [...document.querySelectorAll('button, [role="button"]')];
      const btn = all.find(b => b.textContent.trim().includes(${JSON.stringify(label)}));
      if (btn) btn.click();
      return btn ? 'clicked' : 'not found: ' + ${JSON.stringify(label)};
    })()
  `);
  await sleep(800);
}

async function setEditorCode(session, code) {
  const escaped = JSON.stringify(code);
  // Use the dev hook exposed on window by the React app
  const result = await evalJS(session, `
    (function() {
      if (window.__editorDebug && window.__editorDebug.setCode) {
        window.__editorDebug.setCode(${escaped});
        return 'set-via-hook';
      }
      // fallback: monaco model
      try {
        const models = monaco?.editor?.getModels?.();
        if (models && models.length) { models[0].setValue(${escaped}); return 'set-via-monaco'; }
      } catch(e) {}
      return 'failed';
    })()
  `);
  await sleep(800); // give React time to re-render + scanner to re-run
  return result;
}

// Panel names to match the state type exactly
const BOTTOM_IDS = { 'API Test': 'test', 'Response Log': 'logs', 'Observability': 'observability',
  'Load Test': 'loadtest', 'Security': 'security', 'IaC Export': 'infra' };
const SIDE_IDS = { 'Templates': 'templates', 'AI': 'ai', 'Secrets': 'secrets',
  'Plugins': 'plugins', 'Import': 'import' };

async function openBottomPanel(session, label) {
  const id = BOTTOM_IDS[label] ?? label;
  await evalJS(session, `window.__editorDebug && window.__editorDebug.openBottom(${JSON.stringify(id)})`);
  await sleep(700);
}

async function closeBottomPanel(session) {
  await evalJS(session, `window.__editorDebug && window.__editorDebug.closeBottom()`);
  await sleep(400);
}

async function openSidePanel(session, label) {
  const id = SIDE_IDS[label] ?? label;
  await evalJS(session, `window.__editorDebug && window.__editorDebug.openSide(${JSON.stringify(id)})`);
  await sleep(700);
}

async function closeSidePanel(session) {
  await evalJS(session, `window.__editorDebug && window.__editorDebug.closeSide()`);
  await sleep(400);
}

async function addObsLogs(session, count = 8) {
  const messages = [
    'GET /api/health → 200 (12ms)', 'GET /api/users → 200 (31ms)',
    'POST /api/events → 201 (44ms)', 'GET /api/config → 200 (8ms)',
    'GET /api/health → 200 (11ms)', 'DELETE /api/session → 204 (19ms)',
    'GET /api/metrics → 200 (67ms)', 'PUT /api/config → 200 (23ms)',
    'GET /api/health → 200 (9ms)',  'GET /api/logs → 200 (55ms)',
  ];
  for (let i = 0; i < count; i++) {
    const msg = messages[i % messages.length];
    await evalJS(session, `window.__editorDebug && window.__editorDebug.addObsLog(${JSON.stringify(msg)})`);
    await sleep(60);
  }
  await sleep(400);
}

// ── Main sequence ─────────────────────────────────────────────────────────────

async function main() {
  console.log('🔍 Connecting to CDP...');
  const target = await getTarget();
  console.log(`  → ${target.url}`);

  const session = cdpSession(target.webSocketDebuggerUrl);
  await session.ready;
  console.log('  ✓ Connected\n');

  await session.send('Page.enable');
  await session.send('Runtime.enable');

  // Give the React app a moment to fully render
  await sleep(2000);

  // Set viewport to match the window
  await session.send('Emulation.setDeviceMetricsOverride', {
    width: 1380, height: 860, deviceScaleFactor: 2, mobile: false,
  });
  await sleep(500);

  // ── Default editor code (clean hello world) ──────────────────────────────
  const cleanCode = `addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const { method, url } = request;
  const { pathname } = new URL(url);
  const start = Date.now();

  // Route: /api/health
  if (pathname === "/api/health") {
    return new Response(
      JSON.stringify({ ok: true, uptime: Date.now() }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ path: pathname, method, ts: start }),
    { headers: { "Content-Type": "application/json",
                 "Cache-Control": "s-maxage=60" } }
  );
}`.trim();

  // ── SCREENSHOT 1: editor-deploy.png ─────────────────────────────────────
  console.log('📷 Screenshot 1: editor + deploy panel');
  await closeBottomPanel(session);
  await closeSidePanel(session);
  await setEditorCode(session, cleanCode);
  // Run preview to populate the preview pane
  await clickByText(session, '▶ Run');
  await sleep(1500);
  await screenshot(session, `${OUT_DIR}/editor-deploy.png`);

  // ── SCREENSHOT 2: security-scanner.png ──────────────────────────────────
  console.log('📷 Screenshot 2: security scanner');
  const insecureCode = `// Worker with intentional issues (for demo)
const AWS_ACCESS_KEY = "AKIAIOSFODNN7EXAMPLE1Z";
const API_SECRET = "sk-proj-abc123verylongkeyvalue987654321xyz";
const password = "super-secret-password-hunter2";

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const data = await request.json().catch(() => ({}));
  const result = eval(data.expr || '"hello"');  // dangerous!

  const resp = await fetch("https://api.example.com/data");

  return new Response(JSON.stringify({ result }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    }
  });
}`;
  await setEditorCode(session, insecureCode);
  await sleep(400);
  await openBottomPanel(session, 'Security');
  await sleep(1000);
  await screenshot(session, `${OUT_DIR}/security-scanner.png`);

  // ── SCREENSHOT 3: observability.png ─────────────────────────────────────
  console.log('📷 Screenshot 3: observability');
  await setEditorCode(session, cleanCode);
  await addObsLogs(session, 10);
  await openBottomPanel(session, 'Observability');
  await sleep(800);
  await screenshot(session, `${OUT_DIR}/observability.png`);

  // ── SCREENSHOT 4: iac-export.png ────────────────────────────────────────
  console.log('📷 Screenshot 4: IaC export');
  await openBottomPanel(session, 'IaC Export');
  await sleep(800);
  await screenshot(session, `${OUT_DIR}/iac-export.png`);

  // ── SCREENSHOT 5: ai-assistant.png ──────────────────────────────────────
  console.log('📷 Screenshot 5: AI assistant');
  await closeBottomPanel(session);
  await setEditorCode(session, cleanCode);
  await sleep(300);
  await openSidePanel(session, 'AI');
  await sleep(800);
  // Populate the chat textarea with a question to show usage
  await evalJS(session, `
    (function() {
      const ta = document.querySelector('textarea');
      if (ta) {
        ta.value = 'Optimize this worker for cold starts and add rate limiting';
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()
  `);
  await sleep(400);
  await screenshot(session, `${OUT_DIR}/ai-assistant.png`);

  // ── SCREENSHOT 6: drift-detection.png ───────────────────────────────────
  console.log('📷 Screenshot 6: drift / import panel');
  await openSidePanel(session, 'Import');
  await sleep(600);
  await screenshot(session, `${OUT_DIR}/drift-detection.png`);

  // ── GIF FRAMES ──────────────────────────────────────────────────────────
  console.log('\n🎬 Recording GIF frames...');
  await closeSidePanel(session);
  await closeBottomPanel(session);
  await setEditorCode(session, cleanCode);
  await sleep(600);

  let frame = 0;
  const frame_shot = async (label) => {
    await screenshot(session, `${GIF_DIR}/frame-${String(frame++).padStart(3,'0')}.png`);
    console.log(`    frame ${frame-1}: ${label}`);
  };

  // Frame sequence: editor → run preview → security → observability → IaC → AI → back
  await setEditorCode(session, cleanCode);
  await closeBottomPanel(session);
  await closeSidePanel(session);
  await sleep(500);
  await frame_shot('editor clean state');
  await frame_shot('editor clean state 2');

  // Trigger preview run (postMessage directly)
  await evalJS(session, `
    (function() {
      const iframe = document.getElementById('preview-iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'preview-started' }, '*');
        setTimeout(() => iframe.contentWindow.postMessage({
          type: 'run-code',
          code: ${JSON.stringify(cleanCode)}
        }, '*'), 100);
      }
    })()
  `);
  await sleep(1200);
  await frame_shot('after run preview');
  await frame_shot('preview response visible');

  // Switch to insecure code to demo scanner
  await setEditorCode(session, insecureCode);
  await frame_shot('insecure code added');
  await openBottomPanel(session, 'Security');
  await sleep(500);
  await frame_shot('security panel open');
  await frame_shot('security findings');
  await frame_shot('security findings 2');

  // Load test panel
  await openBottomPanel(session, 'Load Test');
  await sleep(500);
  await frame_shot('load test panel');
  await frame_shot('load test panel 2');

  // Observability with real log data
  await setEditorCode(session, cleanCode);
  await addObsLogs(session, 8);
  await openBottomPanel(session, 'Observability');
  await sleep(600);
  await frame_shot('observability panel');
  await frame_shot('observability metrics');

  // IaC export
  await openBottomPanel(session, 'IaC Export');
  await sleep(500);
  await frame_shot('iac export');
  await frame_shot('iac export buttons');

  // AI panel
  await closeBottomPanel(session);
  await openSidePanel(session, 'AI');
  await sleep(600);
  await frame_shot('ai assistant open');
  await frame_shot('ai assistant 2');

  // Back to clean editor
  await closeSidePanel(session);
  await sleep(400);
  await frame_shot('final editor state');
  await frame_shot('final editor state 2');

  console.log(`\n✅ ${frame} GIF frames captured`);

  session.ws.close();
  console.log('\nAll done. Run create-gif.sh next.');
}

main().catch(e => { console.error(e); process.exit(1); });
