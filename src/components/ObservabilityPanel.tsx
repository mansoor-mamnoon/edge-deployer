import React, { useState, useMemo, useRef, useCallback } from 'react';
import { LogEntry, MetricSnapshot, EnvConfig } from '../types';

interface ObservabilityPanelProps {
  logs: LogEntry[];
  onClear: () => void;
  config?: EnvConfig;
  onAddLog?: (entry: LogEntry) => void;
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function Sparkline({ values, color = '#4af', height = 40 }: { values: number[]; color?: string; height?: number }) {
  if (values.length < 2) return <span style={{ color: '#444', fontSize: '0.75rem' }}>No data</span>;
  const max = Math.max(...values, 1);
  const w = 120;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${height - (v / max) * height}`).join(' ');
  return (
    <svg width={w} height={height} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  );
}

const LEVEL_COLOR: Record<LogEntry['level'], string> = {
  info: '#4af',
  warn: '#fa0',
  error: '#f44',
  success: '#4f4',
};

function makeid() { return Math.random().toString(36).slice(2, 10); }

const ObservabilityPanel: React.FC<ObservabilityPanelProps> = ({ logs, onClear, config, onAddLog }) => {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<LogEntry['level'] | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'logs' | 'metrics'>('logs');
  const [tailActive, setTailActive] = useState(false);
  const [tailId, setTailId] = useState<string | null>(null);
  const [tailError, setTailError] = useState<string | null>(null);
  const tailIdRef = useRef<string | null>(null);

  const startTail = useCallback(async () => {
    if (!config || config.cloudProvider !== 'cloudflare') return;
    setTailError(null);
    try {
      const result = await (window as any).electronAPI?.cfTailStart?.(config);
      if (result?.tailId) {
        tailIdRef.current = result.tailId;
        setTailId(result.tailId);
        setTailActive(true);
        // Listen for incoming tail log messages
        (window as any).electronAPI?.onCfTailLog?.((entry: any) => {
          if (entry.tailId !== tailIdRef.current) return;
          onAddLog?.({
            id: makeid(),
            timestamp: entry.timestamp,
            provider: 'cloudflare',
            level: entry.level === 'error' ? 'error' : 'info',
            message: `[tail] ${entry.message}`,
          });
        });
      }
    } catch (err: any) {
      setTailError(err.message);
    }
  }, [config, onAddLog]);

  const stopTail = useCallback(async () => {
    if (tailIdRef.current && config) {
      await (window as any).electronAPI?.cfTailStop?.(tailIdRef.current, config).catch(() => {});
    }
    tailIdRef.current = null;
    setTailId(null);
    setTailActive(false);
  }, [config]);

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (levelFilter !== 'all' && l.level !== levelFilter) return false;
      if (search && !l.message.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [logs, search, levelFilter]);

  const metrics = useMemo((): MetricSnapshot & { latencyHistory: number[] } => {
    const latencies = logs.filter(l => l.latencyMs != null).map(l => l.latencyMs!);
    const sorted = [...latencies].sort((a, b) => a - b);
    const errors = logs.filter(l => l.level === 'error').length;

    // Group into 10-point buckets for sparkline
    const buckets = 20;
    const bucketSize = Math.max(1, Math.ceil(logs.length / buckets));
    const latencyHistory = Array.from({ length: Math.min(buckets, logs.length) }, (_, i) => {
      const slice = logs.slice(i * bucketSize, (i + 1) * bucketSize).filter(l => l.latencyMs).map(l => l.latencyMs!);
      return slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : 0;
    });

    return {
      timestamp: new Date().toISOString(),
      requestCount: logs.length,
      errorCount: errors,
      avgLatencyMs: latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
      p50: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      p99: percentile(sorted, 99),
      latencyHistory,
    };
  }, [logs]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', color: '#f5f5f5', fontSize: '0.82rem' }}>
      {/* Tab header */}
      <div style={{ display: 'flex', borderBottom: '1px solid #333', background: '#1a1a1a' }}>
        {(['logs', 'metrics'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #4af' : '2px solid transparent',
              color: activeTab === tab ? '#fff' : '#666',
              padding: '8px 16px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: '0.82rem',
              textTransform: 'capitalize',
            }}
          >
            {tab}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {config?.cloudProvider === 'cloudflare' && (
          <button
            className="toolbar-button"
            style={{
              margin: '4px 4px', fontSize: '0.72rem', padding: '2px 8px',
              background: tailActive ? '#3a1a1a' : '#1a3a1a',
              border: `1px solid ${tailActive ? '#6a2a2a' : '#2a5a2a'}`,
              color: tailActive ? '#f66' : '#4f4',
            }}
            onClick={tailActive ? stopTail : startTail}
          >
            {tailActive ? '⏹ Stop Tail' : '▶ Tail Live'}
          </button>
        )}
        <button
          className="toolbar-button"
          style={{ margin: '4px 8px', fontSize: '0.72rem', padding: '2px 8px' }}
          onClick={onClear}
        >
          Clear
        </button>
      </div>
      {tailError && (
        <div style={{ padding: '4px 12px', background: '#2a1a1a', color: '#f66', fontSize: '0.75rem', borderBottom: '1px solid #3a2a2a' }}>
          Tail error: {tailError}
        </div>
      )}
      {tailActive && (
        <div style={{ padding: '4px 12px', background: '#1a2a1a', color: '#4f4', fontSize: '0.72rem', borderBottom: '1px solid #2a3a2a', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#4f4', animation: 'pulse 1s ease-in-out infinite' }} />
          Live tail active — logs will appear as requests hit your Worker
        </div>
      )}

      {activeTab === 'logs' && (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, padding: '8px 12px', borderBottom: '1px solid #2a2a2a' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search logs..."
              style={{ flex: 1, background: '#1e1e1e', border: '1px solid #333', color: '#fff', padding: '4px 8px', borderRadius: 4, fontFamily: 'monospace', fontSize: '0.8rem' }}
            />
            <select
              value={levelFilter}
              onChange={e => setLevelFilter(e.target.value as any)}
              style={{ background: '#1e1e1e', border: '1px solid #333', color: '#fff', padding: '4px 8px', borderRadius: 4, fontSize: '0.8rem' }}
            >
              <option value="all">All levels</option>
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="error">Error</option>
              <option value="success">Success</option>
            </select>
          </div>

          {/* Log list */}
          <div style={{ flex: 1, overflowY: 'auto', fontFamily: 'monospace' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 16, color: '#444', textAlign: 'center' }}>No log entries yet.</div>
            ) : (
              filtered.slice().reverse().map(entry => (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex',
                    gap: 8,
                    padding: '4px 12px',
                    borderBottom: '1px solid #1a1a1a',
                    alignItems: 'flex-start',
                  }}
                >
                  <span style={{ color: '#555', flexShrink: 0, fontSize: '0.75rem', paddingTop: 1 }}>
                    {entry.timestamp.slice(11, 23)}
                  </span>
                  <span style={{ color: LEVEL_COLOR[entry.level], flexShrink: 0, width: 52, fontSize: '0.72rem', paddingTop: 2 }}>
                    {entry.level.toUpperCase()}
                  </span>
                  {entry.latencyMs != null && (
                    <span style={{ color: '#888', flexShrink: 0, fontSize: '0.72rem', paddingTop: 2 }}>
                      {entry.latencyMs}ms
                    </span>
                  )}
                  <span style={{ color: '#ddd', flex: 1, wordBreak: 'break-all', fontSize: '0.8rem' }}>
                    {entry.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {activeTab === 'metrics' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Total', value: metrics.requestCount, unit: 'req' },
              { label: 'Errors', value: metrics.errorCount, unit: '', color: metrics.errorCount ? '#f44' : undefined },
              { label: 'Error rate', value: metrics.requestCount ? ((metrics.errorCount / metrics.requestCount) * 100).toFixed(1) : '0', unit: '%', color: metrics.errorCount ? '#fa0' : undefined },
              { label: 'Avg latency', value: metrics.avgLatencyMs.toFixed(0), unit: 'ms' },
            ].map(stat => (
              <div key={stat.label} style={{ background: '#2a2a2a', borderRadius: 6, padding: '12px 14px' }}>
                <div style={{ fontSize: '0.72rem', color: '#666', marginBottom: 4 }}>{stat.label}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: stat.color ?? '#fff', fontFamily: 'monospace' }}>
                  {stat.value}<span style={{ fontSize: '0.75rem', color: '#666', marginLeft: 3 }}>{stat.unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Latency percentiles */}
          <div style={{ background: '#2a2a2a', borderRadius: 6, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: 12 }}>Latency percentiles</div>
            <div style={{ display: 'flex', gap: 24 }}>
              {[['P50', metrics.p50], ['P95', metrics.p95], ['P99', metrics.p99]].map(([label, val]) => (
                <div key={label as string}>
                  <div style={{ fontSize: '0.72rem', color: '#555' }}>{label as string}</div>
                  <div style={{ fontSize: '1.1rem', fontFamily: 'monospace', color: '#4af' }}>{(val as number).toFixed(0)}ms</div>
                </div>
              ))}
            </div>
          </div>

          {/* Latency trend */}
          <div style={{ background: '#2a2a2a', borderRadius: 6, padding: '14px 16px' }}>
            <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: 10 }}>Latency trend</div>
            <Sparkline values={metrics.latencyHistory} color="#4af" height={50} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ObservabilityPanel;
