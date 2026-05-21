// 工具执行失败 → 飞书通知（红色页头）
var https = require('https');
var fs = require('fs');

var WEBHOOK_URL = process.env.FEISHU_WEBHOOK_URL;
if (!WEBHOOK_URL) process.exit(0);

function cnTool(name) {
  var map = {
    Bash: '终端命令', Read: '读取文件', Write: '写入文件', Edit: '编辑文件',
    Grep: '内容搜索', Glob: '文件查找', Agent: '智能代理',
    TaskCreate: '创建任务', TaskUpdate: '更新任务', TaskGet: '获取任务',
    TaskList: '任务列表', TaskStop: '停止任务', TaskOutput: '任务输出',
    WebSearch: '网络搜索', WebFetch: '网页抓取', AskUserQuestion: '询问用户',
    EnterPlanMode: '进入规划', ExitPlanMode: '退出规划',
    CronCreate: '创建定时', CronDelete: '删除定时', CronList: '定时列表',
    ScheduleWakeup: '定时唤醒', NotebookEdit: '编辑笔记本', Skill: '技能调用',
    EnterWorktree: '进入工作区', ExitWorktree: '退出工作区'
  };
  return map[name] || name || '未知工具';
}

function now() {
  return new Date().toLocaleString('zh-CN', { hour12: false });
}

function fmtError(raw) {
  if (typeof raw === 'string') {
    try { var p = JSON.parse(raw); return JSON.stringify(p, null, 2); } catch (e) { return raw; }
  }
  return JSON.stringify(raw, null, 2);
}

var d = JSON.parse(fs.readFileSync(0, 'utf8'));
var toolName = d.tool_name || d.name || d.tool || 'unknown';
var sessionId = (d.session_id || d.sessionId || d.session || 'N/A').toString();
var error = fmtError(d.error || d.err || d.message || d);

var card = JSON.stringify({
  msg_type: 'interactive',
  card: {
    header: {
      title: { tag: 'plain_text', content: 'PostToolUseFailure · ' + cnTool(toolName) },
      template: 'red'
    },
    elements: [
      { tag: 'div', text: { tag: 'lark_md', content: '**错误信息**\n```\n' + error + '\n```' } },
      {
        tag: 'note',
        elements: [{ tag: 'plain_text', content: '会话 ' + sessionId.substring(0, 12) + ' · ' + now() }]
      }
    ]
  }
});

var req = https.request(WEBHOOK_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  timeout: 5000
}, function () { process.exit(0); });

req.on('error', function (e) {
  console.error('PostToolUseFailure:', e.message);
  process.exit(0);
});
req.on('timeout', function () {
  req.destroy();
  console.error('PostToolUseFailure: timeout');
  process.exit(0);
});

req.write(card);
req.end();
