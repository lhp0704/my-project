const Router = require('@koa/router');
const { getConfig } = require('../store/config');
const { sendAlert } = require('../services/feishu');

const router = new Router({ prefix: '/api/metrics' });

let metricsState = {
  currentQPS: {},
  history: [],
  alertHistory: []
};

const HISTORY_WINDOW_MS = 30 * 60 * 1000;

function updateMetrics(qpsData, alerts) {
  const now = Date.now();
  const time = new Date(now).toLocaleString('zh-CN', { hour12: false });
  const cutoff = now - HISTORY_WINDOW_MS;

  metricsState.currentQPS = qpsData;
  metricsState.history.unshift({ timestamp: now, time, data: { ...qpsData } });
  metricsState.history = metricsState.history.filter(h => h.timestamp >= cutoff);
}

function setAlertHistory(history) {
  metricsState.alertHistory = history;
}

function getMetricsState() {
  return metricsState;
}

router.get('/current', async (ctx) => {
  ctx.body = {
    success: true,
    data: metricsState.currentQPS
  };
});

router.get('/history', async (ctx) => {
  ctx.body = {
    success: true,
    data: metricsState.history
  };
});

router.get('/alerts', async (ctx) => {
  ctx.body = {
    success: true,
    data: metricsState.alertHistory
  };
});

router.post('/alerts/test', async (ctx) => {
  const { apiName } = ctx.request.body || {};
  if (!apiName) {
    ctx.status = 400;
    ctx.body = { success: false, error: 'apiName is required' };
    return;
  }

  const qpsInfo = metricsState.currentQPS[apiName];
  if (!qpsInfo) {
    ctx.status = 404;
    ctx.body = { success: false, error: 'No current metrics for apiName' };
    return;
  }

  const config = getConfig();
  const webhookUrl = config.feishu && config.feishu.webhookUrl;
  if (!webhookUrl) {
    ctx.status = 400;
    ctx.body = { success: false, error: 'Feishu webhook URL not configured' };
    return;
  }

  const currentQps = typeof qpsInfo === 'object' ? qpsInfo.actualQps : qpsInfo;
  const rawQps = typeof qpsInfo === 'object' ? qpsInfo.rawQps : null;
  const diffQps = typeof qpsInfo === 'object' ? qpsInfo.diffQps : null;
  const apiConfig = (config.monitor.apis || []).find(a =>
    (typeof a === 'object' && a.name === apiName) ||
    (typeof a === 'string' && a === apiName)
  );
  const threshold = apiConfig && typeof apiConfig === 'object' && apiConfig.threshold !== undefined
    ? apiConfig.threshold
    : config.monitor.defaultQpsThreshold || 10;
  const sent = await sendAlert(webhookUrl, apiName, currentQps, diffQps, rawQps, threshold);

  if (!sent) {
    ctx.status = 502;
    ctx.body = { success: false, error: 'Failed to send Feishu alert' };
    return;
  }

  ctx.body = {
    success: true,
    data: { apiName, currentQps, rawQps, diffQps, threshold }
  };
});

module.exports = { router, updateMetrics, setAlertHistory, getMetricsState };
