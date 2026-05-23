import { SecurityIssue, IssueSeverity } from '../types';

export interface ScanRule {
  id: string;
  pattern: RegExp;
  severity: IssueSeverity;
  rule: string;
  message: string;
}

export const SCAN_RULES: ScanRule[] = [
  {
    id: 'hardcoded-aws-key',
    pattern: /AKIA[0-9A-Z]{16}/g,
    severity: 'critical',
    rule: 'Hardcoded AWS Access Key',
    message: 'An AWS Access Key ID was found in source. Move it to environment variables.',
  },
  {
    id: 'hardcoded-bearer',
    pattern: /Bearer\s+[A-Za-z0-9\-._~+\/]{20,}=*/g,
    severity: 'critical',
    rule: 'Hardcoded Bearer Token',
    message: 'A Bearer token is hardcoded. Use KV or environment variables instead.',
  },
  {
    id: 'hardcoded-private-key',
    pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g,
    severity: 'critical',
    rule: 'Private Key in Source',
    message: 'A private key is embedded in source. This must never be deployed.',
  },
  {
    id: 'github-token',
    pattern: /gh[ps]_[a-zA-Z0-9]{36}/g,
    severity: 'critical',
    rule: 'GitHub Personal Access Token',
    message: 'A GitHub PAT was found. Revoke it immediately and use secrets management.',
  },
  {
    id: 'hardcoded-password',
    pattern: /password\s*[=:]\s*["'][^"']{6,}["']/gi,
    severity: 'high',
    rule: 'Hardcoded Password',
    message: 'A password appears to be hardcoded. Use environment variables.',
  },
  {
    id: 'hardcoded-secret',
    pattern: /(?:secret|api[_-]?key|token)\s*[=:]\s*["'][^"']{8,}["']/gi,
    severity: 'high',
    rule: 'Hardcoded Secret / API Key',
    message: 'A secret or API key appears hardcoded. Store it in the secrets vault.',
  },
  {
    id: 'insecure-eval',
    pattern: /\beval\s*\(/g,
    severity: 'high',
    rule: 'Use of eval()',
    message: 'eval() is a security risk. It can execute arbitrary code if input is user-controlled.',
  },
  {
    id: 'cors-wildcard',
    pattern: /Access-Control-Allow-Origin[^*\n]{0,30}\*/g,
    severity: 'medium',
    rule: 'Wildcard CORS',
    message: 'Access-Control-Allow-Origin: * allows any origin. Restrict this in production.',
  },
  {
    id: 'no-timeout',
    pattern: /await fetch\(\s*[^,)]+\s*\)(?!\s*\.)/g,
    severity: 'low',
    rule: 'Missing fetch() timeout',
    message: 'fetch() calls without AbortSignal.timeout() can hang indefinitely at the edge.',
  },
  {
    id: 'console-log',
    pattern: /\bconsole\.log\b/g,
    severity: 'low',
    rule: 'console.log in production code',
    message: 'console.log statements can leak sensitive data in production logs.',
  },
];

export function scanCode(code: string): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  const lines = code.split('\n');

  for (const rule of SCAN_RULES) {
    rule.pattern.lastIndex = 0;
    const match = rule.pattern.exec(code);
    if (!match) { rule.pattern.lastIndex = 0; continue; }

    const before = code.slice(0, match.index);
    const line = before.split('\n').length;
    const lineContent = lines[line - 1] ?? '';

    issues.push({
      id: `${rule.id}-${match.index}`,
      severity: rule.severity,
      rule: rule.rule,
      message: rule.message,
      line,
      snippet: lineContent.trim().slice(0, 80),
    });

    rule.pattern.lastIndex = 0;
  }

  const SEVERITY_ORDER: IssueSeverity[] = ['critical', 'high', 'medium', 'low'];
  return issues.sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));
}

export function hasCriticalIssues(code: string): boolean {
  return scanCode(code).some(i => i.severity === 'critical');
}
