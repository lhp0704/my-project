const Router = require('@koa/router');
const { getConfig } = require('../store/config');
const { sendAlert } = require('../services/feishu');

const router = new Router({ prefix: '/api/metrics' });

let metricsState = {
  currentTasks: {},
  history: [],
  alertHistory: []
};

const HISTORY_WINDOW_MS = 30 * 60 * 1000;

function updateMetrics(taskData) {
  const now = Date.now();
  const time = new Date(now).toLocaleString('zh-CN', { hour12: false });
  const cutoff = now - HISTORY_WINDOW_MS;

  metricsState.currentTasks = taskData;
  metricsState.history.unshift({ timestamp: now, time, data: { ...taskData } });
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
    data: metricsState.currentTasks
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
  const { taskName } = ctx.request.body || {};
  if (!taskName) {
    ctx.status = 400;
    ctx.body = { success: false, error: 'taskName is required' };
    return;
  }

  const metrics = metricsState.currentTasks[taskName];
  if (!metrics) {
    ctx.status = 404;
    ctx.body = { success: false, error: 'No current metrics for taskName' };
    return;
  }

  const config = getConfig();
  const webhookUrl = config.feishu && config.feishu.webhookUrl;
  if (!webhookUrl) {
    ctx.status = 400;
    ctx.body = { success: false, error: 'Feishu webhook URL not configured' };
    return;
  }

  const taskConfig = (config.monitor.tasks || []).find(t =>
    (typeof t === 'object' && t.name === taskName) ||
    (typeof t === 'string' && t === taskName)
  );
  const thresholds = {
    successCountThreshold: taskConfig && typeof taskConfig === 'object' && taskConfig.successCountThreshold !== undefined
      ? taskConfig.successCountThreshold
      : config.monitor.defaultSuccessCountThreshold ?? 1,
    successRateThreshold: taskConfig && typeof taskConfig === 'object' && taskConfig.successRateThreshold !== undefined
      ? taskConfig.successRateThreshold
      : config.monitor.defaultSuccessRateThreshold ?? 95
  };
  const sent = await sendAlert(webhookUrl, taskName, metrics, thresholds);

  if (!sent) {
    ctx.status = 502;
    ctx.body = { success: false, error: 'Failed to send Feishu alert' };
    return;
  }

  ctx.body = {
    success: true,
    data: { taskName, metrics, thresholds }
  };
});

module.exports = { router, updateMetrics, setAlertHistory, getMetricsState };
