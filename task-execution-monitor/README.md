# 小红书任务执行监控系统

参考 `qps-monitor` 实现的独立监控项目，用于从 Grafana 查询任务执行数据，并在任务连续异常时发送飞书报警。

## 功能

- 实时展示任务总数、成功数、失败数和成功率
- 支持 Grafana 用户名/密码认证
- 支持可配置 PromQL 查询表达式
- 支持飞书报警和报警历史
- 支持模拟数据模式

## 快速开始

```bash
cd task-execution-monitor
npm install
npm start
```

默认访问地址：

```text
http://localhost:3006
```

## 默认 Grafana 配置

- 地址：`http://inner-grafana.xiguaji.com`
- Dashboard：任务执行报表
- Job：`qiangua:XiaoHongShu.DataTask.SpiderTask.带货相关.店铺商品采集`
- 账号：`gfxigua`

默认 PromQL 使用以下占位符：

- `$job`
- `$group`
- `$compareTime`

如果 Grafana 实际指标名不同，可在配置页修改“总执行数 / 成功数 / 失败数 PromQL”。

## 报警规则

单个任务满足任一条件即视为异常：

- 成功数低于任务配置的成功数阈值
- 成功率低于任务配置的成功率阈值

连续 10 次检查异常后发送报警。每天 00:00 到 08:00 不发送报警。
