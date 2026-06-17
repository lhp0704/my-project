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

  getThresholdsForTask(taskName) {
    const tasks = this.config.monitor.tasks || [];
    const defaults = {
      successCountThreshold: this.config.monitor.defaultSuccessCountThreshold ?? 1,
      successRateThreshold: this.config.monitor.defaultSuccessRateThreshold ?? 95
    };

    if (Array.isArray(tasks)) {
      const taskConfig = tasks.find(t =>
        (typeof t === 'object' && t.name === taskName) ||
        (typeof t === 'string' && t === taskName)
      );

      if (taskConfig && typeof taskConfig === 'object') {
        return {
          successCountThreshold: taskConfig.successCountThreshold ?? defaults.successCountThreshold,
          successRateThreshold: taskConfig.successRateThreshold ?? defaults.successRateThreshold
        };
      }
    }

    return defaults;
  }

  isAbnormal(taskName, metrics) {
    const thresholds = this.getThresholdsForTask(taskName);
    if (metrics === null) {
      return { abnormal: false, metrics: null, thresholds };
    }

    const successCountTooLow = metrics.successCount < thresholds.successCountThreshold;
    const successRateTooLow = metrics.successRate < thresholds.successRateThreshold;

    return {
      abnormal: successCountTooLow || successRateTooLow,
      metrics,
      thresholds
    };
  }

  attachStreakMetadata(metrics, abnormalStreak) {
    if (metrics && typeof metrics === 'object') {
      metrics.abnormalStreak = abnormalStreak;
      metrics.alertRequiredStreak = this.alertRequiredStreak;
    }
  }

  checkAlerts(taskData) {
    const alerts = [];
    const now = this.getNow();
    const currentHour = new Date(now).getHours();
    if (currentHour >= 0 && currentHour < 9) {
      return alerts;
    }

    const cooldown = this.config.monitor.alertCooldown ?? 300000;
    const webhookUrl = this.config.feishu.webhookUrl;

    for (const [taskName, metrics] of Object.entries(taskData)) {
      const { abnormal, thresholds } = this.isAbnormal(taskName, metrics);
      this.abnormalStreaks[taskName] = abnormal
        ? (this.abnormalStreaks[taskName] || 0) + 1
        : 0;
      this.attachStreakMetadata(metrics, this.abnormalStreaks[taskName]);

      if (this.abnormalStreaks[taskName] >= this.alertRequiredStreak) {
        const lastAlert = this.lastAlertTime[taskName] || 0;

        if (now - lastAlert >= cooldown) {
          const alert = {
            taskName,
            totalCount: metrics.totalCount,
            successCount: metrics.successCount,
            failureCount: metrics.failureCount,
            successRate: metrics.successRate,
            successCountThreshold: thresholds.successCountThreshold,
            successRateThreshold: thresholds.successRateThreshold,
            timestamp: now
          };
          alerts.push(alert);

          this.lastAlertTime[taskName] = now;

          if (webhookUrl) {
            sendAlert(webhookUrl, taskName, metrics, thresholds);
          }

          this.alertHistory.unshift({
            ...alert,
            time: new Date(now).toLocaleString('zh-CN', { hour12: false })
          });

          if (this.alertHistory.length > 100) {
            this.alertHistory = this.alertHistory.slice(0, 100);
          }

          this.abnormalStreaks[taskName] = 0;
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
