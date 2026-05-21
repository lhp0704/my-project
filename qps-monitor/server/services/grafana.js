const axios = require('axios');

class GrafanaService {
  constructor(config) {
    this.baseUrl = config.grafana.baseUrl;
    this.dashboardUid = config.grafana.dashboardUid;
    this.dashboardName = config.grafana.dashboardName;
    this.datasourceUid = config.grafana.datasourceUid || 'prometheus';
    this.metricName = config.grafana.metricName || 'xhs_api_request_status_code';
    this.beforeLimitMetricName = config.grafana.beforeLimitMetricName || 'xhs_api_before_limit_request';
    this.apiLabel = config.grafana.apiLabel || 'ApiPath';
    this.rateInterval = config.grafana.rateInterval || '1m';
    this.jobLabel = config.grafana.jobLabel || 'job';
    this.jobValue = config.grafana.jobValue || 'xhs_gateway';
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

  async fetchQPS(apiName) {
    if (this.useSimulate) {
      const rawQps = this.simulateQPS(apiName);
      const actualQps = Math.max(0, rawQps - (Math.random() * 2));
      return this.createQpsResult(rawQps, actualQps);
    }

    try {
      const url = `${this.baseUrl}/api/ds/query`;
      const rawExpr = `rate(${this.beforeLimitMetricName}{${this.apiLabel}="${apiName}"}[${this.rateInterval}])`;
      const actualBaseExpr = `sum by(${this.apiLabel}) (rate(${this.metricName}{${this.jobLabel}="${this.jobValue}", ${this.apiLabel}="${apiName}"}[${this.rateInterval}]))`;
      const actualExpr = `${actualBaseExpr} * (xhs_api_request_success_rate{${this.apiLabel}="${apiName}"})`;

      const query = {
        queries: [
          {
            datasource: { type: 'prometheus', uid: this.datasourceUid },
            expr: rawExpr,
            legendFormat: `限速前 {{${this.apiLabel}}}`,
            refId: 'A',
            interval: '10s'
          },
          {
            datasource: { type: 'prometheus', uid: this.datasourceUid },
            expr: actualExpr,
            legendFormat: `实际 {{${this.apiLabel}}}`,
            refId: 'B',
            interval: '10s'
          }
        ],
        from: 'now-5m',
        to: 'now'
      };

      const response = await axios.post(url, query, {
        ...this.getAuthConfig(),
        timeout: 10000,
        proxy: false
      });

      const rawQps = this.parseResponse(response.data, 'A');
      const actualQps = this.parseResponse(response.data, 'B');
      return this.createQpsResult(rawQps, actualQps);
    } catch (e) {
      console.error(`Failed to fetch QPS for ${apiName}:`, e.message);
      return null;
    }
  }

  createQpsResult(rawQps, actualQps) {
    const diffQps = rawQps !== null && actualQps !== null
      ? Math.round((rawQps - actualQps) * 100) / 100
      : null;

    return {
      rawQps,
      actualQps,
      diffQps
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
          const timeField = frame.fields.find(f => f.type === 'time');
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

  async fetchAllQPS(apis) {
    const results = {};
    const apiNames = apis.map(a =>
      typeof a === 'object' ? a.name : a
    );

    const promises = apiNames.map(async (apiName) => {
      const qps = await this.fetchQPS(apiName);
      results[apiName] = qps;
    });

    await Promise.all(promises);
    return results;
  }

  simulateQPS(apiName) {
    const hash = apiName.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0);
    const base = (Math.abs(hash) % 40) + 10;
    const variance = Math.floor(Math.random() * 15) - 7;
    return Math.max(0, base + variance);
  }
}

module.exports = GrafanaService;
