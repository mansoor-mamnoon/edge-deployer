import React, { useState, useRef } from 'react';
import { LoadTestConfig, LoadTestResult } from '../types';

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
}

interface LoadTestPanelProps {
  deployUrl: string | null;
}

const PRESETS = [
  { label: '10 rps / 10s', rps: 10, durationSec: 10 },
  { label: '50 rps / 10s', rps: 50, durationSec: 10 },
  { label: '100 rps / 30s', rps: 100, durationSec: 30 },
];

const LoadTestPanel: React.FC<LoadTestPanelProps> = ({ deployUrl }) => {
  const [config, setConfig] = useState<LoadTestConfig>({
    url: deployUrl ?? '',
    rps: 10,
    durationSec: 10,
    method: 'GET',
    body: '',
    headers: {},
  });
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<LoadTestResult | null>(null);
  const [liveLatencies, setLiveLatencies] = useState<number[]>([]);
  const abortRef = useRef(false);

  const run = async () => {
    if (!config.url) return alert('Set a deploy URL first.');
    setRunning(true);
    setResult(null);
    setProgress(0);
    setLiveLatencies([]);
    abortRef.current = false;

    const latencies: number[] = [];
    const errors: number[] = [];
    const intervalMs = 1000 / config.rps;
    const endAt = Date.now() + config.durationSec * 1000;
    const totalExpected = config.rps * config.durationSec;
    let sent = 0;

    const fire = async () => {
      const t0 = Date.now();
      try {
        const res = await fetch(config.url, {
          method: config.method,
          body: config.method !== 'GET' && config.body ? config.body : undefined,
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) errors.push(1);
        latencies.push(Date.now() - t0);
      } catch {
        errors.push(1);
        latencies.push(Date.now() - t0);
      }
      sent++;
      setProgress(Math.min(100, (sent / totalExpected) * 100));
      setLiveLatencies(prev => [...prev.slice(-30), Date.now() - t0]);
    };

    const schedule = async () => {
      while (Date.now() < endAt && !abortRef.current) {
        const batch = Math.min(config.rps, 20); // cap concurrency at 20
        const promises = [];
        for (let i = 0; i < batch; i++) {
          promises.push(fire());
          await new Promise(r => setTimeout(r, intervalMs));
        }
        await Promise.allSettled(promises);
      }
    };

    await schedule();

    const sorted = [...latencies].filter(l => l > 0).sort((a, b) => a - b);
    setResult({
      totalRequests: latencies.length,
      successCount: latencies.length - errors.length,
      errorCount: errors.length,
      avgLatencyMs: sorted.length ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0,
      p50: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      p99: percentile(sorted, 99),
      throughputRps: latencies.length / config.durationSec,
      durationMs: config.durationSec * 1000,
    });
    setRunning(false);
    setProgress(100);
  };

  return (
    <div style={{ padding: '12px 14px', color: '#f5f5f5', fontSize: '0.83rem' }}>
      <div style={{ fontWeight: 600, marginBottom: 12 }}>Load Test</div>

      {/* URL */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ color: '#888', fontSize: '0.78rem', display: 'block', marginBottom: 3 }}>Target URL</label>
        <input
          value={config.url}
          onChange={e => setConfig(c => ({ ...c, url: e.target.value }))}
          placeholder="https://my-worker.workers.dev"
          style={{ width: '100%', background: '#1e1e1e', border: '1px solid #333', color: '#fff', padding: '5px 8px', borderRadius: 4, fontFamily: 'monospace', fontSize: '0.8rem', boxSizing: 'border-box' }}
        />
      </div>

      {/* Presets */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ color: '#888', fontSize: '0.78rem', display: 'block', marginBottom: 5 }}>Presets</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {PRESETS.map(p => (
            <button
              key={p.label}
              className="toolbar-button"
              style={{ fontSize: '0.75rem', padding: '3px 10px' }}
              onClick={() => setConfig(c => ({ ...c, rps: p.rps, durationSec: p.durationSec }))}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Config row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Req/sec', field: 'rps', type: 'number', min: 1, max: 1000 },
          { label: 'Duration (s)', field: 'durationSec', type: 'number', min: 1, max: 120 },
        ].map(({ label, field, ...rest }) => (
          <div key={field}>
            <label style={{ color: '#888', fontSize: '0.78rem', display: 'block', marginBottom: 3 }}>{label}</label>
            <input
              {...rest}
              value={(config as any)[field]}
              onChange={e => setConfig(c => ({ ...c, [field]: Number(e.target.value) }))}
              style={{ width: 80, background: '#1e1e1e', border: '1px solid #333', color: '#fff', padding: '5px 8px', borderRadius: 4, fontFamily: 'monospace', fontSize: '0.8rem' }}
            />
          </div>
        ))}
        <div>
          <label style={{ color: '#888', fontSize: '0.78rem', display: 'block', marginBottom: 3 }}>Method</label>
          <select
            value={config.method}
            onChange={e => setConfig(c => ({ ...c, method: e.target.value as 'GET' | 'POST' }))}
            style={{ background: '#1e1e1e', border: '1px solid #333', color: '#fff', padding: '5px 8px', borderRadius: 4, fontSize: '0.8rem' }}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
          </select>
        </div>
      </div>

      {/* Run / Stop */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button
          className="toolbar-button"
          onClick={running ? () => { abortRef.current = true; } : run}
          style={{ background: running ? '#5a1a1a' : undefined }}
        >
          {running ? 'Stop' : 'Run Load Test'}
        </button>
      </div>

      {/* Progress bar */}
      {running && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ background: '#2a2a2a', borderRadius: 4, height: 6, overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: '#4af', transition: 'width 0.2s' }} />
          </div>
          <div style={{ color: '#666', fontSize: '0.75rem', marginTop: 4 }}>
            {progress.toFixed(0)}% — live P50: {liveLatencies.length ? Math.round(liveLatencies.slice(-10).sort((a, b) => a - b)[Math.floor(liveLatencies.slice(-10).length / 2)]) : 0}ms
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div style={{ background: '#1a2a1a', border: '1px solid #2a4a2a', borderRadius: 6, padding: '12px 14px' }}>
          <div style={{ fontWeight: 600, marginBottom: 10, color: '#4f4' }}>Results</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {[
              ['Total requests', result.totalRequests],
              ['Successful', result.successCount],
              ['Errors', result.errorCount],
              ['Throughput', `${result.throughputRps.toFixed(1)} rps`],
              ['Avg latency', `${result.avgLatencyMs.toFixed(0)}ms`],
              ['P50', `${result.p50.toFixed(0)}ms`],
              ['P95', `${result.p95.toFixed(0)}ms`],
              ['P99', `${result.p99.toFixed(0)}ms`],
            ].map(([label, value]) => (
              <div key={label as string}>
                <span style={{ color: '#666', fontSize: '0.75rem' }}>{label}</span>
                <div style={{ fontFamily: 'monospace', color: '#4f4', marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadTestPanel;
