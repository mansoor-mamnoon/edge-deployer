import React, { useMemo, useState } from 'react';
import { SecurityIssue, IssueSeverity } from '../types';

interface Rule {
  id: string;
  pattern: RegExp;
  severity: IssueSeverity;
  rule: string;
  message: string;
}

const RULES: Rule[] = [
  {
    id: 'hardcoded-aws-key',
    pattern: /AKIA[0-9A-Z]{16}/g,
    severity: 'critical',
    rule: 'Hardcoded AWS Access Key',
    message: 'An AWS Access Key ID was found in the source code. Move it to environment variables.',
  },
  {
    id: 'hardcoded-bearer',
    pattern: /Bearer\s+[A-Za-z0-9\-._~+\/]+=*/g,
    severity: 'critical',
    rule: 'Hardcoded Bearer Token',
    message: 'A Bearer token is hardcoded. Use KV or environment variables instead.',
  },
  {
    id: 'hardcoded-private-key',
    pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g,
    severity: 'critical',
    rule: 'Private Key in Source',
    message: 'A private key is embedded in the source. This must never be deployed.',
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
    message: 'A secret or API key appears hardcoded. Store it in environment variables or the secrets vault.',
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
    pattern: /Access-Control-Allow-Origin['":\s]+\*/g,
    severity: 'medium',
    rule: 'Wildcard CORS',
    message: 'Access-Control-Allow-Origin: * allows any origin. Restrict this in production.',
  },
  {
    id: 'no-timeout',
    pattern: /await fetch\([^)]+\)(?!\s*,)/g,
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

const SEVERITY_COLOR: Record<IssueSeverity, string> = {
  critical: '#f44',
  high: '#fa0',
  medium: '#ff0',
  low: '#88c',
};

const SEVERITY_ORDER: IssueSeverity[] = ['critical', 'high', 'medium', 'low'];

interface SecurityScannerProps {
  code: string;
}

const SecurityScanner: React.FC<SecurityScannerProps> = ({ code }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const issues = useMemo((): SecurityIssue[] => {
    const found: SecurityIssue[] = [];
    const lines = code.split('\n');

    for (const rule of RULES) {
      rule.pattern.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = rule.pattern.exec(code)) !== null) {
        const before = code.slice(0, match.index);
        const line = before.split('\n').length;
        const lineContent = lines[line - 1] ?? '';

        found.push({
          id: `${rule.id}-${match.index}`,
          severity: rule.severity,
          rule: rule.rule,
          message: rule.message,
          line,
          snippet: lineContent.trim().slice(0, 80),
        });

        // Only report first match per rule to avoid spam
        break;
      }

      rule.pattern.lastIndex = 0;
    }

    return found.sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));
  }, [code]);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const summary = SEVERITY_ORDER.map(sev => ({
    sev,
    count: issues.filter(i => i.severity === sev).length,
  })).filter(s => s.count > 0);

  return (
    <div style={{ padding: '12px 14px', color: '#f5f5f5', fontSize: '0.83rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{ fontWeight: 600 }}>Security Scanner</span>
        <span style={{ fontSize: '0.75rem', color: '#666' }}>runs on every keystroke</span>
        {summary.map(({ sev, count }) => (
          <span
            key={sev}
            style={{ fontSize: '0.75rem', color: SEVERITY_COLOR[sev], background: '#1e1e1e', padding: '2px 8px', borderRadius: 10 }}
          >
            {count} {sev}
          </span>
        ))}
      </div>

      {issues.length === 0 ? (
        <div style={{ color: '#4f4', padding: '12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>No security issues found.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {issues.map(issue => (
            <div
              key={issue.id}
              style={{
                background: '#1a1a1a',
                border: `1px solid ${SEVERITY_COLOR[issue.severity]}44`,
                borderLeft: `3px solid ${SEVERITY_COLOR[issue.severity]}`,
                borderRadius: 4,
                padding: '8px 10px',
                cursor: 'pointer',
              }}
              onClick={() => toggle(issue.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: SEVERITY_COLOR[issue.severity], fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, minWidth: 52 }}>
                  {issue.severity}
                </span>
                <span style={{ flex: 1, fontWeight: 500 }}>{issue.rule}</span>
                {issue.line && (
                  <span style={{ color: '#555', fontSize: '0.75rem' }}>line {issue.line}</span>
                )}
                <span style={{ color: '#555', fontSize: '0.8rem' }}>{expanded.has(issue.id) ? '▲' : '▼'}</span>
              </div>
              {expanded.has(issue.id) && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ color: '#ccc', marginBottom: 6 }}>{issue.message}</div>
                  {issue.snippet && (
                    <pre style={{
                      margin: 0,
                      padding: '5px 8px',
                      background: '#111',
                      borderRadius: 3,
                      fontSize: '0.75rem',
                      color: '#fa0',
                      overflowX: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}>
                      {issue.snippet}
                    </pre>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SecurityScanner;
