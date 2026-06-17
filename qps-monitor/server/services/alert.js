const { sendAlert } = require('./feishu');

class AlertService {
  constructor(config) {
    this.config = config;
    this.lastAlertTime = {};
    this.abnormalStreaks = {};
    this.alertRequiredStreak = 10;
    this.alertHistory = [];
    this.getNow = () => Date.now();
  }

  updateConfig(config) {
    this.config = config;
  }

  getThresholdForApi(apiName) {
    const apis = this.config.monitor.apis || [];
    const defaultThreshold = this.config.monitor.defaultQpsThreshold || 10;

    if (Array.isArray(apis)) {
      const apiConfig = apis.find(a =>
        (typeof a === 'object' && a.name === apiName) ||
        (typeof a === 'string' && a === apiName)
      );

      if (apiConfig) {
        if (typeof apiConfig === 'object' && apiConfig.threshold !== undefined) {
          return apiConfig.threshold;
        }
      }
    }

    return defaultThreshold;
  }

  isAbnormal(apiName, qpsInfo) {
    if (qpsInfo === null) {
      return {
        abnormal: false,
        qps: null,
        rawQps: null,
        diffQps: null,
        threshold: this.getThresholdForApi(apiName)
      };
    }

    const qps = typeof qpsInfo === 'object' ? qpsInfo.actualQps : qpsInfo;
    const rawQps = typeof qpsInfo === 'object' ? qpsInfo.rawQps : null;
    const diffQps = typeof qpsInfo === 'object' && qpsInfo.diffQps !== undefined
      ? qpsInfo.diffQps
      : rawQps !== null && qps !== null
        ? Math.round((rawQps - qps) * 100) / 100
        : null;
    const threshold = this.getThresholdForApi(apiName);

    const rateGapTooLarge = diffQps !== null && diffQps > 1;
    const actualBelowThreshold = qps !== null && qps < threshold;

    return {
      abnormal: rateGapTooLarge && actualBelowThreshold,
      qps,
      rawQps,
      diffQps,
      threshold
    };
  }

  attachStreakMetadata(qpsInfo, abnormalStreak) {
    if (qpsInfo && typeof qpsInfo === 'object') {
      qpsInfo.abnormalStreak = abnormalStreak;
      qpsInfo.alertRequiredStreak = this.alertRequiredStreak;
    }
  }

  checkAlerts(qpsData) {
    const alerts = [];
    const now = this.getNow();
    const currentHour = new Date(now).getHours();
    if (currentHour >= 0 && currentHour < 9) {
      return alerts;
    }

    const cooldown = this.config.monitor.alertCooldown ?? 300000;
    const webhookUrl = this.config.feishu.webhookUrl;

    for (const [apiName, qpsInfo] of Object.entries(qpsData)) {
      const { abnormal, qps, rawQps, diffQps, threshold } = this.isAbnormal(apiName, qpsInfo);
      this.abnormalStreaks[apiName] = abnormal
        ? (this.abnormalStreaks[apiName] || 0) + 1
        : 0;
      this.attachStreakMetadata(qpsInfo, this.abnormalStreaks[apiName]);

      if (this.abnormalStreaks[apiName] >= this.alertRequiredStreak) {
        const lastAlert = this.lastAlertTime[apiName] || 0;

        if (now - lastAlert >= cooldown) {
          alerts.push({
            apiName,
            currentQps: qps,
            rawQps,
            diffQps,
            threshold,
            timestamp: now
          });

          this.lastAlertTime[apiName] = now;

          if (webhookUrl) {
            sendAlert(webhookUrl, apiName, qps, diffQps, rawQps, threshold);
          }

          this.alertHistory.unshift({
            apiName,
            currentQps: qps,
            rawQps,
            diffQps,
            threshold,
            timestamp: now,
            time: new Date(now).toLocaleString('zh-CN', { hour12: false })
          });

          if (this.alertHistory.length > 100) {
            this.alertHistory = this.alertHistory.slice(0, 100);
          }

          this.abnormalStreaks[apiName] = 0;
        }
      }
    }

    return alerts;
  }

  getAlertHistory() {
    return this.alertHistory;
  }
}

module.exports = AlertService;
