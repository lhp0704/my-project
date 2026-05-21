// 任务创建 → 飞书通知（紫色页头）
var https = require('https');
var fs = require('fs');

var WEBHOOK_URL = process.env.FEISHU_WEBHOOK_URL;
if (!WEBHOOK_URL) process.exit(0);

function trunc(s, n) {
  if (!s) return '';
  n = n || 300;
  return s.length > n ? s.substring(0, n) + '...' : s;
}

function now() {
  return new Date().toLocaleString('zh-CN', { hour12: false });
}

var d = JSON.parse(fs.readFileSync(0, 'utf8'));
var subject = d.subject || d.name || d.title || d.task_subject || '未命名任务';
var desc = d.description || d.desc || d.body || d.task_description || '';
var sessionId = (d.session_id || d.sessionId || d.session || '').toString();

var elements = [
  { tag: 'div', text: { tag: 'lark_md', content: '**任务**  ' + subject } }
];

if (desc) {
  elements.push({ tag: 'div', text: { tag: 'lark_md', content: '**描述**  ' + trunc(desc) } });
}

var noteText = now();
if (sessionId) noteText = '会话 ' + sessionId.substring(0, 12) + ' · ' + noteText;
elements.push({ tag: 'note', elements: [{ tag: 'plain_text', content: noteText }] });

var card = JSON.stringify({
  msg_type: 'interactive',
  card: {
    header: {
      title: { tag: 'plain_text', content: 'TaskCreated · 任务创建' },
      template: 'purple'
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
  console.error('TaskCreated:', e.message);
  process.exit(0);
});
req.on('timeout', function () {
  req.destroy();
  console.error('TaskCreated: timeout');
  process.exit(0);
});

req.write(card);
req.end();
