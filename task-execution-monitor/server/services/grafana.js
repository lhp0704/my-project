const axios = require('axios');

class GrafanaService {
  constructor(config) {
    this.config = config;
    this.baseUrl = config.grafana.baseUrl;
    this.datasourceUid = config.grafana.datasourceUid || 'prometheus';
    this.group = config.grafana.group || 'All';
    this.job = config.grafana.job || '';
    this.compareTime = config.grafana.compareTime || '5m';
    this.timeRange = config.grafana.timeRange || 'now-1h';
    this.queryExpressions = config.grafana.queryExpressions || {};
    this.useSimulate = config.grafana.useSimulate !== false;
    this.username = config.grafana.username;
    this.password = config.grafana.password;
  }

  getAuthConfig() {
    if (this.username && this.password) {
      return {
        auth: {
          username: this.username,
          password: this.password
        }
      };
    }
    return {};
  }

  interpolateExpression(expression, taskName) {
    return expression
      .replaceAll('$job', taskName || this.job)
      .replaceAll('$group', this.group)
      .replaceAll('$compareTime', this.compareTime);
  }

  async fetchTaskMetrics(taskName) {
    if (this.useSimulate) {
      return this.simulateTaskMetrics(taskName);
    }

    try {
      const url = `${this.baseUrl}/api/ds/query`;
      const expressions = {
        total: this.queryExpressions.total,
        success: this.queryExpressions.success,
        failure: this.queryExpressions.failure
      };

      const query = {
        queries: Object.entries(expressions).map(([key, expression], index) => ({
          datasource: { type: 'prometheus', uid: this.datasourceUid },
          expr: this.interpolateExpression(expression, taskName),
          legendFormat: key,
          refId: String.fromCharCode(65 + index),
          interval: '10s'
        })),
        from: this.timeRange,
        to: 'now'
      };

      const response = await axios.post(url, query, {
        ...this.getAuthConfig(),
        timeout: 10000,
        proxy: false
      });

      const totalCount = this.parseResponse(response.data, 'A');
      const successCount = this.parseResponse(response.data, 'B');
      const failureCount = this.parseResponse(response.data, 'C');
      return this.createTaskResult(totalCount, successCount, failureCount);
    } catch (e) {
      console.error(`Failed to fetch task metrics for ${taskName}:`, e.message);
      return null;
    }
  }

  createTaskResult(totalCount, successCount, failureCount) {
    const safeTotal = totalCount ?? 0;
    const safeSuccess = successCount ?? 0;
    const safeFailure = failureCount ?? Math.max(0, safeTotal - safeSuccess);
    const successRate = safeTotal > 0
      ? Math.round((safeSuccess / safeTotal) * 10000) / 100
      : 100;

    return {
      totalCount: safeTotal,
      successCount: safeSuccess,
      failureCount: safeFailure,
      successRate
    };
  }

  parseResponse(data, refId = 'A') {
    if (data && data.results && data.results[refId]) {
      const frames = data.results[refId].frames;
      if (frames && frames.length > 0) {
        const frame = frames[0];

        if (frame.data && frame.data.values) {
          const values = frame.data.values;
          if (values && values.length > 1 && values[1].length > 0) {
            const lastValue = values[1][values[1].length - 1];
            return Math.round(lastValue * 100) / 100;
          }
        }

        if (frame.fields) {
          const valueField = frame.fields.find(f => f.type === 'number');
          if (valueField && valueField.values && valueField.values.length > 0) {
            const lastValue = valueField.values[valueField.values.length - 1];
            return Math.round(lastValue * 100) / 100;
          }
        }
      }
    }

    return null;
  }

  async fetchAllTasks(tasks) {
    const results = {};
    const taskNames = tasks.map(t =>
      typeof t === 'object' ? t.name : t
    );

    const promises = taskNames.map(async (taskName) => {
      const metrics = await this.fetchTaskMetrics(taskName);
      results[taskName] = metrics;
    });

    await Promise.all(promises);
    return results;
  }

  simulateTaskMetrics(taskName) {
    const hash = taskName.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0);
    const totalCount = (Math.abs(hash) % 80) + 20;
    const failureCount = Math.max(0, Math.floor(Math.random() * 5) - 1);
    return this.createTaskResult(totalCount, totalCount - failureCount, failureCount);
  }
}

module.exports = GrafanaService;
