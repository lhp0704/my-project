# 快速开始

本指南介绍安装并初始化 OpenSpec 之后的使用方式。安装说明请参见[主 README](/Fission-AI/OpenSpec/blob/main/README.md#quick-start)。

## 工作原理

OpenSpec 帮助你和你的 AI 编程助手在编写任何代码之前就"要构建什么"达成共识。

**默认快捷路径（core 配置）：**

    /opsx:propose ──► /opsx:apply ──► /opsx:sync ──► /opsx:archive

**扩展路径（自定义工作流选择）：**

    /opsx:new ──► /opsx:ff 或 /opsx:continue ──► /opsx:apply ──► /opsx:verify ──► /opsx:archive

默认的全局配置是 `core`，包含 `propose`、`explore`、`apply`、`sync` 和 `archive`。你可以通过 `openspec config profile` 启用扩展工作流命令，然后执行 `openspec update`。

## OpenSpec 创建了什么

运行 `openspec init` 后，你的项目会生成以下结构：

    openspec/
    ├── specs/              # 事实来源（记录系统行为）
    │   └── <domain>/
    │       └── spec.md
    ├── changes/            # 变更提案（每个变更一个文件夹）
    │   └── <change-name>/
    │       ├── proposal.md
    │       ├── design.md
    │       ├── tasks.md
    │       └── specs/      # 增量规格（变更了哪些内容）
    │           └── <domain>/
    │               └── spec.md
    └── config.yaml         # 项目配置（可选）

**两个核心目录：**

*   **`specs/`** — 事实来源。这些规格描述系统当前的运行行为。按领域组织（例如 `specs/auth/`、`specs/payments/`）。

*   **`changes/`** — 变更提案。每个变更都有自己的文件夹，包含所有相关工件。变更完成后，其规格会合并回主 `specs/` 目录。

## 理解工件

每个变更文件夹包含以下指导开发的工件：

| 工件 | 用途 |
|------|------|
| `proposal.md` | "为什么"和"做什么"——记录意图、范围和方法 |
| `specs/` | 增量规格，以 ADDED/MODIFIED/REMOVED 标注需求变更 |
| `design.md` | "怎么做"——技术方案和架构决策 |
| `tasks.md` | 带复选框的实现清单 |

**工件之间的递进关系：**

    proposal ──► specs ──► design ──► tasks ──► 实施
       ▲           ▲          ▲                    │
       └───────────┴──────────┴────────────────────┘
               实施过程中可以回头更新

在实施过程中，你可以随时回头完善早期的工件。

## 增量规格如何工作

增量规格是 OpenSpec 的核心概念。它们展示相对于当前规格发生了哪些变化。

### 格式

增量规格使用小节标题来标示变更类型：

    # Delta for Auth

    ## ADDED Requirements

    ### Requirement: 双因素认证
    系统必须在登录时要求第二因素验证。

    #### Scenario: 需要 OTP
    - GIVEN 一个已启用 2FA 的用户
    - WHEN 该用户提交有效的凭据
    - THEN 系统展示 OTP 验证挑战

    ## MODIFIED Requirements

    ### Requirement: 会话超时
    系统应在 30 分钟无活动后使会话过期。
    （原为：60 分钟）

    #### Scenario: 空闲超时
    - GIVEN 一个已认证的会话
    - WHEN 30 分钟内没有任何活动
    - THEN 该会话被置为无效

    ## REMOVED Requirements

    ### Requirement: 记住我
    （已弃用，改用 2FA）

### 归档时发生了什么

当你归档一个变更时：

1.  **ADDED** 需求追加到主规格文件末尾
2.  **MODIFIED** 需求替换现有版本
3.  **REMOVED** 需求从主规格文件中删除

变更文件夹会移至 `openspec/changes/archive/` 作为审计历史保留。

## 示例：你的第一个变更

来看看如何给一个应用添加深色模式。

### 1. 开始变更（默认方式）

    你：  /opsx:propose add-dark-mode

    AI：  已创建 openspec/changes/add-dark-mode/
          ✓ proposal.md — 为什么要做、变更内容
          ✓ specs/       — 需求和场景
          ✓ design.md    — 技术方案
          ✓ tasks.md     — 实现清单
          可以开始实施了！

如果已启用扩展工作流配置，你也可以分两步完成：`/opsx:new` 然后 `/opsx:ff`（或逐步使用 `/opsx:continue`）。

### 2. 创建了什么

**proposal.md** — 记录意图：

    # Proposal: 添加深色模式

    ## 意图
    用户要求增加深色模式选项，以减轻夜间使用时
    的眼睛疲劳。

    ## 范围
    - 在设置中添加主题切换
    - 支持系统偏好检测
    - 通过 localStorage 持久化偏好

    ## 方案
    使用 CSS 自定义属性实现主题，结合 React Context
    进行状态管理。

**specs/ui/spec.md** — 展示新需求的增量规格：

    # Delta for UI

    ## ADDED Requirements

    ### Requirement: 主题选择
    系统应允许用户在浅色和深色主题之间进行选择。

    #### Scenario: 手动切换
    - GIVEN 用户位于任意页面
    - WHEN 用户点击主题切换按钮
    - THEN 主题立即切换
    - AND 偏好跨会话持久化

    #### Scenario: 系统偏好
    - GIVEN 用户没有已保存的偏好
    - WHEN 应用程序加载时
    - THEN 使用系统的首选配色方案

**tasks.md** — 实现清单：

    # Tasks

    ## 1. 主题基础设施
    - [ ] 1.1 创建 ThemeContext（含 light/dark 状态）
    - [ ] 1.2 添加颜色的 CSS 自定义属性
    - [ ] 1.3 实现 localStorage 持久化

    ## 2. UI 组件
    - [ ] 2.1 创建 ThemeToggle 组件
    - [ ] 2.2 在设置页面添加切换开关
    - [ ] 2.3 更新 Header 以包含快捷切换

    ## 3. 样式
    - [ ] 3.1 定义深色主题色板
    - [ ] 3.2 更新组件以使用 CSS 变量

### 3. 实施

    你：  /opsx:apply

    AI：  正在执行任务...
          ✓ 1.1 已创建 ThemeContext（含 light/dark 状态）
          ✓ 1.2 已在 globals.css 中添加 CSS 自定义属性
          ✓ 1.3 已实现 localStorage 持久化
          ✓ 2.1 已创建 ThemeToggle 组件
          ...
          所有任务已完成！

在实施过程中，如果发现设计需要调整，直接更新工件然后继续即可。

### 4. 归档

    你：  /opsx:archive

    AI：  正在归档 add-dark-mode...
          ✓ 已合并规格到 openspec/specs/ui/spec.md
          ✓ 已移至 openspec/changes/archive/2025-01-24-add-dark-mode/
          完成！可以开始下一个功能了。

你的增量规格现已合并到主规格，记录了系统的实际运行方式。

## 验证与审查

使用 CLI 检查你的变更：

    # 列出活跃的变更
    openspec list

    # 查看变更详情
    openspec show add-dark-mode

    # 验证规格格式
    openspec validate add-dark-mode

    # 交互式仪表盘
    openspec view

## 下一步

*   [工作流](/Fission-AI/OpenSpec/blob/main/docs/workflows.md) — 常用模式及何时使用各命令
*   [命令参考](/Fission-AI/OpenSpec/blob/main/docs/commands.md) — 所有斜杠命令的完整参考
*   [核心概念](/Fission-AI/OpenSpec/blob/main/docs/concepts.md) — 深入理解规格、变更和模式
*   [自定义](/Fission-AI/OpenSpec/blob/main/docs/customization.md) — 让 OpenSpec 按你的方式工作
