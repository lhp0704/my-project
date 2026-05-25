const https = require('https');

function sendAlert(webhookUrl, taskName, metrics, thresholds) {
  if (!webhookUrl) {
    console.error('Feishu webhook URL not configured');
    return Promise.resolve(false);
  }

  const now = new Date().toLocaleString('zh-CN', { hour12: false });

  const card = JSON.stringify({
    msg_type: 'interactive',
    card: {
      header: {
        title: { tag: 'plain_text', content: '任务执行异常告警' },
        template: 'red'
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**任务名称**\n${taskName}`
          }
        },
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**当前执行数据**\n总数：${metrics.totalCount}\n成功：${metrics.successCount}\n失败：${metrics.failureCount}\n成功率：${metrics.successRate}%`
          }
        },
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**判断规则**\n成功数 < ${thresholds.successCountThreshold} 或 成功率 < ${thresholds.successRateThreshold}%`
          }
        },
        { tag: 'hr' },
        {
          tag: 'note',
          elements: [{ tag: 'plain_text', content: '触发时间 ' + now + '。请检查任务执行状态、依赖服务和队列积压情况。' }]
        }
      ]
    }
  });

  return new Promise((resolve) => {
    const url = new URL(webhookUrl);
    const req = https.request({
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        console.log('Feishu alert sent:', body);
        try {
          const data = JSON.parse(body);
          resolve(data.code === 0);
        } catch (e) {
          resolve(false);
        }
      });
    });

    req.on('error', (e) => {
      console.error('Feishu alert error:', e.message);
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      console.error('Feishu alert timeout');
      resolve(false);
    });

    req.write(card);
    req.end();
  });
}

module.exports = { sendAlert };
