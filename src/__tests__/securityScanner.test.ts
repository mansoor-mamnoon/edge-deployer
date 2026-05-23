import { scanCode, hasCriticalIssues } from '../lib/securityScanner';

describe('Security Scanner', () => {
  // ── Critical rules ────────────────────────────────────────────────────
  describe('Hardcoded AWS Access Key', () => {
    it('detects a real AWS key pattern', () => {
      const code = `const key = "AKIAIOSFODNN7EXAMPLE";`;
      const issues = scanCode(code);
      expect(issues.some(i => i.id.startsWith('hardcoded-aws-key'))).toBe(true);
      expect(issues.find(i => i.id.startsWith('hardcoded-aws-key'))?.severity).toBe('critical');
    });

    it('does not flag non-key strings', () => {
      const code = `const msg = "HELLO_WORLD_EXAMPLE";`;
      const issues = scanCode(code);
      expect(issues.some(i => i.id.startsWith('hardcoded-aws-key'))).toBe(false);
    });
  });

  describe('Hardcoded Bearer Token', () => {
    it('flags a long Bearer token in headers', () => {
      const code = `headers: { Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig" }`;
      const issues = scanCode(code);
      expect(issues.some(i => i.id.startsWith('hardcoded-bearer'))).toBe(true);
    });

    it('does not flag short Bearer strings', () => {
      const code = `const msg = "Bearer xyz"`;
      expect(scanCode(code).some(i => i.id.startsWith('hardcoded-bearer'))).toBe(false);
    });
  });

  describe('Private Key in Source', () => {
    it('detects BEGIN RSA PRIVATE KEY', () => {
      const code = `const key = "-----BEGIN RSA PRIVATE KEY-----\\nMIIE..."`;
      const issues = scanCode(code);
      expect(issues.some(i => i.id.startsWith('hardcoded-private-key'))).toBe(true);
      expect(issues[0].severity).toBe('critical');
    });

    it('detects BEGIN PRIVATE KEY (PKCS8)', () => {
      const code = `-----BEGIN PRIVATE KEY-----`;
      expect(scanCode(code).some(i => i.id.startsWith('hardcoded-private-key'))).toBe(true);
    });
  });

  describe('GitHub PAT', () => {
    it('detects ghp_ token', () => {
      const code = `const token = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";`;
      expect(scanCode(code).some(i => i.id.startsWith('github-token'))).toBe(true);
    });

    it('detects ghs_ token', () => {
      const code = `const token = "ghs_1234567890abcdefghijklmnopqrstuvwxyz";`;
      expect(scanCode(code).some(i => i.id.startsWith('github-token'))).toBe(true);
    });
  });

  // ── High rules ────────────────────────────────────────────────────────
  describe('Hardcoded Password', () => {
    it('flags password = "..."', () => {
      const code = `const password = "supersecret123";`;
      expect(scanCode(code).some(i => i.id.startsWith('hardcoded-password'))).toBe(true);
    });

    it('flags password: "..." (colon variant)', () => {
      const code = `{ password: "opensesame" }`;
      expect(scanCode(code).some(i => i.id.startsWith('hardcoded-password'))).toBe(true);
    });

    it('does not flag short passwords below threshold', () => {
      const code = `const password = "abc";`;
      expect(scanCode(code).some(i => i.id.startsWith('hardcoded-password'))).toBe(false);
    });
  });

  describe('Unsafe eval()', () => {
    it('flags bare eval()', () => {
      const code = `const result = eval(userInput);`;
      expect(scanCode(code).some(i => i.id.startsWith('insecure-eval'))).toBe(true);
      expect(scanCode(code).find(i => i.id.startsWith('insecure-eval'))?.severity).toBe('high');
    });
  });

  // ── Medium rules ──────────────────────────────────────────────────────
  describe('Wildcard CORS', () => {
    it('flags Access-Control-Allow-Origin: *', () => {
      const code = `headers["Access-Control-Allow-Origin"] = "*";`;
      expect(scanCode(code).some(i => i.id.startsWith('cors-wildcard'))).toBe(true);
    });
  });

  // ── Low rules ─────────────────────────────────────────────────────────
  describe('console.log', () => {
    it('flags console.log usage', () => {
      const code = `console.log("debug value:", x);`;
      expect(scanCode(code).some(i => i.id.startsWith('console-log'))).toBe(true);
    });

    it('does not flag console.error', () => {
      const code = `console.error("something went wrong");`;
      expect(scanCode(code).some(i => i.id.startsWith('console-log'))).toBe(false);
    });
  });

  // ── Ordering ──────────────────────────────────────────────────────────
  describe('Issue ordering', () => {
    it('orders critical before high before medium before low', () => {
      const code = `
        const key = "AKIAIOSFODNN7EXAMPLE";
        eval(x);
        console.log("hi");
      `;
      const issues = scanCode(code);
      const severities = issues.map(i => i.severity);
      const order = ['critical', 'high', 'medium', 'low'];
      for (let i = 1; i < severities.length; i++) {
        expect(order.indexOf(severities[i])).toBeGreaterThanOrEqual(order.indexOf(severities[i - 1]));
      }
    });
  });

  // ── hasCriticalIssues ─────────────────────────────────────────────────
  describe('hasCriticalIssues()', () => {
    it('returns true when a critical issue exists', () => {
      expect(hasCriticalIssues(`const k = "AKIAIOSFODNN7EXAMPLE";`)).toBe(true);
    });

    it('returns false for clean code', () => {
      expect(hasCriticalIssues(`addEventListener("fetch", e => e.respondWith(new Response("ok")));`)).toBe(false);
    });
  });

  // ── Clean code ────────────────────────────────────────────────────────
  describe('Clean code', () => {
    it('returns no issues for a simple safe Worker', () => {
      const code = `
        addEventListener("fetch", event => {
          event.respondWith(handleRequest(event.request));
        });
        async function handleRequest(request) {
          return new Response("Hello!", { headers: { "Content-Type": "text/plain" } });
        }
      `;
      expect(scanCode(code)).toHaveLength(0);
    });
  });
});
