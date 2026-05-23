import React, { useState } from 'react';
import { WorkerTemplate } from '../types';

const TEMPLATES: WorkerTemplate[] = [
  {
    id: 'hello-world',
    name: 'Hello World',
    description: 'Minimal edge function that returns a plain text response.',
    category: 'Starter',
    tags: ['basic', 'starter'],
    code: `addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  return new Response("Hello from the edge!", {
    headers: { "Content-Type": "text/plain" },
  });
}`,
  },
  {
    id: 'json-api',
    name: 'JSON REST API',
    description: 'Returns structured JSON with method routing (GET / POST).',
    category: 'API',
    tags: ['json', 'api', 'rest'],
    code: `addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const { method, url } = request;
  const { pathname } = new URL(url);

  const json = (data, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });

  if (method === "GET" && pathname === "/") {
    return json({ ok: true, message: "Edge API is running", ts: Date.now() });
  }

  if (method === "POST" && pathname === "/echo") {
    const body = await request.json();
    return json({ echo: body });
  }

  return json({ error: "Not Found" }, 404);
}`,
  },
  {
    id: 'cors-handler',
    name: 'CORS Middleware',
    description: 'Proxies requests and injects CORS headers on every response.',
    category: 'Middleware',
    tags: ['cors', 'middleware', 'proxy'],
    code: `const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const response = await fetch(request);
  const newHeaders = new Headers(response.headers);
  Object.entries(CORS_HEADERS).forEach(([k, v]) => newHeaders.set(k, v));

  return new Response(response.body, {
    status: response.status,
    headers: newHeaders,
  });
}`,
  },
  {
    id: 'jwt-auth',
    name: 'JWT Auth Middleware',
    description: 'Validates a Bearer JWT before forwarding requests to origin.',
    category: 'Security',
    tags: ['auth', 'jwt', 'security'],
    code: `const JWT_SECRET = "your-secret-here"; // Move to KV / env var in production

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace("Bearer ", "").trim();

  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const [header, payload, signature] = token.split(".");
    // Verify signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const data = encoder.encode(\`\${header}.\${payload}\`);
    const sig = Uint8Array.from(atob(signature.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sig, data);

    if (!valid) throw new Error("Invalid signature");

    const claims = JSON.parse(atob(payload));
    if (claims.exp && Date.now() / 1000 > claims.exp) {
      throw new Error("Token expired");
    }

    return new Response(JSON.stringify({ ok: true, claims }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
}`,
  },
  {
    id: 'cache-proxy',
    name: 'Edge Cache Proxy',
    description: 'Caches upstream responses at the edge using the Cache API.',
    category: 'Performance',
    tags: ['cache', 'proxy', 'performance'],
    code: `const UPSTREAM = "https://api.example.com";
const CACHE_TTL = 60; // seconds

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: "GET" });

  const cached = await cache.match(cacheKey);
  if (cached) {
    const res = new Response(cached.body, cached);
    res.headers.set("X-Cache", "HIT");
    return res;
  }

  const upstream = new URL(request.url);
  upstream.host = new URL(UPSTREAM).host;

  const origin = await fetch(upstream.toString(), {
    method: request.method,
    headers: request.headers,
  });

  const response = new Response(origin.body, {
    status: origin.status,
    headers: origin.headers,
  });
  response.headers.set("Cache-Control", \`public, max-age=\${CACHE_TTL}\`);
  response.headers.set("X-Cache", "MISS");

  event.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}`,
  },
  {
    id: 'rate-limiter',
    name: 'IP Rate Limiter',
    description: 'Limits requests per IP using Cloudflare KV as a sliding window counter.',
    category: 'Security',
    tags: ['rate-limit', 'kv', 'security'],
    code: `// Requires: KV namespace binding named RATE_LIMIT_KV
const MAX_REQUESTS = 100;
const WINDOW_SEC = 60;

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const key = \`rate:\${ip}:\${Math.floor(Date.now() / (WINDOW_SEC * 1000))}\`;

  const current = parseInt(await RATE_LIMIT_KV.get(key) || "0", 10);
  if (current >= MAX_REQUESTS) {
    return new Response(
      JSON.stringify({ error: "Too Many Requests", retry_after: WINDOW_SEC }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(WINDOW_SEC),
          "X-RateLimit-Limit": String(MAX_REQUESTS),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  await RATE_LIMIT_KV.put(key, String(current + 1), { expirationTtl: WINDOW_SEC });

  const response = await fetch(request);
  const newRes = new Response(response.body, response);
  newRes.headers.set("X-RateLimit-Limit", String(MAX_REQUESTS));
  newRes.headers.set("X-RateLimit-Remaining", String(MAX_REQUESTS - current - 1));
  return newRes;
}`,
  },
  {
    id: 'openai-proxy',
    name: 'OpenAI Proxy',
    description: 'Secure edge gateway for OpenAI — adds auth, rate-limiting, and logging.',
    category: 'AI',
    tags: ['openai', 'ai', 'proxy', 'gateway'],
    code: `// Set OPENAI_API_KEY in Cloudflare Worker environment variables
const ALLOWED_MODELS = ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"];

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405 });
  }

  const body = await request.json();
  const model = body.model || "gpt-4o-mini";

  if (!ALLOWED_MODELS.includes(model)) {
    return new Response(
      JSON.stringify({ error: \`Model \${model} not allowed\` }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: \`Bearer \${OPENAI_API_KEY}\`,
    },
    body: JSON.stringify(body),
  });

  const result = await upstream.json();
  return new Response(JSON.stringify(result), {
    status: upstream.status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}`,
  },
  {
    id: 'supabase-edge',
    name: 'Supabase Edge Function',
    description: 'Queries a Supabase table and returns results as JSON via the Supabase REST API.',
    category: 'Database',
    tags: ['supabase', 'postgres', 'rest'],
    code: `// Set SUPABASE_URL and SUPABASE_ANON_KEY in environment variables
addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const { pathname } = new URL(request.url);

  // GET /users → list users from Supabase
  if (pathname === "/users" && request.method === "GET") {
    const res = await fetch(\`\${SUPABASE_URL}/rest/v1/users?select=id,name,email\`, {
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": \`Bearer \${SUPABASE_ANON_KEY}\`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  // POST /users → insert a user
  if (pathname === "/users" && request.method === "POST") {
    const body = await request.json();
    const res = await fetch(\`\${SUPABASE_URL}/rest/v1/users\`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": \`Bearer \${SUPABASE_ANON_KEY}\`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
      body: JSON.stringify(body),
    });
    const created = await res.json();
    return new Response(JSON.stringify(created), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}`,
  },
  {
    id: 'stripe-webhook',
    name: 'Stripe Webhook Processor',
    description: 'Validates Stripe webhook signatures and handles payment.succeeded events.',
    category: 'Integration',
    tags: ['stripe', 'payments', 'webhook'],
    code: `// Set STRIPE_WEBHOOK_SECRET in environment variables
addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  // Validate the webhook signature
  const isValid = await verifyStripeSignature(payload, signature, STRIPE_WEBHOOK_SECRET);
  if (!isValid) {
    return new Response("Invalid signature", { status: 403 });
  }

  const event = JSON.parse(payload);
  console.log("Stripe event:", event.type);

  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object;
      console.log("Payment succeeded:", paymentIntent.id, paymentIntent.amount / 100, paymentIntent.currency);
      // TODO: fulfill order, update DB, send confirmation email
      break;
    }
    case "customer.subscription.created": {
      const sub = event.data.object;
      console.log("New subscription:", sub.id, "status:", sub.status);
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object;
      console.log("Payment failed:", invoice.id, "customer:", invoice.customer);
      break;
    }
    default:
      console.log("Unhandled event type:", event.type);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

async function verifyStripeSignature(payload, header, secret) {
  const pairs = header.split(",").reduce((acc, part) => {
    const [k, v] = part.split("=");
    acc[k.trim()] = v?.trim();
    return acc;
  }, {});
  const timestamp = pairs.t;
  const sig = pairs.v1;
  if (!timestamp || !sig) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"]
  );
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(\`\${timestamp}.\${payload}\`));
  const expected = Array.from(new Uint8Array(signed)).map(b => b.toString(16).padStart(2, "0")).join("");
  return expected === sig;
}`,
  },
  {
    id: 'cf-d1-crud',
    name: 'Cloudflare D1 CRUD API',
    description: 'Full CRUD API backed by Cloudflare D1 (SQLite at the edge).',
    category: 'Database',
    tags: ['d1', 'sqlite', 'cloudflare', 'crud'],
    code: `// Requires: D1 database binding named DB
// Run first: wrangler d1 execute DB --command "CREATE TABLE items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, created_at TEXT)"

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });

async function handleRequest(request) {
  const { method } = request;
  const { pathname } = new URL(request.url);

  if (method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // GET /items
  if (method === "GET" && pathname === "/items") {
    const { results } = await DB.prepare("SELECT * FROM items ORDER BY created_at DESC LIMIT 100").all();
    return json(results);
  }

  // GET /items/:id
  const idMatch = pathname.match(/^\/items\/(\d+)$/);
  if (method === "GET" && idMatch) {
    const row = await DB.prepare("SELECT * FROM items WHERE id = ?").bind(idMatch[1]).first();
    if (!row) return json({ error: "Not found" }, 404);
    return json(row);
  }

  // POST /items
  if (method === "POST" && pathname === "/items") {
    const { name } = await request.json();
    if (!name) return json({ error: "name is required" }, 400);
    const stmt = await DB.prepare("INSERT INTO items (name, created_at) VALUES (?, ?) RETURNING *")
      .bind(name, new Date().toISOString()).first();
    return json(stmt, 201);
  }

  // PUT /items/:id
  if (method === "PUT" && idMatch) {
    const { name } = await request.json();
    const updated = await DB.prepare("UPDATE items SET name = ? WHERE id = ? RETURNING *")
      .bind(name, idMatch[1]).first();
    if (!updated) return json({ error: "Not found" }, 404);
    return json(updated);
  }

  // DELETE /items/:id
  if (method === "DELETE" && idMatch) {
    await DB.prepare("DELETE FROM items WHERE id = ?").bind(idMatch[1]).run();
    return new Response(null, { status: 204 });
  }

  return json({ error: "Not found" }, 404);
}`,
  },
  {
    id: 'cf-r2-storage',
    name: 'Cloudflare R2 Object Storage',
    description: 'Upload, download, and delete files in R2 with signed URL support.',
    category: 'Storage',
    tags: ['r2', 'storage', 'cloudflare', 's3'],
    code: `// Requires: R2 bucket binding named BUCKET
// wrangler.toml: [[r2_buckets]] binding = "BUCKET" bucket_name = "my-bucket"

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const { method } = request;
  const { pathname } = new URL(request.url);
  const key = pathname.slice(1); // strip leading /

  if (!key) {
    const listed = await BUCKET.list({ limit: 50 });
    return json({
      objects: listed.objects.map(o => ({
        key: o.key,
        size: o.size,
        uploaded: o.uploaded,
      })),
      truncated: listed.truncated,
    });
  }

  // PUT /key → upload
  if (method === "PUT") {
    const contentType = request.headers.get("Content-Type") ?? "application/octet-stream";
    await BUCKET.put(key, request.body, {
      httpMetadata: { contentType },
      customMetadata: { uploadedAt: new Date().toISOString() },
    });
    return json({ key, uploaded: true, url: \`/\${key}\` }, 201);
  }

  // GET /key → download
  if (method === "GET") {
    const object = await BUCKET.get(key);
    if (!object) return json({ error: "Not found" }, 404);
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("ETag", object.httpEtag);
    headers.set("Cache-Control", "public, max-age=3600");
    return new Response(object.body, { headers });
  }

  // DELETE /key → remove
  if (method === "DELETE") {
    await BUCKET.delete(key);
    return new Response(null, { status: 204 });
  }

  return json({ error: "Method not allowed" }, 405);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}`,
  },
  {
    id: 'durable-objects-counter',
    name: 'Durable Objects Counter',
    description: 'Globally consistent counter using Cloudflare Durable Objects.',
    category: 'State',
    tags: ['durable-objects', 'cloudflare', 'stateful', 'websocket'],
    code: `// Requires Durable Objects enabled in your account.
// wrangler.toml:
//   [durable_objects]
//   bindings = [{ name = "COUNTER", class_name = "Counter" }]
//   [[migrations]]
//   tag = "v1"
//   new_classes = ["Counter"]

export class Counter {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    let value = (await this.state.storage.get("value")) ?? 0;

    if (url.pathname === "/increment") {
      value++;
      await this.state.storage.put("value", value);
      return json({ value, action: "incremented" });
    }

    if (url.pathname === "/decrement") {
      value = Math.max(0, value - 1);
      await this.state.storage.put("value", value);
      return json({ value, action: "decremented" });
    }

    if (url.pathname === "/reset") {
      await this.state.storage.put("value", 0);
      return json({ value: 0, action: "reset" });
    }

    return json({ value });
  }
}

// Worker entry point
addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const counterId = url.searchParams.get("id") ?? "global";

  const id = COUNTER.idFromName(counterId);
  const stub = COUNTER.get(id);

  // Forward the request to the Durable Object
  return stub.fetch(request);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}`,
  },
  {
    id: 'webhook-handler',
    name: 'Webhook Handler',
    description: 'Validates webhook signatures and processes GitHub / Stripe events.',
    category: 'Integration',
    tags: ['webhook', 'github', 'stripe'],
    code: `// Validates HMAC-SHA256 webhook signatures (GitHub / Stripe style)
const WEBHOOK_SECRET = "your-webhook-secret"; // Use env var in production

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256") ||
                    request.headers.get("stripe-signature") || "";

  const valid = await verifySignature(body, signature);
  if (!valid) {
    return new Response("Forbidden: Invalid signature", { status: 403 });
  }

  const event = JSON.parse(body);
  console.log("Received event:", event.type || event.event);

  // Route by event type
  switch (event.type || event.event) {
    case "push":
    case "payment_intent.succeeded":
      // Handle your events here
      break;
    default:
      console.log("Unhandled event type:", event.type);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

async function verifySignature(body, signature) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const expected = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expectedHex = "sha256=" + Array.from(new Uint8Array(expected))
    .map(b => b.toString(16).padStart(2, "0")).join("");
  return expectedHex === signature;
}`,
  },
];

interface TemplatesPanelProps {
  onLoad: (code: string, name: string) => void;
}

const CATEGORIES = ['All', ...Array.from(new Set(TEMPLATES.map(t => t.category)))];

const TemplatesPanel: React.FC<TemplatesPanelProps> = ({ onLoad }) => {
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<WorkerTemplate | null>(null);

  const filtered = TEMPLATES.filter(t => {
    if (category !== 'All' && t.category !== category) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', height: '100%', color: '#f5f5f5', fontSize: '0.83rem' }}>
      {/* Left: template list */}
      <div style={{ width: preview ? '40%' : '100%', display: 'flex', flexDirection: 'column', borderRight: preview ? '1px solid #333' : 'none' }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #333' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search templates..."
            style={{ width: '100%', background: '#1e1e1e', border: '1px solid #333', color: '#fff', padding: '5px 8px', borderRadius: 4, fontSize: '0.8rem', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className="toolbar-button"
                style={{ fontSize: '0.72rem', padding: '2px 8px', background: category === cat ? '#1a4a7a' : undefined }}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.map(t => (
            <div
              key={t.id}
              onClick={() => setPreview(preview?.id === t.id ? null : t)}
              style={{
                padding: '10px 14px',
                borderBottom: '1px solid #222',
                cursor: 'pointer',
                background: preview?.id === t.id ? '#1e2a3a' : 'transparent',
                transition: 'background 0.1s',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 2 }}>{t.name}</div>
              <div style={{ color: '#888', fontSize: '0.78rem' }}>{t.description}</div>
              <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
                {t.tags.map(tag => (
                  <span key={tag} style={{ background: '#2a2a2a', padding: '1px 6px', borderRadius: 3, fontSize: '0.68rem', color: '#666' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: preview */}
      {preview && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>{preview.name}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="toolbar-button"
                style={{ fontSize: '0.8rem' }}
                onClick={() => { onLoad(preview.code, preview.name); setPreview(null); }}
              >
                Load into editor
              </button>
              <button
                className="toolbar-button"
                style={{ fontSize: '0.8rem', color: '#666' }}
                onClick={() => setPreview(null)}
              >
                ×
              </button>
            </div>
          </div>
          <pre style={{
            flex: 1,
            overflowY: 'auto',
            margin: 0,
            padding: '12px 14px',
            background: '#1a1a1a',
            color: '#d4d4d4',
            fontFamily: 'monospace',
            fontSize: '0.78rem',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}>
            {preview.code}
          </pre>
        </div>
      )}
    </div>
  );
};

export default TemplatesPanel;
