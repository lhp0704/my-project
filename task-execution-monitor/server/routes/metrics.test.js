const test = require('node:test');
const assert = require('node:assert/strict');

function loadMetricsModule() {
  delete require.cache[require.resolve('./metrics')];
  return require('./metrics');
}

async function callRoute(router, method, path, body) {
  const ctx = {
    method,
    path,
    request: { body },
    status: 200,
    body: undefined,
    matched: []
  };

  await router.routes()(ctx, async () => {});
  return ctx;
}

test('keeps only history points from the last 30 minutes', () => {
  const originalNow = Date.now;
  const metrics = loadMetricsModule();
  const baseTime = new Date(2026, 0, 1, 10, 0, 0).getTime();

  try {
    Date.now = () => baseTime - (31 * 60 * 1000);
    metrics.updateMetrics({
      TaskA: { totalCount: 1, successCount: 1, failureCount: 0, successRate: 100 }
    });

    Date.now = () => baseTime - (30 * 60 * 1000);
    metrics.updateMetrics({
      TaskA: { totalCount: 2, successCount: 2, failureCount: 0, successRate: 100 }
    });

    Date.now = () => baseTime;
    metrics.updateMetrics({
      TaskA: { totalCount: 3, successCount: 3, failureCount: 0, successRate: 100 }
    });

    const history = metrics.getMetricsState().history;

    assert.equal(history.length, 2);
    assert.deepEqual(history.map(h => h.data.TaskA.totalCount), [3, 2]);
    assert.ok(history.every(h => h.timestamp >= baseTime - (30 * 60 * 1000)));
  } finally {
    Date.now = originalNow;
  }
});

test('returns current task metrics from current endpoint', async () => {
  const metrics = loadMetricsModule();
  const taskMetrics = {
    totalCount: 10,
    successCount: 9,
    failureCount: 1,
    successRate: 90
  };

  metrics.updateMetrics({ TaskA: taskMetrics });

  const ctx = await callRoute(metrics.router, 'GET', '/api/metrics/current');

  assert.equal(ctx.status, 200);
  assert.deepEqual(ctx.body, {
    success: true,
    data: { TaskA: taskMetrics }
  });
});

test('returns metrics history from history endpoint', async () => {
  const metrics = loadMetricsModule();
  const taskMetrics = {
    totalCount: 10,
    successCount: 10,
    failureCount: 0,
    successRate: 100
  };

  metrics.updateMetrics({ TaskA: taskMetrics });

  const ctx = await callRoute(metrics.router, 'GET', '/api/metrics/history');

  assert.equal(ctx.status, 200);
  assert.equal(ctx.body.success, true);
  assert.equal(ctx.body.data.length, 1);
  assert.deepEqual(ctx.body.data[0].data, { TaskA: taskMetrics });
});

test('returns alert history from alerts endpoint', async () => {
  const metrics = loadMetricsModule();
  const alertHistory = [{
    taskName: 'TaskA',
    failureCount: 2,
    successRate: 80,
    time: '2026/1/1 09:00:00'
  }];

  metrics.setAlertHistory(alertHistory);

  const ctx = await callRoute(metrics.router, 'GET', '/api/metrics/alerts');

  assert.equal(ctx.status, 200);
  assert.deepEqual(ctx.body, {
    success: true,
    data: alertHistory
  });
});
