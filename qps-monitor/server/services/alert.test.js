const test = require('node:test');
const assert = require('node:assert/strict');
const AlertService = require('./alert');

function createService() {
  return new AlertService({
    feishu: { webhookUrl: '' },
    monitor: {
      apis: [{ name: 'ApiA', threshold: 10 }],
      defaultQpsThreshold: 10,
      alertCooldown: 0
    }
  });
}

function setHour(service, hour) {
  service.getNow = () => new Date(2026, 0, 1, hour, 0, 0).getTime();
}

test('alerts when diff is greater than 1 and actual rate is below threshold', () => {
  const service = createService();
  setHour(service, 9);
  let alerts = [];

  for (let i = 0; i < 5; i++) {
    alerts = service.checkAlerts({
      ApiA: { rawQps: 8.5, actualQps: 7.4 }
    });
  }

  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].apiName, 'ApiA');
  assert.equal(alerts[0].diffQps, 1.1);
});

test('does not alert before the same api is abnormal five times in a row', () => {
  const service = createService();
  setHour(service, 9);

  for (let i = 0; i < 4; i++) {
    const alerts = service.checkAlerts({
      ApiA: { rawQps: 8.5, actualQps: 7.4 }
    });

    assert.equal(alerts.length, 0);
  }
});

test('adds abnormal streak metadata before an alert is sent', () => {
  const service = createService();
  setHour(service, 9);
  const qpsData = {
    ApiA: { rawQps: 8.5, actualQps: 7.4 }
  };

  service.checkAlerts(qpsData);
  service.checkAlerts(qpsData);
  service.checkAlerts(qpsData);

  assert.equal(qpsData.ApiA.abnormalStreak, 3);
  assert.equal(qpsData.ApiA.alertRequiredStreak, 5);
});

test('shows the triggering streak after an alert is sent and restarts on the next abnormal sample', () => {
  const service = createService();
  setHour(service, 9);
  const qpsData = {
    ApiA: { rawQps: 8.5, actualQps: 7.4 }
  };

  for (let i = 0; i < 5; i++) {
    service.checkAlerts(qpsData);
  }

  assert.equal(qpsData.ApiA.abnormalStreak, 5);
  assert.equal(qpsData.ApiA.alertRequiredStreak, 5);

  service.checkAlerts(qpsData);

  assert.equal(qpsData.ApiA.abnormalStreak, 1);
});

test('resets the abnormal streak when a normal sample is received', () => {
  const service = createService();
  setHour(service, 9);

  for (let i = 0; i < 4; i++) {
    service.checkAlerts({
      ApiA: { rawQps: 8.5, actualQps: 7.4 }
    });
  }

  service.checkAlerts({
    ApiA: { rawQps: 8.5, actualQps: 7.5 }
  });

  for (let i = 0; i < 4; i++) {
    const alerts = service.checkAlerts({
      ApiA: { rawQps: 8.5, actualQps: 7.4 }
    });

    assert.equal(alerts.length, 0);
  }

  const alerts = service.checkAlerts({
    ApiA: { rawQps: 8.5, actualQps: 7.4 }
  });

  assert.equal(alerts.length, 1);
});

test('does not alert when pre-limit rate minus actual rate is 1 or less', () => {
  const service = createService();
  setHour(service, 9);
  const alerts = service.checkAlerts({
    ApiA: { rawQps: 8.5, actualQps: 7.5 }
  });

  assert.equal(alerts.length, 0);
});

test('does not alert from 00:00 through before 08:00', () => {
  const service = createService();
  setHour(service, 2);
  const alerts = service.checkAlerts({
    ApiA: { rawQps: 8.5, actualQps: 7.4 }
  });

  assert.equal(alerts.length, 0);
});

test('does not alert when diff is greater than 1 but actual rate is not below threshold', () => {
  const service = createService();
  setHour(service, 9);
  const alerts = service.checkAlerts({
    ApiA: { rawQps: 12, actualQps: 10.5 }
  });

  assert.equal(alerts.length, 0);
});

test('alerts when actual rate is 0, threshold is higher, and diff is greater than 1', () => {
  const service = createService();
  setHour(service, 9);
  let alerts = [];

  for (let i = 0; i < 5; i++) {
    alerts = service.checkAlerts({
      ApiA: { rawQps: 1.5, actualQps: 0 }
    });
  }

  assert.equal(alerts.length, 1);
});
