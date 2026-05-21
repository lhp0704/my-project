const { createApp, ref, computed, onMounted, watch, nextTick } = Vue;

createApp({
  setup() {
    const currentTab = ref('dashboard');
    const currentQPS = ref({});
    const history = ref([]);
    const alerts = ref([]);
    const saveDialog = ref({
      visible: false,
      type: 'success',
      title: '',
      message: ''
    });
    const lastUpdate = ref('');
    const selectedApi = ref('');
    let chart = null;
    let saveDialogTimer = null;

    const config = ref({
      grafana: {
        baseUrl: 'http://172.26.99.26:3000',
        dashboardUrl: 'http://172.26.99.26:3000/d/a432b915-8399-4f17-b2f5-4ea9c7af346d/e68ea5-e58fa3-e8afa6-e7bb86?orgId=1&from=now-5m&to=now&timezone=browser&var-Api=User_UserPostedV4',
        datasourceUid: 'a930f974-4513-411b-9d2c-882a9510b71c',
        metricName: 'xhs_api_request_status_code',
        beforeLimitMetricName: 'xhs_api_before_limit_request',
        apiLabel: 'ApiPath',
        jobLabel: 'job',
        jobValue: 'xhs_gateway',
        rateInterval: '1m',
        useSimulate: false,
        username: 'hz',
        password: 'EcQMZpzuFst5UK'
      },
      feishu: {
        webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/46a0f903-f7ed-4617-a159-1da1f98e3757'
      },
      monitor: {
        apis: [],
        defaultQpsThreshold: 10,
        checkInterval: 60000,
        alertCooldown: 300000
      }
    });

    const apiNames = computed(() => {
      return config.value.monitor.apis.map(a => typeof a === 'object' ? a.name : a).filter(n => n);
    });

    const healthyCount = computed(() => {
      return Object.entries(currentQPS.value).filter(([api, qpsInfo]) =>
        !isAbnormal(api, qpsInfo)
      ).length;
    });

    const lowCount = computed(() => {
      return Object.entries(currentQPS.value).filter(([api, qpsInfo]) =>
        isAbnormal(api, qpsInfo)
      ).length;
    });

    function getThreshold(apiName) {
      const apis = config.value.monitor.apis || [];
      const apiConfig = apis.find(a =>
        (typeof a === 'object' && a.name === apiName) ||
        (typeof a === 'string' && a === apiName)
      );
      if (apiConfig && typeof apiConfig === 'object' && apiConfig.threshold !== undefined) {
        return apiConfig.threshold;
      }
      return config.value.monitor.defaultQpsThreshold || 10;
    }

    function addApi() {
      config.value.monitor.apis.push({
        name: '',
        threshold: config.value.monitor.defaultQpsThreshold || 10
      });
    }

    function removeApi(index) {
      config.value.monitor.apis.splice(index, 1);
    }

    function getActualQps(qpsInfo) {
      if (qpsInfo && typeof qpsInfo === 'object') {
        return qpsInfo.actualQps;
      }
      return qpsInfo;
    }

    function getRawQps(qpsInfo) {
      if (qpsInfo && typeof qpsInfo === 'object') {
        return qpsInfo.rawQps;
      }
      return null;
    }

    function getDiffQps(qpsInfo) {
      if (qpsInfo && typeof qpsInfo === 'object') {
        return qpsInfo.diffQps;
      }
      return null;
    }

    function getAbnormalStreak(qpsInfo) {
      if (qpsInfo && typeof qpsInfo === 'object' && qpsInfo.abnormalStreak !== undefined) {
        return qpsInfo.abnormalStreak;
      }
      return 0;
    }

    function getAlertRequiredStreak(qpsInfo) {
      if (qpsInfo && typeof qpsInfo === 'object' && qpsInfo.alertRequiredStreak !== undefined) {
        return qpsInfo.alertRequiredStreak;
      }
      return 5;
    }

    function formatQps(value) {
      return value === null || value === undefined ? '--' : value;
    }

    function isAbnormal(apiName, qpsInfo) {
      const diffQps = getDiffQps(qpsInfo);
      const actualQps = getActualQps(qpsInfo);
      const threshold = getThreshold(apiName);
      return (diffQps !== null && diffQps > 1) &&
        (actualQps !== null && actualQps < threshold);
    }

    function showSaveDialog(type, title, message) {
      if (saveDialogTimer) {
        clearTimeout(saveDialogTimer);
      }
      saveDialog.value = {
        visible: true,
        type,
        title,
        message
      };
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
      const colors = [
        '#2563eb',
        '#0891b2',
        '#059669',
        '#d97706',
        '#b91c1c',
        '#7c3aed',
        '#0f766e',
        '#475569'
      ];
      return colors[index % colors.length];
    }

    function initChart() {
      const ctx = document.getElementById('qpsChart').getContext('2d');
      chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: [],
          datasets: []
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false
          },
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
                font: {
                  size: 12,
                  weight: '500'
                }
              }
            },
            title: {
              display: false
            },
            tooltip: {
              backgroundColor: '#111827',
              titleColor: '#ffffff',
              bodyColor: '#e5e7eb',
              borderColor: '#374151',
              borderWidth: 1,
              padding: 12,
              displayColors: true
            }
          },
          scales: {
            x: {
              ticks: {
                color: '#6b7280',
                maxRotation: 0,
                autoSkip: true,
                maxTicksLimit: 8
              },
              grid: {
                color: '#e5e7eb',
                borderDash: [4, 4],
                drawBorder: false
              }
            },
            y: {
              beginAtZero: true,
              ticks: {
                color: '#6b7280'
              },
              grid: {
                color: '#e5e7eb',
                borderDash: [4, 4],
                drawBorder: false
              },
              title: {
                display: true,
                text: 'QPS',
                color: '#4b5563',
                font: {
                  size: 12,
                  weight: '500'
                }
              }
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

      if (selectedApi.value) {
        const data = history.value.map(h => getActualQps(h.data[selectedApi.value]) || 0);
        datasets.push({
          label: selectedApi.value,
          data: data,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.12)',
          pointBackgroundColor: '#2563eb',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2,
          tension: 0.35,
          fill: true
        });
      } else {
        const apis = apiNames.value.slice(0, 6);
        datasets = apis.map((api, index) => {
          const data = history.value.map(h => getActualQps(h.data[api]) || 0);
          return {
            label: api,
            data: data,
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
          if (!Array.isArray(config.value.monitor.apis)) {
            config.value.monitor.apis = [];
          }
          config.value.monitor.apis = config.value.monitor.apis.map(a => {
            if (typeof a === 'string') {
              return { name: a, threshold: config.value.monitor.defaultQpsThreshold || 10 };
            }
            return a;
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

    async function sendApiAlert(apiName) {
      if (!apiName) {
        showSaveDialog('error', '发送失败', '请先填写接口名称。');
        return;
      }

      try {
        const res = await fetch('/api/metrics/alerts/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiName })
        });
        const data = await res.json();
        if (data.success) {
          showSaveDialog('success', '已发送报警', `${apiName} 的当前数据报警已发送到飞书。`);
        } else {
          showSaveDialog('error', '发送失败', data.error || '飞书报警没有发送成功。');
        }
      } catch (e) {
        console.error('Failed to send alert:', e);
        showSaveDialog('error', '发送失败', '连接服务失败，请确认服务正在运行。');
      }
    }

    async function fetchCurrentQPS() {
      try {
        const res = await fetch('/api/metrics/current');
        const data = await res.json();
        if (data.success) {
          currentQPS.value = data.data;
          lastUpdate.value = new Date().toLocaleString('zh-CN', { hour12: false });
        }
      } catch (e) {
        console.error('Failed to fetch current QPS:', e);
      }
    }

    async function fetchHistory() {
      try {
        const res = await fetch('/api/metrics/history');
        const data = await res.json();
        if (data.success) {
          history.value = data.data.slice(0, 30);
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
      fetchCurrentQPS();
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
      currentQPS,
      history,
      alerts,
      config,
      lastUpdate,
      saveDialog,
      selectedApi,
      apiNames,
      healthyCount,
      lowCount,
      getThreshold,
      getActualQps,
      getRawQps,
      getDiffQps,
      getAbnormalStreak,
      getAlertRequiredStreak,
      formatQps,
      isAbnormal,
      addApi,
      removeApi,
      sendApiAlert,
      closeSaveDialog,
      saveConfig,
      updateChart
    };
  }
}).mount('#app');
