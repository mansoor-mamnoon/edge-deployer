export function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

export function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function computeStats(latencies: number[], errors: number[], durationSec: number) {
  const valid = latencies.filter(l => l >= 0);
  const sorted = [...valid].sort((a, b) => a - b);
  return {
    totalRequests: latencies.length,
    successCount: latencies.length - errors.length,
    errorCount: errors.length,
    avgLatencyMs: average(valid),
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    throughputRps: latencies.length / durationSec,
    durationMs: durationSec * 1000,
  };
}

export function groupErrorsByMessage(messages: string[]): Array<{ message: string; count: number }> {
  const map = new Map<string, number>();
  for (const msg of messages) {
    const key = msg.slice(0, 80);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([message, count]) => ({ message, count }))
    .sort((a, b) => b.count - a.count);
}

export function detectColdStarts(latencies: number[]): number[] {
  if (latencies.length < 3) return [];
  const med = percentile(latencies, 50);
  return latencies.map((l, i) => (l > med * 2.5 && l > 200 ? i : -1)).filter(i => i >= 0);
}
