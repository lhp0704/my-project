const Router = require('@koa/router');
const { getConfig, updateConfig } = require('../store/config');

const router = new Router({ prefix: '/api/config' });

router.get('/', async (ctx) => {
  const config = getConfig();
  ctx.body = {
    success: true,
    data: {
      grafana: config.grafana,
      feishu: { webhookUrl: config.feishu.webhookUrl },
      monitor: config.monitor
    }
  };
});

router.put('/', async (ctx) => {
  const updates = ctx.request.body;
  const currentConfig = getConfig();

  const newConfig = { ...currentConfig };

  if (updates.grafana) {
    newConfig.grafana = { ...newConfig.grafana, ...updates.grafana };
  }

  if (updates.feishu) {
    newConfig.feishu = { ...newConfig.feishu, ...updates.feishu };
  }

  if (updates.monitor) {
    newConfig.monitor = { ...newConfig.monitor, ...updates.monitor };
  }

  const saved = updateConfig(newConfig);
  if (saved) {
    ctx.body = { success: true, data: saved };
  } else {
    ctx.status = 500;
    ctx.body = { success: false, error: 'Failed to save config' };
  }
});

module.exports = router;
