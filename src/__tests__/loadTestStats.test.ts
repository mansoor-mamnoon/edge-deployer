import { percentile, average, computeStats, groupErrorsByMessage, detectColdStarts } from '../lib/loadTestStats';

describe('Load test statistics', () => {
  describe('percentile()', () => {
    it('returns 0 for empty array', () => {
      expect(percentile([], 50)).toBe(0);
    });

    it('returns the only value for a single-element array', () => {
      expect(percentile([42], 50)).toBe(42);
      expect(percentile([42], 99)).toBe(42);
    });

    it('computes P50 for even-length sorted array', () => {
      const data = [10, 20, 30, 40];
      expect(percentile(data, 50)).toBe(20);
    });

    it('computes P95 correctly', () => {
      const data = Array.from({ length: 100 }, (_, i) => i + 1); // 1..100
      expect(percentile(data, 95)).toBe(95);
    });

    it('computes P99 correctly', () => {
      const data = Array.from({ length: 100 }, (_, i) => i + 1);
      expect(percentile(data, 99)).toBe(99);
    });

    it('handles unsorted input', () => {
      const data = [100, 10, 50, 90, 30];
      expect(percentile(data, 50)).toBe(50);
    });
  });

  describe('average()', () => {
    it('returns 0 for empty array', () => {
      expect(average([])).toBe(0);
    });

    it('computes mean', () => {
      expect(average([10, 20, 30])).toBe(20);
    });

    it('handles single value', () => {
      expect(average([7])).toBe(7);
    });
  });

  describe('computeStats()', () => {
    const latencies = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const errors = [1, 1]; // 2 errors

    it('computes totalRequests correctly', () => {
      const stats = computeStats(latencies, errors, 10);
      expect(stats.totalRequests).toBe(10);
    });

    it('computes errorCount correctly', () => {
      const stats = computeStats(latencies, errors, 10);
      expect(stats.errorCount).toBe(2);
    });

    it('computes successCount correctly', () => {
      const stats = computeStats(latencies, errors, 10);
      expect(stats.successCount).toBe(8);
    });

    it('computes throughputRps correctly', () => {
      const stats = computeStats(latencies, errors, 10);
      expect(stats.throughputRps).toBe(1); // 10 requests / 10s
    });

    it('computes durationMs correctly', () => {
      const stats = computeStats(latencies, errors, 10);
      expect(stats.durationMs).toBe(10_000);
    });

    it('has p50 <= p95 <= p99', () => {
      const stats = computeStats(latencies, errors, 10);
      expect(stats.p50).toBeLessThanOrEqual(stats.p95);
      expect(stats.p95).toBeLessThanOrEqual(stats.p99);
    });
  });

  describe('groupErrorsByMessage()', () => {
    it('groups identical messages', () => {
      const msgs = ['timeout', 'timeout', 'network error', 'timeout'];
      const groups = groupErrorsByMessage(msgs);
      const timeoutGroup = groups.find(g => g.message === 'timeout');
      expect(timeoutGroup?.count).toBe(3);
    });

    it('sorts by count descending', () => {
      const msgs = ['a', 'b', 'b', 'b', 'a'];
      const groups = groupErrorsByMessage(msgs);
      expect(groups[0].message).toBe('b');
      expect(groups[0].count).toBe(3);
    });

    it('returns empty for empty input', () => {
      expect(groupErrorsByMessage([])).toHaveLength(0);
    });

    it('truncates message key at 80 chars', () => {
      const longMsg = 'x'.repeat(100);
      const groups = groupErrorsByMessage([longMsg, longMsg]);
      expect(groups[0].message.length).toBe(80);
      expect(groups[0].count).toBe(2);
    });
  });

  describe('detectColdStarts()', () => {
    it('returns empty array for < 3 data points', () => {
      expect(detectColdStarts([10, 20])).toHaveLength(0);
    });

    it('detects a spike that is 3x the median', () => {
      const latencies = [20, 20, 20, 20, 20, 20, 20, 500]; // 500ms is a cold start
      const coldStarts = detectColdStarts(latencies);
      expect(coldStarts).toContain(7); // index 7
    });

    it('does not flag spikes below 200ms even if above threshold ratio', () => {
      const latencies = [10, 10, 10, 10, 10, 10, 10, 50]; // 50 > 2.5x median(10) but < 200ms
      const coldStarts = detectColdStarts(latencies);
      expect(coldStarts).toHaveLength(0);
    });
  });
});
