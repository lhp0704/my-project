const test = require('node:test');
const assert = require('node:assert/strict');
const AlertService = require('./alert');

function createService() {
  return new AlertService({
    feishu: { webhookUrl: '' },
    monitor: {
      tasks: [{ name: 'TaskA', successCountThreshold: 9, successRateThreshold: 95 }],
      defaultSuccessCountThreshold: 9,
      defaultSuccessRateThreshold: 95,
      alertCooldown: 0
    }
  });
}

function setHour(service, hour) {
  service.getNow = () => new Date(2026, 0, 1, hour, 0, 0).getTime();
}

test('alerts when success count is below threshold for ten checks in a row', () => {
  const service = createService();
  setHour(service, 9);
  let alerts = [];

  for (let i = 0; i < 10; i++) {
    alerts = service.checkAlerts({
      TaskA: { totalCount: 10, successCount: 8, failureCount: 2, successRate: 80 }
    });
  }

  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].taskName, 'TaskA');
  assert.equal(alerts[0].successCount, 8);
  assert.equal(alerts[0].successRate, 80);
});

test('does not alert before the same task is abnormal ten times in a row', () => {
  const service = createService();
  setHour(service, 9);

  for (let i = 0; i < 9; i++) {
    const alerts = service.checkAlerts({
      TaskA: { totalCount: 10, successCount: 8, failureCount: 2, successRate: 80 }
    });

    assert.equal(alerts.length, 0);
  }
});

test('resets the abnormal streak when a normal sample is received', () => {
  const service = createService();
  setHour(service, 9);

  for (let i = 0; i < 9; i++) {
    service.checkAlerts({
      TaskA: { totalCount: 10, successCount: 8, failureCount: 2, successRate: 80 }
    });
  }

  service.checkAlerts({
    TaskA: { totalCount: 10, successCount: 10, failureCount: 0, successRate: 100 }
  });

  for (let i = 0; i < 9; i++) {
    const alerts = service.checkAlerts({
      TaskA: { totalCount: 10, successCount: 8, failureCount: 2, successRate: 80 }
    });

    assert.equal(alerts.length, 0);
  }

  const alerts = service.checkAlerts({
    TaskA: { totalCount: 10, successCount: 8, failureCount: 2, successRate: 80 }
  });

  assert.equal(alerts.length, 1);
});

test('does not alert from 00:00 through before 09:00', () => {
  const service = createService();
  setHour(service, 8);
  let alerts = [];

  for (let i = 0; i < 10; i++) {
    alerts = service.checkAlerts({
      TaskA: { totalCount: 10, successCount: 8, failureCount: 2, successRate: 80 }
    });
  }

  assert.equal(alerts.length, 0);
});

test('uses task thresholds when configured as an object', () => {
  const service = createService();

  assert.deepEqual(service.getThresholdsForTask('TaskA'), {
    successCountThreshold: 9,
    successRateThreshold: 95
  });
});

test('uses default thresholds for string task config', () => {
  const service = new AlertService({
    feishu: { webhookUrl: '' },
    monitor: {
      tasks: ['TaskB'],
      defaultSuccessCountThreshold: 7,
      defaultSuccessRateThreshold: 90,
      alertCooldown: 0
    }
  });

  assert.deepEqual(service.getThresholdsForTask('TaskB'), {
    successCountThreshold: 7,
    successRateThreshold: 90
  });
});

test('uses default thresholds for unknown task', () => {
  const service = createService();

  assert.deepEqual(service.getThresholdsForTask('UnknownTask'), {
    successCountThreshold: 9,
    successRateThreshold: 95
  });
});

test('marks metrics abnormal when success count is below threshold', () => {
  const service = createService();
  const result = service.isAbnormal('TaskA', {
    totalCount: 10,
    successCount: 8,
    failureCount: 0,
    successRate: 100
  });

  assert.equal(result.abnormal, true);
});

test('does not mark metrics abnormal when only failures exceed the old threshold', () => {
  const service = createService();
  const result = service.isAbnormal('TaskA', {
    totalCount: 20,
    successCount: 10,
    failureCount: 10,
    successRate: 100
  });

  assert.equal(result.abnormal, false);
});

test('marks metrics abnormal when success rate is below threshold', () => {
  const service = createService();
  const result = service.isAbnormal('TaskA', {
    totalCount: 10,
    successCount: 9,
    failureCount: 1,
    successRate: 94
  });

  assert.equal(result.abnormal, true);
});

test('does not mark normal metrics abnormal', () => {
  const service = createService();
  const result = service.isAbnormal('TaskA', {
    totalCount: 10,
    successCount: 10,
    failureCount: 0,
    successRate: 100
  });

  assert.equal(result.abnormal, false);
});

test('does not mark missing metrics abnormal', () => {
  const service = createService();
  const result = service.isAbnormal('TaskA', null);

  assert.equal(result.abnormal, false);
  assert.equal(result.metrics, null);
});

test('adds abnormal streak metadata before an alert is sent', () => {
  const service = createService();
  setHour(service, 9);
  const taskData = {
    TaskA: { totalCount: 10, successCount: 8, failureCount: 2, successRate: 80 }
  };

  service.checkAlerts(taskData);
  service.checkAlerts(taskData);
  service.checkAlerts(taskData);

  assert.equal(taskData.TaskA.abnormalStreak, 3);
  assert.equal(taskData.TaskA.alertRequiredStreak, 10);
});

test('shows the triggering streak after an alert is sent and restarts on the next abnormal sample', () => {
  const service = createService();
  setHour(service, 9);
  const taskData = {
    TaskA: { totalCount: 10, successCount: 8, failureCount: 2, successRate: 80 }
  };

  for (let i = 0; i < 10; i++) {
    service.checkAlerts(taskData);
  }

  assert.equal(taskData.TaskA.abnormalStreak, 10);
  assert.equal(taskData.TaskA.alertRequiredStreak, 10);

  service.checkAlerts(taskData);

  assert.equal(taskData.TaskA.abnormalStreak, 1);
});

test('suppresses repeated alert during cooldown', () => {
  const service = createService();
  service.config.monitor.alertCooldown = 300000;
  let now = new Date(2026, 0, 1, 9, 0, 0).getTime();
  service.getNow = () => now;
  const taskData = {
    TaskA: { totalCount: 10, successCount: 8, failureCount: 2, successRate: 80 }
  };

  for (let i = 0; i < 10; i++) {
    service.checkAlerts(taskData);
  }

  now += 60000;

  let alerts = [];
  for (let i = 0; i < 10; i++) {
    alerts = service.checkAlerts(taskData);
  }

  assert.equal(alerts.length, 0);
});

test('keeps only the latest 100 alert history entries', () => {
  const service = createService();
  setHour(service, 9);

  for (let i = 0; i < 101; i++) {
    service.checkAlerts({
      [`Task${i}`]: { totalCount: 10, successCount: 8, failureCount: 2, successRate: 80 }
    });
    service.abnormalStreaks[`Task${i}`] = 9;
    service.checkAlerts({
      [`Task${i}`]: { totalCount: 10, successCount: 8, failureCount: 2, successRate: 80 }
    });
  }

  assert.equal(service.getAlertHistory().length, 100);
  assert.equal(service.getAlertHistory()[0].taskName, 'Task100');
});
