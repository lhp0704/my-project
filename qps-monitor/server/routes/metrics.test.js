const test = require('node:test');
const assert = require('node:assert/strict');

function loadMetricsModule() {
  delete require.cache[require.resolve('./metrics')];
  return require('./metrics');
}

test('keeps only history points from the last 30 minutes', () => {
  const originalNow = Date.now;
  const metrics = loadMetricsModule();
  const baseTime = new Date(2026, 0, 1, 10, 0, 0).getTime();

  try {
    Date.now = () => baseTime - (31 * 60 * 1000);
    metrics.updateMetrics({ ApiA: { actualQps: 1 } });

    Date.now = () => baseTime - (30 * 60 * 1000);
    metrics.updateMetrics({ ApiA: { actualQps: 2 } });

    Date.now = () => baseTime;
    metrics.updateMetrics({ ApiA: { actualQps: 3 } });

    const history = metrics.getMetricsState().history;

    assert.equal(history.length, 2);
    assert.deepEqual(history.map(h => h.data.ApiA.actualQps), [3, 2]);
    assert.ok(history.every(h => h.timestamp >= baseTime - (30 * 60 * 1000)));
  } finally {
    Date.now = originalNow;
  }
});
