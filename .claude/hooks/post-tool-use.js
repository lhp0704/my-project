// 工具执行成功 → 飞书通知（绿色页头，含 Token 用量 + 余额）
var https = require('https');
var fs = require('fs');

var WEBHOOK_URL = process.env.FEISHU_WEBHOOK_URL;
var DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';

if (!WEBHOOK_URL) process.exit(0);

function trunc(s, n) {
  if (!s) return '';
  n = n || 800;
  return s.length > n ? s.substring(0, n) + '...' : s;
}

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

function fmtOutput(raw) {
  if (typeof raw === 'string') {
    try { var p = JSON.parse(raw); return JSON.stringify(p, null, 2); } catch (e) { return raw; }
  }
  return JSON.stringify(raw, null, 2);
}

function getTokenUsage(transcriptPath) {
  if (!transcriptPath) return null;
  try {
    var stat = fs.statSync(transcriptPath);
    var size = Math.min(stat.size, 65536);
    var buf = Buffer.alloc(size);
    var fd = fs.openSync(transcriptPath, 'r');
    fs.readSync(fd, buf, 0, size, stat.size - size);
    fs.closeSync(fd);

    var lines = buf.toString().split('\n');
    for (var i = lines.length - 1; i >= 0; i--) {
      try {
        var entry = JSON.parse(lines[i]);
        var usage = entry.message && entry.message.usage;
        if (usage && (usage.input_tokens || usage.output_tokens)) {
          var input = '' + (usage.input_tokens || usage.prompt_tokens || '');
          var output = '' + (usage.output_tokens || usage.completion_tokens || '');
          var t = (parseInt(input) || 0) + (parseInt(output) || 0);
          return { input: input, output: output, total: t ? '' + t : '' };
        }
      } catch (e) {}
    }
  } catch (e) {
    console.error('PostToolUse: transcript error:', e.message);
  }
  return null;
}

function sendCard(elements, toolName) {
  var card = JSON.stringify({
    msg_type: 'interactive',
    card: {
      header: {
        title: { tag: 'plain_text', content: 'PostToolUse · ' + cnTool(toolName) },
        template: 'green'
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
    console.error('PostToolUse:', e.message);
    process.exit(0);
  });
  req.on('timeout', function () {
    req.destroy();
    console.error('PostToolUse: timeout');
    process.exit(0);
  });

  req.write(card);
  req.end();
}

function fetchBalance(callback) {
  if (!DEEPSEEK_API_KEY) { callback(null); return; }

  var handled = false;
  function once(info) {
    if (handled) return;
    handled = true;
    callback(info);
  }

  var req = https.get('https://api.deepseek.com/user/balance', {
    headers: { Authorization: 'Bearer ' + DEEPSEEK_API_KEY, Accept: 'application/json' },
    timeout: 5000
  }, function (res) {
    var body = '';
    res.on('data', function (c) { body += c; });
    res.on('end', function () {
      try {
        var j = JSON.parse(body);
        if (j.balance_infos && j.balance_infos.length) {
          var info = j.balance_infos[0];
          once('¥' + info.total_balance + '（' + (j.is_available ? '可用' : '不可用') + '）');
        } else {
          once((j.is_available ? '可用' : '不可用'));
        }
      } catch (e) {
        console.error('PostToolUse: balance parse error:', e.message);
        once(null);
      }
    });
  });

  req.on('error', function (e) {
    console.error('PostToolUse: balance query error:', e.message);
    once(null);
  });
  req.on('timeout', function () {
    req.destroy();
    once(null);
  });
}

// --- Main ---
var d = JSON.parse(fs.readFileSync(0, 'utf8'));
var toolName = d.tool_name || d.name || d.tool || 'unknown';
var sessionId = (d.session_id || d.sessionId || d.session || 'N/A').toString();
var output = fmtOutput(d.tool_response || d.response || d.output || d.result || d);

var elements = [];

var usage = getTokenUsage(d.transcript_path);
if (usage) {
  elements.push({
    tag: 'fields',
    fields: [
      { is_short: true, text: { tag: 'lark_md', content: '**输入 Token**\n' + usage.input } },
      { is_short: true, text: { tag: 'lark_md', content: '**输出 Token**\n' + usage.output } },
      { is_short: true, text: { tag: 'lark_md', content: '**合计**\n' + usage.total } }
    ]
  });
}

elements.push({ tag: 'hr' });
elements.push({ tag: 'div', text: { tag: 'lark_md', content: '**输出结果**\n```\n' + trunc(output) + '\n```' } });
elements.push({
  tag: 'note',
  elements: [{ tag: 'plain_text', content: '会话 ' + sessionId.substring(0, 12) + ' · ' + now() }]
});

fetchBalance(function (balanceInfo) {
  if (balanceInfo) {
    elements.unshift({ tag: 'div', text: { tag: 'lark_md', content: '**余额**  ' + balanceInfo } });
  }
  sendCard(elements, toolName);
});
