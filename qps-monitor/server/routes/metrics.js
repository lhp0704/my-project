const Router = require('@koa/router');
const { getConfig } = require('../store/config');
const { sendAlert } = require('../services/feishu');

const router = new Router({ prefix: '/api/metrics' });

let metricsState = {
  currentQPS: {},
  history: [],
  alertHistory: []
};

function updateMetrics(qpsData, alerts) {
  const now = Date.now();
  const time = new Date(now).toLocaleString('zh-CN', { hour12: false });

  metricsState.currentQPS = qpsData;
  metricsState.history.unshift({ time, data: { ...qpsData } });

  if (metricsState.history.length > 60) {
    metricsState.history = metricsState.history.slice(0, 60);
  }
}

function setAlertHistory(history) {
  metricsState.alertHistory = history;
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

module.exports = { router, updateMetrics, setAlertHistory };
