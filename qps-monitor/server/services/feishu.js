const https = require('https');

function sendAlert(webhookUrl, apiName, currentQps, diffQps, rawQps, threshold) {
  if (!webhookUrl) {
    console.error('Feishu webhook URL not configured');
    return Promise.resolve(false);
  }

  const now = new Date().toLocaleString('zh-CN', { hour12: false });

  const card = JSON.stringify({
    msg_type: 'interactive',
    card: {
      header: {
        title: { tag: 'plain_text', content: '接口异常告警' },
        template: 'red'
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**接口名称**\n${apiName}`
          }
        },
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**当前接口监控数据**\n实际速率：${currentQps} QPS\n限速前速率：${rawQps} QPS\n差值：${diffQps} QPS`
          }
        },
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**判断规则**\n差值 > 1 且 实际速率 < 阈值（${threshold}）`
          }
        },
        { tag: 'hr' },
        {
          tag: 'note',
          elements: [{ tag: 'plain_text', content: '触发时间 ' + now + '。请检查限流、路由转发和接口实例状态。' }]
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
