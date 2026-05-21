// 会话开始 → 飞书通知（浅蓝页头）
var https = require('https');
var fs = require('fs');

var WEBHOOK_URL = process.env.FEISHU_WEBHOOK_URL;
if (!WEBHOOK_URL) process.exit(0);

function now() {
  return new Date().toLocaleString('zh-CN', { hour12: false });
}

var d = JSON.parse(fs.readFileSync(0, 'utf8'));
var sessionId = (d.session_id || d.sessionId || d.session || 'N/A').toString();
var cwd = d.cwd || d.working_directory || d.workingDirectory || d.project_dir || '';

var elements = [
  { tag: 'div', text: { tag: 'lark_md', content: '**会话**  `' + sessionId.substring(0, 16) + '`' } }
];

if (cwd) {
  elements.push({ tag: 'div', text: { tag: 'lark_md', content: '**目录**  `' + cwd + '`' } });
}

elements.push({ tag: 'note', elements: [{ tag: 'plain_text', content: now() }] });

var card = JSON.stringify({
  msg_type: 'interactive',
  card: {
    header: {
      title: { tag: 'plain_text', content: 'SessionStart · 会话开始' },
      template: 'wathet'
    },
    elements: elements
  }
});

var req = https.request(WEBHOOK_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  timeout: 5000
}, function () { process.exit(0); });

req.on('error', function (e) {
  console.error('SessionStart:', e.message);
  process.exit(0);
});
req.on('timeout', function () {
  req.destroy();
  console.error('SessionStart: timeout');
  process.exit(0);
});

req.write(card);
req.end();
