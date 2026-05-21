const Koa = require('koa');
const serve = require('koa-static');
const bodyParser = require('koa-bodyparser');
const path = require('path');

const { loadConfig } = require('./store/config');
const configRouter = require('./routes/config');
const { router: metricsRouter, updateMetrics, setAlertHistory } = require('./routes/metrics');
const GrafanaService = require('./services/grafana');
const AlertService = require('./services/alert');

const app = new Koa();
let config = loadConfig();

let grafanaService = new GrafanaService(config);
let alertService = new AlertService(config);

app.use(bodyParser());
app.use(serve(path.join(__dirname, '../public')));

app.use(configRouter.routes()).use(configRouter.allowedMethods());
app.use(metricsRouter.routes()).use(metricsRouter.allowedMethods());

let checkInterval = null;

async function checkMetrics() {
  config = loadConfig();
  grafanaService = new GrafanaService(config);
  alertService.updateConfig(config);

  const apis = config.monitor.apis || [];
  const qpsData = await grafanaService.fetchAllQPS(apis);

  updateMetrics(qpsData);

  const alerts = alertService.checkAlerts(qpsData);
  setAlertHistory(alertService.getAlertHistory());

  console.log('Metrics checked at', new Date().toLocaleString('zh-CN', { hour12: false }));
}

function startMonitor() {
  config = loadConfig();
  const interval = config.monitor.checkInterval || 60000;

  if (checkInterval) {
    clearInterval(checkInterval);
  }

  checkMetrics();
  checkInterval = setInterval(checkMetrics, interval);

  console.log('Monitor started, checking every', interval, 'ms');
}

const PORT = config.server.port || 3003;
app.listen(PORT, () => {
  console.log('\n🚀 小红书接口监控系统已启动!');
  console.log(`📍 访问地址: http://localhost:${PORT}`);
  console.log('\n📊 当前配置:');
  console.log('   - 模拟数据:', config.grafana.useSimulate ? '开启' : '关闭');
  console.log('   - 监控 API:', (config.monitor.apis || []).length, '个');
  console.log('   - 检查间隔:', config.monitor.checkInterval, 'ms');
  console.log('   - 默认报警阈值: QPS <', config.monitor.defaultQpsThreshold || 10);
  console.log('\n');
  startMonitor();
});

app.context.restartMonitor = startMonitor;
