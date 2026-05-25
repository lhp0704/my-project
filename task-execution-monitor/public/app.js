const { createApp, ref, computed, onMounted, watch, nextTick } = Vue;

createApp({
  setup() {
    const currentTab = ref('dashboard');
    const currentTasks = ref({});
    const history = ref([]);
    const alerts = ref([]);
    const saveDialog = ref({
      visible: false,
      type: 'success',
      title: '',
      message: ''
    });
    const lastUpdate = ref('');
    const selectedTask = ref('');
    let chart = null;
    let saveDialogTimer = null;

    const config = ref({
      grafana: {
        baseUrl: 'http://inner-grafana.xiguaji.com',
        dashboardUrl: 'http://inner-grafana.xiguaji.com/d/MHpMo164k/ren-wu-zhi-xing-bao-biao?orgId=1',
        datasourceUid: 'prometheus',
        group: 'All',
        job: 'qiangua:XiaoHongShu.DataTask.SpiderTask.带货相关.店铺商品采集',
        compareTime: '5m',
        timeRange: 'now-1h',
        useSimulate: false,
        username: 'gfxigua',
        password: 'QujTijJKsFC95SBm',
        queryExpressions: {
          total: 'sum(increase(task_execution_total{job="$job"}[$compareTime]))',
          success: 'sum(increase(task_execution_success_total{job="$job"}[$compareTime]))',
          failure: 'sum(increase(task_execution_failure_total{job="$job"}[$compareTime]))'
        }
      },
      feishu: {
        webhookUrl: ''
      },
      monitor: {
        tasks: [],
        defaultSuccessCountThreshold: 1,
        defaultSuccessRateThreshold: 95,
        checkInterval: 60000,
        alertCooldown: 300000
      }
    });

    const taskNames = computed(() => {
      return config.value.monitor.tasks.map(t => typeof t === 'object' ? t.name : t).filter(n => n);
    });

    const healthyCount = computed(() => {
      return Object.entries(currentTasks.value).filter(([task, metrics]) =>
        !isAbnormal(task, metrics)
      ).length;
    });

    const abnormalCount = computed(() => {
      return Object.entries(currentTasks.value).filter(([task, metrics]) =>
        isAbnormal(task, metrics)
      ).length;
    });

    function getThresholds(taskName) {
      const tasks = config.value.monitor.tasks || [];
      const taskConfig = tasks.find(t =>
        (typeof t === 'object' && t.name === taskName) ||
        (typeof t === 'string' && t === taskName)
      );
      return {
        successCountThreshold: taskConfig && typeof taskConfig === 'object' && taskConfig.successCountThreshold !== undefined
          ? taskConfig.successCountThreshold
          : config.value.monitor.defaultSuccessCountThreshold ?? 1,
        successRateThreshold: taskConfig && typeof taskConfig === 'object' && taskConfig.successRateThreshold !== undefined
          ? taskConfig.successRateThreshold
          : config.value.monitor.defaultSuccessRateThreshold ?? 95
      };
    }

    function addTask() {
      config.value.monitor.tasks.push({
        name: '',
        successCountThreshold: config.value.monitor.defaultSuccessCountThreshold ?? 1,
        successRateThreshold: config.value.monitor.defaultSuccessRateThreshold ?? 95
      });
    }

    function removeTask(index) {
      config.value.monitor.tasks.splice(index, 1);
    }

    function getTotalCount(metrics) {
      return metrics && typeof metrics === 'object' ? metrics.totalCount : null;
    }

    function getSuccessCount(metrics) {
      return metrics && typeof metrics === 'object' ? metrics.successCount : null;
    }

    function getFailureCount(metrics) {
      return metrics && typeof metrics === 'object' ? metrics.failureCount : null;
    }

    function getSuccessRate(metrics) {
      return metrics && typeof metrics === 'object' ? metrics.successRate : null;
    }

    function getAbnormalStreak(metrics) {
      if (metrics && typeof metrics === 'object' && metrics.abnormalStreak !== undefined) {
        return metrics.abnormalStreak;
      }
      return 0;
    }

    function getAlertRequiredStreak(metrics) {
      if (metrics && typeof metrics === 'object' && metrics.alertRequiredStreak !== undefined) {
        return metrics.alertRequiredStreak;
      }
      return 10;
    }

    function formatTaskName(taskName) {
      if (!taskName) return '';

      const namePart = String(taskName).split(':').pop();
      const parts = namePart.split('.').filter(Boolean);
      if (parts.length <= 2) {
        return namePart;
      }

      return parts.slice(-2).join('.');
    }

    function formatMetric(value, suffix = '') {
      return value === null || value === undefined ? '--' : `${value}${suffix}`;
    }

    function isAbnormal(taskName, metrics) {
      if (!metrics) return false;
      const thresholds = getThresholds(taskName);
      return metrics.successCount < thresholds.successCountThreshold ||
        metrics.successRate < thresholds.successRateThreshold;
    }

    function showSaveDialog(type, title, message) {
      if (saveDialogTimer) {
        clearTimeout(saveDialogTimer);
      }
      saveDialog.value = { visible: true, type, title, message };
      saveDialogTimer = setTimeout(closeSaveDialog, type === 'success' ? 2500 : 6000);
    }

    function closeSaveDialog() {
      if (saveDialogTimer) {
        clearTimeout(saveDialogTimer);
        saveDialogTimer = null;
      }
      saveDialog.value.visible = false;
    }

    function getColor(index) {
      const colors = ['#2563eb', '#0891b2', '#059669', '#d97706', '#b91c1c', '#7c3aed', '#0f766e', '#475569'];
      return colors[index % colors.length];
    }

    function initChart() {
      const ctx = document.getElementById('taskChart').getContext('2d');
      chart = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              position: 'top',
              align: 'start',
              labels: {
                color: '#374151',
                boxWidth: 10,
                boxHeight: 10,
                usePointStyle: true,
                pointStyle: 'circle',
                padding: 16,
                font: { size: 12, weight: '500' }
              }
            },
            title: { display: false }
          },
          scales: {
            x: {
              ticks: { color: '#6b7280', maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
              grid: { color: '#e5e7eb', borderDash: [4, 4], drawBorder: false }
            },
            y: {
              beginAtZero: true,
              ticks: { color: '#6b7280' },
              grid: { color: '#e5e7eb', borderDash: [4, 4], drawBorder: false },
              title: { display: true, text: '成功数', color: '#4b5563', font: { size: 12, weight: '500' } }
            }
          }
        }
      });
    }

    function destroyChart() {
      if (chart) {
        chart.destroy();
        chart = null;
      }
    }

    function updateChart() {
      if (!chart) return;

      const labels = history.value.map(h => h.time);
      let datasets = [];

      if (selectedTask.value) {
        const data = history.value.map(h => getSuccessCount(h.data[selectedTask.value]) || 0);
        datasets.push({
          label: formatTaskName(selectedTask.value),
          data,
          borderColor: '#b91c1c',
          backgroundColor: 'rgba(185, 28, 28, 0.12)',
          pointBackgroundColor: '#b91c1c',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2,
          tension: 0.35,
          fill: true
        });
      } else {
        const tasks = taskNames.value.slice(0, 6);
        datasets = tasks.map((task, index) => {
          const data = history.value.map(h => getSuccessCount(h.data[task]) || 0);
          return {
            label: formatTaskName(task),
            data,
            borderColor: getColor(index),
            backgroundColor: 'transparent',
            pointBackgroundColor: getColor(index),
            pointBorderColor: '#ffffff',
            pointBorderWidth: 1,
            pointRadius: 2,
            pointHoverRadius: 5,
            borderWidth: 2,
            tension: 0.35,
            fill: false
          };
        });
      }

      chart.data.labels = labels;
      chart.data.datasets = datasets;
      chart.update('none');
    }

    async function fetchConfig() {
      try {
        const res = await fetch('/api/config');
        const data = await res.json();
        if (data.success) {
          config.value = data.data;
          if (!Array.isArray(config.value.monitor.tasks)) {
            config.value.monitor.tasks = [];
          }
          config.value.monitor.tasks = config.value.monitor.tasks.map(t => {
            if (typeof t === 'string') {
              return {
                name: t,
                successCountThreshold: config.value.monitor.defaultSuccessCountThreshold ?? 1,
                successRateThreshold: config.value.monitor.defaultSuccessRateThreshold ?? 95
              };
            }
            return t;
          });
        }
      } catch (e) {
        console.error('Failed to fetch config:', e);
      }
    }

    async function saveConfig() {
      try {
        const res = await fetch('/api/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config.value)
        });
        const data = await res.json();
        if (data.success) {
          showSaveDialog('success', '保存成功', '配置已保存，稍后会按新配置更新数据。');
        } else {
          showSaveDialog('error', '保存失败', data.error || '配置没有保存成功，请稍后再试。');
        }
      } catch (e) {
        console.error('Failed to save config:', e);
        showSaveDialog('error', '保存失败', '连接服务失败，请确认服务正在运行。');
      }
    }

    async function sendTaskAlert(taskName) {
      if (!taskName) {
        showSaveDialog('error', '发送失败', '请先填写任务名称。');
        return;
      }

      try {
        const res = await fetch('/api/metrics/alerts/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskName })
        });
        const data = await res.json();
        if (data.success) {
          showSaveDialog('success', '已发送报警', `${taskName} 的当前数据报警已发送到飞书。`);
        } else {
          showSaveDialog('error', '发送失败', data.error || '飞书报警没有发送成功。');
        }
      } catch (e) {
        console.error('Failed to send alert:', e);
        showSaveDialog('error', '发送失败', '连接服务失败，请确认服务正在运行。');
      }
    }

    async function fetchCurrentTasks() {
      try {
        const res = await fetch('/api/metrics/current');
        const data = await res.json();
        if (data.success) {
          currentTasks.value = data.data;
          lastUpdate.value = new Date().toLocaleString('zh-CN', { hour12: false });
        }
      } catch (e) {
        console.error('Failed to fetch current task metrics:', e);
      }
    }

    async function fetchHistory() {
      try {
        const res = await fetch('/api/metrics/history');
        const data = await res.json();
        if (data.success) {
          const cutoff = Date.now() - (30 * 60 * 1000);
          history.value = data.data
            .filter(h => !h.timestamp || h.timestamp >= cutoff)
            .reverse();
          await nextTick();
          updateChart();
        }
      } catch (e) {
        console.error('Failed to fetch history:', e);
      }
    }

    async function fetchAlerts() {
      try {
        const res = await fetch('/api/metrics/alerts');
        const data = await res.json();
        if (data.success) {
          alerts.value = data.data;
        }
      } catch (e) {
        console.error('Failed to fetch alerts:', e);
      }
    }

    function refreshAll() {
      fetchCurrentTasks();
      if (currentTab.value === 'dashboard') fetchHistory();
      if (currentTab.value === 'alerts') fetchAlerts();
    }

    watch(currentTab, async (newTab, oldTab) => {
      if (oldTab === 'dashboard' && newTab !== 'dashboard') {
        destroyChart();
      }

      if (newTab === 'dashboard') {
        await fetchHistory();
        await nextTick();
        if (!chart) {
          initChart();
        }
        updateChart();
      } else if (newTab === 'alerts') {
        fetchAlerts();
      }
    });

    onMounted(async () => {
      await fetchConfig();
      refreshAll();
      await nextTick();
      initChart();
      setInterval(refreshAll, 10000);
    });

    return {
      currentTab,
      currentTasks,
      history,
      alerts,
      config,
      lastUpdate,
      saveDialog,
      selectedTask,
      taskNames,
      healthyCount,
      abnormalCount,
      getThresholds,
      getTotalCount,
      getSuccessCount,
      getFailureCount,
      getSuccessRate,
      getAbnormalStreak,
      getAlertRequiredStreak,
      formatTaskName,
      formatMetric,
      isAbnormal,
      addTask,
      removeTask,
      sendTaskAlert,
      closeSaveDialog,
      saveConfig,
      updateChart
    };
  }
}).mount('#app');
