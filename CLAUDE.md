# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

当前项目为纯配置项目，无应用代码。主要用于 Claude Code 的 hook 通知、权限管理和状态栏定制。

父级 `../CLAUDE.md` 包含通用行为准则（思考优先、简洁至上、外科手术式修改、目标驱动执行），本项目也应遵循。

## 权限模型

两层级配置，`settings.local.json` 优先级更高，合并到 `settings.json`：

| 文件 | 用途 |
|------|------|
| `.claude/settings.json` | 项目级：读权限 `**/*`、白名单 bash 命令、7 个飞书 hooks、状态栏 |
| `.claude/settings.local.json` | 用户级附加权限（当前：允许 WebSearch） |

## Hook 系统

7 个生命周期 hook，全部通过飞书 interactive 卡片通知。架构统一：

1. 从 stdin 读取 JSON 事件数据
2. 构建飞书原生卡片（header + elements）
3. POST 到 `FEISHU_WEBHOOK_URL` 环境变量

| Hook | 页头色 | 特殊内容 |
|------|--------|----------|
| `session-start.js` | wathet (浅蓝) | 会话 ID + 工作目录 |
| `session-end.js` | turquoise (青蓝) | 会话 ID |
| `pre-tool-use.js` | blue | 工具名(中文) + 输入参数 |
| `post-tool-use.js` | green | DeepSeek 余额 + Token 三列 + 输出结果 |
| `post-tool-use-failure.js` | red | 错误信息 |
| `task-created.js` | purple | 任务名 + 描述 |
| `task-completed.js` | green | 任务名 |

**必需环境变量：**
- `FEISHU_WEBHOOK_URL` — 飞书机器人 webhook 地址，所有 hook 脚本依赖
- `DEEPSEEK_API_KEY` — DeepSeek API 密钥，仅 `post-tool-use.js` 用于查询余额

**已知技术债：** `cnTool()` 工具名中文映射函数在 `pre-tool-use.js`、`post-tool-use.js`、`post-tool-use-failure.js` 中各有独立副本。添加新工具映射时需同步修改三处。

## 后续添加代码后应更新

- 构建/测试/lint 命令
- 代码架构说明
- 项目特定的开发指南
